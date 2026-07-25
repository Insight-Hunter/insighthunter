import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  extractSessionToken,
  getLoginRedirectUrl,
  getRegisterRedirectUrl,
} from "@insighthunter/auth-shared";
import { createStripeCheckoutSession } from "./billing/stripe.js";
import { customerHasEntitlement } from "./authz/entitlements.js";
import { FEATURE_KEYS } from "./authz/plans.js";
import { ensureCustomer, getSession } from "./authz/session.js";
import entitlementsRoutes from "./routes/entitlements.js";
import onboarding from "./routes/onboarding.js";
import { webhooks } from "./routes/webhooks.js";

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
    STRIPE_PRICE_LITE: string;
    STRIPE_PRICE_STANDARD: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    STRIPE_PRICE_STARTER: string;
    STRIPE_PRICE_GROWTH: string;
    STRIPE_PRICE_PRO: string;
  };
};

const PLANS = {
  lite: { label: "Insight Lite", price: 0, txnLimit: 150, users: 1, color: "#6b7280" },
  standard: { label: "Insight Standard", price: 49, txnLimit: null, users: 3, color: "#60a5fa" },
  pro: { label: "Insight Pro", price: 129, txnLimit: null, users: null, color: "#a78bfa" },
} as const;

type PlanCode = keyof typeof PLANS;
const VALID_PLANS = new Set<PlanCode>(Object.keys(PLANS) as PlanCode[]);

const APPS = [
  { id: "bookkeeping", label: "Bookkeeping", desc: "Auto-categorized P&L, reconciliation, bank sync", plans: ["lite", "standard", "pro"], badge: "Core", badgeColor: "#0d3b2e", badgeText: "#34d399" },
  { id: "bizforma", label: "BizForma", desc: "AI business formation — LLC, S-Corp, C-Corp", plans: ["lite", "standard", "pro"], badge: "Core", badgeColor: "#0d3b2e", badgeText: "#34d399" },
  { id: "insights", label: "AI CFO", desc: "Anomaly detection, cash-flow forecasting, alerts", plans: ["standard", "pro"], badge: "Standard", badgeColor: "#1c2e5e", badgeText: "#60a5fa" },
  { id: "finops", label: "FinOps", desc: "Budget vs actuals, cost centers, burn rate", plans: ["standard", "pro"], badge: "Standard", badgeColor: "#1c2e5e", badgeText: "#60a5fa" },
  { id: "ledger", label: "Ledger", desc: "Double-entry general ledger & journal entries", plans: ["standard", "pro"], badge: "Standard", badgeColor: "#1c2e5e", badgeText: "#60a5fa" },
  { id: "scout", label: "Scout CRM", desc: "Leads, deals, pipeline, and revenue tracking", plans: ["standard", "pro"], badge: "Standard", badgeColor: "#1c2e5e", badgeText: "#60a5fa" },
  { id: "payroll", label: "Payroll", desc: "W-2 + 1099 payroll, tax calculations, filing", plans: ["standard", "pro"], badge: "Standard", badgeColor: "#1c2e5e", badgeText: "#60a5fa" },
  { id: "report", label: "Reports", desc: "Custom report builder + white-label PDF export", plans: ["pro"], badge: "Pro", badgeColor: "#2d1b5e", badgeText: "#a78bfa" },
  { id: "pbx", label: "PBX Phone", desc: "Cloud phone, IVR, voicemail-to-email, 10 ext", plans: ["pro"], badge: "Pro", badgeColor: "#2d1b5e", badgeText: "#a78bfa" },
] as const;

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

function renderPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} - Insight Hunter</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Inter,system-ui,sans-serif;margin:0;background:#0b1020;color:#f7f8fc;line-height:1.6}
    .wrap{max-width:1100px;margin:0 auto;padding:40px 20px}
    nav{display:flex;align-items:center;gap:16px;padding:16px 20px;border-bottom:1px solid #1f2a4a}
    nav a{color:#b9c2e3;text-decoration:none;font-size:14px}
    nav a:hover{color:#fff}
    nav .logo{font-weight:700;color:#fff;margin-right:auto;font-size:18px}
    .btn{display:inline-block;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;cursor:pointer;border:none}
    .btn-primary{background:#4f7cff;color:#fff}
    .btn-secondary{background:#1f2a4a;color:#b9c2e3;border:1px solid #2a3359}
    .btn-sm{padding:6px 12px;font-size:13px}
    .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px;margin-top:24px}
    .card{background:#121933;padding:22px;border-radius:14px;border:1px solid #2a3359}
    .badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600;margin-bottom:10px}
    .pricing-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px;margin-top:24px}
    .plan-card{background:#121933;padding:28px;border-radius:16px;border:1px solid #2a3359}
    .plan-card.featured{border-color:#4f7cff;background:#111d40}
    .plan-price{font-size:2.4rem;font-weight:800;margin:8px 0}
    .muted{color:#b9c2e3}
    .divider{border:none;border-top:1px solid #1f2a4a;margin:40px 0}
  </style>
</head>
<body>
  <nav>
    <a class="logo" href="/">Insight Hunter</a>
    <a href="/pricing">Pricing</a>
    <a href="/dashboard">Dashboard</a>
  </nav>
  <div class="wrap">${body}</div>
</body>
</html>`;
}

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

app.get("/health", (c) =>
  c.json({ ok: true, service: c.env.APP_NAME, ts: new Date().toISOString() }),
);

app.route("/", onboarding);
app.route("/", webhooks);
app.route("/", entitlementsRoutes);

app.get("/", (c) => {
  const loginUrl = getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL);
  const registerUrl = getRegisterRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL);

  const appCards = APPS.map(
    (a) =>
      `<div class="card"><span class="badge" style="background:${a.badgeColor};color:${a.badgeText}">${a.badge}</span><h2>${a.label}</h2><p class="muted" style="font-size:13px;">${a.desc}</p></div>`,
  ).join("");

  return c.html(
    renderPage(
      "Stop Flying Blind",
      `<div class="hero">
        <h1>Stop flying blind.<br/>Know your numbers.</h1>
        <p class="muted" style="font-size:1.15rem;margin:16px 0 32px;">AI-powered bookkeeping, payroll, cash-flow forecasting, and an AI CFO — built on Cloudflare's global edge.</p>
        <a class="btn btn-primary" href="${registerUrl}">Start Free — No Credit Card</a>
        <a class="btn btn-secondary" href="/pricing">See pricing →</a>
        <p class="muted" style="margin-top:20px;font-size:13px;">✓ Cloudflare-native · ✓ Per-tenant data isolation · ✓ SOC 2 ready architecture</p>
      </div>
      <hr class="divider"/>
      <h2 style="font-size:1.5rem;">Everything your business needs — one platform</h2>
      <div class="cards">${appCards}</div>
      <hr class="divider"/>
      <div style="text-align:center;padding:20px 0 40px;">
        <h2 style="font-size:1.8rem;margin-bottom:10px;">Ready to take control?</h2>
        <p class="muted" style="margin-bottom:24px;">Join thousands of small businesses replacing 6 apps with one.</p>
        <a class="btn btn-primary" href="${registerUrl}">Get started free</a>
        <a class="btn btn-secondary" href="${loginUrl}">Log in →</a>
      </div>`,
    ),
  );
});

app.get("/pricing", (c) =>
  c.html(
    renderPage(
      "Pricing",
      `<h1>Simple, Transparent Pricing</h1>
      <p class="muted">Start free. Scale when ready. Cancel anytime.</p>
      <div class="pricing-grid">
        <div class="plan-card">
          <p class="muted" style="font-size:13px;">For solo operators getting started.</p>
          <h2>Insight Lite</h2>
          <div class="plan-price">$0 <span style="font-size:1rem;font-weight:400;color:#b9c2e3">/mo</span></div>
          <ul class="muted" style="list-style:none;margin:16px 0 22px;padding:0">
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
          <div class="plan-price">$49 <span style="font-size:1rem;font-weight:400;color:#b9c2e3">/mo</span></div>
          <ul class="muted" style="list-style:none;margin:16px 0 22px;padding:0">
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
          <p class="muted" style="font-size:13px;">Full OS for high-velocity operators.</p>
          <h2>Insight Pro</h2>
          <div class="plan-price">$129 <span style="font-size:1rem;font-weight:400;color:#b9c2e3">/mo</span></div>
          <ul class="muted" style="list-style:none;margin:16px 0 22px;padding:0">
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
      </div>`,
    ),
  ),
);

app.get("/start", (c) => {
  const plan = (c.req.query("plan") ?? "lite") as PlanCode;
  if (!VALID_PLANS.has(plan)) return c.redirect("/pricing", 302);
  return c.redirect(getRegisterRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL, "auth/callback", plan), 302);
});

app.get("/auth/callback", async (c) => {
  const token = c.req.query("sessiontoken");
  const plan = (c.req.query("plan") ?? "lite") as PlanCode;
  if (!token) return c.redirect("/pricing", 302);
  if (!VALID_PLANS.has(plan)) return c.redirect("/pricing", 302);
  const location = plan === "lite" ? "/dashboard" : "/checkout/start?plan=" + encodeURIComponent(plan);
  return c.redirect(location, 302);
});

app.get("/checkout/start", async (c) => {
  const plan = (c.req.query("plan") ?? "standard") as PlanCode;
  if (!VALID_PLANS.has(plan) || plan === "lite") return c.redirect("/pricing", 302);

  const token = extractSessionToken(c.req.raw);
  const session = await getSession(c.env, token);
  if (!session?.user.email) return c.redirect(getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL), 302);

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);
  const successUrl = new URL("/checkout/success", c.env.MAIN_BASE_URL);
  successUrl.searchParams.set("plan", plan);
  const cancelUrl = new URL("/checkout/cancel", c.env.MAIN_BASE_URL);
  cancelUrl.searchParams.set("plan", plan);

  const checkoutUrl = await createStripeCheckoutSession(c.env, {
    customerId: customer.id,
    plan,
    successUrl: successUrl.toString(),
    cancelUrl: cancelUrl.toString(),
  });

  return c.redirect(checkoutUrl, 302);
});

app.get("/checkout/success", (c) => {
  const plan = (c.req.query("plan") ?? "standard") as PlanCode;
  return c.html(
    renderPage(
      "Payment received",
      `<div style="padding:16px;border-radius:12px;background:#0a2e1a;border:1px solid #34d399;color:#34d399;margin-bottom:20px;">Payment received — activating your subscription...</div>
      <h1>Welcome to ${PLANS[plan]?.label ?? PLANS.standard.label}!</h1>
      <p class="muted">Your account is being activated. This typically takes under 30 seconds.</p>
      <a class="btn btn-primary" href="/dashboard">Go to dashboard</a>`,
    ),
  );
});

app.get("/checkout/cancel", (c) =>
  c.html(
    renderPage(
      "Checkout canceled",
      `<div style="padding:16px;border-radius:12px;background:#2d2400;border:1px solid #f59e0b;color:#fbbf24;margin-bottom:20px;">Checkout was canceled. No charges were made.</div>
      <h1>No problem.</h1>
      <p class="muted">You can restart whenever you're ready.</p>
      <a class="btn btn-secondary" href="/pricing">Return to pricing</a>`,
    ),
  ),
);

app.post("/billing/webhook", webhooks);
app.post("/api/onboard", onboarding);

app.get("/dashboard", async (c) => {
  const token = extractSessionToken(c.req.raw);
  const session = await getSession(c.env, token);
  if (!session?.user.email) return c.redirect(getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL), 302);

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);
  const subscription = await c.env.DB.prepare(
    "SELECT plan_code, status, created_at, stripe_subscription_id FROM subscriptions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1",
  )
    .bind(customer.id)
    .first<Subscription>();

  const plan = (subscription?.plan_code ?? "lite") as PlanCode;
  const planInfo = PLANS[plan] ?? PLANS.lite;
  const isActive = !subscription || subscription.status === "active";
  if (!isActive) {
    return c.html(
      renderPage(
        "Subscription inactive",
        `<div style="padding:16px;border-radius:12px;background:#2d2400;border:1px solid #f59e0b;color:#fbbf24;margin-bottom:20px;">Your subscription is inactive.</div>
        <h1>Reactivate your account</h1>
        <p class="muted">Your previous plan was <strong>${planInfo.label}</strong>. Choose a plan below to reactivate.</p>
        <a class="btn btn-primary" href="/pricing">View plans</a>`,
      ),
    );
  }

  const appTiles = APPS.map((a) => {
    const hasAccess = (a.plans as readonly PlanCode[]).includes(plan);
    const appUrl =
      a.id === "bizforma"
        ? c.env.BIZFORMA_BASE_URL
        : `${c.env.GATEWAY_BASE_URL}/handoff?app=${a.id}&token=${encodeURIComponent(token ?? "")}`;

    return `<div class="card" style="${hasAccess ? "" : "opacity:.5"}"><span class="badge" style="background:${a.badgeColor};color:${a.badgeText}">${a.badge}</span><h2>${a.label}</h2><p class="muted" style="font-size:13px;margin-bottom:14px;">${a.desc}</p>${hasAccess ? `<a class="btn btn-primary btn-sm" href="${appUrl}">Open</a>` : `<span class="muted" style="font-size:12px;">Requires ${a.plans[0]} plan</span><br/><a class="btn btn-secondary btn-sm" style="margin-top:8px;" href="/pricing">Upgrade</a>`}</div>`;
  }).join("");

  const hasAdvancedDashboard = await customerHasEntitlement(c.env.DB, customer.id, FEATURE_KEYS.ADVANCED_DASHBOARD);
  const hasAiAdvisor = await customerHasEntitlement(c.env.DB, customer.id, FEATURE_KEYS.AI_ADVISOR);
  const hasPayroll = await customerHasEntitlement(c.env.DB, customer.id, FEATURE_KEYS.PAYROLL);
  const hasBizForma = await customerHasEntitlement(c.env.DB, customer.id, FEATURE_KEYS.BIZFORMA);

  return c.html(
    renderPage(
      "Dashboard",
      `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px;"><div><h1 style="margin-bottom:4px;">Welcome back</h1><p class="muted">${session.user.email}</p></div><div style="text-align:right;"><span class="badge" style="background:#0a2e1a;color:#34d399">${planInfo.label}</span><p class="muted" style="font-size:12px;margin-top:4px;">${planInfo.price === 0 ? "Free" : "$" + planInfo.price + "/mo"}</p></div></div><div class="cards"><div class="card"><h2>Entitlements</h2><p class="muted">Advanced dashboard: ${hasAdvancedDashboard ? "Yes" : "No"}</p><p class="muted">AI advisor: ${hasAiAdvisor ? "Yes" : "No"}</p><p class="muted">Payroll workspace: ${hasPayroll ? "Yes" : "No"}</p><p class="muted">BizForma app: ${hasBizForma ? "Yes" : "No"}</p></div></div><div class="cards">${appTiles}</div><hr class="divider"/><h2>Account Details</h2><table><tr><th>Plan</th><td>${planInfo.label}</td></tr><tr><th>Price</th><td>${planInfo.price === 0 ? "Free" : "$" + planInfo.price + "/mo"}</td></tr><tr><th>Status</th><td><span class="badge" style="background:#0a2e1a;color:#34d399">Active</span></td></tr>${subscription?.created_at ? `<tr><th>Member since</th><td>${new Date(subscription.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td></tr>` : ""}${subscription?.stripe_subscription_id ? `<tr><th>Subscription ID</th><td style="font-family:monospace;font-size:12px;">${subscription.stripe_subscription_id}</td></tr>` : ""}</table>`,
    ),
  );
});

export default app;
