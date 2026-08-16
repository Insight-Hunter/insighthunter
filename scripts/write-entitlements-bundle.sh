#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-/Users/jamesmichaelhunterturner/insighthunter}"
APP_DIR="$REPO/apps/insighthunter-main"
SRC_DIR="$APP_DIR/src"
AUTHZ_DIR="$SRC_DIR/authz"
ROUTES_DIR="$SRC_DIR/routes"

mkdir -p "$AUTHZ_DIR" "$ROUTES_DIR"

cat > "$APP_DIR/schema.sql" <<'EOF'
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT UNIQUE,
  billing_provider TEXT DEFAULT 'stripe',
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER DEFAULT 0,
  canceled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  processed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  subscription_id TEXT,
  feature_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'plan',
  granted_at TEXT NOT NULL,
  expires_at TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_events_provider_event_id ON billing_events(provider_event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_checkout_session_id ON subscriptions(stripe_checkout_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_customer_feature
  ON entitlements(customer_id, feature_key);
CREATE INDEX IF NOT EXISTS idx_entitlements_subscription_id
  ON entitlements(subscription_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status
  ON entitlements(status);
EOF

cat > "$AUTHZ_DIR/plans.ts" <<'EOF'
export const FEATURE_KEYS = {
  APP_BIZFORMA: "app.bizforma",
  DASHBOARD_ADVANCED: "dashboard.advanced",
  DOCUMENTS_VAULT: "documents.vault",
  AI_ADVISOR: "ai.advisor",
  PAYROLL_WORKSPACE: "payroll.workspace",
  COMPLIANCE_CALENDAR: "compliance.calendar",
  FORMS_LEGO: "forms.lego",
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

export const PLAN_FEATURES: Record<string, FeatureKey[]> = {
  starter: [
    FEATURE_KEYS.APP_BIZFORMA,
    FEATURE_KEYS.DOCUMENTS_VAULT,
    FEATURE_KEYS.COMPLIANCE_CALENDAR,
  ],
  growth: [
    FEATURE_KEYS.APP_BIZFORMA,
    FEATURE_KEYS.DOCUMENTS_VAULT,
    FEATURE_KEYS.COMPLIANCE_CALENDAR,
    FEATURE_KEYS.AI_ADVISOR,
    FEATURE_KEYS.FORMS_LEGO,
    FEATURE_KEYS.DASHBOARD_ADVANCED,
  ],
  pro: [
    FEATURE_KEYS.APP_BIZFORMA,
    FEATURE_KEYS.DOCUMENTS_VAULT,
    FEATURE_KEYS.COMPLIANCE_CALENDAR,
    FEATURE_KEYS.AI_ADVISOR,
    FEATURE_KEYS.FORMS_LEGO,
    FEATURE_KEYS.DASHBOARD_ADVANCED,
    FEATURE_KEYS.PAYROLL_WORKSPACE,
  ],
};

export function getPlanFeatures(planCode: string): FeatureKey[] {
  return PLAN_FEATURES[planCode] ?? [];
}
EOF

cat > "$AUTHZ_DIR/entitlements.ts" <<'EOF'
import type { FeatureKey } from "./plans.js";
import { getPlanFeatures } from "./plans.js";

export type SubscriptionRecord = {
  id: string;
  customer_id: string;
  plan_code: string;
  status: string;
  current_period_end?: string | null;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

export function subscriptionCanGrantEntitlements(status: string): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(status);
}

export async function syncEntitlementsForSubscription(
  db: D1Database,
  subscription: SubscriptionRecord,
): Promise<void> {
  const now = new Date().toISOString();

  if (!subscriptionCanGrantEntitlements(subscription.status)) {
    await db.prepare(
      'UPDATE entitlements
       SET status = 'inactive',
           expires_at = COALESCE(?, expires_at, ?),
           updated_at = ?
       WHERE subscription_id = ?'
    ).bind(
      subscription.current_period_end ?? null,
      now,
      now,
      subscription.id,
    ).run();

    return;
  }

  const features = getPlanFeatures(subscription.plan_code);

  await db.prepare(
    'UPDATE entitlements
     SET status = 'inactive',
         expires_at = COALESCE(?, expires_at),
         updated_at = ?
     WHERE subscription_id = ?'
  ).bind(
    subscription.current_period_end ?? null,
    now,
    subscription.id,
  ).run();

  for (const featureKey of features) {
    const existing = await db.prepare(
      'SELECT id
       FROM entitlements
       WHERE customer_id = ? AND feature_key = ?
       LIMIT 1'
    ).bind(subscription.customer_id, featureKey).first<{ id: string }>();

    if (existing?.id) {
      await db.prepare(
        'UPDATE entitlements
         SET subscription_id = ?,
             status = 'active',
             source = 'plan',
             expires_at = ?,
             metadata_json = ?,
             updated_at = ?
         WHERE id = ?'
      ).bind(
        subscription.id,
        subscription.current_period_end ?? null,
        JSON.stringify({ plan_code: subscription.plan_code }),
        now,
        existing.id,
      ).run();
      continue;
    }

    await db.prepare(
      'INSERT INTO entitlements (
        id,
        customer_id,
        subscription_id,
        feature_key,
        status,
        source,
        granted_at,
        expires_at,
        metadata_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'active', 'plan', ?, ?, ?, ?, ?)'
    ).bind(
      crypto.randomUUID(),
      subscription.customer_id,
      subscription.id,
      featureKey,
      now,
      subscription.current_period_end ?? null,
      JSON.stringify({ plan_code: subscription.plan_code }),
      now,
      now,
    ).run();
  }
}

export async function customerHasEntitlement(
  db: D1Database,
  customerId: string,
  featureKey: FeatureKey,
): Promise<boolean> {
  const row = await db.prepare(
    'SELECT id
     FROM entitlements
     WHERE customer_id = ?
       AND feature_key = ?
       AND status = 'active'
       AND (expires_at IS NULL OR expires_at >= ?)
     LIMIT 1'
  ).bind(customerId, featureKey, new Date().toISOString()).first<{ id: string }>();

  return Boolean(row?.id);
}
EOF

cat > "$AUTHZ_DIR/session.ts" <<'EOF'
import { extractSessionToken } from "@insighthunter/auth-shared";

export type SessionLookup = {
  ok: boolean;
  session?: {
    token: string;
    user: {
      subject: string;
      email?: string;
    };
    expiresAt: string;
  };
};

export async function getSession(
  authBaseUrl: string,
  request: Request,
): Promise<SessionLookup["session"] | null> {
  const token = extractSessionToken(request);

  if (!token) {
    return null;
  }

  const response = await fetch('${authBaseUrl}/session/${encodeURIComponent(token)}');

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as SessionLookup;
  return payload.ok ? payload.session ?? null : null;
}

export async function ensureCustomer(
  db: D1Database,
  userId: string,
  email: string,
): Promise<{ id: string; userId: string; email: string; stripeCustomerId?: string | null }> {
  const existing = await db.prepare(
    "SELECT id, user_id, email, stripe_customer_id FROM customers WHERE user_id = ? LIMIT 1"
  ).bind(userId).first<{ id: string; user_id: string; email: string; stripe_customer_id?: string | null }>();

  if (existing) {
    return {
      id: existing.id,
      userId: existing.user_id,
      email: existing.email,
      stripeCustomerId: existing.stripe_customer_id ?? null,
    };
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db.prepare(
    "INSERT INTO customers (id, user_id, email, created_at) VALUES (?, ?, ?, ?)"
  ).bind(id, userId, email, createdAt).run();

  return { id, userId, email, stripeCustomerId: null };
}
EOF

cat > "$AUTHZ_DIR/middleware.ts" <<'EOF'
import { createMiddleware } from "hono/factory";
import { getLoginRedirectUrl } from "@insighthunter/auth-shared";
import { customerHasEntitlement } from "./entitlements.js";
import type { FeatureKey } from "./plans.js";
import { ensureCustomer, getSession } from "./session.js";

type Bindings = {
  AUTH_BASE_URL: string;
  MAIN_BASE_URL: string;
  DB: D1Database;
};

export function requireEntitlement(featureKey: FeatureKey) {
  return createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
    const session = await getSession(c.env.AUTH_BASE_URL, c.req.raw);

    if (!session || !session.user.email) {
      const loginUrl = getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL);
      return c.redirect(loginUrl, 302);
    }

    const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);
    const allowed = await customerHasEntitlement(c.env.DB, customer.id, featureKey);

    if (!allowed) {
      return c.json(
        {
          ok: false,
          error: "entitlement_required",
          feature: featureKey,
        },
        403,
      );
    }

    c.set("session", session);
    c.set("customer", customer);
    await next();
  });
}
EOF

