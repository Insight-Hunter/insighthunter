import type { Context, Next } from "hono";
import {
  extractSessionToken,
  extractAuthToken,
  isProbablyBrowserRequest,
  verifyHS256,
  verifyRS256,
} from "https://github.com/Insight-Hunter/insighthunter/blob/dd4f1507f279ae4ddb19af1dd95bc2b331992ddb/packages/authz/src/index.ts";
import type { JWTPayload } from "https://github.com/Insight-Hunter/insighthunter/blob/dd4f1507f279ae4ddb19af1dd95bc2b331992ddb/packages/authz/src/index.ts";
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

export async function requireAuth(c: Context<{ Bindings: BizformaEnv }>, next: Next): Promise<Response | void> {
  const sessionToken = extractSessionToken(c.req.raw);
  const bearerToken = extractAuthToken(c.req.raw);
  const token = sessionToken ?? bearerToken;

  if (!token) {
    return unauthenticated(c, "no_token");
  }

  let payload: JWTPayload | undefined;

  if (c.env.JWT_SECRET) {
    const result = await verifyHS256(token, c.env.JWT_SECRET);
    if (result.valid && result.payload) {
      payload = result.payload;
    }
  }

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
