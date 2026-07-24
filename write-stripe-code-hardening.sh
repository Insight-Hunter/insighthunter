#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-/Users/jamesmichaelhunterturner/insighthunter}"

mkdir -p "$REPO/apps/insighthunter-main/src/billing"
mkdir -p "$REPO/apps/insighthunter-main/src/routes"

cat > "$REPO/apps/insighthunter-main/schema.sql" <<'EOF'
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
  stripe_subscription_id TEXT,
  stripe_checkout_session_id TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_checkout_session_id ON subscriptions(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
EOF

cat > "$REPO/apps/insighthunter-main/src/billing/stripe.ts" <<'EOF'
export type StripeCheckoutSession = {
  id: string;
  url: string;
};

export type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

type CreateCheckoutSessionInput = {
  secretKey: string;
  priceId: string;
  customerEmail: string;
  customerId: string;
  successUrl: string;
  cancelUrl: string;
  planCode: string;
};

function toFormBody(values: Record<string, string>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    params.set(key, value);
  }

  return params.toString();
}

export async function createStripeCheckoutSession(input: CreateCheckoutSessionInput): Promise<StripeCheckoutSession> {
  const body = toFormBody({
    mode: "subscription",
    "line_items[0][price]": input.priceId,
    "line_items[0][quantity]": "1",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail,
    "metadata[customer_id]": input.customerId,
    "metadata[plan_code]": input.planCode
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stripe checkout session failed: ${response.status} ${text}`);
  }

  const payload = await response.json() as { id: string; url: string };
  return { id: payload.id, url: payload.url };
}

export async function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string,
  webhookSecret: string,
): Promise<boolean> {
  const signatureParts = signatureHeader.split(",");
  const timestampPart = signatureParts.find((part) => part.startsWith("t="));
  const v1Part = signatureParts.find((part) => part.startsWith("v1="));

  if (!timestampPart || !v1Part) {
    return false;
  }

  const timestamp = timestampPart.slice(2);
  const signature = v1Part.slice(3);
  const signedPayload = `${timestamp}.${payload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return result === 0;
}
EOF

cat > "$REPO/apps/insighthunter-main/src/routes/webhooks.ts" <<'EOF'
import type { Hono } from "hono";
import { verifyStripeWebhookSignature, type StripeEvent } from "../billing/stripe.js";

type Env = {
  Bindings: {
    DB: D1Database;
    STRIPE_WEBHOOK_SECRET: string;
  };
};

export function registerWebhookRoutes(app: Hono<Env>) {
  app.post("/webhooks/stripe", async (c) => {
    const signature = c.req.header("stripe-signature");

    if (!signature) {
      return c.json({ ok: false, error: "missing_signature" }, 400);
    }

    const payload = await c.req.text();
    const isValid = await verifyStripeWebhookSignature(
      payload,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET,
    );

    if (!isValid) {
      return c.json({ ok: false, error: "invalid_signature" }, 401);
    }

    const event = JSON.parse(payload) as StripeEvent;
    const object = event.data.object;

    if (event.type === "checkout.session.completed") {
      const checkoutSessionId = String(object.id ?? "");
      const customerId = String(object.metadata?.customer_id ?? "");
      const planCode = String(object.metadata?.plan_code ?? "starter");
      const stripeSubscriptionId = String(object.subscription ?? "");
      const now = new Date().toISOString();

      if (customerId) {
        const existing = await c.env.DB.prepare(
          "SELECT id FROM subscriptions WHERE stripe_checkout_session_id = ? LIMIT 1"
        ).bind(checkoutSessionId).first<{ id: string }>();

        if (!existing) {
          await c.env.DB.prepare(`
            INSERT INTO subscriptions (
              id, customer_id, plan_code, status, stripe_subscription_id,
              stripe_checkout_session_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            customerId,
            planCode,
            "active",
            stripeSubscriptionId || null,
            checkoutSessionId || null,
            now,
            now
          ).run();
        }
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const stripeSubscriptionId = String(object.id ?? "");
      const status = String(object.status ?? "incomplete");
      const cancelAtPeriodEnd = object.cancel_at_period_end ? 1 : 0;
      const currentPeriodEndUnix = Number(object.current_period_end ?? 0);
      const currentPeriodEnd = currentPeriodEndUnix > 0
        ? new Date(currentPeriodEndUnix * 1000).toISOString()
        : null;
      const now = new Date().toISOString();

      await c.env.DB.prepare(`
        UPDATE subscriptions
        SET status = ?, cancel_at_period_end = ?, current_period_end = ?, updated_at = ?
        WHERE stripe_subscription_id = ?
      `).bind(
        status,
        cancelAtPeriodEnd,
        currentPeriodEnd,
        now,
        stripeSubscriptionId
      ).run();
    }

    if (event.type === "customer.subscription.deleted") {
      const stripeSubscriptionId = String(object.id ?? "");
      const now = new Date().toISOString();

      await c.env.DB.prepare(`
        UPDATE subscriptions
        SET status = ?, updated_at = ?
        WHERE stripe_subscription_id = ?
      `).bind(
        "canceled",
        now,
        stripeSubscriptionId
      ).run();
    }

    return c.json({ ok: true });
  });
}
EOF

cat > "$REPO/apps/insighthunter-main/src/routes/onboarding.ts" <<'EOF'
import type { Hono } from "hono";
import { extractSessionToken, getLoginRedirectUrl } from "@insighthunter/auth-shared";

type SessionLookup = {
  ok: boolean;
  session?: {
    user: {
      subject: string;
      email?: string;
    };
  };
};

type Env = {
  Bindings: {
    DB: D1Database;
    AUTH_BASE_URL: string;
    MAIN_BASE_URL: string;
    GATEWAY_BASE_URL: string;
  };
};

async function getSession(env: Env["Bindings"], token: string | null) {
  if (!token) {
    return null;
  }

  const response = await fetch(`${env.AUTH_BASE_URL}/session/${encodeURIComponent(token)}`);

  if (!response.ok) {
    return null;
  }

  const payload = await response.json() as SessionLookup;
  return payload.ok ? payload.session ?? null : null;
}

export function registerOnboardingRoutes(app: Hono<Env>) {
  app.get("/onboarding", async (c) => {
    const token = extractSessionToken(c.req.raw);
    const session = await getSession(c.env, token);

    if (!session || !session.user.email) {
      return c.redirect(getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL), 302);
    }

    const customer = await c.env.DB.prepare(
      "SELECT id FROM customers WHERE user_id = ? LIMIT 1"
    ).bind(session.user.subject).first<{ id: string }>();

    if (!customer) {
      return c.redirect("/pricing", 302);
    }

    const subscription = await c.env.DB.prepare(`
      SELECT plan_code, status
      FROM subscriptions
      WHERE customer_id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `).bind(customer.id).first<{ plan_code: string; status: string }>();

    if (!subscription || subscription.status !== "active") {
      return c.redirect("/pricing", 302);
    }

    if (subscription.plan_code === "pro" || subscription.plan_code === "growth") {
      return c.redirect(`${c.env.GATEWAY_BASE_URL}/handoff?app=bizforma`, 302);
    }

    return c.redirect("/dashboard", 302);
  });
}
EOF

cat > "$REPO/apps/insighthunter-main/src/index.ts" <<'EOF'
import { Hono } from "hono";
import { extractSessionToken, getLoginRedirectUrl, getRegisterRedirectUrl } from "@insighthunter/auth-shared";
import { createStripeCheckoutSession } from "./billing/stripe.js";
import { registerWebhookRoutes } from "./routes/webhooks.js";
import { registerOnboardingRoutes } from "./routes/onboarding.js";

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

type Env = {
  Bindings: {
    APP_NAME: string;
    DB: D1Database;
    MAIN_BASE_URL: string;
    AUTH_BASE_URL: string;
    GATEWAY_BASE_URL: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    STRIPE_PRICE_STARTER: string;
    STRIPE_PRICE_GROWTH: string;
    STRIPE_PRICE_PRO: string;
  };
};

const app = new Hono<Env>();

function renderPage(title: string, body: string): string {
  return `
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
  `;
}

async function getSession(env: Env["Bindings"], token: string | null) {
  if (!token) {
    return null;
  }

  const response = await fetch(`${env.AUTH_BASE_URL}/session/${encodeURIComponent(token)}`);

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

function getPriceId(env: Env["Bindings"], plan: string): string {
  if (plan === "pro") {
    return env.STRIPE_PRICE_PRO;
  }

  if (plan === "growth") {
    return env.STRIPE_PRICE_GROWTH;
  }

  return env.STRIPE_PRICE_STARTER;
}

app.get("/health", (c) => c.json({ ok: true, service: c.env.APP_NAME }));

app.get("/", (c) => {
  const loginUrl = getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL);
  const registerUrl = getRegisterRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL);

  return c.html(renderPage("Insight Hunter", `
    <h1>Insight Hunter</h1>
    <p class="muted">AI-powered finance, compliance, and operations for growing businesses.</p>
    <p><a class="button" href="${registerUrl}">Create account</a> <a class="button" href="${loginUrl}">Log in</a></p>
    <p><a class="button" href="/pricing">See pricing</a></p>
  `));
});

app.get("/pricing", (c) => {
  return c.html(renderPage("Pricing", `
    <h1>Pricing</h1>
    <div class="cards">
      <div class="card">
        <h2>Starter</h2>
        <p>$29/month</p>
        <p class="muted">For solo operators and first workflows.</p>
        <a class="button" href="/start?plan=starter">Choose Starter</a>
      </div>
      <div class="card">
        <h2>Growth</h2>
        <p>$99/month</p>
        <p class="muted">For teams needing reporting and process automation.</p>
        <a class="button" href="/start?plan=growth">Choose Growth</a>
      </div>
      <div class="card">
        <h2>Pro</h2>
        <p>$299/month</p>
        <p class="muted">For advanced operations and multi-entity support.</p>
        <a class="button" href="/start?plan=pro">Choose Pro</a>
      </div>
    </div>
  `));
});

app.get("/start", (c) => {
  const plan = c.req.query("plan") ?? "starter";
  return c.redirect(getRegisterRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL, "/auth/callback", plan), 302);
});

app.get("/auth/callback", async (c) => {
  const token = c.req.query("session_token");
  const plan = c.req.query("plan") ?? "starter";

  if (!token) {
    return c.redirect("/pricing", 302);
  }

  const response = c.redirect(`/checkout/start?plan=${encodeURIComponent(plan)}`, 302);
  response.headers.append("Set-Cookie", `ih_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
  return response;
});

app.get("/checkout/start", async (c) => {
  const plan = c.req.query("plan") ?? "starter";
  const token = extractSessionToken(c.req.raw);
  const session = await getSession(c.env, token);

  if (!session || !session.user.email) {
    return c.redirect(getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL), 302);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);
  const successUrl = new URL("/checkout/success", c.env.MAIN_BASE_URL);
  successUrl.searchParams.set("plan", plan);

  const cancelUrl = new URL("/checkout/cancel", c.env.MAIN_BASE_URL);
  cancelUrl.searchParams.set("plan", plan);

  const stripeSession = await createStripeCheckoutSession({
    secretKey: c.env.STRIPE_SECRET_KEY,
    priceId: getPriceId(c.env, plan),
    customerEmail: session.user.email,
    customerId: customer.id,
    successUrl: successUrl.toString(),
    cancelUrl: cancelUrl.toString(),
    planCode: plan
  });

  return c.redirect(stripeSession.url, 302);
});

app.get("/checkout/success", async (c) => {
  const plan = c.req.query("plan") ?? "starter";

  return c.html(renderPage("Processing payment", `
    <h1>Processing payment</h1>
    <p class="muted">Your ${plan} checkout completed. We are confirming billing now.</p>
    <p><a class="button" href="/onboarding">Continue</a></p>
  `));
});

app.get("/checkout/cancel", (c) => {
  const plan = c.req.query("plan") ?? "starter";

  return c.html(renderPage("Checkout canceled", `
    <h1>Checkout canceled</h1>
    <p class="muted">Your ${plan} checkout was canceled.</p>
    <p><a class="button" href="/pricing">Return to pricing</a></p>
  `));
});

app.get("/dashboard", async (c) => {
  const token = extractSessionToken(c.req.raw);
  const session = await getSession(c.env, token);

  if (!session || !session.user.email) {
    return c.redirect(getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL), 302);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);
  const subscription = await c.env.DB.prepare(`
    SELECT plan_code, status, current_period_end, cancel_at_period_end, updated_at
    FROM subscriptions
    WHERE customer_id = ?
    ORDER BY updated_at DESC
    LIMIT 1
  `).bind(customer.id).first<{
    plan_code: string;
    status: string;
    current_period_end?: string | null;
    cancel_at_period_end?: number;
    updated_at: string;
  }>();

  if (!subscription || subscription.status !== "active") {
    return c.redirect("/pricing", 302);
  }

  return c.html(renderPage("Dashboard", `
    <h1>Welcome back</h1>
    <p class="muted">${session.user.email}</p>
    <div class="card">
      <h2>Current plan</h2>
      <p>${subscription.plan_code}</p>
      <p class="muted">Status: ${subscription.status}</p>
      <p class="muted">Renews through: ${subscription.current_period_end ?? "pending sync"}</p>
      <p class="muted">Cancel at period end: ${subscription.cancel_at_period_end ? "yes" : "no"}</p>
    </div>
    <p><a class="button" href="/onboarding">Continue to app</a></p>
  `));
});

registerWebhookRoutes(app);
registerOnboardingRoutes(app);

export default app;
EOF

cat > "$REPO/apps/insighthunter-main/wrangler.toml" <<'EOF'
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
STRIPE_PRICE_STARTER = "price_starter_replace"
STRIPE_PRICE_GROWTH = "price_growth_replace"
STRIPE_PRICE_PRO = "price_pro_replace"

[placement]
mode = "smart"

[observability.logs]
enabled = true

# Set these with `wrangler secret put`
# STRIPE_SECRET_KEY
# STRIPE_WEBHOOK_SECRET
EOF

echo "Stripe webhook bundle written to: $REPO"
echo "Updated files:"
echo "  - $REPO/apps/insighthunter-main/schema.sql"
echo "  - $REPO/apps/insighthunter-main/src/billing/stripe.ts"
echo "  - $REPO/apps/insighthunter-main/src/routes/webhooks.ts"
echo "  - $REPO/apps/insighthunter-main/src/routes/onboarding.ts"
echo "  - $REPO/apps/insighthunter-main/src/index.ts"
echo "  - $REPO/apps/insighthunter-main/wrangler.toml"
