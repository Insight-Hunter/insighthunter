// middleware/auth.ts — trusts identity headers injected by apps/gateway
import type { Context, Next } from "hono";
import type { BizformaEnv } from "../types.js";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    orgId: string;
    role: string;
    email: string;
    name: string;
    orgPlan: string;
  }
}

export async function requireAuth(
  c: Context<{ Bindings: BizformaEnv }>,
  next: Next,
): Promise<Response | void> {
  const userId = c.req.header("X-User-Id");
  const orgId = c.req.header("X-Org-Id");
  const role = c.req.header("X-User-Role");
  const email = c.req.header("X-User-Email");
  const orgPlan = c.req.header("X-Org-Plan");

  if (!userId || !orgId || !role || !email || !orgPlan) {
    return c.json({ error: "Unauthorized", code: "MISSING_GATEWAY_HEADERS" }, 401);
  }

  c.set("userId", userId);
  c.set("orgId", orgId);
  c.set("role", role);
  c.set("email", email);
  c.set("name", c.req.header("X-User-Name") ?? email);
  c.set("orgPlan", orgPlan);

  await next();
}
