export interface Env {
  AUTH_WORKER: Fetcher;
  PLATFORM_WORKER: Fetcher;
  SESSIONS: KVNamespace;
  RATE_LIMIT: KVNamespace;
  DB: D1Database;
  API_EVENTS: AnalyticsEngineDataset;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
  RATE_LIMIT_WINDOW_SECONDS: string;
  RATE_LIMIT_MAX_REQUESTS: string;
  PLATFORM_API_BASE: string;
  TENANT_BASE_DOMAIN: string;
  AUTH_URL: string;
  PUBLIC_APP_URL: string;
  JWT_SECRET?: string;
}

type Tier = "lite" | "standard" | "pro" | "enterprise";

interface SessionClaims {
  sub: string;
  org: string;
  email: string;
  tier: Tier;
  exp: number;
}

interface TenantWorkerRow {
  org_id: string;
  tenant_id: string;
  worker_name: string;
  worker_url: string;
  status: "pending" | "active" | "suspended" | "failed";
  subscription_status: "inactive" | "trialing" | "active" | "past_due" | "canceled";
}

const PUBLIC_ROUTES = new Set([
  "GET:/api/health",
  "GET:/api/version",
  "POST:/api/auth/login",
  "POST:/api/auth/register",
  "POST:/api/auth/refresh",
  "POST:/api/auth/forgot-password"
]);

function normalizePath(pathname: string): string {
  const cleaned = pathname.replace(/\/+$/, "");
  return cleaned || "/";
}

function isPublicRoute(method: string, pathname: string): boolean {
  return PUBLIC_ROUTES.has(`${method.toUpperCase()}:${normalizePath(pathname)}`);
}

function getAllowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS.split(",").map((v) => v.trim()).filter(Boolean);
}

function corsHeaders(origin: string | null, env: Env): HeadersInit {
  const allowed = getAllowedOrigins(env);
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0] ?? "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-IH-Org, X-IH-Tenant",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

function withCors(res: Response, origin: string | null, env: Env): Response {
  const headers = new Headers(res.headers);
  const extra = corsHeaders(origin, env);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v as string);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

async function verifySession(req: Request, env: Env): Promise<SessionClaims | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const verifyReq = new Request("https://auth.internal/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: auth.slice("Bearer ".length) })
  });

  const verifyRes = await env.AUTH_WORKER.fetch(verifyReq);
  if (!verifyRes.ok) return null;
  return (await verifyRes.json()) as SessionClaims;
}

async function lookupTenant(orgId: string, env: Env): Promise<TenantWorkerRow | null> {
  const result = await env.DB.prepare(
    `SELECT
       tw.org_id,
       tw.tenant_id,
       tw.worker_name,
       tw.worker_url,
       tw.status,
       COALESCE(s.status, 'inactive') AS subscription_status
     FROM tenant_workers tw
     LEFT JOIN subscriptions s ON s.org_id = tw.org_id
     WHERE tw.org_id = ?
     LIMIT 1`
  ).bind(orgId).first<TenantWorkerRow>();

  return result ?? null;
}

async function createProvisioningJob(orgId: string, tier: Tier, env: Env): Promise<string> {
  const jobId = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO provisioning_jobs (
      id, org_id, requested_tier, status, created_at, updated_at
    ) VALUES (?, ?, ?, 'queued', unixepoch(), unixepoch())`
  ).bind(jobId, orgId, tier).run();

  await env.PLATFORM_WORKER.fetch(
    new Request("https://platform.internal/api/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, orgId, tier })
    })
  );

  return jobId;
}

async function proxyToTenant(req: Request, tenant: TenantWorkerRow, claims: SessionClaims): Promise<Response> {
  const url = new URL(req.url);
  const upstream = new URL(url.pathname + url.search, tenant.worker_url);

  const headers = new Headers(req.headers);
  headers.set("X-IH-Org", claims.org);
  headers.set("X-IH-Tenant", tenant.tenant_id);
  headers.set("X-IH-Tier", claims.tier);
  headers.set("X-IH-User", claims.sub);

  return fetch(new Request(upstream.toString(), {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
    redirect: "manual"
  }));
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("Origin");

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    const url = new URL(req.url);
    const path = normalizePath(url.pathname);

    if (path === "/api/health") {
      return withCors(Response.json({ ok: true, service: "dispatch" }), origin, env);
    }

    if (path === "/api/version") {
      return withCors(Response.json({ service: "insighthunter-dispatch", mode: "workers-for-platforms" }), origin, env);
    }

    if (path.startsWith("/api/auth/")) {
      return withCors(await env.AUTH_WORKER.fetch(req), origin, env);
    }

    const start = Date.now();
    const claims = await verifySession(req, env);
    if (!claims) {
      return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }), origin, env);
    }

    const tenant = await lookupTenant(claims.org, env);

    if (!tenant) {
      const jobId = await createProvisioningJob(claims.org, claims.tier, env);
      return withCors(Response.json({ error: "Tenant provisioning in progress", jobId, status: "queued" }, { status: 202 }), origin, env);
    }

    if (tenant.subscription_status !== "active" && tenant.subscription_status !== "trialing") {
      return withCors(Response.json({ error: "Subscription required" }, { status: 403 }), origin, env);
    }

    if (tenant.status !== "active") {
      return withCors(Response.json({ error: "Tenant not ready", status: tenant.status }, { status: 409 }), origin, env);
    }

    const upstream = await proxyToTenant(req, tenant, claims);

    try {
      env.API_EVENTS.writeDataPoint({
        blobs: [req.method, path, env.ENVIRONMENT],
        doubles: [upstream.status, Date.now() - start],
        indexes: [claims.org]
      });
    } catch {}

    return withCors(upstream, origin, env);
  }
};
