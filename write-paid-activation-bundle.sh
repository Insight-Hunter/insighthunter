#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-/Users/jamesmichaelhunterturner/insighthunter}"

mkdir -p "$REPO/packages/auth-shared/src"
mkdir -p "$REPO/apps/auth/src"
mkdir -p "$REPO/apps/gateway/src"
mkdir -p "$REPO/apps/insighthunter-main/src"

cat > "$REPO/packages/auth-shared/package.json" <<'EOF'
{
  "name": "@insighthunter/auth-shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
EOF

cat > "$REPO/packages/auth-shared/tsconfig.json" <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
EOF

cat > "$REPO/packages/auth-shared/src/types.ts" <<'EOF'
export interface AuthenticatedUser {
  readonly subject: string;
  readonly email?: string;
  readonly orgId?: string;
}

export interface SessionRecord {
  readonly id: string;
  readonly token: string;
  readonly userId: string;
  readonly email: string;
  readonly expiresAt: string;
}

export interface CustomerRecord {
  readonly id: string;
  readonly userId: string;
  readonly email: string;
  readonly stripeCustomerId?: string;
  readonly createdAt: string;
}

export interface SubscriptionRecord {
  readonly id: string;
  readonly customerId: string;
  readonly planCode: string;
  readonly status: string;
  readonly stripeSubscriptionId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
EOF

cat > "$REPO/packages/auth-shared/src/request-auth.ts" <<'EOF'
export function extractAuthToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export function extractCookieValue(request: Request, cookieName: string): string | null {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [name, ...rest] = cookie.trim().split("=");

    if (name === cookieName) {
      return rest.join("=");
    }
  }

  return null;
}

export function extractSessionToken(request: Request): string | null {
  return extractCookieValue(request, "ih_session");
}

export function isProbablyBrowserRequest(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html");
}
EOF

cat > "$REPO/packages/auth-shared/src/session.ts" <<'EOF'
export function createSessionCookie(token: string, maxAgeSeconds: number): string {
  return [
    `ih_session=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`
  ].join("; ");
}

export function clearSessionCookie(): string {
  return [
    "ih_session=",
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0"
  ].join("; ");
}
EOF

cat > "$REPO/packages/auth-shared/src/redirects.ts" <<'EOF'
export function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

export function getLoginRedirectUrl(authBaseUrl: string, appBaseUrl: string, callbackPath = "/auth/callback"): string {
  const redirectUri = new URL(callbackPath, ensureTrailingSlash(appBaseUrl)).toString();
  const url = new URL("login", ensureTrailingSlash(authBaseUrl));
  url.searchParams.set("redirect_uri", redirectUri);
  return url.toString();
}

export function getRegisterRedirectUrl(
  authBaseUrl: string,
  appBaseUrl: string,
  callbackPath = "/auth/callback",
  plan?: string,
): string {
  const redirectUri = new URL(callbackPath, ensureTrailingSlash(appBaseUrl)).toString();
  const url = new URL("register", ensureTrailingSlash(authBaseUrl));
  url.searchParams.set("redirect_uri", redirectUri);

  if (plan) {
    url.searchParams.set("plan", plan);
  }

  return url.toString();
}
EOF

cat > "$REPO/packages/auth-shared/src/index.ts" <<'EOF'
export { extractAuthToken, extractCookieValue, extractSessionToken, isProbablyBrowserRequest } from "./request-auth.js";
export { createSessionCookie, clearSessionCookie } from "./session.js";
export { ensureTrailingSlash, getLoginRedirectUrl, getRegisterRedirectUrl } from "./redirects.js";
export type { AuthenticatedUser, SessionRecord, CustomerRecord, SubscriptionRecord } from "./types.js";
EOF

cat > "$REPO/apps/auth/package.json" <<'EOF'
{
  "name": "@insighthunter/auth",
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

cat > "$REPO/apps/auth/tsconfig.json" <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*.ts"]
}
EOF

cat > "$REPO/apps/auth/schema.sql" <<'EOF'
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
EOF

cat > "$REPO/apps/auth/src/index.ts" <<'EOF'
import { Hono } from "hono";
import { clearSessionCookie, createSessionCookie } from "@insighthunter/auth-shared";

type Env = {
  Bindings: {
    APP_NAME: string;
    DB: D1Database;
    SESSION_TTL_SECONDS: string;
  };
};

const app = new Hono<Env>();

app.get("/health", (c) => c.json({ ok: true, service: c.env.APP_NAME }));

app.get("/login", (c) => {
  const redirectUri = c.req.query("redirect_uri") ?? "https://insighthunter.app/auth/callback";
  const plan = c.req.query("plan") ?? "";

  return c.html(`
    <!doctype html>
    <html>
      <body style="font-family:sans-serif;padding:40px">
        <h1>Log in</h1>
        <form method="post" action="/callback">
          <input type="hidden" name="redirect_uri" value="${redirectUri}" />
          <input type="hidden" name="plan" value="${plan}" />
          <label>Email <input type="email" name="email" required /></label>
          <button type="submit">Continue</button>
        </form>
      </body>
    </html>
  `);
});

app.get("/register", (c) => {
  const redirectUri = c.req.query("redirect_uri") ?? "https://insighthunter.app/auth/callback";
  const plan = c.req.query("plan") ?? "";

  return c.html(`
    <!doctype html>
    <html>
      <body style="font-family:sans-serif;padding:40px">
        <h1>Create account</h1>
        <form method="post" action="/callback">
          <input type="hidden" name="redirect_uri" value="${redirectUri}" />
          <input type="hidden" name="plan" value="${plan}" />
          <label>Email <input type="email" name="email" required /></label>
          <button type="submit">Create account</button>
        </form>
      </body>
    </html>
  `);
});

app.post("/callback", async (c) => {
  const form = await c.req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const redirectUri = String(form.get("redirect_uri") ?? "https://insighthunter.app/auth/callback");
  const plan = String(form.get("plan") ?? "").trim();

  if (!email) {
    return c.text("Missing email", 400);
  }

  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const token = crypto.randomUUID();
  const ttlSeconds = Number(c.env.SESSION_TTL_SECONDS || "604800");
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const existingUser = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first<{ id: string }>();
  const finalUserId = existingUser?.id ?? userId;

  if (!existingUser) {
    await c.env.DB.prepare(
      "INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)"
    ).bind(finalUserId, email, now).run();
  }

  await c.env.DB.prepare(
    "INSERT INTO sessions (id, token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(sessionId, token, finalUserId, expiresAt, now).run();

  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set("session_token", token);

  if (plan) {
    callbackUrl.searchParams.set("plan", plan);
  }

  const response = Response.redirect(callbackUrl.toString(), 302);
  response.headers.set("Set-Cookie", createSessionCookie(token, ttlSeconds));
  return response;
});

app.get("/session/:token", async (c) => {
  const token = c.req.param("token");

  const row = await c.env.DB.prepare(`
    SELECT sessions.token, sessions.expires_at, users.id as user_id, users.email
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ?
    LIMIT 1
  `).bind(token).first<{ token: string; expires_at: string; user_id: string; email: string }>();

  if (!row) {
    return c.json({ ok: false, error: "not_found" }, 404);
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return c.json({ ok: false, error: "expired" }, 401);
  }

  return c.json({
    ok: true,
    session: {
      token: row.token,
      user: {
        subject: row.user_id,
        email: row.email
      },
      expiresAt: row.expires_at
    }
  });
});

app.post("/logout", async (c) => {
  const cookie = c.req.header("cookie") ?? "";
  const tokenMatch = cookie.match(/ih_session=([^;]+)/);
  const token = tokenMatch?.[1];

  if (token) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }

  const response = c.json({ ok: true });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
});

export default app;
EOF

cat > "$REPO/apps/auth/wrangler.toml" <<'EOF'
name = "insighthunter-auth"
main = "src/index.ts"
compatibility_date = "2026-07-05"

[observability]
enabled = true

[[d1_databases]]
binding = "DB"
database_name = "insighthunter_auth"
database_id = "REPLACE_WITH_AUTH_DB_ID"

[vars]
APP_NAME = "insighthunter-auth"
SESSION_TTL_SECONDS = "604800"
EOF

cat > "$REPO/apps/gateway/package.json" <<'EOF'
{
  "name": "@insighthunter/gateway",
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

cat > "$REPO/apps/gateway/tsconfig.json" <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*.ts"]
}
EOF

cat > "$REPO/apps/gateway/src/index.ts" <<'EOF'
import { Hono } from "hono";
import { extractAuthToken, extractSessionToken, getLoginRedirectUrl, isProbablyBrowserRequest } from "@insighthunter/auth-shared";

type SessionResponse = {
  ok: boolean;
  session?: {
    token: string;
    user: {
      subject: string;
      email?: string;
      orgId?: string;
    };
    expiresAt: string;
  };
};

type Env = {
  Bindings: {
    APP_NAME: string;
    AUTH_BASE_URL: string;
    GATEWAY_BASE_URL: string;
  };
  Variables: {
    authUser: {
      subject: string;
      email?: string;
      orgId?: string;
    };
    authToken: string;
  };
};

const app = new Hono<Env>();

async function requireAuth(c: any, next: () => Promise<void>) {
  const token = extractAuthToken(c.req.raw) ?? extractSessionToken(c.req.raw);

  if (!token) {
    if (isProbablyBrowserRequest(c.req.raw)) {
      return c.redirect(getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.GATEWAY_BASE_URL), 302);
    }

    return c.json({ error: "unauthorized" }, 401);
  }

  const response = await fetch(`${c.env.AUTH_BASE_URL}/session/${encodeURIComponent(token)}`);

  if (!response.ok) {
    return c.json({ error: "invalid_session" }, 401);
  }

  const data = (await response.json()) as SessionResponse;

  if (!data.ok || !data.session) {
    return c.json({ error: "invalid_session" }, 401);
  }

  c.set("authUser", data.session.user);
  c.set("authToken", token);

  await next();
}

