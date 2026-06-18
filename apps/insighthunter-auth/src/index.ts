// index.ts — InsightHunter Auth Worker
//
// Route map:
//   GET  /health          → liveness probe
//   GET  /callback        → Cloudflare Access JWT → session cookie
//   POST /auth/register   → email+password registration (sends verify email)
//   GET  /auth/verify     → consumes verify token, creates user + session
//   GET  *                → branded login page (Cloudflare Access UI)

import { validateAccessJWT, getIdentity } from "./access";
import { handleRegister } from "./register";
import { handleVerify } from "./verify";
import { loginPageHTML } from "./login-page";
import type { Env } from "./types";
import {
  SESSION_TTL_SECONDS,
  buildSecureCookie,
  createSession,
  corsPreflightResponse,
  sanitizeRedirect,
} from "./shared";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // ── CORS preflight (global) ──────────────────────────────────────────────
    if (request.method === "OPTIONS") return corsPreflightResponse();

    // ── Health check ─────────────────────────────────────────────────────────
    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        service: "auth.insighthunter.app",
        env: env.ENVIRONMENT,
        ts: new Date().toISOString(),
      });
    }

    // ── Cloudflare Access callback ───────────────────────────────────────────
    if (url.pathname === "/callback") {
      const token = request.headers.get("Cf-Access-Jwt-Assertion");
      if (!token) {
        return new Response("Missing Access JWT", { status: 401 });
      }

      const accessPayload = await validateAccessJWT(token, env.TEAM_DOMAIN, env.POLICY_AUD);
      if (!accessPayload) {
        console.warn("[auth] /callback: invalid JWT from", request.headers.get("CF-Connecting-IP"));
        return new Response("Invalid or expired Access JWT", { status: 403 });
      }

      // Fetch full identity from the CF Access identity endpoint
      const identity = await getIdentity(request, env.TEAM_DOMAIN);
      if (!identity) {
        return new Response("Could not resolve identity", { status: 403 });
      }

      // Create server-side session in KV
      const sessionId = await createSession(env.SESSIONS, identity, SESSION_TTL_SECONDS);

      // Log auth event to Analytics Engine (non-blocking)
      ctx.waitUntil(
        (async () => {
          try {
            env.AUTH_EVENTS.writeDataPoint({
              blobs:   [identity.email, identity.user_uuid, env.ENVIRONMENT],
              doubles: [Date.now()],
              indexes: ["login"],
            });
          } catch (e) {
            console.error("[auth] Analytics write failed:", e);
          }
        })(),
      );

      const redirectTo = sanitizeRedirect(url.searchParams.get("redirect"));

      const headers = new Headers();
      headers.set("Location", redirectTo);
      headers.append(
        "Set-Cookie",
        buildSecureCookie("ih_session", sessionId, env.COOKIE_DOMAIN, SESSION_TTL_SECONDS),
      );

      return new Response(null, { status: 302, headers });
    }

    // ── Email+password registration ──────────────────────────────────────────
    if (url.pathname === "/auth/register") {
      return handleRegister(request, env);
    }

    // ── Email verification ───────────────────────────────────────────────────
    if (url.pathname === "/auth/verify") {
      return handleVerify(request, env);
    }

    // ── Login page (catch-all) ────────────────────────────────────────────────
    const redirect = sanitizeRedirect(url.searchParams.get("redirect") ?? null);
    return new Response(loginPageHTML(redirect), {
      headers: {
        "Content-Type":           "text/html; charset=utf-8",
        "Cache-Control":          "no-store, no-cache, must-revalidate",
        "X-Frame-Options":        "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy":        "strict-origin-when-cross-origin",
      },
    });
  },
} satisfies ExportedHandler<Env>;
