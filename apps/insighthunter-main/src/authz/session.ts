// authz/session.ts
// Session resolution for insighthunter-main.
// The gateway (apps/gateway) validates ih_session against KV_SESSIONS and
// injects X-* identity headers before proxying here. This module reads those
// headers — no KV lookup needed in this Worker.

import type { Context } from "hono";
import type { Env } from "../index.js";

export type Session = {
  userId: string;
  orgId: string;
  role: string;
  email: string;
  name: string;
  orgName: string;
  orgSlug: string;
  orgPlan: string;
};

/**
 * Reads the X-* identity headers injected by apps/gateway.
 * Returns null if any required header is absent (gateway didn't auth the request).
 */
export function fromGatewayHeaders(req: Request): Session | null {
  const userId = req.headers.get("X-User-Id");
  const orgId = req.headers.get("X-Org-Id");
  const role = req.headers.get("X-User-Role");
  const email = req.headers.get("X-User-Email");
  const name = req.headers.get("X-User-Name") ?? email ?? "Unknown";
  const orgName = req.headers.get("X-Org-Name") ?? "My Org";
  const orgSlug = req.headers.get("X-Org-Slug") ?? "";
  const orgPlan = req.headers.get("X-Org-Plan") ?? "starter";

  if (!userId || !orgId || !role || !email) return null;

  return { userId, orgId, role, email, name, orgName, orgSlug, orgPlan };
}

/**
 * Convenience wrapper: reads session from gateway headers on a Hono context.
 * Use in API route handlers: const session = requireSession(c); if (!session) return 401;
 */
export function requireSession(c: Context<{ Bindings: Env }>): Session | null {
  return fromGatewayHeaders(c.req.raw);
}