cat > "$ROUTES_DIR/entitlements.ts" <<'EOF'
import { Hono } from "hono";
import { ensureCustomer, getSession } from "../authz/session.js";
import { FEATURE_KEYS, getPlanFeatures } from "../authz/plans.js";
import { customerHasEntitlement } from "../authz/entitlements.js";

type Env = {
  Bindings: {
    AUTH_BASE_URL: string;
    MAIN_BASE_URL: string;
    DB: D1Database;
  };
};

const entitlements = new Hono<Env>();

entitlements.get("/api/entitlements", async (c) => {
  const session = await getSession(c.env.AUTH_BASE_URL, c.req.raw);

  if (!session || !session.user.email) {
    return c.json({ ok: false, error: "unauthorized" }, 401);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);

  const rows = await c.env.DB.prepare(
    'SELECT feature_key, status, source, expires_at, metadata_json
     FROM entitlements
     WHERE customer_id = ?
     ORDER BY feature_key ASC'
  ).bind(customer.id).all<{
    results: Array<{
      feature_key: string;
      status: string;
      source: string;
      expires_at?: string | null;
      metadata_json?: string | null;
    }>;
  }>();

  return c.json({
    ok: true,
    customerId: customer.id,
    entitlements: rows.results ?? [],
  });
});

entitlements.get("/api/entitlements/check/:featureKey", async (c) => {
  const featureKey = c.req.param("featureKey");

  if (!Object.values(FEATURE_KEYS).includes(featureKey as (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS])) {
    return c.json({ ok: false, error: "unknown_feature" }, 400);
  }

  const session = await getSession(c.env.AUTH_BASE_URL, c.req.raw);

  if (!session || !session.user.email) {
    return c.json({ ok: false, error: "unauthorized" }, 401);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);
  const allowed = await customerHasEntitlement(c.env.DB, customer.id, featureKey as keyof typeof FEATURE_KEYS extends never ? never : any);

  return c.json({
    ok: true,
    featureKey,
    allowed,
  });
});

