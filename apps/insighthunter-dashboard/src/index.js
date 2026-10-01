// Insight Hunter — Dashboard (Worker entry)
//
// Real, connected command center: verifies the session against
// insighthunter-auth, then proxies each tab's data to the actual module
// Worker that owns it (invoicing, bills, payroll, ledger, insights) via
// Cloudflare service bindings — no more local demo data.

import { Hono } from "hono";
import { verifySession } from "./session.js";
import { callService } from "./services.js";

const app = new Hono();

// ── App launcher tiles (ported from the decommissioned insighthunter-main) ──
const APP_TILES = [
  { slug: "insights", name: "Insights", desc: "Financial KPIs, forecasting & AI analysis", url: "https://insights.insighthunter.app", icon: "📊", minTier: "lite" },
  { slug: "bookkeeping", name: "Bookkeeping", desc: "Bank feeds, transactions & reconciliation", url: "https://bookkeeping.insighthunter.app", icon: "📒", minTier: "standard" },
  { slug: "advisor", name: "Advisor", desc: "AI-driven CFO advisory using your real data", url: "https://advisor.insighthunter.app", icon: "🤖", minTier: "standard" },
  { slug: "reports", name: "Reports", desc: "Automated financial reports & exports", url: "https://reports.insighthunter.app", icon: "📄", minTier: "standard" },
  { slug: "payroll", name: "Payroll", desc: "Employee & contractor payroll processing", url: "https://payroll.insighthunter.app", icon: "💰", minTier: "pro" },
  { slug: "bizforma", name: "BizForma", desc: "Business formation & compliance tracking", url: "https://bizforma.insighthunter.app", icon: "🏛️", minTier: "standard" },
  { slug: "pbx", name: "PBX", desc: "AI-powered business phone & call analytics", url: "https://pbx.insighthunter.app", icon: "📞", minTier: "pro" },
  { slug: "scout", name: "Scout", desc: "Business intelligence & market signals", url: "https://scout.insighthunter.app", icon: "🔍", minTier: "pro" },
];
const TIER_RANK = { lite: 0, standard: 1, pro: 2, enterprise: 3 };

app.get("/health", (c) => c.json({ ok: true, service: "insighthunter-dashboard" }));

// ── Auth gate for everything else ───────────────────────────────────────────
app.use("*", async (c, next) => {
  if (c.req.path === "/health") return next();
  const session = await verifySession(c.req.raw, c.env);
  if (!session) {
    if (c.req.path.startsWith("/api/")) return c.json({ error: "unauthorized" }, 401);
    const returnTo = encodeURIComponent(c.req.url);
    return c.redirect(`${c.env.AUTH_ORIGIN}/login?returnTo=${returnTo}`, 302);
  }
  c.set("session", session);
  await next();
});

app.get("/api/session", (c) => {
  const session = c.get("session");
  const rank = TIER_RANK[session.tier] ?? 0;
  return c.json({
    user: { userId: session.userId, email: session.email, name: session.name, role: session.role },
    org: { name: session.orgName, tier: session.tier },
    apps: APP_TILES.filter((a) => (TIER_RANK[a.minTier] ?? 0) <= rank),
  });
});

// ── Overview — real KPIs/health/cashflow from insighthunter-insights ────────
app.get("/api/overview", async (c) => {
  const session = c.get("session");
  try {
    const summary = await callService(c.env.INSIGHTS_SERVICE, "/api/summary", session);
    return c.json(summary);
  } catch (err) {
    return c.json({ error: String(err.message || err) }, 502);
  }
});

// ── Invoices — insighthunter-invoicing ───────────────────────────────────────
app.get("/api/invoices", async (c) => {
  const session = c.get("session");
  const data = await callService(c.env.INVOICING_SERVICE, "/api/invoices", session);
  return c.json(data);
});

app.post("/api/invoices", async (c) => {
  const session = c.get("session");
  const body = await c.req.json();
  const clientId = await findOrCreateClient(c.env, session, body.client);
  const created = await callService(c.env.INVOICING_SERVICE, "/api/invoices", session, {
    method: "POST",
    body: {
      client_id: clientId,
      issue_date: body.issueDate,
      due_date: body.dueDate,
      memo: body.memo,
      line_items: body.lineItems.map((l) => ({
        description: l.description,
        quantity: 1,
        unit_price: l.amountCents / 100,
      })),
    },
  });
  // Move draft -> sent so it's immediately payable, matching the dashboard's UX.
  await callService(c.env.INVOICING_SERVICE, `/api/invoices/${created.id}/send`, session, { method: "POST" });
  return c.json(created, 201);
});

app.post("/api/invoices/:id/pay", async (c) => {
  const session = c.get("session");
  const id = c.req.param("id");
  const { invoice } = await callService(c.env.INVOICING_SERVICE, `/api/invoices/${id}`, session);
  const remaining = invoice.total_amount - invoice.amount_paid;
  const result = await callService(c.env.INVOICING_SERVICE, "/api/payments", session, {
    method: "POST",
    body: { invoice_id: id, amount: remaining, method: "other" },
  });
  return c.json(result);
});

