

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
  const row = await env.DB.prepare("SELECT slug FROM orgs WHERE id = ? LIMIT 1")
    .bind(orgId)
    .first<{ slug: string }>();
  return row?.slug ?? orgId.toLowerCase();
}

async function updateJob(jobId: string, status: string, errorMessage: string | null, env: Env) {
  await env.DB.prepare(
    `UPDATE provisioning_jobs
     SET status = ?, error_message = ?, updated_at = unixepoch()
     WHERE id = ?`
  )
    .bind(status, errorMessage, jobId)
    .run();
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
  )
    .bind(
      crypto.randomUUID(),
      orgId,
      tenantId,
      workerName,
      workerUrl,
      env.DISPATCH_NAMESPACE
    )
    .run();

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
