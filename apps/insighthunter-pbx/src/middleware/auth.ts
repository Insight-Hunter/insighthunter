import type { Context, Next } from "hono";
import type { Env } from "../index.js";

export type Session = {
  userId: string;
  orgId: string;
  role: string;
  email: string;
};

export function getSession(req: Request): Session | null {
  const userId = req.headers.get("X-User-Id");
  const orgId = req.headers.get("X-Org-Id");
  const role = req.headers.get("X-User-Role");
  const email = req.headers.get("X-User-Email");
  if (!userId || !orgId || !role || !email) return null;
  return { userId, orgId, role, email };
}

export async function requireAuth(
  c: Context<{ Bindings: Env }>,
  next: Next,
): Promise<Response | undefined> {
  if (!getSession(c.req.raw)) return c.json({ error: "unauthorized" }, 401);
  await next();
}
