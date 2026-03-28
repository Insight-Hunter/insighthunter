import type { Context, Next } from "hono";
import type { Env } from "../types.js";
import { TIER_LIMITS } from "../types.js";

// Enforces transaction volume limits and feature gates per tier
export function tierGate(
  feature: keyof (typeof TIER_LIMITS)[keyof typeof TIER_LIMITS]
) {
  return async (
    c: Context<{ Bindings: Env }>,
    next: Next
  ): Promise<Response | void> => {
    const user = c.get("user");
    const limits = TIER_LIMITS[user.tier];

    if (!(limits as Record<string, unknown>)[feature]) {
      return c.json(
        {
          error: "Feature not available on your current plan",
          feature,
          currentTier: user.tier,
          upgradeUrl: "https://insighthunter.app/dashboard/upgrade",
        },
        402
      );
    }
    return next();
  };
}

// Checks monthly transaction volume before allowing new transaction ingestion
export async function txVolumeCheck(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<Response | void> {
  const user = c.get("user");
  const limits = TIER_LIMITS[user.tier];

  if (limits.txPerMonth === Infinity) return next();

  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const key = `txcount:${user.orgId}:${month}`;
  const raw = await c.env.TIER_USAGE.get(key);
  const count = raw ? parseInt(raw, 10) : 0;

  if (count >= limits.txPerMonth) {
    return c.json(
      {
        error: "Monthly transaction limit reached",
        limit: limits.txPerMonth,
        used: count,
        tier: user.tier,
        upgradeUrl: "https://insighthunter.app/dashboard/upgrade",
      },
      402
    );
  }
  return next();
}

// Increments the monthly transaction count — call after successful ingestion
export async function incrementTxCount(
  orgId: string,
  env: Env,
  amount = 1
): Promise<void> {
  const month = new Date().toISOString().slice(0, 7);
  const key = `txcount:${orgId}:${month}`;
  const raw = await env.TIER_USAGE.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  // TTL = 35 days so it naturally expires after the billing month
  await env.TIER_USAGE.put(key, String(count + amount), {
    expirationTtl: 60 * 60 * 24 * 35,
  });
}
