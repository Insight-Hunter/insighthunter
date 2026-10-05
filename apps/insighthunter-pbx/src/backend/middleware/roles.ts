// apps/insighthunter-pbx/src/backend/middleware/roles.ts
//
// Planning stub for per-route role/permission enforcement beyond the
// coarse tier-gate check in middleware/tier-gate.ts (docs/insight-pbx
// -master-prompt.md §5.1 entitlements, §4.1 org roles). No route currently
// distinguishes admin/manager/agent roles — getSession(...).role exists but
// is unused by any handler today.
// TODO(roles): build a `requireRole(...roles: string[])` middleware factory
// once role-gated routes (e.g. billing.ts, onboarding.ts) are implemented.
import type { Context, Next } from "hono";
import type { Env } from "../types.js";
import { getSession } from "./auth.js";

export function requireRole(...allowed: string[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next): Promise<Response | undefined> => {
    const session = getSession(c.req.raw);
    if (!session || !allowed.includes(session.role)) {
      return c.json({ error: "forbidden" }, 403);
    }
    await next();
  };
}
