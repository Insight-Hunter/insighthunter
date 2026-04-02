import { Hono } from "hono";
import type { Env } from "../types.js";
import { authMiddleware } from "../middleware/auth.js";
import { getUsage } from "../services/tierService.js";
import { TIER_LIMITS } from "../types.js";

const billing = new Hono<{ Bindings: Env }>();
billing.use("*", authMiddleware);

// GET /api/billing/usage — current tier + usage
billing.get("/usage", async (c) => {
  const user = c.get("user");
  const usage = await getUsage(user.orgId, user.tier, c.env);
  const limits = TIER_LIMITS[user.tier];

  return c.json({
    tier: user.tier,
    usage,
    features: limits,
    upgradeUrl: "https://insighthunter.app/dashboard/upgrade",
  });
});

export default billing;