entitlements.get("/api/plans/:planCode/features", (c) => {
  const planCode = c.req.param("planCode");

  return c.json({
    ok: true,
    planCode,
    features: getPlanFeatures(planCode),
  });
});

export default entitlements;
EOF

cat > "$ROUTES_DIR/onboarding.ts" <<'EOF'
import { Hono } from "hono";
import { customerHasEntitlement } from "../authz/entitlements.js";
import { FEATURE_KEYS } from "../authz/plans.js";
import { ensureCustomer, getSession } from "../authz/session.js";

type Env = {
  Bindings: {
    AUTH_BASE_URL: string;
    MAIN_BASE_URL: string;
    GATEWAY_BASE_URL: string;
    DB: D1Database;
  };
};

const onboarding = new Hono<Env>();

onboarding.get("/onboarding/route", async (c) => {
  const product = c.req.query("product") ?? "main";
  const session = await getSession(c.env.AUTH_BASE_URL, c.req.raw);

  if (!session || !session.user.email) {
    return c.redirect("/pricing", 302);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);

  if (product === "bizforma") {
    const canUseBizForma = await customerHasEntitlement(c.env.DB, customer.id, FEATURE_KEYS.APP_BIZFORMA);

    if (!canUseBizForma) {
      return c.redirect("/pricing", 302);
    }

    return c.redirect('${c.env.GATEWAY_BASE_URL}/handoff?app=bizforma', 302);
  }

  return c.redirect("/dashboard", 302);
});

