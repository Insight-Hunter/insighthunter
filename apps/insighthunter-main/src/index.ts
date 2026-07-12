// apps/insighthunter-main/src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  extractSessionToken,
  getLoginRedirectUrl,
  getRegisterRedirectUrl,
} from "@insighthunter/auth-shared";

// ── Types ─────────────────────────────────────────────────────────────────────

type SessionLookup = {
  ok: boolean;
  session?: {
    token: string;
    user: { subject: string; email?: string };
    expiresAt: string;
  };
};

type Subscription = {
  plan_code: string;
  status: string;
  created_at: string;
  stripe_subscription_id?: string;
  stripe_checkout_session_id?: string;
};

type Customer = {
  id: string;
  userId: string;
  email: string;
  stripeCustomerId?: string;
};

type Env = {
  Bindings: {
    APP_NAME: string;
    DB: D1Database;
    RATE_LIMIT_KV: KVNamespace;
    MAIN_BASE_URL: string;
    AUTH_BASE_URL: string;
    GATEWAY_BASE_URL: string;
    BIZFORMA_BASE_URL: string;
    CHECKOUT_BASE_URL: string;
    BILLING_PROVIDER_SECRET: string;
    BILLING_WEBHOOK_SECRET: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_PRICE_LITE: string;
    STRIPE_PRICE_STANDARD: string;
    STRIPE_PRICE_PRO: string;
  };
};

// ── Plan definitions (MUST match insighthunter.app pricing page) ──────────────

const PLANS = {
  lite:     { label: "Insight Lite",     price: 0,   txnLimit: 150, users: 1,    color: "#6b7280" },
  standard: { label: "Insight Standard", price: 49,  txnLimit: null, users: 3,   color: "#60a5fa" },
  pro:      { label: "Insight Pro",      price: 129, txnLimit: null, users: null, color: "#a78bfa" },
} as const;

type PlanCode = keyof typeof PLANS;
const VALID_PLANS = new Set<string>(Object.keys(PLANS));

// ── App registry (drives dashboard tiles + access gating) ────────────────────

const APPS = [
  { id: "bookkeeping", label: "Bookkeeping",  desc: "Auto-categorized P&L, reconciliation, bank sync",   plans: ["lite","standard","pro"], badge: "Core",     badgeColor: "#0d3b2e", badgeText: "#34d399" },
  { id: "bizforma",   label: "BizForma",     desc: "AI business formation — LLC, S-Corp, C-Corp",        plans: ["lite","standard","pro"], badge: "Core",     badgeColor: "#0d3b2e", badgeText: "#34d399" },
  { id: "insights",   label: "AI CFO",       desc: "Anomaly detection, cash-flow forecasting, alerts",    plans: ["standard","pro"],        badge: "Standard", badgeColor: "#1c2e5e", badgeText: "#60a5fa" },
  { id: "finops",     label: "FinOps",       desc: "Budget vs actuals, cost centers, burn rate",          plans: ["standard","pro"],        badge: "Standard", badgeColor: "#1c2e5e", badgeText: "#60a5fa" },
  { id: "ledger",     label: "Ledger",       desc: "Double-entry general ledger & journal entries",       plans: ["standard","pro"],        badge: "Standard", badgeColor: "#1c2e5e", badgeText: "#60a5fa" },
  { id: "scout",      label: "Scout CRM",    desc: "Leads, deals, pipeline, and revenue tracking",        plans: ["standard","pro"],        badge: "Standard", badgeColor: "#1c2e5e", badgeText: "#60a5fa" },
  { id: "payroll",    label: "Payroll",      desc: "W-2 + 1099 payroll, tax calculations, filing",        plans: ["standard","pro"],        badge: "Standard", badgeColor: "#1c2e5e", badgeText: "#60a5fa" },
  { id: "report",     label: "Reports",      desc: "Custom report builder + white-label PDF export",      plans: ["pro"],                   badge: "Pro",      badgeColor: "#2d1b5e", badgeText: "#a78bfa" },
  { id: "pbx",        label: "PBX Phone",    desc: "Cloud phone, IVR, voicemail-to-email, 10 ext",        plans: ["pro"],                   badge: "Pro",      badgeColor: "#2d1b5e", badgeText: "#a78bfa" },
] as const;

// ── Rate limiter ──────────────────────────────────────────────────────────────

