#!/bin/bash
set -euo pipefail

REPO_ROOT="/Users/jamesmichaelhunterturner/Documents/insighthunter"
cd "$REPO_ROOT"

mkdir -p apps/insighthunter-dispatch/sql
mkdir -p apps/insighthunter-platform-worker/src
mkdir -p apps/insighthunter-tenant/src
mkdir -p apps/insighthunter-main/functions/api

cat > apps/insighthunter-dispatch/wrangler.toml <<'TOML'
name = "insighthunter-dispatch"
main = "src/index.ts"
compatibility_date = "2026-06-20"
compatibility_flags = ["nodejs_compat"]

[observability]
enabled = true
head_sampling_rate = 1

[[services]]
binding = "AUTH_WORKER"
service = "insighthunter-auth"

[[services]]
binding = "PLATFORM_WORKER"
service = "insighthunter-platform-worker"

[[kv_namespaces]]
binding = "SESSIONS"
id = "60e34ba310ca40c79edec05470c7a271"
preview_id = "60e34ba310ca40c79edec05470c7a271"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "f75a15f1df8c42cdb2e623d8cb324a23"
preview_id = "f75a15f1df8c42cdb2e623d8cb324a23"

[[d1_databases]]
binding = "DB"
database_name = "insighthunter-dispatch"
database_id = "2a0331eb-4775-4ad2-9126-0560336486df"

[[analytics_engine_datasets]]
binding = "API_EVENTS"
dataset = "ih_api_events"

[vars]
ENVIRONMENT = "production"
ALLOWED_ORIGINS = "https://insighthunter.app,https://www.insighthunter.app,https://auth.insighthunter.app"
RATE_LIMIT_WINDOW_SECONDS = "60"
RATE_LIMIT_MAX_REQUESTS = "120"
PLATFORM_API_BASE = "https://platform.insighthunter.app"
TENANT_BASE_DOMAIN = "tenant.insighthunter.app"
AUTH_URL = "https://auth.insighthunter.app"
PUBLIC_APP_URL = "https://insighthunter.app"
TOML

cat > apps/insighthunter-dispatch/src/index.ts <<'TS'
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
TS

cat > apps/insighthunter-dispatch/sql/0001_workers_for_platforms.sql <<'SQL'
CREATE TABLE IF NOT EXISTS orgs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id
ON memberships (user_id);