app.get("/health", (c) => c.json({ ok: true, service: c.env.APP_NAME }));

app.get("/me", requireAuth, (c) => {
  return c.json({
    ok: true,
    user: c.get("authUser")
  });
});

app.get("/handoff", requireAuth, (c) => {
  const appName = c.req.query("app") ?? "main";
  const baseMap: Record<string, string> = {
    main: "https://insighthunter.app/dashboard",
    bizforma: "https://bizforma.insighthunter.app/"
  };

  const redirectTarget = baseMap[appName] ?? baseMap.main;
  const url = new URL(redirectTarget);
  url.searchParams.set("from", "gateway");

  return c.redirect(url.toString(), 302);
});

export default app;
EOF

cat > "$REPO/apps/gateway/wrangler.toml" <<'EOF'
name = "insighthunter-gateway"
main = "src/index.ts"
compatibility_date = "2026-07-05"

[observability]
enabled = true

[vars]
APP_NAME = "insighthunter-gateway"
AUTH_BASE_URL = "https://auth.insighthunter.app"
GATEWAY_BASE_URL = "https://gateway.insighthunter.app"
EOF

cat > "$REPO/apps/insighthunter-main/package.json" <<'EOF'
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

cat > "$REPO/apps/insighthunter-main/tsconfig.json" <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*.ts"]
}
EOF

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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_checkout_session_id ON subscriptions(stripe_checkout_session_id);
EOF

