// apps/insighthunter-pbx/src/routes/tenant.ts
// Architecture: Single Telnyx org. Each tenant = one Credential Connection.
// All API calls use master TELNYX_API_KEY — no per-tenant keys.
import { Hono } from 'hono';
import { z }    from 'zod';

interface Env {
  PBX_DB:            D1Database;
  PBX_KV:            KVNamespace;
  ANALYTICS:         AnalyticsEngineDataset;
  TELNYX_API_KEY:    string;
  STRIPE_SECRET_KEY: string;
}

const TELNYX = 'https://api.telnyx.com/v2';
const STRIPE  = 'https://api.stripe.com/v1';

// ── Shared fetch helpers ──────────────────────────────────────────────────────
async function telnyxPost<T = Record<string, unknown>>(path: string, body: unknown, key: string): Promise<{  T }> {
  const r = await fetch(`${TELNYX}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Telnyx ${path} ${r.status}: ${text}`);
  return JSON.parse(text);
}

async function telnyxDelete(path: string, key: string): Promise<void> {
  const r = await fetch(`${TELNYX}${path}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${key}` },
  });
  if (!r.ok && r.status !== 404) {
    throw new Error(`Telnyx DELETE ${path} ${r.status}: ${await r.text()}`);
  }
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
  if (!r.ok) throw new Error(`Stripe ${path} ${r.status}: ${text}`);
  return JSON.parse(text);
}

// ── Random SIP password (16+ chars, alphanumeric + symbols) ──────────────────
function randomSipPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

// ── Validation ────────────────────────────────────────────────────────────────
const OnboardSchema = z.object({
  orgId:        z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  orgName:      z.string().min(1).max(120),
  email:        z.string().email(),
  planId:       z.enum(['starter', 'professional', 'enterprise']),
  stripePmId:   z.string().optional(),
  customDomain: z.string().optional(),
});

const tenant = new Hono<{ Bindings: Env }>();

