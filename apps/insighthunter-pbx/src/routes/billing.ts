// apps/insighthunter-pbx/src/routes/billing.ts
// Self-hosted billing portal endpoints — no Stripe redirect.
import { Hono } from 'hono';
import { z }    from 'zod';

interface Env {
  PBX_DB:                D1Database;
  ANALYTICS:             AnalyticsEngineDataset;
  STRIPE_SECRET_KEY:     string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PK:             string;   // publishable key (returned to frontend for Stripe.js)
}

const STRIPE = 'https://api.stripe.com/v1';

async function stripeGet<T = Record<string, unknown>>(path: string, key: string): Promise<T> {
  const r = await fetch(`${STRIPE}${path}`, {
    headers: { 'Authorization': `Bearer ${key}` },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Stripe GET ${path} ${r.status}: ${text}`);
  return JSON.parse(text);
}

async function stripePost<T = Record<string, unknown>>(
  path: string, params: Record<string, string>, key: string,
): Promise<T> {
  const r = await fetch(`${STRIPE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Stripe POST ${path} ${r.status}: ${text}`);
  return JSON.parse(text);
}

async function stripeReq<T = Record<string, unknown>>(
  method: string, path: string, key: string, params?: Record<string, string>,
): Promise<T> {
  const r = await fetch(`${STRIPE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${key}`,
      ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    ...(params ? { body: new URLSearchParams(params).toString() } : {}),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Stripe ${method} ${path} ${r.status}: ${text}`);
  return JSON.parse(text);
}

async function reportMeterEvent(
  eventName: string, stripeCustomerId: string, value: number,
  secretKey: string, idempotencyKey: string,
): Promise<void> {
  const r = await fetch('https://api.stripe.com/v2/billing/meter_events', {
    method: 'POST',
    headers: {
      'Authorization':   `Bearer ${secretKey}`,
      'Content-Type':    'application/json',
      'Stripe-Version':  '2024-12-18.acacia',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      event_name: eventName,
      payload: { stripe_customer_id: stripeCustomerId, value: String(value) },
    }),
  });
  if (!r.ok) console.error('Meter event error:', await r.text());
}

const billing = new Hono<{ Bindings: Env }>();

// ── GET /api/pbx/billing/usage ────────────────────────────────────────────────
billing.get('/usage', async (c) => {
  const orgId = c.get('orgId') as string;
  const org   = await c.env.PBX_DB
    .prepare('SELECT stripe_customer_id, plan_id, stripe_subscription_id FROM orgs WHERE org_id=? LIMIT 1')
    .bind(orgId)
    .first<{ stripe_customer_id: string; plan_id: string; stripe_subscription_id: string }>();
  if (!org) return c.json({ error: 'Org not found' }, 404);

  const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10);

  const [usage, vmRow, numRow] = await Promise.all([
    c.env.PBX_DB.prepare(`
      SELECT COUNT(*) AS total_calls,
        COALESCE(SUM(CASE WHEN direction='inbound'  THEN duration_seconds END),0) AS inbound_seconds,
        COALESCE(SUM(CASE WHEN direction='outbound' THEN duration_seconds END),0) AS outbound_seconds,
        COALESCE(SUM(duration_seconds),0) AS total_seconds
      FROM call_logs WHERE org_id=? AND started_at>=?
    `).bind(orgId, periodStart).first<Record<string, number>>(),
    c.env.PBX_DB.prepare(
      `SELECT COUNT(*) AS count FROM voicemails WHERE org_id=? AND created_at>=?`,
    ).bind(orgId, periodStart).first<{ count: number }>(),
    c.env.PBX_DB.prepare(
      `SELECT COUNT(*) AS count FROM phone_numbers WHERE org_id=? AND status='active'`,
    ).bind(orgId).first<{ count: number }>(),
  ]);

  let upcomingInvoice: Record<string, unknown> | null = null;
  try {
    upcomingInvoice = await stripeGet(
      `/invoices/upcoming?customer=${org.stripe_customer_id}`, c.env.STRIPE_SECRET_KEY,
    );
  } catch { /* no upcoming invoice yet */ }

  return c.json({ data: {
    period:          periodStart,
    plan:            org.plan_id,
    totalCalls:      usage?.total_calls      ?? 0,
    inboundMinutes:  Math.ceil((usage?.inbound_seconds  ?? 0) / 60),
    outboundMinutes: Math.ceil((usage?.outbound_seconds ?? 0) / 60),
    totalMinutes:    Math.ceil((usage?.total_seconds    ?? 0) / 60),
    voicemails:      vmRow?.count  ?? 0,
    activeNumbers:   numRow?.count ?? 0,
    estimatedTotal:  upcomingInvoice?.amount_due  ?? null,
    nextBillingDate: upcomingInvoice?.period_end  ?? null,
  }});
});

// ── GET /api/pbx/billing/invoices ─────────────────────────────────────────────
billing.get('/invoices', async (c) => {
  const org = await c.env.PBX_DB
    .prepare('SELECT stripe_customer_id FROM orgs WHERE org_id=? LIMIT 1')
    .bind(c.get('orgId') as string).first<{ stripe_customer_id: string }>();
  if (!org) return c.json({ error: 'Not found' }, 404);

  const invoices = await stripeGet<{ data: unknown[] }>(
    `/invoices?customer=${org.stripe_customer_id}&limit=24&status=paid`,
    c.env.STRIPE_SECRET_KEY,
  );
  return c.json({ data: invoices.data });
});

// ── POST /api/pbx/billing/change-plan — in-app plan upgrade/downgrade ─────────
billing.post('/change-plan', async (c) => {
  const orgId   = c.get('orgId') as string;
  const { planId } = await c.req.json<{ planId: string }>();

  if (!['starter','professional','enterprise'].includes(planId))
    return c.json({ error: 'Invalid plan' }, 422);

  const [org, newPlan] = await Promise.all([
    c.env.PBX_DB.prepare(
      'SELECT plan_id, stripe_subscription_id, stripe_sub_item_platform, stripe_sub_item_minutes, stripe_sub_item_numbers FROM orgs WHERE org_id=? LIMIT 1',
    ).bind(orgId).first<{
      plan_id: string; stripe_subscription_id: string;
      stripe_sub_item_platform: string; stripe_sub_item_minutes: string; stripe_sub_item_numbers: string;
    }>(),
    c.env.PBX_DB.prepare(
      'SELECT stripe_price_id_platform, stripe_price_id_minutes, stripe_price_id_numbers, max_dids FROM plans WHERE plan_id=? LIMIT 1',
    ).bind(planId).first<{
      stripe_price_id_platform: string; stripe_price_id_minutes: string;
      stripe_price_id_numbers: string; max_dids: number;
    }>(),
  ]);

  if (!org)      return c.json({ error: 'Org not found' }, 404);
  if (!newPlan?.stripe_price_id_platform)
    return c.json({ error: `Stripe prices not configured for ${planId} — update plans table` }, 500);
  if (org.plan_id === planId) return c.json({ ok: true, unchanged: true });

  // Check current DID count won't exceed new plan limit
  const { count } = await c.env.PBX_DB
    .prepare(`SELECT COUNT(*) AS count FROM phone_numbers WHERE org_id=? AND status='active'`)
    .bind(orgId).first<{ count: number }>() ?? { count: 0 };
  if (count > newPlan.max_dids)
    return c.json({ error: `Release ${count - newPlan.max_dids} number(s) before downgrading to ${planId}` }, 409);

  // Stripe: update each subscription item price (proration automatic)
  await Promise.all([
    stripePost(`/subscription_items/${org.stripe_sub_item_platform}`,
      { price: newPlan.stripe_price_id_platform, 'proration_behavior': 'create_prorations' },
      c.env.STRIPE_SECRET_KEY),
    stripePost(`/subscription_items/${org.stripe_sub_item_minutes}`,
      { price: newPlan.stripe_price_id_minutes,  'proration_behavior': 'create_prorations' },
      c.env.STRIPE_SECRET_KEY),
    stripePost(`/subscription_items/${org.stripe_sub_item_numbers}`,
      { price: newPlan.stripe_price_id_numbers,  'proration_behavior': 'create_prorations' },
      c.env.STRIPE_SECRET_KEY),
  ]);

  await c.env.PBX_DB.prepare('UPDATE orgs SET plan_id=? WHERE org_id=?').bind(planId, orgId).run();

  c.env.ANALYTICS.writeDataPoint({
    blobs: ['plan_changed', orgId, `${org.plan_id}→${planId}`], doubles: [1], indexes: [orgId],
  });

  return c.json({ ok: true, oldPlan: org.plan_id, newPlan: planId });
});

// ── POST /api/pbx/billing/setup-intent — create SetupIntent for card update ───
// Frontend calls this → gets client_secret → uses Stripe.js to collect card
// → posts confirmed pm_id to /payment-method
billing.post('/setup-intent', async (c) => {
  const org = await c.env.PBX_DB
    .prepare('SELECT stripe_customer_id FROM orgs WHERE org_id=? LIMIT 1')
    .bind(c.get('orgId') as string).first<{ stripe_customer_id: string }>();
  if (!org) return c.json({ error: 'Not found' }, 404);

  const si = await stripePost<{ client_secret: string; id: string }>('/setup_intents', {
    customer:                    org.stripe_customer_id,
    'payment_method_types[]':    'card',
    'usage':                     'off_session',
  }, c.env.STRIPE_SECRET_KEY);

  return c.json({
    clientSecret:    si.client_secret,
    setupIntentId:   si.id,
    stripePublicKey: c.env.STRIPE_PK,
  });
});

// ── POST /api/pbx/billing/payment-method — save confirmed payment method ──────
// Called after Stripe.js confirms the SetupIntent on the frontend
billing.post('/payment-method', async (c) => {
  const orgId = c.get('orgId') as string;
  const { paymentMethodId } = await c.req.json<{ paymentMethodId: string }>();

  if (!paymentMethodId?.startsWith('pm_'))
    return c.json({ error: 'Invalid payment method ID' }, 422);

  const org = await c.env.PBX_DB
    .prepare('SELECT stripe_customer_id, stripe_subscription_id FROM orgs WHERE org_id=? LIMIT 1')
    .bind(orgId).first<{ stripe_customer_id: string; stripe_subscription_id: string }>();
  if (!org) return c.json({ error: 'Not found' }, 404);

  // Attach to customer, set as default, update subscription
  await Promise.all([
    stripePost(`/payment_methods/${paymentMethodId}/attach`,
      { customer: org.stripe_customer_id }, c.env.STRIPE_SECRET_KEY),
    stripePost(`/customers/${org.stripe_customer_id}`,
      { 'invoice_settings[default_payment_method]': paymentMethodId }, c.env.STRIPE_SECRET_KEY),
    stripePost(`/subscriptions/${org.stripe_subscription_id}`,
      { 'default_payment_method': paymentMethodId }, c.env.STRIPE_SECRET_KEY),
  ]);

  return c.json({ ok: true });
});

// ── GET /api/pbx/billing/payment-method — current card on file ────────────────
billing.get('/payment-method', async (c) => {
  const org = await c.env.PBX_DB
    .prepare('SELECT stripe_customer_id FROM orgs WHERE org_id=? LIMIT 1')
    .bind(c.get('orgId') as string).first<{ stripe_customer_id: string }>();
  if (!org) return c.json({ error: 'Not found' }, 404);

  const cust = await stripeGet<{
    invoice_settings: { default_payment_method: string | null };
  }>(`/customers/${org.stripe_customer_id}`, c.env.STRIPE_SECRET_KEY);

  const pmId = cust.invoice_settings?.default_payment_method;
  if (!pmId) return c.json({ data: null });

  const pm = await stripeGet<{
    id: string; card: { brand: string; last4: string; exp_month: number; exp_year: number };
  }>(`/payment_methods/${pmId}`, c.env.STRIPE_SECRET_KEY);

  return c.json({ data: { id: pm.id, brand: pm.card.brand, last4: pm.card.last4, expMonth: pm.card.exp_month, expYear: pm.card.exp_year } });
});

// ── POST /api/pbx/billing/stripe-webhook ──────────────────────────────────────
billing.post('/stripe-webhook', async (c) => {
  const sig     = c.req.header('stripe-signature') ?? '';
  const rawBody = await c.req.text();
  const enc     = new TextEncoder();

  const parts = sig.split(',').reduce((a, p) => {
    const [k, v] = p.split('=');
    if (k === 't') a.t = v; if (k === 'v1') a.v1 = v;
    return a;
  }, {} as Record<string, string>);

  const key    = await crypto.subtle.importKey('raw', enc.encode(c.env.STRIPE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig256 = await crypto.subtle.sign('HMAC', key, enc.encode(`${parts.t}.${rawBody}`));
  const hexSig = Array.from(new Uint8Array(sig256)).map(b => b.toString(16).padStart(2,'0')).join('');
  if (hexSig !== parts.v1) return c.json({ error: 'Bad signature' }, 400);

  const event = JSON.parse(rawBody) as { type: string; data: { object: Record<string, unknown> } };
  const customerId = event.data.object.customer as string;

  const statusMap: Record<string, string> = {
    'invoice.payment_failed':       'payment_failed',
    'customer.subscription.deleted': 'cancelled',
  };
  if (statusMap[event.type]) {
    await c.env.PBX_DB
      .prepare(`UPDATE orgs SET status=? WHERE stripe_customer_id=?`)
      .bind(statusMap[event.type], customerId).run();
    if (event.type === 'customer.subscription.deleted') {
      await c.env.PBX_DB
        .prepare(`UPDATE orgs SET cancelled_at=CURRENT_TIMESTAMP WHERE stripe_customer_id=?`)
        .bind(customerId).run();
    }
  }
  if (event.type === 'invoice.payment_succeeded') {
    await c.env.PBX_DB
      .prepare(`UPDATE orgs SET status='active' WHERE stripe_customer_id=? AND status='payment_failed'`)
      .bind(customerId).run();
  }

  return c.json({ received: true });
});

// ── Exported: report call minutes to Stripe meter ────────────────────────────
export async function reportCallUsage(
  env: Env, orgId: string, durationSeconds: number,
  direction: 'inbound'|'outbound', callId: string,
): Promise<void> {
  const org = await env.PBX_DB
    .prepare('SELECT stripe_customer_id FROM orgs WHERE org_id=? LIMIT 1')
    .bind(orgId).first<{ stripe_customer_id: string }>();
  if (!org) return;

  const minutes   = Math.max(1, Math.ceil(durationSeconds / 60));
  const meterName = direction === 'inbound' ? 'pbx_inbound_minutes' : 'pbx_outbound_minutes';
  await reportMeterEvent(meterName, org.stripe_customer_id, minutes, env.STRIPE_SECRET_KEY, `call-${callId}-${direction}`);
  env.ANALYTICS.writeDataPoint({ blobs: [meterName, orgId, direction], doubles: [minutes], indexes: [orgId] });
}

export default billing;

