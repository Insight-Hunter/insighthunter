import { Hono } from "hono";
import { z } from "zod";
import type { Env, AccessTokenPayload, Role } from "@/types";
import { validateBody } from "@/middleware/validate";
import { verifyAccessToken } from "@/lib/jwt";
import { assignRole, getOrgRoles } from "@/services/roleService";
import { trackAuthEvent } from "@/lib/analytics";
import { logger } from "@/lib/logger";

const AssignSchema = z.object({
  userId: z.string().uuid(),
  role:   z.enum(["owner", "admin", "member", "viewer"]),
});

const roles = new Hono<{ Bindings: Env }>();

// Require auth on all role routes
roles.use("*", async (c, next) => {
  const token = (c.req.header("Authorization") ?? "").replace("Bearer ", "");
  const payload = await verifyAccessToken(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: "Unauthorized" }, 401);
  (c as any).set("user", payload);
  await next();
});

// GET /roles — list org roles
roles.get("/", async (c) => {
  const user = (c as any).get("user") as AccessTokenPayload;
  if (!["owner", "admin"].includes(user.role)) {
    return c.json({ error: "Forbidden. Admin or Owner required." }, 403);
  }
  const list = await getOrgRoles(c.env, user.orgId);
  return c.json({ ok: true,  list });
});

// POST /roles/assign — assign a role to a user
roles.post(
  "/assign",
  validateBody(AssignSchema),
  async (c) => {
    const user   = (c as any).get("user") as AccessTokenPayload;
    const body   = (c as any).get("body") as z.infer<typeof AssignSchema>;

    if (!["owner", "admin"].includes(user.role)) {
      return c.json({ error: "Forbidden. Admin or Owner required." }, 403);
    }

    try {
      await assignRole(c.env, user.orgId, user.sub, user.role as Role, body.userId, body.role);
      trackAuthEvent(c.env, "role_assigned", user.orgId, { targetUserId: body.userId, newRole: body.role });
      return c.json({ ok: true, message: `Role '${body.role}' assigned.` });
    } catch (e: any) {
      logger.warn("Role assignment failed", { error: e.message });
      return c.json({ error: e.message }, e.status ?? 500);
    }
  }
);

export default roles;
