// src/backend/services/uploadTenantScriptSdk.ts
import Cloudflare from "cloudflare";

export async function uploadTenantScriptSdk(opts: {
  apiToken: string;
  accountId: string;
  dispatchNamespace: string;
  scriptName: string;
  scriptContent: string;
  kvNamespaceId: string;
  orgId: string;
  tier: string;
}) {
  const cf = new Cloudflare({ apiToken: opts.apiToken });

  // The SDK wraps the same multipart upload — pass metadata + script as FormData
  const form = new FormData();

  const metadata = {
    main_module: "worker.js",
    compatibility_date: "2025-03-07",
    bindings: [
      { type: "kv_namespace", name: "TENANT_KV", namespace_id: opts.kvNamespaceId },
    ],
    tags: [`org:${opts.orgId}`, `tier:${opts.tier}`],
  };

  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    "metadata.json"
  );
  form.append(
    "worker.js",
    new Blob([opts.scriptContent], { type: "application/javascript+module" }),
    "worker.js"
  );

  return cf.workersForPlatforms.dispatch.namespaces.scripts.update(
    opts.dispatchNamespace,
    opts.scriptName,
    {
      account_id: opts.accountId,
      // @ts-expect-error SDK accepts FormData as the body
    } as any,
    { body: form }
  );
}
