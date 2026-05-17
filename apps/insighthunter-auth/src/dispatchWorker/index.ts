// src/backend/dispatchWorker/index.ts
// Deployed SEPARATELY as "insighthunter-dispatch"
// This Worker sits in front of all tenant traffic.

interface Env {
  TENANT_DISPATCHER: DispatchNamespace; // the "ih-tenants" namespace
  ORG_ROUTES: KVNamespace;             // maps hostname/path → orgId
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // --- Routing strategy 1: subdomain  (org-abc.insighthunter.app) ---
    const subdomain = url.hostname.split(".")[0];

    // --- Routing strategy 2: X-IH-Org-ID header (internal service calls) ---
    const headerOrgId = request.headers.get("X-IH-Org-ID");

    // --- Routing strategy 3: KV lookup (custom domains) ---
    const kvOrgId = await env.ORG_ROUTES.get(url.hostname);

    const orgId = headerOrgId ?? kvOrgId ?? subdomain;

    if (!orgId) {
      return Response.json({ error: "Cannot resolve tenant" }, { status: 400 });
    }

    const scriptName = `tenant-${orgId}`;

    try {
      // Retrieve the tenant's Worker from the dispatch namespace
      const userWorker = env.TENANT_DISPATCHER.get(scriptName, {
        // Optional: enforce per-tenant CPU limits based on tier
        // limits: { cpuMs: 50 },
      });

      // Forward the request to the tenant Worker
      return await userWorker.fetch(request);
    } catch (err: any) {
      // Tenant Worker not found (e.g. provisioning still in progress)
      if (err.message?.includes("does not exist")) {
        return Response.json(
          {
            error: "Tenant not yet provisioned",
            orgId,
            retryAfterSeconds: 5,
          },
          { status: 503, headers: { "Retry-After": "5" } }
        );
      }

      console.error(`Dispatch error for org=${orgId}:`, err);
      return Response.json({ error: "Internal error" }, { status: 500 });
    }
  },
};
