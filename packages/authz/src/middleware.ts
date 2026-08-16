// Hono middleware for session-gated routes across all InsightHunter apps
import type { Context, Next } from "hono";
import type { IHSession, OrgRole, Permission } from "./types";

type KVEnv = { KV_SESSIONS: KVNamespace };

const LOGIN_URL = "https://auth.insighthunter.app/login";

// Use in HTML-rendered apps — redirects to login on failure
export function authGuard(loginUrl = LOGIN_URL) {
  return async (c: Context<{ Bindings: KVEnv }>, next: Next) => {
    const sessionId = extractSessionId(c.req.raw);
    if (!sessionId) return c.redirect(`${loginUrl}?redirect=${encodeURIComponent(c.req.url)}`);
    const session = (await c.env.KV_SESSIONS.get(
      `session:${sessionId}`,
      "json",
    )) as IHSession | null;
    if (!session || session.expiresAt < Math.floor(Date.now() / 1000)) {
      return c.redirect(`${loginUrl}?error=expired`);
    }
    c.set("session" as never, session);
    await next();
  };
}

// Use in API routes — returns 401 JSON instead of redirect
export function apiAuthGuard() {
  return async (c: Context<{ Bindings: KVEnv }>, next: Next) => {
    const sessionId = extractSessionId(c.req.raw) ?? c.req.header("X-Session-Token");
    if (!sessionId) return c.json({ error: "Unauthorized" }, 401);
    const session = (await c.env.KV_SESSIONS.get(
      `session:${sessionId}`,
      "json",
    )) as IHSession | null;
    if (!session || session.expiresAt < Math.floor(Date.now() / 1000)) {
      return c.json({ error: "Session expired" }, 401);
    }
    c.set("session" as never, session);
    await next();
  };
}

// Chain after authGuard to restrict by role
export function requireRole(...roles: OrgRole[]) {
  return async (c: Context, next: Next) => {
    const session = c.get("session" as never) as IHSession;
    if (!session || !roles.includes(session.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}

// Chain after authGuard to restrict by permission
export function requirePermission(permission: Permission) {
  return async (c: Context, next: Next) => {
    const session = c.get("session" as never) as IHSession;
    if (!session) return c.json({ error: "Forbidden" }, 403);
    const { ROLE_PERMISSIONS } = await import("./index");
    const perms = ROLE_PERMISSIONS[session.role] ?? [];
    if (!perms.includes(permission)) return c.json({ error: "Forbidden" }, 403);
    await next();
  };
}

// Helper — pull session from KV by cookie
export function getSession(c: Context): IHSession {
  return c.get("session" as never) as IHSession;
}

export function getOrgId(c: Context): string {
  return getSession(c).orgId;
}

function extractSessionId(request: Request): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/ih_session=([^;\s]+)/);
  return match?.[1] ?? null;
}
