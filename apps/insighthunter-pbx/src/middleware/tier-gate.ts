import type { Context, Next } from "hono";
import type { Env } from "../index.js";

const TIER_RANK: Record<string, number> = {
  starter: 0,
  growth: 1,
  pro: 2,
  enterprise: 3,
};
const MINIMUM_TIER = 1;

export async function requirePbxTier(
  c: Context<{ Bindings: Env }>,
  next: Next,
): Promise<Response | undefined> {
  const plan = c.req.header("X-Org-Plan") ?? "starter";
  if ((TIER_RANK[plan] ?? -1) < MINIMUM_TIER) {
    return c.json(
      { error: "upgrade_required", detail: "PBX requires the Growth plan or above." },
      403,
    );
  }
  await next();
}
