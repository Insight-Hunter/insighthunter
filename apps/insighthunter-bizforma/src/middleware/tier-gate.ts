// middleware/tier-gate.ts — Standard/Pro plan gate (reads X-Org-Plan from gateway)
// NOTE: bizforma_compliance addon bypass from the legacy worker is NOT implemented
// here because apps/gateway has no addon field in its session model yet (only
// session.plan -> X-Org-Plan). Re-add the bypass once addons ship platform-wide.
import type { Context, Next } from "hono";
import type { BizformaEnv } from "../types.js";

type OrgPlan = "startup" | "standard" | "pro";

const TIER_RANK: Record<OrgPlan, number> = { startup: 0, standard: 1, pro: 2 };

function rankOf(plan: string): number {
  return plan in TIER_RANK ? TIER_RANK[plan as OrgPlan] : -1;
}

export async function requireBizformaTier(
  c: Context<{ Bindings: BizformaEnv }>,
  next: Next,
): Promise<Response | void> {
  const orgPlan = c.get("orgPlan");

  if (!orgPlan || rankOf(orgPlan) < TIER_RANK.standard) {
    return c.json(
      {
        error: "upgrade_required",
        detail: "BizForma requires the Standard plan or above.",
      },
      403,
    );
  }

  await next();
}
