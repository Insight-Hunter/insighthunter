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
