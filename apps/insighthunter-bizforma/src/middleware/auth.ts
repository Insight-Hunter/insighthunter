import type { Context, Next } from "hono";
import { extractSessionToken, extractAuthToken, isProbablyBrowserRequest } from "@insighthunter/auth-shared";
import { verifyHS256, verifyRS256 } from "@insighthunter/auth-shared";
import type { JWTPayload } from "@insighthunter/auth-shared";
import type { BizformaEnv } from "../types.js";

export type AuthContext = {
  userId: string;
  tenantId: string;
  email?: string;
  role?: string;
  plan?: string;
};

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

// Verifies session token from cookie OR Bearer JWT from Authorization header.
// On failure: redirects browser requests to auth.insighthunter.app, returns 401 for API clients.
export async function requireAuth(c: Context<{ Bindings: BizformaEnv }>, next: Next): Promise<Response | void> {
  const sessionToken = extractSessionToken(c.req.raw);
  const bearerToken = extractAuthToken(c.req.raw);
  const token = sessionToken ?? bearerToken;

  if (!token) {
    return unauthenticated(c, "no_token");
  }

  let payload: JWTPayload | undefined;

  // Try HS256 shared secret first (internal service-to-service)
  if (c.env.JWT_SECRET) {
    const result = await verifyHS256(token, c.env.JWT_SECRET);
    if (result.valid && result.payload) {
      payload = result.payload;
    }
  }

  // Fall back to RS256 via JWKS from auth.insighthunter.app
  if (!payload) {
    const jwksUrl = c.env.JWKS_URL ?? "https://auth.insighthunter.app/.well-known/jwks.json";
    const result = await verifyRS256(token, jwksUrl);
    if (result.valid && result.payload) {
      payload = result.payload;
    } else {
      return unauthenticated(c, result.error ?? "invalid_token");
    }
  }

  if (!payload?.sub) {
    return unauthenticated(c, "missing_sub");
  }

  c.set("auth", {
    userId: payload.sub,
    tenantId: payload.tenant_id ?? payload.sub,
    email: payload.email,
    role: payload.role,
    plan: payload.plan,
  });

  await next();
}

// Optional auth — sets auth context if token present, never blocks
export async function optionalAuth(c: Context<{ Bindings: BizformaEnv }>, next: Next): Promise<Response | void> {
  const token = extractSessionToken(c.req.raw) ?? extractAuthToken(c.req.raw);
  if (token) {
    const jwksUrl = c.env.JWKS_URL ?? "https://auth.insighthunter.app/.well-known/jwks.json";
    const result = await verifyRS256(token, jwksUrl);
    if (result.valid && result.payload?.sub) {
      c.set("auth", {
        userId: result.payload.sub,
        tenantId: result.payload.tenant_id ?? result.payload.sub,
        email: result.payload.email,
        role: result.payload.role,
        plan: result.payload.plan,
      });
    }
  }
  await next();
}

function unauthenticated(c: Context<{ Bindings: BizformaEnv }>, reason: string): Response {
  if (isProbablyBrowserRequest(c.req.raw)) {
    const authUrl = c.env.AUTH_URL ?? "https://auth.insighthunter.app";
    const returnTo = encodeURIComponent(c.req.url);
    return c.redirect(`${authUrl}/login?return_to=${returnTo}`, 302);
  }
  return c.json({ error: "unauthorized", reason }, 401);
}