cat > "$REPO/apps/insighthunter-main/src/index.ts" <<'EOF'
import { Hono } from "hono";
import { extractSessionToken, getLoginRedirectUrl, getRegisterRedirectUrl } from "@insighthunter/auth-shared";

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
    CHECKOUT_BASE_URL: string;
    BILLING_PROVIDER_SECRET: string;
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
): Promise<{ id: string; userId: string; email: string }> {
  const existing = await db.prepare(
    "SELECT id, user_id, email FROM customers WHERE user_id = ? LIMIT 1"
  ).bind(userId).first<{ id: string; user_id: string; email: string }>();

  if (existing) {
    return {
      id: existing.id,
      userId: existing.user_id,
      email: existing.email,
    };
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db.prepare(
    "INSERT INTO customers (id, user_id, email, created_at) VALUES (?, ?, ?, ?)"
  ).bind(id, userId, email, createdAt).run();

  return { id, userId, email };
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

  const checkoutUrl = new URL(c.env.CHECKOUT_BASE_URL);
  checkoutUrl.searchParams.set("customer_id", customer.id);
  checkoutUrl.searchParams.set("plan", plan);
  checkoutUrl.searchParams.set("success_url", successUrl.toString());
  checkoutUrl.searchParams.set("cancel_url", cancelUrl.toString());

  return c.redirect(checkoutUrl.toString(), 302);
});

app.get("/checkout/success", async (c) => {
  const plan = c.req.query("plan") ?? "starter";
  const token = extractSessionToken(c.req.raw);
  const session = await getSession(c.env, token);

  if (!session || !session.user.email) {
    return c.redirect("/pricing", 302);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO subscriptions (
      id, customer_id, plan_code, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    customer.id,
    plan,
    "active",
    now,
    now
  ).run();

  return c.html(renderPage("Subscription active", `
    <h1>Subscription active</h1>
    <p class="muted">Your ${plan} subscription is now active.</p>
    <p><a class="button" href="/dashboard">Go to dashboard</a></p>
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
    SELECT plan_code, status, created_at
    FROM subscriptions
    WHERE customer_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(customer.id).first<{ plan_code: string; status: string; created_at: string }>();

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
    </div>
    <p><a class="button" href="${c.env.GATEWAY_BASE_URL}/handoff?app=bizforma">Open BizForma</a></p>
  `));
});

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
CHECKOUT_BASE_URL = "https://checkout.insighthunter.app/session"
BILLING_PROVIDER_SECRET = "REPLACE_WITH_SECRET_REF"
EOF

find "$REPO/apps" -name 'wrangler.jsonc' -delete

echo "Paid activation bundle written to: $REPO"
echo "Wrangler configs created as TOML:"
echo "  - $REPO/apps/auth/wrangler.toml"
echo "  - $REPO/apps/gateway/wrangler.toml"
echo "  - $REPO/apps/insighthunter-main/wrangler.toml"
