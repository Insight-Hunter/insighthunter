// packages/platform-middleware/src/require-permission.ts
import type { Context, Next } from "hono";
import { requireAuth, requirePermission, type Env, type Permission } from "@insighthunter/authz";

export function requireOrgPermission(permission: Permission) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const orgId = c.req.param("orgId") || c.req.header("x-org-id");
    if (!orgId) return c.json({ error: "Missing organization context" }, 400);

    try {
      const auth = await requireAuth(c.req.raw, c.env, orgId);
      requirePermission(auth, permission);
      c.set("auth", auth);
      await next();
    } catch (error) {
      if (error instanceof Response) return error;
      return c.json({ error: "Unauthorized" }, 401);
    }
  };
}

