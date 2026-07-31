// packages/platform-middleware/index.ts
// Auth + org + RBAC gate used by EVERY app Worker

import { verifyToken, canAccess, type TokenPayload, type AppSlug, type Env } from "@insighthunter/auth";

export interface AuthContext {
  user: TokenPayload;
  orgId: string;
  role: string;
}

export function withAuth(appSlug: AppSlug) {
  return async function authMiddleware(
    request: Request,
    env: Env,
    next: (ctx: AuthContext) => Promise<Response>
  ): Promise<Response> {
    const authHeader = request.headers.get("Authorization");
    const cookieToken = getCookieToken(request);
    const token = authHeader?.replace("Bearer ", "") ?? cookieToken;

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await verifyToken(token, env.JWT_SECRET);
    if (!payload) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!canAccess(payload.role, appSlug)) {
      return new Response(JSON.stringify({ error: "Forbidden", app: appSlug, role: payload.role }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    return next({ user: payload, orgId: payload.org, role: payload.role });
  };
}

function getCookieToken(request: Request): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/ih_session=([^;]+)/);
  return match?.[1] ?? null;
}
