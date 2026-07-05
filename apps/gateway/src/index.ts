import { Hono } from "hono";

export interface Env {
  AUTH: Fetcher;
  LEDGER: Fetcher;
  FINOPS: Fetcher;
  ADVISOR: Fetcher;
  BIZFORMA: Fetcher;
  DISPATCH: Fetcher;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ service: "gateway", ok: true }));

/** Verify the caller is authenticated via the auth service. */
async function authenticate(
  headers: Headers,
  auth: Fetcher,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const verifyHeaders = new Headers(headers);
  const res = await auth.fetch(
    new Request("https://insighthunter-auth/verify", {
      method: "POST",
      headers: verifyHeaders,
    }),
  );
  const body = await res.json();
  return { ok: res.ok, status: res.status, body };
}

// ─── Auth passthrough ────────────────────────────────────────────────────────
app.all("/api/auth/*", async (c) => {
  const url = new URL(c.req.url);
  url.hostname = "insighthunter-auth";
  const res = await c.env.AUTH.fetch(new Request(url.toString(), c.req.raw));
  return new Response(res.body, res);
});

// ─── Ledger ──────────────────────────────────────────────────────────────────
app.all("/api/ledger/*", async (c) => {
  const auth = await authenticate(c.req.raw.headers, c.env.AUTH);
  if (!auth.ok) return c.json(auth.body, auth.status as 401 | 403);

  const url = new URL(c.req.url);
  // strip /api/ledger prefix → /api/...
  url.pathname = url.pathname.replace(/^\/api\/ledger/, "/api");
  url.hostname = "insighthunter-ledger";
  const res = await c.env.LEDGER.fetch(new Request(url.toString(), c.req.raw));
  return new Response(res.body, res);
});

// ─── FinOps ───────────────────────────────────────────────────────────────────
app.all("/api/finops/*", async (c) => {
  const auth = await authenticate(c.req.raw.headers, c.env.AUTH);
  if (!auth.ok) return c.json(auth.body, auth.status as 401 | 403);

  const url = new URL(c.req.url);
  url.pathname = url.pathname.replace(/^\/api\/finops/, "");
  url.hostname = "insighthunter-finops";
  const res = await c.env.FINOPS.fetch(new Request(url.toString(), c.req.raw));
  return new Response(res.body, res);
});

// ─── Advisor ──────────────────────────────────────────────────────────────────
app.all("/api/advisor/*", async (c) => {
  const auth = await authenticate(c.req.raw.headers, c.env.AUTH);
  if (!auth.ok) return c.json(auth.body, auth.status as 401 | 403);

  const url = new URL(c.req.url);
  url.pathname = url.pathname.replace(/^\/api\/advisor/, "");
  url.hostname = "insighthunter-advisor";
  const res = await c.env.ADVISOR.fetch(new Request(url.toString(), c.req.raw));
  return new Response(res.body, res);
});

// ─── BizForma ─────────────────────────────────────────────────────────────────
app.all("/api/bizforma/*", async (c) => {
  const auth = await authenticate(c.req.raw.headers, c.env.AUTH);
  if (!auth.ok) return c.json(auth.body, auth.status as 401 | 403);

  const url = new URL(c.req.url);
  url.pathname = url.pathname.replace(/^\/api\/bizforma/, "");
  url.hostname = "insighthunter-bizforma";
  const res = await c.env.BIZFORMA.fetch(new Request(url.toString(), c.req.raw));
  return new Response(res.body, res);
});

// ─── Dispatch / Tenant ────────────────────────────────────────────────────────
app.all("/api/dispatch/*", async (c) => {
  const auth = await authenticate(c.req.raw.headers, c.env.AUTH);
  if (!auth.ok) return c.json(auth.body, auth.status as 401 | 403);

  const url = new URL(c.req.url);
  url.pathname = url.pathname.replace(/^\/api\/dispatch/, "");
  url.hostname = "insighthunter-dispatch";
  const res = await c.env.DISPATCH.fetch(new Request(url.toString(), c.req.raw));
  return new Response(res.body, res);
});

export default app;
