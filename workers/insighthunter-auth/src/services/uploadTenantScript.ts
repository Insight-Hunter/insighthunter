// src/backend/services/uploadTenantScript.ts

export interface TenantScriptOptions {
  accountId: string;
  apiToken: string;
  dispatchNamespace: string;  // e.g. "ih-tenants"
  scriptName: string;         // e.g. "tenant-<orgId>"
  scriptContent: string;      // the JS/TS module source
  kvNamespaceId: string;      // pre-created KV namespace ID
  orgId: string;
  tier: "lite" | "standard" | "pro";
  annotations?: {
    message?: string;         // shown in CF dashboard as deployment note
    tag?: string;             // version tag
  };
}

export interface UploadResult {
  id: string;
  etag: string;
  startup_time_ms: number;
  modified_on: string;
}

/**
 * Uploads a tenant Worker to the WfP dispatch namespace.
 * Uses multipart/form-data with a metadata part + script module part.
 *
 * PUT /accounts/{account_id}/workers/dispatch/namespaces/{namespace}/scripts/{script_name}
 */
export async function uploadTenantScript(
  opts: TenantScriptOptions
): Promise<UploadResult> {
  const {
    accountId,
    apiToken,
    dispatchNamespace,
    scriptName,
    scriptContent,
    kvNamespaceId,
    orgId,
    tier,
    annotations,
  } = opts;

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/dispatch/namespaces/${dispatchNamespace}/scripts/${scriptName}`;

  // ---------- 1. Build metadata (equivalent to wrangler.jsonc) ----------
  const metadata = {
    main_module: "worker.js",            // must match the FormData part name
    compatibility_date: "2025-03-07",
    compatibility_flags: ["nodejs_compat"],

    // Bindings available inside this tenant's Worker via `env.*`
    bindings: [
      {
        type: "kv_namespace",
        name: "TENANT_KV",              // env.TENANT_KV inside the worker
        namespace_id: kvNamespaceId,
      },
      // Add more bindings per tier here, e.g. AI binding for Pro:
      // tier === "pro"
      //   ? { type: "ai", name: "AI" }
      //   : null,
    ].filter(Boolean),

    // Tags — used for bulk operations (e.g. delete all workers for an org)
    tags: [
      `org:${orgId}`,
      `tier:${tier}`,
      `env:production`,
    ],

    // Version annotations (visible in Cloudflare dashboard)
    annotations: {
      "workers/message": annotations?.message ?? `Provisioned for org ${orgId}`,
      "workers/tag": annotations?.tag ?? `signup-${new Date().toISOString().slice(0, 10)}`,
    },
  };

  // ---------- 2. Build multipart/form-data ----------
  const form = new FormData();

  // Part 1: metadata (MUST be named "metadata", MUST come first)
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    "metadata.json"
  );

  // Part 2: the script module (name must match metadata.main_module)
  form.append(
    "worker.js",                         // matches main_module above
    new Blob([scriptContent], { type: "application/javascript+module" }),
    "worker.js"
  );

  // ---------- 3. PUT to WfP API ----------
  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      // Do NOT set Content-Type — fetch sets it automatically with the boundary
    },
    body: form,
  });

  const json = await res.json<{
    success: boolean;
    errors: Array<{ code: number; message: string }>;
    result: UploadResult;
  }>();

  if (!json.success) {
    const msg = json.errors.map((e) => `[${e.code}] ${e.message}`).join("; ");
    throw new Error(`WfP script upload failed: ${msg}`);
  }

  return json.result;
}
