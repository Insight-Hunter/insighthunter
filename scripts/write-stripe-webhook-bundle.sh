#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-/Users/jamesmichaelhunterturner/insighthunter}"
APP_DIR="$REPO/apps/insighthunter-main"
SRC_DIR="$APP_DIR/src"
BILLING_DIR="$SRC_DIR/billing"

mkdir -p "$BILLING_DIR"

cat > "$APP_DIR/package.json" <<'EOF'
{
  "name": "@insighthunter/main",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "build": "wrangler deploy --dry-run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@insighthunter/auth-shared": "workspace:*",
    "hono": "^4.6.10"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250701.0"
  }
}
EOF

cat > "$APP_DIR/tsconfig.json" <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*.ts"]
}
EOF

cat > "$APP_DIR/schema.sql" <<'EOF'
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  app_code TEXT NOT NULL DEFAULT 'bizforma',
  status TEXT NOT NULL,
  onboarding_status TEXT NOT NULL DEFAULT 'pending',
  stripe_customer_id TEXT,
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  current_period_end TEXT,
  canceled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer_id ON customers(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_app_code ON subscriptions(app_code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_checkout_session_id ON subscriptions(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_id ON subscriptions(stripe_subscription_id);
EOF

cat > "$APP_DIR/.dev.vars.example" <<'EOF'
STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
EOF

cat > "$BILLING_DIR/stripe.ts" <<'EOF'
export type StripeCheckoutSession = {
  id: string;
  url?: string;
  customer?: string | null;
  subscription?: string | null;
  metadata?: Record<string, string> | null;
};

export type StripeSubscription = {
  id: string;
  customer?: string | null;
  status?: string | null;
  metadata?: Record<string, string> | null;
  current_period_end?: number | null;
  canceled_at?: number | null;
};

export type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: any;
  };
};

type StripeEnv = {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_STARTER_PRICE_ID: string;
  STRIPE_GROWTH_PRICE_ID: string;
  STRIPE_PRO_PRICE_ID: string;
};

type CreateCheckoutSessionInput = {
  planCode: string;
  appCode: string;
  customerId: string;
  userId: string;
  email: string;
  stripeCustomerId?: string | null;
  successUrl: string;
  cancelUrl: string;
};

function getPriceIdForPlan(planCode: string, env: StripeEnv): string {
  switch (planCode) {
    case "starter":
      return env.STRIPE_STARTER_PRICE_ID;
    case "growth":
      return env.STRIPE_GROWTH_PRICE_ID;
    case "pro":
      return env.STRIPE_PRO_PRICE_ID;
    default:
      throw new Error('Unsupported plan code: ${planCode}');
  }
}

function encodeHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return encodeHex(new Uint8Array(signature));
}