CREATE INDEX IF NOT EXISTS idx_memberships_org_id
ON memberships (org_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'lite',
  status TEXT NOT NULL DEFAULT 'inactive',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS tenant_workers (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL UNIQUE,
  worker_name TEXT NOT NULL UNIQUE,
  worker_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  dispatch_namespace TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_tenant_workers_org_id
ON tenant_workers (org_id);

CREATE TABLE IF NOT EXISTS provisioning_jobs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  requested_tier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_org_id
ON provisioning_jobs (org_id);

CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_status
ON provisioning_jobs (status);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  actor_user_id TEXT,
  event_type TEXT NOT NULL,
  payload_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
SQL

cat > apps/insighthunter-platform-worker/wrangler.toml <<'TOML'
name = "insighthunter-platform-worker"
main = "src/index.ts"
compatibility_date = "2026-06-20"
compatibility_flags = ["nodejs_compat"]

[observability]
enabled = true
head_sampling_rate = 1

[[d1_databases]]
binding = "DB"
database_name = "insighthunter-dispatch"
database_id = "2a0331eb-4775-4ad2-9126-0560336486df"

[[analytics_engine_datasets]]
binding = "PLATFORM_EVENTS"
dataset = "ih_platform_events"

[vars]
ENVIRONMENT = "production"
CLOUDFLARE_ACCOUNT_ID = "REPLACE_WITH_ACCOUNT_ID"
TENANT_SCRIPT_NAME = "insighthunter-tenant"
TENANT_BASE_DOMAIN = "tenant.insighthunter.app"
DISPATCH_NAMESPACE = "insighthunter-tenants"
TOML

cat > apps/insighthunter-platform-worker/src/index.ts <<'TS'
export interface Env {
  DB: D1Database;
  PLATFORM_EVENTS: AnalyticsEngineDataset;
  ENVIRONMENT: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  TENANT_SCRIPT_NAME: string;
  TENANT_BASE_DOMAIN: string;
  DISPATCH_NAMESPACE: string;
  CLOUDFLARE_API_TOKEN?: string;
}

interface ProvisionBody {
  jobId: string;
  orgId: string;
  tier: string;
}

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

async function resolveOrgSlug(orgId: string, env: Env): Promise<string> {
  const row = await env.DB.prepare(`SELECT slug FROM orgs WHERE id = ? LIMIT 1`).bind(orgId).first<{ slug: string }>();
  return row?.slug ?? orgId.toLowerCase();
}

async function updateJob(jobId: string, status: string, errorMessage: string | null, env: Env) {
  await env.DB.prepare(
    `UPDATE provisioning_jobs
     SET status = ?, error_message = ?, updated_at = unixepoch()
     WHERE id = ?`
  ).bind(status, errorMessage, jobId).run();
}

async function upsertTenant(orgId: string, slug: string, env: Env) {
  const tenantId = crypto.randomUUID();
  const workerName = `ih-tenant-${slug}`;
  const workerUrl = `https://${workerName}.${env.TENANT_BASE_DOMAIN}`;

  await env.DB.prepare(
    `INSERT INTO tenant_workers (
      id, org_id, tenant_id, worker_name, worker_url, status, dispatch_namespace, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, 'active', ?, unixepoch(), unixepoch())
     ON CONFLICT(org_id) DO UPDATE SET
       worker_name = excluded.worker_name,
       worker_url = excluded.worker_url,
       status = 'active',
       dispatch_namespace = excluded.dispatch_namespace,
       updated_at = unixepoch()`
  ).bind(
    crypto.randomUUID(),
    orgId,
    tenantId,
    workerName,
    workerUrl,
    env.DISPATCH_NAMESPACE
  ).run();

  return { tenantId, workerName, workerUrl };
}

async function provisionTenant(body: ProvisionBody, env: Env) {
  const slug = slugify(await resolveOrgSlug(body.orgId, env));
  const tenant = await upsertTenant(body.orgId, slug, env);

  try {
    env.PLATFORM_EVENTS.writeDataPoint({
      blobs: ["provision", env.ENVIRONMENT, body.tier],
      indexes: [body.orgId, tenant.workerName],
      doubles: [1]
    });
  } catch {}

  return tenant;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return Response.json({ ok: true, service: "platform-worker" });
    }

    if (req.method === "POST" && url.pathname === "/api/provision") {
      const body = await req.json<ProvisionBody>();

      try {
        await updateJob(body.jobId, "processing", null, env);
        const tenant = await provisionTenant(body, env);
        await updateJob(body.jobId, "completed", null, env);
        return Response.json({ ok: true, tenant });
      } catch (error) {
        await updateJob(body.jobId, "failed", error instanceof Error ? error.message : "Unknown error", env);
        return Response.json({ error: "Provisioning failed" }, { status: 500 });
      }
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }
};
TS

cat > apps/insighthunter-tenant/wrangler.toml <<'TOML'
name = "insighthunter-tenant"
main = "src/index.ts"
compatibility_date = "2026-06-20"
compatibility_flags = ["nodejs_compat"]

[observability]
enabled = true
head_sampling_rate = 1

[[d1_databases]]
binding = "DB"
database_name = "insighthunter-main"
database_id = "04854880-81f5-4c02-b555-905a34492b92"

[vars]
ENVIRONMENT = "production"
PUBLIC_APP_URL = "https://insighthunter.app"
AUTH_URL = "https://auth.insighthunter.app"
TOML

cat > apps/insighthunter-tenant/src/index.ts <<'TS'
export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  PUBLIC_APP_URL: string;
  AUTH_URL: string;
}

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "tenant-worker" });
    }

    if (url.pathname.startsWith("/api/bizforma")) {
      return json({ ok: true, app: "bizforma", path: url.pathname });
    }

    if (url.pathname.startsWith("/api/bookkeeping")) {
      return json({ ok: true, app: "bookkeeping", path: url.pathname });
    }

    if (url.pathname.startsWith("/api/payroll")) {
      return json({ ok: true, app: "payroll", path: url.pathname });
    }

    if (url.pathname.startsWith("/api/report")) {
      return json({ ok: true, app: "report", path: url.pathname });
    }

    if (url.pathname.startsWith("/api/scout")) {
      return json({ ok: true, app: "scout", path: url.pathname });
    }

    if (url.pathname.startsWith("/api/pbx")) {
      return json({ ok: true, app: "pbx", path: url.pathname });
    }

    return json({ ok: true, message: "tenant online" });
  }
};
TS

cat > apps/insighthunter-main/wrangler.toml <<'TOML'
name = "insighthunter-main"
pages_build_output_dir = "dist"
compatibility_date = "2026-06-20"
compatibility_flags = ["nodejs_compat"]

[observability]
enabled = true
head_sampling_rate = 1

[[d1_databases]]
binding = "DB"
database_name = "insighthunter-main"
database_id = "04854880-81f5-4c02-b555-905a34492b92"

[[services]]
binding = "DISPATCH_WORKER"
service = "insighthunter-dispatch"

[[services]]
binding = "AUTH_WORKER"
service = "insighthunter-auth"

[[kv_namespaces]]
binding = "SESSIONS"
id = "60e34ba310ca40c79edec05470c7a271"
preview_id = "60e34ba310ca40c79edec05470c7a271"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "f75a15f1df8c42cdb2e623d8cb324a23"
preview_id = "f75a15f1df8c42cdb2e623d8cb324a23"

[[analytics_engine_datasets]]
binding = "PAGE_VIEWS"
dataset = "ih_page_views"

[vars]
PUBLIC_APP_URL = "https://insighthunter.app"
DISPATCH_URL = "https://dispatch.insighthunter.app"
AUTH_URL = "https://auth.insighthunter.app"
TOML

cat > 'apps/insighthunter-main/functions/api/[[path]].ts' <<'TS'
export const onRequest = async (context: any) => {
  const request = context.request as Request;
  const env = context.env;
  const url = new URL(request.url);
  const proxied = new URL(`/api/${context.params.path ?? ""}${url.search}`, env.DISPATCH_URL);

  const headers = new Headers(request.headers);
  headers.set("X-Forwarded-Host", url.host);
  headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));

  return env.DISPATCH_WORKER.fetch(
    new Request(proxied.toString(), {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual"
    })
  );
};
TS

echo "Patch applied."
echo "Next:"
echo "1. git diff"
echo "2. wrangler d1 execute insighthunter-dispatch --file apps/insighthunter-dispatch/sql/0001_workers_for_platforms.sql"
echo "3. wrangler deploy apps/insighthunter-platform-worker"
echo "4. wrangler deploy apps/insighthunter-tenant"
echo "5. wrangler deploy apps/insighthunter-dispatch"
echo "6. wrangler deploy apps/insighthunter-main"
