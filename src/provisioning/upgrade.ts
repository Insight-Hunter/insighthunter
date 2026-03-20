import { deployUserWorker, PlanTier } from "./worker-deploy";

const CF_BASE = "https://api.cloudflare.com/client/v4";

// Creates a new KV namespace for the user on plan upgrade
export async function createUserKVNamespace(
  accountId: string,
  apiToken: string,
  userId: string
): Promise<string> {
  const res = await fetch(`${CF_BASE}/accounts/${accountId}/storage/kv/namespaces`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: `ih-kv-${userId}` }),
  });

  const json = await res.json<{ success: boolean; result: { id: string } }>();
  if (!json.success) throw new Error(`KV create failed for user ${userId}`);
  return json.result.id;
}

// Re-deploys Worker with upgraded bindings — existing D1 data is untouched
export async function upgradeUserPlan(opts: {
  accountId: string;
  apiToken: string;
  namespace: string;
  userId: string;
  databaseId: string;        // existing D1 UUID (from your platform DB)
  newPlan: PlanTier;
}): Promise<{ kvNamespaceId: string | null }> {
  const { accountId, apiToken, userId, newPlan } = opts;

  let kvNamespaceId: string | null = null;

  if (newPlan === "standard" || newPlan === "pro") {
    kvNamespaceId = await createUserKVNamespace(accountId, apiToken, userId);
  }

  await deployUserWorker({ ...opts, kvNamespaceId, plan: newPlan });

  return { kvNamespaceId };
}

