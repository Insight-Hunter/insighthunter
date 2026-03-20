import { createUserDatabase, seedUserDatabase } from "./d1";
import { deployUserWorker, PlanTier } from "./worker-deploy";

export interface ProvisionResult {
  userId: string;
  databaseId: string;
  workerName: string;
  plan: PlanTier;
}

export async function provisionNewUser(opts: {
  accountId: string;
  apiToken: string;
  namespace: string;   // your dispatch namespace name, e.g. "insight-hunter-prod"
  userId: string;      // Insight Hunter account ID
  plan?: PlanTier;
}): Promise<ProvisionResult> {
  const { accountId, apiToken, namespace, userId, plan = "lite" } = opts;

  console.log(`[provision] Starting for user: ${userId} on plan: ${plan}`);

  // 1. Create isolated D1 database
  const { databaseId } = await createUserDatabase(accountId, apiToken, userId);
  console.log(`[provision] D1 created: ${databaseId}`);

  // 2. Seed with Insight Hunter schema
  await seedUserDatabase(accountId, apiToken, databaseId);
  console.log(`[provision] Schema seeded`);

  // 3. Deploy isolated Worker with correct bindings for plan
  await deployUserWorker({
    accountId, apiToken, namespace, userId,
    databaseId,
    kvNamespaceId: null, // null for lite; upgrade.ts handles Standard/Pro
    plan,
  });
  console.log(`[provision] Worker deployed: user-${userId}`);

  return {
    userId,
    databaseId,
    workerName: `user-${userId}`,
    plan,
  };
}

