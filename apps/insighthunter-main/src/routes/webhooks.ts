import { Hono } from "hono";
import { syncEntitlementsForSubscription } from "../authz/entitlements.js";
import { parseStripeEvent, verifyStripeWebhookSignature } from "../billing/stripe.js";

type StripeCheckoutSessionObject = {
  id: string;
  customer?: string;
  subscription?: string;
  metadata?: Record<string, string>;
};

type StripeSubscriptionObject = {
  id: string;
  customer?: string;
  status?: string;
  cancel_at_period_end?: boolean;
  canceled_at?: number | null;
  current_period_start?: number | null;
  current_period_end?: number | null;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
        metadata?: Record<string, string>;
      };
    }>;
  };
  metadata?: Record<string, string>;
};

type Env = {
  Bindings: {
    DB: D1Database;
    STRIPE_WEBHOOK_SECRET: string;
  };
};

const webhooks = new Hono<Env>();

function unixToIso(value?: number | null): string | null {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

async function hasProcessedEvent(db: D1Database, eventId: string): Promise<boolean> {
  const row = await db.prepare(
    "SELECT provider_event_id FROM billing_events WHERE provider_event_id = ? LIMIT 1"
  ).bind(eventId).first<{ provider_event_id: string }>();

  return Boolean(row?.provider_event_id);
}

async function insertBillingEvent(
  db: D1Database,
  eventId: string,
  eventType: string,
  payload: string,
) {
  await db.prepare(
    `INSERT INTO billing_events (id, provider, provider_event_id, event_type, payload_json, processed_at)
     VALUES (?, 'stripe', ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    eventId,
    eventType,
    payload,
    new Date().toISOString(),
  ).run();
}

async function upsertSubscriptionFromCheckout(
  db: D1Database,
  checkout: StripeCheckoutSessionObject,
) {
  const customerId = checkout.metadata?.customer_id;
  const planCode = checkout.metadata?.plan_code ?? "starter";

  if (!customerId) {
    return;
  }

  const now = new Date().toISOString();
  const existingByCheckout = await db.prepare(
    `SELECT id FROM subscriptions WHERE stripe_checkout_session_id = ? LIMIT 1`
  ).bind(checkout.id).first<{ id: string }>();

  if (existingByCheckout?.id) {
    await db.prepare(
      `UPDATE subscriptions
       SET status = ?,
           stripe_subscription_id = COALESCE(?, stripe_subscription_id),
           updated_at = ?
       WHERE id = ?`
    ).bind(
      "active",
      checkout.subscription ?? null,
      now,
      existingByCheckout.id,
    ).run();

    const sub = await db.prepare(
      `SELECT id, customer_id, plan_code, status, current_period_end
       FROM subscriptions
       WHERE id = ? LIMIT 1`
    ).bind(existingByCheckout.id).first<{
      id: string;
      customer_id: string;
      plan_code: string;
      status: string;
      current_period_end?: string | null;
    }>();

    if (sub) {
      await syncEntitlementsForSubscription(db, sub);
    }

    return;
  }

  const latestCustomerPlan = await db.prepare(
    `SELECT id FROM subscriptions
     WHERE customer_id = ? AND plan_code = ?
     ORDER BY updated_at DESC
     LIMIT 1`
  ).bind(customerId, planCode).first<{ id: string }>();

  if (latestCustomerPlan?.id) {
    await db.prepare(
      `UPDATE subscriptions
       SET status = ?,
           stripe_subscription_id = COALESCE(?, stripe_subscription_id),
           stripe_checkout_session_id = COALESCE(?, stripe_checkout_session_id),
           updated_at = ?
       WHERE id = ?`
    ).bind(
      "active",
      checkout.subscription ?? null,
      checkout.id,
      now,
      latestCustomerPlan.id,
    ).run();

    const sub = await db.prepare(
      `SELECT id, customer_id, plan_code, status, current_period_end
       FROM subscriptions
       WHERE id = ? LIMIT 1`
    ).bind(latestCustomerPlan.id).first<{
      id: string;
      customer_id: string;
      plan_code: string;
      status: string;
      current_period_end?: string | null;
    }>();

    if (sub) {
      await syncEntitlementsForSubscription(db, sub);
    }

    return;
  }

  const newId = crypto.randomUUID();

  await db.prepare(
    `INSERT INTO subscriptions (
      id, customer_id, plan_code, status, stripe_subscription_id, stripe_checkout_session_id,
      billing_provider, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'stripe', ?, ?)`
  ).bind(
    newId,
    customerId,
    planCode,
    "active",
    checkout.subscription ?? null,
    checkout.id,
    now,
    now,
  ).run();

  const sub = await db.prepare(
    `SELECT id, customer_id, plan_code, status, current_period_end
     FROM subscriptions
     WHERE id = ? LIMIT 1`
  ).bind(newId).first<{
    id: string;
    customer_id: string;
    plan_code: string;
    status: string;
    current_period_end?: string | null;
  }>();

  if (sub) {
    await syncEntitlementsForSubscription(db, sub);
  }
}

async function updateSubscriptionLifecycle(
  db: D1Database,
  subscription: StripeSubscriptionObject,
) {
  const planCode =
    subscription.metadata?.plan_code ??
    subscription.items?.data?.[0]?.price?.metadata?.plan_code ??
    "starter";

  const now = new Date().toISOString();
  const periodStart = unixToIso(subscription.current_period_start);
  const periodEnd = unixToIso(subscription.current_period_end);
  const canceledAt = unixToIso(subscription.canceled_at);

  const existing = await db.prepare(
    `SELECT id FROM subscriptions WHERE stripe_subscription_id = ? LIMIT 1`
  ).bind(subscription.id).first<{ id: string }>();

  let targetId: string | null = null;

  if (existing?.id) {
    targetId = existing.id;

    await db.prepare(
      `UPDATE subscriptions
       SET status = ?,
           plan_code = ?,
           current_period_start = ?,
           current_period_end = ?,
           cancel_at_period_end = ?,
           canceled_at = ?,
           updated_at = ?
       WHERE id = ?`
    ).bind(
      subscription.status ?? "incomplete",
      planCode,
      periodStart,
      periodEnd,
      subscription.cancel_at_period_end ? 1 : 0,
      canceledAt,
      now,
      existing.id,
    ).run();
  } else {
    const customerId = subscription.metadata?.customer_id;

    if (!customerId) {
      return;
    }

    targetId = crypto.randomUUID();

    await db.prepare(
      `INSERT INTO subscriptions (
        id, customer_id, plan_code, status, stripe_subscription_id, billing_provider,
        current_period_start, current_period_end, cancel_at_period_end, canceled_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'stripe', ?, ?, ?, ?, ?, ?)`
    ).bind(
      targetId,
      customerId,
      planCode,
      subscription.status ?? "incomplete",
      subscription.id,
      periodStart,
      periodEnd,
      subscription.cancel_at_period_end ? 1 : 0,
      canceledAt,
      now,
      now,
    ).run();
  }

  if (!targetId) {
    return;
  }

  const sub = await db.prepare(
    `SELECT id, customer_id, plan_code, status, current_period_end
     FROM subscriptions
     WHERE id = ? LIMIT 1`
  ).bind(targetId).first<{
    id: string;
    customer_id: string;
    plan_code: string;
    status: string;
    current_period_end?: string | null;
  }>();

  if (sub) {
    await syncEntitlementsForSubscription(db, sub);
  }
}

webhooks.post("/webhooks/stripe", async (c) => {
  const payload = await c.req.text();
  const signature = c.req.header("stripe-signature");

  if (!signature) {
    return c.json({ ok: false, error: "missing_signature" }, 400);
  }

  const isValid = await verifyStripeWebhookSignature(payload, signature, c.env.STRIPE_WEBHOOK_SECRET);

  if (!isValid) {
    return c.json({ ok: false, error: "invalid_signature" }, 400);
  }

  const event = parseStripeEvent(payload);

  if (await hasProcessedEvent(c.env.DB, event.id)) {
    return c.json({ ok: true, duplicate: true });
  }

  await insertBillingEvent(c.env.DB, event.id, event.type, payload);

  if (event.type === "checkout.session.completed") {
    await upsertSubscriptionFromCheckout(c.env.DB, event.data.object as StripeCheckoutSessionObject);
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await updateSubscriptionLifecycle(c.env.DB, event.data.object as StripeSubscriptionObject);
  }

  return c.json({ ok: true });
});

export default webhooks;
