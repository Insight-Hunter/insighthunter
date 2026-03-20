import { USER_WORKER_TEMPLATE } from "./templates/user-worker";

const CF_BASE = "https://api.cloudflare.com/client/v4";

export type PlanTier = "lite" | "standard" | "pro";

interface Binding {
  type: string;
  name: string;
  [key: string]: unknown;
}

function buildBindings(
  databaseId: string,
  kvNamespaceId: string | null,
  plan: PlanTier
): Binding[] {
  const bindings: Binding[] = [
    // All plans get a D1 database
    { type: "d1", name: "USER_DB", id: databaseId },
  ];

  // Standard+ gets KV for dashboard caching
  if ((plan === "standard" || plan === "pro") && kvNamespaceId) {
    bindings.push({ type: "kv_namespace", name: "USER_KV", namespace_id: kvNamespaceId });
  }

  // Pro gets Workers AI
  if (plan === "pro") {
    bindings.push({ type: "ai", name: "AI" });
  }

  return bindings;
}

export async function deployUserWorker(opts: {
  accountId: string;
  apiToken: string;
  namespace: string;
  userId: string;
  databaseId: string;
  kvNamespaceId: string | null;
  plan: PlanTier;
}): Promise<void> {
  const { accountId, apiToken, namespace, userId, databaseId, kvNamespaceId, plan } = opts;

  const metadata = {
    main_module: "worker.mjs",
    compatibility_date: "2025-01-01",
    bindings: buildBindings(databaseId, kvNamespaceId, plan),
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    "metadata.json"
  );
  form.append(
    "worker.mjs",
    new Blob([USER_WORKER_TEMPLATE], { type: "application/javascript+module" }),
    "worker.mjs"
  );

  const res = await fetch(
    `${CF_BASE}/accounts/${accountId}/workers/dispatch/namespaces/${namespace}/scripts/user-${userId}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${apiToken}` },
      body: form,
    }
  );

  const json = await res.json<{ success: boolean; errors: unknown[] }>();
  if (!json.success) throw new Error(`Worker deploy failed: ${JSON.stringify(json.errors)}`);
}

