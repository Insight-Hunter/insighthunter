import { defineMiddleware } from "astro:middleware";
import { getSession, getUser, getSessionToken } from "@/lib/auth/session";
import type { Env } from "@/types";

const PUBLIC_PATHS = new Set([
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
]);

const API_PUBLIC = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/qbo/callback",
]);

export const onRequest = defineMiddleware(async ({ locals, request, redirect, url }, next) => {
  const env = (locals as any).runtime?.env as Env | undefined;

  // Skip guard for public routes and static assets
  const path = url.pathname;
  if (PUBLIC_PATHS.has(path) || API_PUBLIC.has(path) || path.startsWith("/_")) {
    return next();
  }

  if (!env) return next(); // dev fallback

  const token = getSessionToken(request);
  if (!token) return redirect("/auth/login?next=" + encodeURIComponent(path), 302);

  const session = await getSession(env.IH_SESSIONS, token);
  if (!session) return redirect("/auth/login?expired=1", 302);

  const user = await getUser(env.IH_SESSIONS, session.userId);
  if (!user) return redirect("/auth/login", 302);

  (locals as any).user = user;
  (locals as any).session = session;

  return next();
});
