import Cloudflare from "cloudflare";
import type { Env } from "../types";

export interface ProvisionedTenant {
  orgId: string;
  scriptName: string;
  kvNamespaceId: string;
  dispatchNamespace: string;
}

// The default Worker script every new tenant gets at signup.
// It's a thin, safe passthrough — no user code runs here.
// Customers can later upload custom logic through the platform.
const DEFAULT_TENANT_WORKER = (orgId: string, tier: string) => `
// InsightHunter tenant Worker — auto-provisioned at signup
// org: ${orgId}  tier: ${tier}
export default {
  async fetch(request, env) {
    // Default: forward all requests to the platform API
    // This can be replaced by tenant-customized logic later
    const url = new URL(request.url);

    // Expose tenant context in a header for downstream workers
    const headers = new Headers(request.headers);
    headers.set("X-IH-Org-ID", "${orgId}");
    headers.set("X-IH-Tier", "${tier}");

    return new Response(
      JSON.stringify({
        tenant: "${orgId}",
        tier: "${tier}",
        path: url.pathname,
        status: "active",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  },
};
`;

export class TenantProvisioningService {
  private cf: Cloudflare;
  private accountId: string;
  private dispatchNamespace: string;

  constructor(env: Env) {
    this.cf = new Cloudflare({ apiToken: env.CF_API_TOKEN });
    this.accountId = env.CF_ACCOUNT_ID;
    this.dispatchNamespace = env.WFP_DISPATCH_NAMESPACE; // e.g. "ih-tenants"
  }

  /**
   * Full tenant provisioning called during signup.
   * Idempotent: safe to retry if a step fails (uses orgId as script name).
   */
  async provision(
    orgId: string,
    tier: string
  ): Promise<ProvisionedTenant> {
    const scriptName = `tenant-${orgId}`;

    // Step 1: Create a KV namespace for this tenant
    const kv = await this.cf.kv.namespaces.create({
      account_id: this.accountId,
      title: `ih-tenant-${orgId}`,
    });
    const kvNamespaceId = kv.id!;

    // Step 2: Upload the default Worker to the dispatch namespace
    // with the KV binding and tags (orgId, tier, env)
    const workerScript = DEFAULT_TENANT_WORKER(orgId, tier);
    const workerBlob = new Blob([workerScript], {
      type: "application/javascript+module",
    });

    // Metadata for the upload: bindings + compatibility
    const metadata = {
      main_module: "worker.js",
      compatibility_date: "2025-03-07",
      compatibility_flags: ["nodejs_compat"],
      bindings: [
        {
          type: "kv_namespace",
          name: "TENANT_KV",
          namespace_id: kvNamespaceId,
        },
      ],
      tags: [
        `org:${orgId}`,
        `tier:${tier}`,
        `env:production`,
      ],
    };

    const metadataBlob = new Blob([JSON.stringify(metadata)], {
      type: "application/json",
    });

    // Use FormData for multipart upload (required by WfP API)
    const formData = new FormData();
    formData.append("metadata", metadataBlob, "metadata.json");
    formData.append("worker.js", workerBlob, "worker.js");

    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/workers/dispatch/namespaces/${this.dispatchNamespace}/scripts/${scriptName}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${(this.cf as any)._options.apiToken}`,
        },
        body: formData,
      }
    );

    return {
      orgId,
      scriptName,
      kvNamespaceId,
      dispatchNamespace: this.dispatchNamespace,
    };
  }

  /**
   * Update worker script (e.g. after tier upgrade or custom logic upload).
   */
  async updateScript(
    orgId: string,
    scriptContent: string,
    bindings: object[] = []
  ): Promise<void> {
    const scriptName = `tenant-${orgId}`;
    const workerBlob = new Blob([scriptContent], {
      type: "application/javascript+module",
    });

    const metadata = {
      main_module: "worker.js",
      compatibility_date: "2025-03-07",
      compatibility_flags: ["nodejs_compat"],
      bindings,
    };

    const formData = new FormData();
    formData.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" }),
      "metadata.json"
    );
    formData.append("worker.js", workerBlob, "worker.js");

    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/workers/dispatch/namespaces/${this.dispatchNamespace}/scripts/${scriptName}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${(this.cf as any)._options.apiToken}`,
        },
        body: formData,
      }
    );
  }

  /**
   * Deprovision: delete the Worker + KV namespace.
   * Called on account deletion / GDPR erasure.
   */
  async deprovision(orgId: string, kvNamespaceId: string): Promise<void> {
    const scriptName = `tenant-${orgId}`;

    await Promise.allSettled([
      // Delete user Worker from dispatch namespace
      this.cf.workersForPlatforms.dispatch.namespaces.scripts.delete(
        this.dispatchNamespace,
        scriptName,
        { account_id: this.accountId }
      ),
      // Delete the tenant KV namespace
      this.cf.kv.namespaces.delete(kvNamespaceId, {
        account_id: this.accountId,
      }),
    ]);
  }

  /**
   * List all tenant workers in the namespace (useful for admin/billing).
   */
  async listTenantWorkers(tag?: string) {
    const url = new URL(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/workers/dispatch/namespaces/${this.dispatchNamespace}/scripts`
    );
    if (tag) url.searchParams.set("tags", tag);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${(this.cf as any)._options.apiToken}`,
      },
    });
    return res.json();
  }
}
