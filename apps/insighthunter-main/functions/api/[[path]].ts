import { Hono } from "hono";
import { cors } from "hono/cors";

interface Env {
  SESSIONS: KVNamespace;
  DB: D1Database;
  ANALYTICS: AnalyticsEngineDataset;
  AUTH_WORKER_URL: string;
  JWT_SECRET: string;
  ASSETS: Fetcher;
}

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({ origin: ["https://insighthunter.app", "http://localhost:4321"] })
);

// ── Auth proxy ──────────────────────────────────────────────────────────────
app.post("/api/auth/login", async (c) => {
  const body = await c.req.json();
  const res = await fetch(`${c.env.AUTH_WORKER_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return new Response(res.body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});

app.post("/api/auth/register", async (c) => {
  const body = await c.req.json();
  const res = await fetch(`${c.env.AUTH_WORKER_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return new Response(res.body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});

app.get("/api/auth/me", async (c) => {
  const token = c.req.header("Authorization")?.slice(7);
  if (!token) return c.json({ success: false, error: "Unauthorized" }, 401);
  const res = await fetch(`${c.env.AUTH_WORKER_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return new Response(res.body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});

app.post("/api/auth/logout", async (c) => {
  const token = c.req.header("Authorization")?.slice(7);
  if (token) await c.env.SESSIONS.delete(`session:${token}`);
  return c.json({ success: true });
});

app.post("/api/auth/forgot-password", async (c) => {
  const { email } = await c.req.json<{ email: string }>();
  const res = await fetch(`${c.env.AUTH_WORKER_URL}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return new Response(res.body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});

// ── Analytics event intake ──────────────────────────────────────────────────
app.post("/api/analytics/event", async (c) => {
  const body = await c.req.json<{
    event: string;
    page?: string;
    userId?: string;
  }>();
  c.env.ANALYTICS.writeDataPoint({
    blobs: [body.event, body.page ?? ""],
    indexes: [body.userId ?? "anonymous"],
  });
  return c.json({ success: true });
});

// ── KPI data (mocked; replace with D1 query) ───────────────────────────────
app.get("/api/dashboard/kpis", async (c) => {
  const kpis = {
    revenue: 24850,
    expenses: 11200,
    netIncome: 13650,
    cashBalance: 42000,
    burnRate: 11200,
    runway: 3.8,
    revenueDelta: 12.4,
    expensesDelta: -3.1,
  };
  return c.json({ success: true, data: kpis });
});

// ── Contact form ────────────────────────────────────────────────────────────
app.post("/api/contact", async (c) => {
  const { name, email, message } = await c.req.json<{
    name: string;
    email: string;
    message: string;
  }>();
  // Store in D1 for now; wire up email sending (Mailchannels/Resend) as next step
  await c.env.DB.prepare(
    "INSERT INTO contact_submissions (name, email, message, created_at) VALUES (?, ?, ?, ?)"
  )
    .bind(name, email, message, new Date().toISOString())
    .run();
  return c.json({ success: true });
});

export const onRequest = app.fetch;
