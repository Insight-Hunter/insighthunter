// apps/insighthunter-pbx/src/backend/middleware/tenant.ts
//
// Planning stub. Today, tenant scoping for authenticated API routes is done
// inline in each route via `getSession(c.req.raw).orgId` (see
// middleware/auth.ts), and inbound-webhook tenant resolution is handled by
// services/tenant-resolution.ts. This file is reserved for a future
// Hono middleware that attaches a validated `{ orgId }` context value once
// routes grow numerous enough that repeating the inline check becomes risky.
// TODO(tenant): extract the common `getSession(...).orgId` + 401 pattern used
// across routes/*.ts into middleware here.
import type { Context, Next } from "hono";
import type { Env } from "../types.js";
import { getSession } from "./auth.js";

export async function attachTenant(
  c: Context<{ Bindings: Env; Variables: { orgId: string } }>,
  next: Next,
): Promise<Response | undefined> {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  c.set("orgId", session.orgId);
  await next();
}