function secureCompareHex(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

function parseStripeSignature(header: string): { timestamp: number; signatures: string[] } {
  const parts = header.split(",");
  let timestamp = 0;
  const signatures: string[] = [];

  for (const part of parts) {
    const [rawKey, rawValue] = part.split("=", 2);
    const key = rawKey?.trim();
    const value = rawValue?.trim();

    if (!key || !value) {
      continue;
    }

    if (key === "t") {
      timestamp = Number(value);
    }

    if (key === "v1") {
      signatures.push(value);
    }
  }

  return { timestamp, signatures };
}

export async function verifyStripeWebhookSignature(
  payload: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
): Promise<void> {
  if (!header) {
    throw new Error("Missing Stripe-Signature header.");
  }

  const { timestamp, signatures } = parseStripeSignature(header);

  if (!timestamp || signatures.length === 0) {
    throw new Error("Invalid Stripe-Signature header.");
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - timestamp;

  if (Math.abs(ageSeconds) > toleranceSeconds) {
    throw new Error("Stripe webhook signature timestamp outside tolerance.");
  }

  const expected = await hmacSha256Hex(secret, '${timestamp}.${payload}');
  const matched = signatures.some((signature) => secureCompareHex(signature, expected));

  if (!matched) {
    throw new Error("Stripe webhook signature verification failed.");
  }
}

export async function createStripeCheckoutSession(
  env: StripeEnv,
  input: CreateCheckoutSessionInput,
): Promise<StripeCheckoutSession> {
  const priceId = getPriceIdForPlan(input.planCode, env);
  const body = new URLSearchParams();

  body.set("mode", "subscription");
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl);
  body.set("allow_promotion_codes", "true");
  body.set("billing_address_collection", "auto");
  body.set("line_items[0][price]", priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("client_reference_id", input.customerId);
  body.set("metadata[customer_id]", input.customerId);
  body.set("metadata[user_id]", input.userId);
  body.set("metadata[plan_code]", input.planCode);
  body.set("metadata[app_code]", input.appCode);
  body.set("subscription_data[metadata][customer_id]", input.customerId);
  body.set("subscription_data[metadata][user_id]", input.userId);
  body.set("subscription_data[metadata][plan_code]", input.planCode);
  body.set("subscription_data[metadata][app_code]", input.appCode);

  if (input.stripeCustomerId) {
    body.set("customer", input.stripeCustomerId);
  } else {
    body.set("customer_email", input.email);
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: 'Bearer ${env.STRIPE_SECRET_KEY}',
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error('Stripe checkout session creation failed: ${response.status} ${detail}');
  }

  return (await response.json()) as StripeCheckoutSession;
}
EOF

cat > "$SRC_DIR/index.ts" <<'EOF'
import { Hono } from "hono";
import {
  extractSessionToken,
  getLoginRedirectUrl,
  getRegisterRedirectUrl,
} from "@insighthunter/auth-shared";
import {
  createStripeCheckoutSession,
  type StripeCheckoutSession,
  type StripeEvent,
  type StripeSubscription,
  verifyStripeWebhookSignature,
} from "./billing/stripe.js";

type SessionLookup = {
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

type CustomerRow = {
  id: string;
  user_id: string;
  email: string;
  stripe_customer_id: string | null;
};

type SubscriptionRow = {
  id: string;
  customer_id: string;
  plan_code: string;
  app_code: string;
  status: string;
  onboarding_status: string;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
};

type Env = {
  Bindings: {
    APP_NAME: string;
    DB: D1Database;
    MAIN_BASE_URL: string;
    AUTH_BASE_URL: string;
    GATEWAY_BASE_URL: string;
    DEFAULT_APP_CODE: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    STRIPE_STARTER_PRICE_ID: string;
    STRIPE_GROWTH_PRICE_ID: string;
    STRIPE_PRO_PRICE_ID: string;
  };
};

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

const app = new Hono<Env>();

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
          .button { display:inline-block; padding:12px 16px; border-radius:10px; text-decoration:none; background:#4f7cff; color:white; }
          .muted { color:#b9c2e3; }
          .warn { color:#ffd479; }
        </style>
      </head>
      <body>
        <div class="wrap">${body}</div>
      </body>
    </html>
  ';
}

async function getSession(env: Env["Bindings"], token: string | null) {
  if (!token) {
    return null;
  }

  const response = await fetch('${env.AUTH_BASE_URL}/session/${encodeURIComponent(token)}');

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as SessionLookup;
  return payload.ok ? payload.session ?? null : null;
}

async function ensureCustomer(
  db: D1Database,
  userId: string,
  email: string,
  stripeCustomerId?: string | null,
): Promise<CustomerRow> {
  const existing = await db.prepare(
    "SELECT id, user_id, email, stripe_customer_id FROM customers WHERE user_id = ? LIMIT 1",
  ).bind(userId).first<CustomerRow>();

  const now = new Date().toISOString();

  if (existing) {
    if (stripeCustomerId && existing.stripe_customer_id !== stripeCustomerId) {
      await db.prepare(
        "UPDATE customers SET stripe_customer_id = ?, updated_at = ? WHERE id = ?",
      ).bind(stripeCustomerId, now, existing.id).run();

      return {
        ...existing,
        stripe_customer_id: stripeCustomerId,
      };
    }

    return existing;
  }

  const id = crypto.randomUUID();

  await db.prepare(
    "INSERT INTO customers (id, user_id, email, stripe_customer_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(id, userId, email, stripeCustomerId ?? null, now, now).run();

  return {
    id,
    user_id: userId,
    email,
    stripe_customer_id: stripeCustomerId ?? null,
  };
}

async function findCustomerByStripeCustomerId(db: D1Database, stripeCustomerId: string | null | undefined) {
  if (!stripeCustomerId) {
    return null;
  }

  return db.prepare(
    "SELECT id, user_id, email, stripe_customer_id FROM customers WHERE stripe_customer_id = ? LIMIT 1",
  ).bind(stripeCustomerId).first<CustomerRow>();
}

async function getLatestSubscription(db: D1Database, customerId: string) {
  return db.prepare('
    SELECT
      id,
      customer_id,
      plan_code,
      app_code,
      status,
      onboarding_status,
      stripe_customer_id,
      stripe_checkout_session_id,
      stripe_subscription_id,
      current_period_end,
      canceled_at,
      created_at,
      updated_at
    FROM subscriptions
    WHERE customer_id = ?
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 1
  ').bind(customerId).first<SubscriptionRow>();
}

function normalizeSubscriptionStatus(status: string | null | undefined): string {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "unpaid":
      return "unpaid";
    case "incomplete":
      return "incomplete";
    case "incomplete_expired":
      return "incomplete_expired";
    case "canceled":
      return "canceled";
    default:
      return "unknown";
  }
}

async function writePendingCheckout(
  db: D1Database,
  input: {
    customerId: string;
    planCode: string;
    appCode: string;
    stripeCustomerId?: string | null;
    checkoutSessionId: string;
  },
) {
  const now = new Date().toISOString();

  await db.prepare('
    INSERT INTO subscriptions (
      id,
      customer_id,
      plan_code,
      app_code,
      status,
      onboarding_status,
      stripe_customer_id,
      stripe_checkout_session_id,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(stripe_checkout_session_id) DO UPDATE SET
      customer_id = excluded.customer_id,
      plan_code = excluded.plan_code,
      app_code = excluded.app_code,
      status = excluded.status,
      stripe_customer_id = excluded.stripe_customer_id,
      updated_at = excluded.updated_at
  ').bind(
    crypto.randomUUID(),
    input.customerId,
    input.planCode,
    input.appCode,
    "checkout_pending",
    "pending",
    input.stripeCustomerId ?? null,
    input.checkoutSessionId,
    now,
    now,
  ).run();
}

async function upsertSubscriptionFromCheckout(db: D1Database, session: StripeCheckoutSession) {
  const metadata = session.metadata ?? {};
  const customerIdFromMetadata = metadata.customer_id;
  const customer = customerIdFromMetadata
    ? await db.prepare("SELECT id, user_id, email, stripe_customer_id FROM customers WHERE id = ? LIMIT 1")
        .bind(customerIdFromMetadata)
        .first<CustomerRow>()
    : await findCustomerByStripeCustomerId(db, session.customer ?? null);

  if (!customer) {
    return;
  }

  const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
  const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null;
  const now = new Date().toISOString();

  if (stripeCustomerId) {
    await ensureCustomer(db, customer.user_id, customer.email, stripeCustomerId);
  }

  await db.prepare('
    INSERT INTO subscriptions (
      id,
      customer_id,
      plan_code,
      app_code,
      status,
      onboarding_status,
      stripe_customer_id,
      stripe_checkout_session_id,
      stripe_subscription_id,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(stripe_checkout_session_id) DO UPDATE SET
      customer_id = excluded.customer_id,
      plan_code = excluded.plan_code,
      app_code = excluded.app_code,
      status = excluded.status,
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      updated_at = excluded.updated_at
  ').bind(
    crypto.randomUUID(),
    customer.id,
    metadata.plan_code ?? "starter",
    metadata.app_code ?? "bizforma",
    stripeSubscriptionId ? "checkout_completed" : "checkout_pending",
    "pending",
    stripeCustomerId,
    session.id,
    stripeSubscriptionId,
    now,
    now,
  ).run();
}

async function upsertSubscriptionFromStripe(db: D1Database, subscription: StripeSubscription) {
  const metadata = subscription.metadata ?? {};
  const customerId = metadata.customer_id
    ?? (await findCustomerByStripeCustomerId(db, subscription.customer ?? null))?.id;

  if (!customerId) {
    return;
  }

  const planCode = metadata.plan_code ?? "starter";
  const appCode = metadata.app_code ?? "bizforma";
  const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : null;
  const status = normalizeSubscriptionStatus(subscription.status);
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const canceledAt = subscription.canceled_at
    ? new Date(subscription.canceled_at * 1000).toISOString()
    : null;
  const onboardingStatus = ACTIVE_STATUSES.has(status) ? "ready" : "pending";
  const now = new Date().toISOString();

  await db.prepare('
    INSERT INTO subscriptions (
      id,
      customer_id,
      plan_code,
      app_code,
      status,
      onboarding_status,
      stripe_customer_id,
      stripe_subscription_id,
      current_period_end,
      canceled_at,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(stripe_subscription_id) DO UPDATE SET
      customer_id = excluded.customer_id,
      plan_code = excluded.plan_code,
      app_code = excluded.app_code,
      status = excluded.status,
      onboarding_status = excluded.onboarding_status,
      stripe_customer_id = excluded.stripe_customer_id,
      current_period_end = excluded.current_period_end,
      canceled_at = excluded.canceled_at,
      updated_at = excluded.updated_at
  ').bind(
    crypto.randomUUID(),
    customerId,
    planCode,
    appCode,
    status,
    onboardingStatus,
    stripeCustomerId,
    subscription.id,
    currentPeriodEnd,
    canceledAt,
    now,
    now,
  ).run();
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
  const defaultAppCode = c.env.DEFAULT_APP_CODE || "bizforma";

  return c.html(renderPage("Pricing", '
    <h1>Pricing</h1>
    <div class="cards">
      <div class="card">
        <h2>Starter</h2>
        <p>$29/month</p>
        <p class="muted">For solo operators and first workflows.</p>
        <a class="button" href="/start?plan=starter&app=${encodeURIComponent(defaultAppCode)}">Choose Starter</a>
      </div>
      <div class="card">
        <h2>Growth</h2>
        <p>$99/month</p>
        <p class="muted">For teams needing reporting and process automation.</p>
        <a class="button" href="/start?plan=growth&app=${encodeURIComponent(defaultAppCode)}">Choose Growth</a>
      </div>
      <div class="card">
        <h2>Pro</h2>
        <p>$299/month</p>
        <p class="muted">For advanced operations and multi-entity support.</p>
        <a class="button" href="/start?plan=pro&app=${encodeURIComponent(defaultAppCode)}">Choose Pro</a>
      </div>
    </div>
  '));
});

app.get("/start", (c) => {
  const plan = c.req.query("plan") ?? "starter";
  const appCode = c.req.query("app") ?? c.env.DEFAULT_APP_CODE ?? "bizforma";
  const callbackPath = '/auth/callback?app=${encodeURIComponent(appCode)}';

  return c.redirect(
    getRegisterRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL, callbackPath, plan),
    302,
  );
});

app.get("/auth/callback", async (c) => {
  const token = c.req.query("session_token");
  const plan = c.req.query("plan") ?? "starter";
  const appCode = c.req.query("app") ?? c.env.DEFAULT_APP_CODE ?? "bizforma";

  if (!token) {
    return c.redirect("/pricing", 302);
  }

  const response = c.redirect(
    '/checkout/start?plan=${encodeURIComponent(plan)}&app=${encodeURIComponent(appCode)}',
    302,
  );
  response.headers.append(
    "Set-Cookie",
    'ih_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800',
  );

  return response;
});

app.get("/checkout/start", async (c) => {
  const plan = c.req.query("plan") ?? "starter";
  const appCode = c.req.query("app") ?? c.env.DEFAULT_APP_CODE ?? "bizforma";
  const token = extractSessionToken(c.req.raw);
  const session = await getSession(c.env, token);

  if (!session || !session.user.email) {
    return c.redirect(getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL), 302);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);
  const successUrl =
    '${c.env.MAIN_BASE_URL}/checkout/success?plan=${encodeURIComponent(plan)}&app=${encodeURIComponent(appCode)}&session_id={CHECKOUT_SESSION_ID}';
  const cancelUrl =
    '${c.env.MAIN_BASE_URL}/checkout/cancel?plan=${encodeURIComponent(plan)}&app=${encodeURIComponent(appCode)}';

  const stripeSession = await createStripeCheckoutSession(c.env, {
    planCode: plan,
    appCode,
    customerId: customer.id,
    userId: session.user.subject,
    email: session.user.email,
    stripeCustomerId: customer.stripe_customer_id,
    successUrl,
    cancelUrl,
  });

  const stripeCustomerId = typeof stripeSession.customer === "string" ? stripeSession.customer : null;

  await ensureCustomer(c.env.DB, session.user.subject, session.user.email, stripeCustomerId);
  await writePendingCheckout(c.env.DB, {
    customerId: customer.id,
    planCode: plan,
    appCode,
    stripeCustomerId,
    checkoutSessionId: stripeSession.id,
  });

  if (!stripeSession.url) {
    return c.text("Stripe checkout session missing redirect URL.", 502);
  }

  return c.redirect(stripeSession.url, 303);
});

app.get("/checkout/success", async (c) => {
  const sessionId = c.req.query("session_id");
  const appCode = c.req.query("app") ?? c.env.DEFAULT_APP_CODE ?? "bizforma";
  const token = extractSessionToken(c.req.raw);
  const session = await getSession(c.env, token);

  if (!session || !session.user.email) {
    return c.redirect("/pricing", 302);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);
  const latest = sessionId
    ? await c.env.DB.prepare('
        SELECT
          id,
          customer_id,
          plan_code,
          app_code,
          status,
          onboarding_status,
          stripe_customer_id,
          stripe_checkout_session_id,
          stripe_subscription_id,
          current_period_end,
          canceled_at,
          created_at,
          updated_at
        FROM subscriptions
        WHERE stripe_checkout_session_id = ?
        LIMIT 1
      ').bind(sessionId).first<SubscriptionRow>()
    : await getLatestSubscription(c.env.DB, customer.id);

  if (latest && ACTIVE_STATUSES.has(latest.status)) {
    return c.redirect('/onboarding?app=${encodeURIComponent(latest.app_code)}', 302);
  }

  return c.html(renderPage("Checkout received", '
    <h1>Payment received</h1>
    <p class="muted">We are confirming your subscription with Stripe.</p>
    <p class="warn">If this page does not move you forward within a few seconds, open onboarding manually.</p>
    <p><a class="button" href="/onboarding?app=${encodeURIComponent(appCode)}">Continue</a></p>
  '));
});

app.get("/checkout/cancel", (c) => {
  const plan = c.req.query("plan") ?? "starter";

  return c.html(renderPage("Checkout canceled", '
    <h1>Checkout canceled</h1>
    <p class="muted">Your ${plan} checkout was canceled.</p>
    <p><a class="button" href="/pricing">Return to pricing</a></p>
  '));
});

app.get("/onboarding", async (c) => {
  const requestedApp = c.req.query("app");
  const token = extractSessionToken(c.req.raw);
  const session = await getSession(c.env, token);

  if (!session || !session.user.email) {
    return c.redirect(getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL), 302);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);
  const subscription = await getLatestSubscription(c.env.DB, customer.id);

  if (!subscription || !ACTIVE_STATUSES.has(subscription.status)) {
    return c.redirect("/pricing", 302);
  }

  const appCode = requestedApp ?? subscription.app_code;

  await c.env.DB.prepare(
    "UPDATE subscriptions SET onboarding_status = ?, updated_at = ? WHERE id = ?",
  ).bind("complete", new Date().toISOString(), subscription.id).run();

  if (appCode === "bizforma") {
    return c.redirect('${c.env.GATEWAY_BASE_URL}/handoff?app=bizforma', 302);
  }

  return c.redirect("/dashboard?welcome=1", 302);
});

app.post("/api/webhooks/stripe", async (c) => {
  const payload = await c.req.text();
  const signature = c.req.header("stripe-signature") ?? null;

  try {
    await verifyStripeWebhookSignature(payload, signature, c.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_signature";
    return c.text(message, 400);
  }

  const event = JSON.parse(payload) as StripeEvent;

  switch (event.type) {
    case "checkout.session.completed":
      await upsertSubscriptionFromCheckout(c.env.DB, event.data.object as StripeCheckoutSession);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await upsertSubscriptionFromStripe(c.env.DB, event.data.object as StripeSubscription);
      break;
    default:
      break;
  }

  return c.json({ received: true });
});

app.get("/dashboard", async (c) => {
  const token = extractSessionToken(c.req.raw);
  const session = await getSession(c.env, token);

  if (!session || !session.user.email) {
    return c.redirect(getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL), 302);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.ema
