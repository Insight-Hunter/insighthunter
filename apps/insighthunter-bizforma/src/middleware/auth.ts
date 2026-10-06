import type { MiddlewareHandler } from "hono";
import { unauthorized } from "../utils/http.js";

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return unauthorized(c);

  c.set("authToken", token);

  const orgId = c.req.header("x-org-id") ?? "";
  const userId = c.req.header("x-user-id") ?? "";
  if (!orgId || !userId) {
    return unauthorized(c, "Missing org or user context");
  }

  c.set("orgId", orgId);
  c.set("userId", userId);
  await next();
};