// ── POST /api/pbx/tenant/onboard ─────────────────────────────────────────────
tenant.post('/onboard', async (c) => {
  const isAdmin = await c.env.PBX_DB
    .prepare('SELECT 1 FROM admins WHERE org_id=? LIMIT 1')
    .bind(c.get('orgId') as string).first();
  if (!isAdmin) return c.json({ error: 'Forbidden' }, 403);

  const parsed = OnboardSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 422);

  const { orgId, orgName, email, planId, stripePmId, customDomain } = parsed.data;

  // Idempotency: skip if already provisioned
  const existing = await c.env.PBX_DB
    .prepare('SELECT telnyx_connection_id FROM orgs WHERE org_id=? LIMIT 1')
    .bind(orgId).first<{ telnyx_connection_id: string }>();
  if (existing?.telnyx_connection_id) return c.json({ ok: true, already: true });

  try {
    // ── 1. Create Telnyx Credential Connection (SIP, per-tenant) ─────────────
    // One connection per tenant under the single master Telnyx org.
    // Username must be 4-32 alphanumeric chars; password 8-128 chars.
    const sipUsername = `ih-${orgId.replace(/[^a-z0-9]/g, '').slice(0, 28)}`;
    const sipPassword = randomSipPassword();

    const {  conn } = await telnyxPost<{
      id: string; connection_name: string;
    }>('/credential_connections', {
      connection_name:            `InsightHunter — ${orgName}`,
      user_name:                  sipUsername,
      password:                   sipPassword,
      active:                     true,
      anchorsite_override:        'Latency',
      sip_uri_calling_preference: 'disabled',
      webhook_event_url:          `https://pbx-api.insighthunter.app/webhook/telnyx`,
      webhook_api_version:        '2',
      inbound: { channel_limit: 10 },
      outbound: { channel_limit: 10 },
    }, c.env.TELNYX_API_KEY);

    const telnyxConnectionId = conn.id;

    // ── 2. Create Telephony Credential (WebRTC token source) ─────────────────
    // One permanent credential per tenant; we call /token on it each WebRTC session.
    const {  cred } = await telnyxPost<{ id: string }>(
      '/telephony_credentials',
      { connection_id: telnyxConnectionId, name: `${orgName} WebRTC` },
      c.env.TELNYX_API_KEY,
    );

    const telnyxCredentialId = cred.id;

    // ── 3. Create Stripe Customer ─────────────────────────────────────────────
    const stripeCust = await stripePost<{ id: string }>('/customers', {
      email, name: orgName,
      'metadata[orgId]':  orgId,
      'metadata[planId]': planId,
    }, c.env.STRIPE_SECRET_KEY);

    const stripeCustomerId = stripeCust.id;

    // ── 4. Attach payment method ──────────────────────────────────────────────
    if (stripePmId) {
      await stripePost(`/payment_methods/${stripePmId}/attach`,
        { customer: stripeCustomerId }, c.env.STRIPE_SECRET_KEY);
      await stripePost(`/customers/${stripeCustomerId}`,
        { 'invoice_settings[default_payment_method]': stripePmId }, c.env.STRIPE_SECRET_KEY);
    }

    // ── 5. Fetch Stripe price IDs from plan table ─────────────────────────────
    const plan = await c.env.PBX_DB
      .prepare('SELECT stripe_price_id_platform, stripe_price_id_minutes, stripe_price_id_numbers FROM plans WHERE plan_id=? LIMIT 1')
      .bind(planId)
      .first<{
        stripe_price_id_platform: string;
        stripe_price_id_minutes:  string;
        stripe_price_id_numbers:  string;
      }>();
    if (!plan?.stripe_price_id_platform)
      throw new Error(`Stripe prices not configured for plan: ${planId} — update the plans table first.`);

    // ── 6. Create Stripe Subscription ────────────────────────────────────────
    const sub = await stripePost<{
      id: string;
      items: {  Array<{ id: string; price: { id: string } }> };
    }>('/subscriptions', {
      customer:                    stripeCustomerId,
      'items[0][price]':           plan.stripe_price_id_platform,
      'items[1][price]':           plan.stripe_price_id_minutes,
      'items[2][price]':           plan.stripe_price_id_numbers,
      'payment_settings[save_default_payment_method]': 'on_subscription',
      'expand[0]':                 'items',
    }, c.env.STRIPE_SECRET_KEY);

    const stripeSubId = sub.id;
    // Map subscription item IDs for future per-item updates (plan changes, metered usage)
    const items = sub.items.data ?? [];
    const subItemPlatform = items.find(i => i.price.id === plan.stripe_price_id_platform)?.id ?? '';
    const subItemMinutes  = items.find(i => i.price.id === plan.stripe_price_id_minutes)?.id  ?? '';
    const subItemNumbers  = items.find(i => i.price.id === plan.stripe_price_id_numbers)?.id  ?? '';

    // ── 7. Persist to D1 ─────────────────────────────────────────────────────
    await c.env.PBX_DB.prepare(`
      INSERT INTO orgs (
        org_id, org_name, email, plan_id,
        telnyx_connection_id, telnyx_credential_id,
        stripe_customer_id, stripe_subscription_id,
        stripe_sub_item_platform, stripe_sub_item_minutes, stripe_sub_item_numbers,
        status, created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,'active',CURRENT_TIMESTAMP)
      ON CONFLICT(org_id) DO UPDATE SET
        telnyx_connection_id      = excluded.telnyx_connection_id,
        telnyx_credential_id      = excluded.telnyx_credential_id,
        stripe_customer_id        = excluded.stripe_customer_id,
        stripe_subscription_id    = excluded.stripe_subscription_id,
        stripe_sub_item_platform  = excluded.stripe_sub_item_platform,
        stripe_sub_item_minutes   = excluded.stripe_sub_item_minutes,
        stripe_sub_item_numbers   = excluded.stripe_sub_item_numbers,
        status = 'active'
    `).bind(
      orgId, orgName, email, planId,
      telnyxConnectionId, telnyxCredentialId,
      stripeCustomerId, stripeSubId,
      subItemPlatform, subItemMinutes, subItemNumbers,
    ).run();

    // ── 8. KV routing (custom domain + connection lookup) ─────────────────────
    if (customDomain) await c.env.PBX_KV.put(`host:${customDomain}`, orgId);
    // Store connection_id → orgId for fast webhook lookup (supplement to DID routing)
    await c.env.PBX_KV.put(`telnyx:conn:${telnyxConnectionId}`, orgId);

    c.env.ANALYTICS.writeDataPoint({
      blobs: ['tenant_provisioned', orgId, planId], doubles: [1], indexes: [orgId],
    });

    return c.json({
      ok: true,
      orgId,
      telnyxConnectionId,
      telnyxCredentialId,
      stripeCustomerId,
      stripeSubId,
    });

  } catch (e) {
    console.error('Onboard error:', e);
    return c.json({ error: (e as Error).message }, 500);
  }
});