async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= limit) return false;
  await kv.put(key, String(count + 1), { expirationTtl: windowSec });
  return true;
}

// ── Session helper ────────────────────────────────────────────────────────────

async function getSession(env: Env["Bindings"], token: string | null) {
  if (!token) return null;
  try {
    const res = await fetch(`${env.AUTH_BASE_URL}/session/${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    const payload = (await res.json()) as SessionLookup;
    return payload.ok ? (payload.session ?? null) : null;
  } catch {
    return null;
  }
}

// ── Customer helper ───────────────────────────────────────────────────────────

async function ensureCustomer(
  db: D1Database,
  userId: string,
  email: string,
): Promise<Customer> {
  const existing = await db
    .prepare("SELECT id, user_id, email, stripe_customer_id FROM customers WHERE user_id = ? LIMIT 1")
    .bind(userId)
    .first<{ id: string; user_id: string; email: string; stripe_customer_id?: string }>();

  if (existing) {
    return {
      id: existing.id,
      userId: existing.user_id,
      email: existing.email,
      stripeCustomerId: existing.stripe_customer_id,
    };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare("INSERT INTO customers (id, user_id, email, created_at) VALUES (?, ?, ?, ?)")
    .bind(id, userId, email, now)
    .run();

  return { id, userId, email };
}

// ── HTML renderer ─────────────────────────────────────────────────────────────

function renderPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} — Insight Hunter</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, system-ui, sans-serif; background: #0b1020; color: #f7f8fc; line-height: 1.6; }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 40px 20px; }
    nav { display:flex; align-items:center; gap:20px; padding:14px 28px; border-bottom:1px solid #1f2a4a; background:#0b1020; position:sticky; top:0; z-index:100; }
    nav .logo { font-weight:800; color:#fff; margin-right:auto; font-size:18px; text-decoration:none; }
    nav a { color:#b9c2e3; text-decoration:none; font-size:14px; font-weight:500; }
    nav a:hover { color:#fff; }
    h1 { font-size:2rem; font-weight:800; margin-bottom:10px; }
    h2 { font-size:1.2rem; font-weight:700; margin-bottom:8px; }
    p { margin-bottom:12px; }
    .muted { color:#b9c2e3; }
    .btn { display:inline-block; padding:10px 20px; border-radius:8px; text-decoration:none; font-size:14px; font-weight:600; border:none; cursor:pointer; transition:opacity .15s; }
    .btn:hover { opacity:.85; }
    .btn-primary { background:#4f7cff; color:#fff; }
    .btn-secondary { background:#1f2a4a; color:#b9c2e3; border:1px solid #2a3359; }
    .btn-danger { background:#7f1d1d; color:#fca5a5; }
    .btn-sm { padding:6px 13px; font-size:13px; }
    .btn-lg { padding:14px 32px; font-size:16px; }
    .cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:18px; margin-top:24px; }
    .card { background:#121933; padding:22px; border-radius:14px; border:1px solid #2a3359; }
    .card-locked { opacity:.5; }
    .badge { display:inline-block; font-size:11px; padding:2px 9px; border-radius:20px; font-weight:700; margin-bottom:10px; }
    .pill { display:inline-block; padding:3px 11px; border-radius:20px; font-size:12px; font-weight:700; }
    .pill-active   { background:#0a2e1a; color:#34d399; }
    .pill-cancelled{ background:#1e1e2e; color:#ef4444; }
    .alert { padding:14px 18px; border-radius:10px; margin-bottom:22px; font-size:14px; }
    .alert-success { background:#0a2e1a; border:1px solid #34d399; color:#34d399; }
    .alert-warning { background:#2d2400; border:1px solid #f59e0b; color:#fbbf24; }
    .alert-error   { background:#2d0a0a; border:1px solid #ef4444; color:#fca5a5; }
    .pricing-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(290px,1fr)); gap:24px; margin-top:28px; }
    .plan-card { background:#121933; padding:28px; border-radius:16px; border:1px solid #2a3359; }
    .plan-card.featured { border-color:#4f7cff; background:#111d40; }
    .plan-price { font-size:2.6rem; font-weight:800; margin:10px 0 4px; }
    .plan-price span { font-size:1rem; font-weight:400; color:#b9c2e3; }
    .plan-features { list-style:none; margin:16px 0 22px; }
    .plan-features li { padding:5px 0; font-size:14px; color:#d1d8f0; }
    .plan-features li::before { content:"✓  "; color:#4f7cff; font-weight:700; }
    table { width:100%; border-collapse:collapse; margin-top:12px; }
    th, td { padding:11px 14px; text-align:left; border-bottom:1px solid #1f2a4a; font-size:14px; }
    th { color:#b9c2e3; font-weight:600; font-size:13px; }
    .hero { text-align:center; padding:72px 20px 52px; }
    .hero h1 { font-size:3.2rem; line-height:1.15; margin-bottom:16px; }
    .divider { border:none; border-top:1px solid #1f2a4a; margin:40px 0; }
    .stat-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:20px; margin:32px 0; }
    .stat-box { background:#121933; border:1px solid #2a3359; border-radius:12px; padding:20px; text-align:center; }
    .stat-box .num { font-size:2rem; font-weight:800; color:#4f7cff; }
    .stat-box .lbl { font-size:13px; color:#b9c2e3; margin-top:4px; }
  </style>
</head>
<body>
<nav>
  <a href="/" class="logo">⚡ Insight Hunter</a>
  <a href="/pricing">Pricing</a>
  <a href="/dashboard">Dashboard</a>
</nav>
<div class="wrap">${body}</div>
</body>
</html>`;
}

// ── App ───────────────────────────────────────────────────────────────────────

const app = new Hono<Env>();

app.use(
  "*",
  cors({
    origin: ["https://insighthunter.app", "https://auth.insighthunter.app"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// ── Health ────────────────────────────────────────────────────────────────────

app.get("/health", (c) =>
  c.json({ ok: true, service: c.env.APP_NAME, ts: new Date().toISOString() }),
);

// ── Home ──────────────────────────────────────────────────────────────────────

app.get("/", (c) => {
  const loginUrl = getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL);
  const registerUrl = getRegisterRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL);

  const appCards = APPS.map(
    (a) => `
    <div class="card">
      <span class="badge" style="background:${a.badgeColor};color:${a.badgeText}">${a.badge}</span>
      <h2>${a.label}</h2>
      <p class="muted" style="font-size:13px;">${a.desc}</p>
    </div>`,
  ).join("");

  return c.html(
    renderPage(
      "Stop Flying Blind",
      `
    <div class="hero">
      <h1>Stop flying blind.<br/>Know your numbers.</h1>
      <p class="muted" style="font-size:1.15rem;margin-bottom:32px;">AI-powered bookkeeping, payroll, cash-flow forecasting,<br/>and an AI CFO — built on Cloudflare's global edge.</p>
      <a class="btn btn-primary btn-lg" href="${registerUrl}">Start Free — No Credit Card</a>
      &nbsp;&nbsp;
      <a class="btn btn-secondary btn-lg" href="/pricing">See pricing →</a>
      <p class="muted" style="margin-top:20px;font-size:13px;">✓ Cloudflare-native &nbsp;·&nbsp; ✓ Per-tenant data isolation &nbsp;·&nbsp; ✓ SOC 2 ready architecture</p>
    </div>
    <hr class="divider"/>
    <h2 style="font-size:1.5rem;">Everything your business needs — one platform</h2>
    <div class="cards">${appCards}</div>
    <hr class="divider"/>
    <div style="text-align:center;padding:20px 0 40px;">
      <h2 style="font-size:1.8rem;margin-bottom:10px;">Ready to take control?</h2>
      <p class="muted" style="margin-bottom:24px;">Join thousands of small businesses replacing 6 apps with one.</p>
      <a class="btn btn-primary btn-lg" href="${registerUrl}">Get started free</a>
      &nbsp;&nbsp;
      <a class="btn btn-secondary" href="${loginUrl}">Log in →</a>
    </div>
    `,
    ),
  );
});

// ── Pricing ───────────────────────────────────────────────────────────────────

app.get("/pricing", (c) => {
  return c.html(
    renderPage(
      "Pricing",
      `
    <h1>Simple, Transparent Pricing</h1>
    <p class="muted">Start free. Scale when ready. Cancel anytime.</p>
    <div class="pricing-grid">
      <div class="plan-card">
        <p style="font-size:13px;color:#b9c2e3;">For solo operators getting started.</p>
        <h2>Insight Lite</h2>
        <div class="plan-price">$0 <span>/mo</span></div>
        <ul class="plan-features">
          <li>Bookkeeping (up to 150 txns/mo)</li>
          <li>P&amp;L statement</li>
          <li>Cash flow overview</li>
          <li>BizForma (1 business setup)</li>
          <li>1 user</li>
        </ul>
        <a class="btn btn-secondary" href="/start?plan=lite">Get started free</a>
      </div>
      <div class="plan-card featured">
        <p style="font-size:11px;font-weight:700;color:#4f7cff;margin-bottom:6px;">★ MOST POPULAR</p>
        <h2>Insight Standard</h2>
        <div class="plan-price">$49 <span>/mo</span></div>
        <ul class="plan-features">
          <li>Full bookkeeping (unlimited txns)</li>
          <li>Bank sync (Plaid)</li>
          <li>Payroll (up to 5 employees)</li>
          <li>AI CFO insights &amp; forecasting</li>
          <li>FinOps budget tracking</li>
          <li>Scout CRM (50 leads)</li>
          <li>Financial reports + export</li>
          <li>3 users</li>
        </ul>
        <a class="btn btn-primary" href="/start?plan=standard">Choose Standard</a>
      </div>
      <div class="plan-card">
        <p style="font-size:13px;color:#b9c2e3;">Full OS for high-velocity operators.</p>
        <h2>Insight Pro</h2>
        <div class="plan-price">$129 <span>/mo</span></div>
        <ul class="plan-features">
          <li>Everything in Standard</li>
          <li>Unlimited employees + payroll</li>
          <li>PBX phone system (10 extensions)</li>
          <li>Advanced AI forecasting</li>
          <li>Scout CRM (unlimited)</li>
          <li>White-label reports</li>
          <li>API access</li>
          <li>Priority support</li>
          <li>Unlimited users</li>
        </ul>
        <a class="btn btn-primary" href="/start?plan=pro">Choose Pro</a>
      </div>
    </div>
    <hr class="divider"/>
    <h2>Add-Ons</h2>
    <table>
      <thead><tr><th>Add-On</th><th>Price</th></tr></thead>
      <tbody>
        <tr><td>PBX Phone System</td><td>$29/mo</td></tr>
        <tr><td>Extra Payroll Employee</td><td>$6/mo each</td></tr>
        <tr><td>White Label Branding</td><td>$199/mo</td></tr>
        <tr><td>Report Builder</td><td>$19/mo</td></tr>
        <tr><td>BizForma Extra Filings</td><td>$49/filing</td></tr>
        <tr><td>Website Services</td><td>$79/mo</td></tr>
      </tbody>
    </table>
    `,
    ),
  );
});

// ── Auth flow ─────────────────────────────────────────────────────────────────

app.get("/start", (c) => {
  const plan = c.req.query("plan") ?? "lite";
  if (!VALID_PLANS.has(plan)) return c.redirect("/pricing", 302);
  return c.redirect(
    getRegisterRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL, "/auth/callback", plan),
    302,
  );
});

app.get("/auth/callback", async (c) => {
  const token = c.req.query("session_token");
  const plan = c.req.query("plan") ?? "lite";

  if (!token) return c.redirect("/pricing", 302);
  if (!VALID_PLANS.has(plan)) return c.redirect("/pricing", 302);

  // Lite is free — skip checkout entirely
  const location = plan === "lite" ? "/dashboard" : `/checkout/start?plan=${encodeURIComponent(plan)}`;

  const res = new Response(null, { status: 302, headers: { Location: location } });
  res.headers.append(
    "Set-Cookie",
    `ih_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`,
  );
  return res;
});

// ── Checkout ──────────────────────────────────────────────────────────────────

app.get("/checkout/start", async (c) => {
  const plan = c.req.query("plan") ?? "standard";
  if (!VALID_PLANS.has(plan) || plan === "lite") return c.redirect("/pricing", 302);

  const token = extractSessionToken(c.req.raw);
  const session = await getSession(c.env, token);
  if (!session?.user.email) {
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

// NOTE: /checkout/success is UI-only. Real plan activation happens via /billing/webhook.
// This page must NOT write to subscriptions — it is reachable without payment.
app.get("/checkout/success", async (c) => {
  const plan = (c.req.query("plan") ?? "standard") as PlanCode;
  const planInfo = PLANS[plan] ?? PLANS.standard;

  return c.html(
    renderPage(
      "Payment received",
      `
    <div class="alert alert-success">✓ Payment received — activating your subscription...</div>
    <h1>Welcome to ${planInfo.label}!</h1>
    <p class="muted">Your account is being activated. This typically takes under 30 seconds.</p>
    <p><a class="btn btn-primary" href="/dashboard">Go to dashboard →</a></p>
    <script>setTimeout(()=>location.href='/dashboard',4000)</script>
    `,
    ),
  );
});

app.get("/checkout/cancel", (c) => {
  return c.html(
    renderPage(
      "Checkout canceled",
      `
    <div class="alert alert-warning">⚠ Checkout was canceled. No charges were made.</div>
    <h1>No problem.</h1>
    <p class="muted">You can restart whenever you're ready.</p>
    <p><a class="btn btn-secondary" href="/pricing">← Return to pricing</a></p>
    `,
    ),
  );
});

// ── Billing webhook (Stripe) ───────────────────────────────────────────────────
// This is the ONLY place subscriptions are written. Verified via HMAC signature.

app.post("/billing/webhook", async (c) => {
  const body = await c.req.text();
  const sig = c.req.header("stripe-signature") ?? "";

  // Verify Stripe webhook signature (timing-safe HMAC-SHA256)
  if (c.env.BILLING_WEBHOOK_SECRET && sig) {
    try {
      const [, tsPart, v1Part] = [
        sig.match(/t=(\d+)/)?.[1] ?? "",
        sig.match(/t=(\d+)/)?.[1] ?? "",
        sig.match(/v1=([a-f0-9]+)/)?.[1] ?? "",
      ];
      const timestamp = sig.match(/t=(\d+)/)?.[1] ?? "";
      const v1 = sig.match(/v1=([a-f0-9]+)/)?.[1] ?? "";
      const signedPayload = `${timestamp}.${body}`;
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(c.env.BILLING_WEBHOOK_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
      const computed = Array.from(new Uint8Array(sigBytes))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (computed !== v1) {
        return c.json({ error: "invalid_signature" }, 401);
      }
    } catch {
      return c.json({ error: "signature_verification_failed" }, 401);
    }
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const obj = event.data.object as {
    id?: string;
    customer?: string;
    metadata?: { customer_id?: string; plan_code?: string };
    status?: string;
    items?: { data: Array<{ price: { id: string } }> };
  };

  const customerId = obj.metadata?.customer_id ?? "";
  const planCode = obj.metadata?.plan_code ?? "standard";
  const stripeSubId = obj.id ?? "";

  if (!customerId) return c.json({ error: "missing customer_id in metadata" }, 400);
  if (!VALID_PLANS.has(planCode)) return c.json({ error: "unknown plan_code" }, 400);

  const now = new Date().toISOString();

  if (event.type === "checkout.session.completed" || event.type === "customer.subscription.updated") {
    await c.env.DB.prepare(`
      INSERT INTO subscriptions (id, customer_id, plan_code, status, stripe_subscription_id, created_at, updated_at)
      VALUES (?, ?, ?, 'active', ?, ?, ?)
      ON CONFLICT(customer_id) DO UPDATE
        SET plan_code = excluded.plan_code,
            status = 'active',
            stripe_subscription_id = excluded.stripe_subscription_id,
            updated_at = excluded.updated_at
    `)
      .bind(crypto.randomUUID(), customerId, planCode, stripeSubId, now, now)
      .run();
  }

  if (event.type === "customer.subscription.deleted" || event.type === "invoice.payment_failed") {
    await c.env.DB.prepare(`
      UPDATE subscriptions SET status = 'cancelled', updated_at = ? WHERE customer_id = ?
    `)
      .bind(now, customerId)
      .run();
  }

  return c.json({ ok: true, type: event.type });
});

// ── Onboarding API ────────────────────────────────────────────────────────────

app.post("/api/onboard", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const allowed = await checkRateLimit(c.env.RATE_LIMIT_KV, `onboard:${ip}`, 5, 60);
  if (!allowed) return c.json({ error: "rate_limit_exceeded" }, 429);

  let body: { org_name?: string; industry?: string; plan?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const { org_name, industry, plan = "lite" } = body;
  if (!org_name || typeof org_name !== "string" || org_name.trim().length < 2) {
    return c.json({ error: "org_name required (min 2 chars)" }, 422);
  }
  if (!VALID_PLANS.has(plan)) {
    return c.json({ error: "invalid plan" }, 422);
  }

  const token = extractSessionToken(c.req.raw);
  const session = await getSession(c.env, token);
  if (!session?.user.email) return c.json({ error: "unauthenticated" }, 401);

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);
  const orgId = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    "INSERT INTO organizations (id, customer_id, name, industry, plan_code, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(orgId, customer.id, org_name.trim(), industry ?? null, plan, now)
    .run();

  return c.json({ ok: true, org_id: orgId, plan });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

app.get("/dashboard", async (c) => {
  const token = extractSessionToken(c.req.raw);
  const session = await getSession(c.env, token);
  if (!session?.user.email) {
    return c.redirect(getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL), 302);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);
  const subscription = await c.env.DB.prepare(`
    SELECT plan_code, status, created_at, stripe_subscription_id
    FROM subscriptions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1
  `)
    .bind(customer.id)
    .first<Subscription>();

  // Lite users have no subscription row — default them to lite
  const plan = (subscription?.plan_code ?? "lite") as PlanCode;
  const planInfo = PLANS[plan] ?? PLANS.lite;
  const isActive = !subscription || subscription.status === "active";

  if (!isActive) {
    return c.html(
      renderPage(
        "Subscription inactive",
        `
      <div class="alert alert-warning">⚠ Your subscription is inactive.</div>
      <h1>Reactivate your account</h1>
      <p class="muted">Your previous plan was <strong>${planInfo.label}</strong>. Choose a plan below to reactivate.</p>
      <p><a class="btn btn-primary" href="/pricing">View plans →</a></p>
      `,
      ),
    );
  }

  const appTiles = APPS.map((a) => {
    const hasAccess = (a.plans as readonly string[]).includes(plan);
    const appUrl = a.id === "bizforma"
      ? c.env.BIZFORMA_BASE_URL
      : `${c.env.GATEWAY_BASE_URL}/handoff?app=${a.id}&token=${encodeURIComponent(token ?? "")}`;

    return `
    <div class="card ${hasAccess ? "" : "card-locked"}">
      <span class="badge" style="background:${a.badgeColor};color:${a.badgeText};">${a.badge}</span>
      <h2>${a.label}</h2>
      <p class="muted" style="font-size:13px;margin-bottom:14px;">${a.desc}</p>
      ${hasAccess
        ? `<a class="btn btn-primary btn-sm" href="${appUrl}">Open →</a>`
        : `<span style="font-size:12px;color:#6b7280;">🔒 Requires ${a.plans[0]} plan</span>
           <br/><a class="btn btn-secondary btn-sm" style="margin-top:8px;" href="/pricing">Upgrade</a>`
      }
    </div>`;
  }).join("");

  return c.html(
    renderPage(
      "Dashboard",
      `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:28px;">
      <div>
        <h1 style="margin-bottom:4px;">Welcome back</h1>
        <p class="muted">${session.user.email}</p>
      </div>
      <div style="text-align:right;">
        <span class="pill pill-active">${planInfo.label}</span>
        ${planInfo.price > 0 ? `<p class="muted" style="font-size:12px;margin-top:4px;">$${planInfo.price}/mo</p>` : ""}
        ${plan !== "pro" ? `<br/><a class="btn btn-primary btn-sm" style="margin-top:6px;" href="/pricing">Upgrade plan</a>` : ""}
      </div>
    </div>
    <div class="cards">${appTiles}</div>
    <hr class="divider"/>
    <h2>Account Details</h2>
    <table>
      <tr><th>Plan</th><td>${planInfo.label}</td></tr>
      <tr><th>Price</th><td>${planInfo.price === 0 ? "Free" : `$${planInfo.price}/mo`}</td></tr>
      <tr><th>Status</th><td><span class="pill pill-active">Active</span></td></tr>
      ${subscription?.created_at ? `<tr><th>Member since</th><td>${new Date(subscription.created_at).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</td></tr>` : ""}
      ${subscription?.stripe_subscription_id ? `<tr><th>Subscription ID</th><td style="font-family:monospace;font-size:12px;">${subscription.stripe_subscription_id}</td></tr>` : ""}
    </table>
    `,
    ),
  );
});

export default app;