export default onboarding;
EOF

cat > "$APP_DIR/src/routes/webhooks.ts" <<'EOF'
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
    'INSERT INTO billing_events (id, provider, provider_event_id, event_type, payload_json, processed_at)
     VALUES (?, 'stripe', ?, ?, ?, ?)'
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
    'SELECT id FROM subscriptions WHERE stripe_checkout_session_id = ? LIMIT 1'
  ).bind(checkout.id).first<{ id: string }>();

  if (existingByCheckout?.id) {
    await db.prepare(
      'UPDATE subscriptions
       SET status = ?,
           stripe_subscription_id = COALESCE(?, stripe_subscription_id),
           updated_at = ?
       WHERE id = ?'
    ).bind(
      "active",
      checkout.subscription ?? null,
      now,
      existingByCheckout.id,
    ).run();

    const sub = await db.prepare(
      'SELECT id, customer_id, plan_code, status, current_period_end
       FROM subscriptions
       WHERE id = ? LIMIT 1'
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
    'SELECT id FROM subscriptions
     WHERE customer_id = ? AND plan_code = ?
     ORDER BY updated_at DESC
     LIMIT 1'
  ).bind(customerId, planCode).first<{ id: string }>();

  if (latestCustomerPlan?.id) {
    await db.prepare(
      'UPDATE subscriptions
       SET status = ?,
           stripe_subscription_id = COALESCE(?, stripe_subscription_id),
           stripe_checkout_session_id = COALESCE(?, stripe_checkout_session_id),
           updated_at = ?
       WHERE id = ?'
    ).bind(
      "active",
      checkout.subscription ?? null,
      checkout.id,
      now,
      latestCustomerPlan.id,
    ).run();

    const sub = await db.prepare(
      'SELECT id, customer_id, plan_code, status, current_period_end
       FROM subscriptions
       WHERE id = ? LIMIT 1'
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
    'INSERT INTO subscriptions (
      id, customer_id, plan_code, status, stripe_subscription_id, stripe_checkout_session_id,
      billing_provider, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'stripe', ?, ?)'
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
    'SELECT id, customer_id, plan_code, status, current_period_end
     FROM subscriptions
     WHERE id = ? LIMIT 1'
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
    'SELECT id FROM subscriptions WHERE stripe_subscription_id = ? LIMIT 1'
  ).bind(subscription.id).first<{ id: string }>();

  let targetId: string | null = null;

  if (existing?.id) {
    targetId = existing.id;

    await db.prepare(
      'UPDATE subscriptions
       SET status = ?,
           plan_code = ?,
           current_period_start = ?,
           current_period_end = ?,
           cancel_at_period_end = ?,
           canceled_at = ?,
           updated_at = ?
       WHERE id = ?'
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
      'INSERT INTO subscriptions (
        id, customer_id, plan_code, status, stripe_subscription_id, billing_provider,
        current_period_start, current_period_end, cancel_at_period_end, canceled_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'stripe', ?, ?, ?, ?, ?, ?)'
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
    'SELECT id, customer_id, plan_code, status, current_period_end
     FROM subscriptions
     WHERE id = ? LIMIT 1'
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
EOF

cat > "$APP_DIR/src/index.ts" <<'EOF'
import { Hono } from "hono";
import { getLoginRedirectUrl, getRegisterRedirectUrl } from "@insighthunter/auth-shared";
import { createStripeCheckoutSession } from "./billing/stripe.js";
import { customerHasEntitlement } from "./authz/entitlements.js";
import { FEATURE_KEYS } from "./authz/plans.js";
import { ensureCustomer, getSession } from "./authz/session.js";
import entitlementsRoutes from "./routes/entitlements.js";
import onboarding from "./routes/onboarding.js";
import webhooks from "./routes/webhooks.js";

type Env = {
  Bindings: {
    APP_NAME: string;
    DB: D1Database;
    MAIN_BASE_URL: string;
    AUTH_BASE_URL: string;
    GATEWAY_BASE_URL: string;
    BIZFORMA_BASE_URL: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    STRIPE_PRICE_STARTER: string;
    STRIPE_PRICE_GROWTH: string;
    STRIPE_PRICE_PRO: string;
  };
};

const app = new Hono<Env>();

app.route("/", onboarding);
app.route("/", webhooks);
app.route("/", entitlementsRoutes);

function renderPage(title: string, body: string): string {
  return '
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <style>
          body { font-family: Inter, Arial, sans-serif; margin: 0; background: #0b1020; color: #f7f8fc; }
          .wrap { max-width: 1040px; margin: 0 auto; padding: 40px 20px; }
          .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
          .card { background: #121933; padding: 24px; border-radius: 16px; border: 1px solid #2a3359; }
          a.button { display:inline-block; padding:12px 16px; border-radius:10px; text-decoration:none; background:#4f7cff; color:white; }
          .muted { color:#b9c2e3; }
        </style>
      </head>
      <body>
        <div class="wrap">${body}</div>
      </body>
    </html>
  ';
}

function getPriceId(env: Env["Bindings"], plan: string): string {
  switch (plan) {
    case "growth":
      return env.STRIPE_PRICE_GROWTH;
    case "pro":
      return env.STRIPE_PRICE_PRO;
    case "starter":
    default:
      return env.STRIPE_PRICE_STARTER;
  }
}

app.get("/health", (c) => c.json({ ok: true, service: c.env.APP_NAME }));

app.get("/", (c) => {
  const loginUrl = getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL);
  const registerUrl = getRegisterRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL);

  return c.html(renderPage("Insight Hunter", '
    <h1>Insight Hunter</h1>
    <p class="muted">AI-powered finance, compliance, and operations for growing businesses.</p>
    <p><a class="button" href="${registerUrl}">Create account</a> <a class="button" href="${loginUrl}">Log in</a></p>
    <p><a class="button" href="/pricing">See pricing</a></p>
  '));
});

app.get("/pricing", (c) => {
  return c.html(renderPage("Pricing", '
    <h1>Pricing</h1>
    <div class="cards">
      <div class="card">
        <h2>Starter</h2>
        <p>$29/month</p>
        <p class="muted">Core operating tools and BizForma access.</p>
        <a class="button" href="/start?plan=starter&product=bizforma">Choose Starter</a>
      </div>
      <div class="card">
        <h2>Growth</h2>
        <p>$99/month</p>
        <p class="muted">Advanced dashboarding, AI, and modular forms.</p>
        <a class="button" href="/start?plan=growth&product=bizforma">Choose Growth</a>
      </div>
      <div class="card">
        <h2>Pro</h2>
        <p>$299/month</p>
        <p class="muted">Adds payroll workspace and broader operational tooling.</p>
        <a class="button" href="/start?plan=pro&product=bizforma">Choose Pro</a>
      </div>
    </div>
  '));
});

app.get("/start", (c) => {
  const plan = c.req.query("plan") ?? "starter";
  const product = c.req.query("product") ?? "bizforma";
  const url = getRegisterRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL, "/auth/callback", plan);
  const redirect = new URL(url);
  redirect.searchParams.set("product", product);
  return c.redirect(redirect.toString(), 302);
});

app.get("/auth/callback", async (c) => {
  const token = c.req.query("session_token");
  const plan = c.req.query("plan") ?? "starter";
  const product = c.req.query("product") ?? "bizforma";

  if (!token) {
    return c.redirect("/pricing", 302);
  }

  const response = c.redirect('/checkout/start?plan=${encodeURIComponent(plan)}&product=${encodeURIComponent(product)}', 302);
  response.headers.append("Set-Cookie", 'ih_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800');
  return response;
});

app.get("/checkout/start", async (c) => {
  const plan = c.req.query("plan") ?? "starter";
  const product = c.req.query("product") ?? "bizforma";
  const session = await getSession(c.env.AUTH_BASE_URL, c.req.raw);

  if (!session || !session.user.email) {
    return c.redirect(getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL), 302);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);

  const successUrl = new URL("/checkout/success", c.env.MAIN_BASE_URL);
  successUrl.searchParams.set("plan", plan);
  successUrl.searchParams.set("product", product);

  const cancelUrl = new URL("/checkout/cancel", c.env.MAIN_BASE_URL);
  cancelUrl.searchParams.set("plan", plan);
  cancelUrl.searchParams.set("product", product);

  const checkout = await createStripeCheckoutSession(c.env.STRIPE_SECRET_KEY, {
    mode: "subscription",
    customer: customer.stripeCustomerId ?? undefined,
    customer_email: customer.stripeCustomerId ? undefined : customer.email,
    client_reference_id: customer.id,
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
    line_items: [
      {
        price: getPriceId(c.env, plan),
        quantity: 1,
      },
    ],
    metadata: {
      customer_id: customer.id,
      plan_code: plan,
      product,
    },
  });

  if (!checkout.url) {
    return c.text("Unable to create Stripe checkout session", 500);
  }

  if (checkout.customer && checkout.customer !== customer.stripeCustomerId) {
    await c.env.DB.prepare(
      "UPDATE customers SET stripe_customer_id = ? WHERE id = ?"
    ).bind(checkout.customer, customer.id).run();
  }

  const now = new Date().toISOString();
  const existingPending = await c.env.DB.prepare(
    'SELECT id FROM subscriptions
     WHERE customer_id = ? AND plan_code = ? AND status IN ('pending', 'incomplete')
     ORDER BY updated_at DESC
     LIMIT 1'
  ).bind(customer.id, plan).first<{ id: string }>();

  if (existingPending?.id) {
    await c.env.DB.prepare(
      'UPDATE subscriptions
       SET stripe_checkout_session_id = ?,
           updated_at = ?
       WHERE id = ?'
    ).bind(
      checkout.id,
      now,
      existingPending.id,
    ).run();
  } else {
    await c.env.DB.prepare(
      'INSERT INTO subscriptions (
        id, customer_id, plan_code, status, stripe_checkout_session_id, billing_provider, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'stripe', ?, ?)'
    ).bind(
      crypto.randomUUID(),
      customer.id,
      plan,
      "pending",
      checkout.id,
      now,
      now,
    ).run();
  }

  return c.redirect(checkout.url, 302);
});

app.get("/checkout/success", async (c) => {
  const plan = c.req.query("plan") ?? "starter";
  const product = c.req.query("product") ?? "bizforma";
  const session = await getSession(c.env.AUTH_BASE_URL, c.req.raw);

  if (!session || !session.user.email) {
    return c.redirect("/pricing", 302);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);
  const subscription = await c.env.DB.prepare(
    'SELECT plan_code, status
     FROM subscriptions
     WHERE customer_id = ?
     ORDER BY updated_at DESC
     LIMIT 1'
  ).bind(customer.id).first<{ plan_code: string; status: string }>();

  if (!subscription || (subscription.status !== "active" && subscription.status !== "trialing")) {
    return c.html(renderPage("Processing subscription", '
      <h1>Payment received</h1>
      <p class="muted">We are confirming your subscription. Refresh in a few seconds.</p>
      <p><a class="button" href="/checkout/success?plan=${encodeURIComponent(plan)}&product=${encodeURIComponent(product)}">Refresh status</a></p>
    '));
  }

  return c.redirect('/onboarding/route?plan=${encodeURIComponent(subscription.plan_code)}&product=${encodeURIComponent(product)}', 302);
});

app.get("/checkout/cancel", (c) => {
  const plan = c.req.query("plan") ?? "starter";

  return c.html(renderPage("Checkout canceled", '
    <h1>Checkout canceled</h1>
    <p class="muted">Your ${plan} checkout was canceled.</p>
    <p><a class="button" href="/pricing">Return to pricing</a></p>
  '));
});

app.get("/dashboard", async (c) => {
  const session = await getSession(c.env.AUTH_BASE_URL, c.req.raw);

  if (!session || !session.user.email) {
    return c.redirect(getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL), 302);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);
  const subscription = await c.env.DB.prepare(
    'SELECT plan_code, status, current_period_end, cancel_at_period_end
     FROM subscriptions
     WHERE customer_id = ?
     ORDER BY updated_at DESC
     LIMIT 1'
  ).bind(customer.id).first<{
    plan_code: string;
    status: string;
    current_period_end?: string | null;
    cancel_at_period_end?: number | null;
  }>();

  const hasAdvancedDashboard = await customerHasEntitlement(c.env.DB, customer.id, FEATURE_KEYS.DASHBOARD_ADVANCED);
  const hasAiAdvisor = await customerHasEntitlement(c.env.DB, customer.id, FEATURE_KEYS.AI_ADVISOR);
  const hasPayroll = await customerHasEntitlement(c.env.DB, customer.id, FEATURE_KEYS.PAYROLL_WORKSPACE);
  const hasBizForma = await customerHasEntitlement(c.env.DB, customer.id, FEATURE_KEYS.APP_BIZFORMA);

  if (!subscription || (subscription.status !== "active" && subscription.status !== "trialing")) {
    return c.redirect("/pricing", 302);
  }

  return c.html(renderPage("Dashboard", '
    <h1>Welcome back</h1>
    <p class="muted">${session.user.email}</p>
    <div class="card">
      <h2>Current plan</h2>
      <p>${subscription.plan_code}</p>
      <p class="muted">Status: ${subscription.status}</p>
      <p class="muted">Renews through: ${subscription.current_period_end ?? "Pending Stripe sync"}</p>
      <p class="muted">Cancel at period end: ${subscription.cancel_at_period_end ? "Yes" : "No"}</p>
    </div>
    <div class="card">
      <h2>Entitlements</h2>
      <p class="muted">Advanced dashboard: ${hasAdvancedDashboard ? "Yes" : "No"}</p>
      <p class="muted">AI advisor: ${hasAiAdvisor ? "Yes" : "No"}</p>
      <p class="muted">Payroll workspace: ${hasPayroll ? "Yes" : "No"}</p>
      <p class="muted">BizForma app: ${hasBizForma ? "Yes" : "No"}</p>
    </div>
    <p><a class="button" href="${c.env.GATEWAY_BASE_URL}/handoff?app=bizforma">Open BizForma</a></p>
  '));
});

export default app;
EOF

cat > "$APP_DIR/wrangler.toml" <<'EOF'
name = "insighthunter-main"
main = "src/index.ts"
compatibility_date = "2026-07-05"

[observability]
enabled = true

[[d1_databases]]
binding = "DB"
database_name = "insighthunter_main"
database_id = "REPLACE_WITH_MAIN_DB_ID"

[vars]
APP_NAME = "insighthunter-main"
MAIN_BASE_URL = "https://insighthunter.app"
AUTH_BASE_URL = "https://auth.insighthunter.app"
GATEWAY_BASE_URL = "https://gateway.insighthunter.app"
BIZFORMA_BASE_URL = "https://bizforma.insighthunter.app"
STRIPE_PRICE_STARTER = "prod_U9zYWaE9xpW0Tx"
STRIPE_PRICE_GROWTH = "prod_U9zYM5rWy3zKPv"
STRIPE_PRICE_PRO = "prod_U9zYEwdL9Ca7Xu"
EOF

cat > "$APP_DIR/ENTITLEMENTS.md" <<'EOF'
# Entitlements bundle

## Features by plan

- starter: app.bizforma, documents.vault, compliance.calendar
- growth: starter + ai.advisor, forms.lego, dashboard.advanced
- pro: growth + payroll.workspace

## Apply schema

'''bash
cd apps/insighthunter-main
wrangler d1 execute insighthunter_main --file=schema.sql
