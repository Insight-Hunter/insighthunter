// middleware/tier-gate.ts — Standard/Pro plan or bizforma_compliance addon gate
import type { Context, Next } from "hono";
import type { BizformaEnv } from "../types.js";

interface EntitlementAddon {
  module: string;
  status: string;
}

interface EntitlementsResponse {
  accountTier: "startup" | "standard" | "pro";
  addons: EntitlementAddon[];
}

const TIER_RANK = { startup: 0, standard: 1, pro: 2 } as const;

export async function requireBizformaTier(
  c: Context<{ Bindings: BizformaEnv }>,
  next: Next,
): Promise<Response | void> {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return c.json({ error: "Unauthorized", code: "MISSING_TOKEN" }, 401);

  const entitlements = await fetchEntitlements(c.env, token);
  const hasBizformaAddon = entitlements?.addons.some(
    (a) => a.module === "bizforma_compliance" && a.status === "active",
  );

  if (!entitlements || (TIER_RANK[entitlements.accountTier] < TIER_RANK.standard && !hasBizformaAddon)) {
    return c.json(
      {
        error: "upgrade_required",
        detail: "BizForma requires the Standard plan or above, or the BizForma Compliance add-on.",
      },
      403,
    );
  }

  await next();
}

async function fetchEntitlements(
  env: BizformaEnv,
  token: string,
): Promise<EntitlementsResponse | null> {
  const res = await fetch(`${env.AUTH_URL}/entitlements`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as EntitlementsResponse;
}
