import type { Env, Tier } from "../types.js";
import { TIER_LIMITS } from "../types.js";

export async function getUsage(
  orgId: string,
  tier: Tier,
  env: Env
): Promise<{
  txCount: number;
  txLimit: number;
  pctUsed: number;
  month: string;
}> {
  const month = new Date().toISOString().slice(0, 7);
  const key = `txcount:${orgId}:${month}`;
  const raw = await env.TIER_USAGE.get(key);
  const txCount = raw ? parseInt(raw, 10) : 0;
  const txLimit = TIER_LIMITS[tier].txPerMonth;
  const pctUsed =
    txLimit === Infinity ? 0 : Math.round((txCount / txLimit) * 100);
  return { txCount, txLimit, pctUsed, month };
}