app.post("/api/invoices/:id/void", async (c) => {
  const session = c.get("session");
  const result = await callService(c.env.INVOICING_SERVICE, `/api/invoices/${c.req.param("id")}/void`, session, {
    method: "POST",
  });
  return c.json(result);
});

// ── Bills — insighthunter-bills ──────────────────────────────────────────────
app.get("/api/bills", async (c) => {
  const session = c.get("session");
  const data = await callService(c.env.BILLS_SERVICE, "/api/bills", session);
  return c.json(data);
});

app.post("/api/bills", async (c) => {
  const session = c.get("session");
  const body = await c.req.json();
  const vendorId = await findOrCreateVendor(c.env, session, body.vendor);
  const created = await callService(c.env.BILLS_SERVICE, "/api/bills", session, {
    method: "POST",
    body: {
      vendor_id: vendorId,
      issue_date: body.issueDate,
      due_date: body.dueDate,
      memo: body.memo,
      total_amount: body.lineItems.reduce((s, l) => s + l.amountCents, 0) / 100,
      lines: body.lineItems.map((l) => ({ description: l.description, amount: l.amountCents / 100 })),
    },
  });
  return c.json(created, 201);
});

app.post("/api/bills/:id/pay", async (c) => {
  const session = c.get("session");
  const id = c.req.param("id");
  const { bill } = await callService(c.env.BILLS_SERVICE, `/api/bills/${id}`, session);
  const result = await callService(c.env.BILLS_SERVICE, "/api/payments", session, {
    method: "POST",
    body: {
      bill_id: id,
      amount: bill.balance_due,
      method: "other",
      paid_at: new Date().toISOString().slice(0, 10),
    },
  });
  return c.json(result);
});

app.post("/api/bills/:id/void", async (c) => {
  const session = c.get("session");
  const result = await callService(c.env.BILLS_SERVICE, `/api/bills/${c.req.param("id")}/void`, session, {
    method: "POST",
  });
  return c.json(result);
});

// ── Payroll — insighthunter-payroll (employees only; run approval requires
// the tax-provider onboarding flow in that app itself — not fabricated here) ─
app.get("/api/payroll/employees", async (c) => {
  const session = c.get("session");
  const data = await callService(c.env.PAYROLL_SERVICE, "/api/employees", session);
  return c.json(data);
});

app.post("/api/payroll/employees", async (c) => {
  const session = c.get("session");
  const body = await c.req.json();
  const created = await callService(c.env.PAYROLL_SERVICE, "/api/employees", session, {
    method: "POST",
    body: {
      name: body.name,
      pay_type: "salary",
      pay_rate: body.salaryCents / 100,
    },
  });
  return c.json(created, 201);
});

// ── Journal — insighthunter-ledger (chart of accounts + manual journals) ────
app.get("/api/journal", async (c) => {
  const session = c.get("session");
  const [accounts, entries] = await Promise.all([
    callService(c.env.LEDGER_SERVICE, "/api/accounts", session),
    callService(c.env.LEDGER_SERVICE, "/api/journals", session),
  ]);
  return c.json({ accounts: accounts.items ?? [], entries: entries.items ?? [] });
});

app.post("/api/journal/accounts", async (c) => {
  const session = c.get("session");
  const body = await c.req.json();
  const result = await callService(c.env.LEDGER_SERVICE, "/api/accounts", session, {
    method: "POST",
    body: { code: body.code, name: body.name, type: body.type },
  });
  return c.json(result, 201);
});

app.post("/api/journal", async (c) => {
  const session = c.get("session");
  const body = await c.req.json();
  const result = await callService(c.env.LEDGER_SERVICE, "/api/journals/post", session, {
    method: "POST",
    body: { lines: body.lines, memo: body.memo },
  });
  return c.json(result, result.posted ? 201 : 400);
});

// ── Static assets (dashboard UI) ────────────────────────────────────────────
app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

async function findOrCreateClient(env, session, name) {
  const trimmed = String(name || "").trim();
  const { clients } = await callService(env.INVOICING_SERVICE, "/api/clients", session);
  const existing = clients.find((cl) => cl.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing.id;
  const created = await callService(env.INVOICING_SERVICE, "/api/clients", session, {
    method: "POST",
    body: { name: trimmed },
  });
  return created.id;
}

async function findOrCreateVendor(env, session, name) {
  const trimmed = String(name || "").trim();
  const { vendors } = await callService(env.BILLS_SERVICE, "/api/vendors", session);
  const existing = vendors.find((v) => v.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing.id;
  const created = await callService(env.BILLS_SERVICE, "/api/vendors", session, {
    method: "POST",
    body: { name: trimmed },
  });
  return created.id;
}

export default app;
