import type { FeatureKey } from "./plans.js";
import { getPlanFeatures } from "./plans.js";

export type SubscriptionRecord = {
  id: string;
  customer_id: string;
  plan_code: string;
  status: string;
  current_period_end?: string | null;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

export function subscriptionCanGrantEntitlements(status: string): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(status);
}

export async function syncEntitlementsForSubscription(
  db: D1Database,
  subscription: SubscriptionRecord,
): Promise<void> {
  const now = new Date().toISOString();

  if (!subscriptionCanGrantEntitlements(subscription.status)) {
    await db.prepare(
      `UPDATE entitlements
       SET status = 'inactive',
           expires_at = COALESCE(?, expires_at, ?),
           updated_at = ?
       WHERE subscription_id = ?`
    ).bind(
      subscription.current_period_end ?? null,
      now,
      now,
      subscription.id,
    ).run();

    return;
  }

  const features = getPlanFeatures(subscription.plan_code);

  await db.prepare(
    `UPDATE entitlements
     SET status = 'inactive',
         expires_at = COALESCE(?, expires_at),
         updated_at = ?
     WHERE subscription_id = ?`
  ).bind(
    subscription.current_period_end ?? null,
    now,
    subscription.id,
  ).run();

  for (const featureKey of features) {
    const existing = await db.prepare(
      `SELECT id
       FROM entitlements
       WHERE customer_id = ? AND feature_key = ?
       LIMIT 1`
    ).bind(subscription.customer_id, featureKey).first<{ id: string }>();

    if (existing?.id) {
      await db.prepare(
        `UPDATE entitlements
         SET subscription_id = ?,
             status = 'active',
             source = 'plan',
             expires_at = ?,
             metadata_json = ?,
             updated_at = ?
         WHERE id = ?`
      ).bind(
        subscription.id,
        subscription.current_period_end ?? null,
        JSON.stringify({ plan_code: subscription.plan_code }),
        now,
        existing.id,
      ).run();
      continue;
    }

    await db.prepare(
      `INSERT INTO entitlements (
        id,
        customer_id,
        subscription_id,
        feature_key,
        status,
        source,
        granted_at,
        expires_at,
        metadata_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'active', 'plan', ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      subscription.customer_id,
      subscription.id,
      featureKey,
      now,
      subscription.current_period_end ?? null,
      JSON.stringify({ plan_code: subscription.plan_code }),
      now,
      now,
    ).run();
  }
}

export async function customerHasEntitlement(
  db: D1Database,
  customerId: string,
  featureKey: FeatureKey,
): Promise<boolean> {
  const row = await db.prepare(
    `SELECT id
     FROM entitlements
     WHERE customer_id = ?
       AND feature_key = ?
       AND status = 'active'
       AND (expires_at IS NULL OR expires_at >= ?)
     LIMIT 1`
  ).bind(customerId, featureKey, new Date().toISOString()).first<{ id: string }>();

  return Boolean(row?.id);
}