// ── DELETE /api/pbx/tenant/:targetOrgId — cancel & deprovision ───────────────
tenant.delete('/:targetOrgId', async (c) => {
  const isAdmin = await c.env.PBX_DB
    .prepare('SELECT 1 FROM admins WHERE org_id=? LIMIT 1')
    .bind(c.get('orgId') as string).first();
  if (!isAdmin) return c.json({ error: 'Forbidden' }, 403);

  const org = await c.env.PBX_DB.prepare(`
    SELECT stripe_subscription_id, telnyx_connection_id, telnyx_credential_id
    FROM orgs WHERE org_id=? LIMIT 1
  `).bind(c.req.param('targetOrgId'))
    .first<{ stripe_subscription_id: string; telnyx_connection_id: string; telnyx_credential_id: string }>();
  if (!org) return c.json({ error: 'Not found' }, 404);

  // Cancel Stripe subscription immediately
  await fetch(`${STRIPE}/subscriptions/${org.stripe_subscription_id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}` },
  }).catch(console.error);

  // Delete Telnyx telephony credential + connection
  if (org.telnyx_credential_id) {
    await telnyxDelete(`/telephony_credentials/${org.telnyx_credential_id}`, c.env.TELNYX_API_KEY);
  }
  if (org.telnyx_connection_id) {
    await telnyxDelete(`/credential_connections/${org.telnyx_connection_id}`, c.env.TELNYX_API_KEY);
    await c.env.PBX_KV.delete(`telnyx:conn:${org.telnyx_connection_id}`);
  }

  await c.env.PBX_DB.prepare(
    `UPDATE orgs SET status='cancelled', cancelled_at=CURRENT_TIMESTAMP WHERE org_id=?`,
  ).bind(c.req.param('targetOrgId')).run();

  return c.json({ ok: true });
});

// ── GET /api/pbx/tenant/list ─────────────────────────────────────────────────
tenant.get('/list', async (c) => {
  const isAdmin = await c.env.PBX_DB
    .prepare('SELECT 1 FROM admins WHERE org_id=? LIMIT 1')
    .bind(c.get('orgId') as string).first();
  if (!isAdmin) return c.json({ error: 'Forbidden' }, 403);

  const { results } = await c.env.PBX_DB.prepare(`
    SELECT
      o.org_id, o.org_name, o.email, o.plan_id, o.status, o.created_at,
      COUNT(DISTINCT n.id) AS phone_count,
      COUNT(DISTINCT v.id) AS voicemail_count
    FROM orgs o
    LEFT JOIN phone_numbers n ON n.org_id=o.org_id AND n.status='active'
    LEFT JOIN voicemails    v ON v.org_id=o.org_id AND v.read_at IS NULL
    GROUP BY o.org_id
    ORDER BY o.created_at DESC
    LIMIT 500
  `).all<Record<string, unknown>>();

  return c.json({  results });
});

export default tenant;
