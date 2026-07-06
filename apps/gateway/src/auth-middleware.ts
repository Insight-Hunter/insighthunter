import type { Context, Next } from "hono";
import {
  createRemoteJwksVerifier,
  extractAuthToken,
  extractSessionToken,
  getLoginRedirectUrl,
  isProbablyBrowserRequest,
  type AuthenticatedUser,
} from "../../../packages/auth-shared/src/index.ts";

type GatewayBindings = {
  APP_NAME: string;
  AUTH_BASE_URL: string;
  GATEWAY_BASE_URL: string;
  AUTH_JWKS_URL: string;
  AUTH_ISSUER: string;
  AUTH_AUDIENCE: string;
};

type GatewayVariables = {
  authUser: AuthenticatedUser;
  authToken: string;
};

export type GatewayEnv = {
  Bindings: GatewayBindings;
  Variables: GatewayVariables;
};

export async function requireAuth(c: Context<GatewayEnv>, next: Next): Promise<Response | void> {
  const bearerToken = extractAuthToken(c.req.raw);
  const sessionToken = extractSessionToken(c.req.raw);
  const token = bearerToken ?? sessionToken;

  if (!token) {
    if (isProbablyBrowserRequest(c.req.raw)) {
      const redirectUrl = getLoginRedirectUrl(
        c.env.AUTH_BASE_URL,
        c.env.GATEWAY_BASE_URL,
        "/auth/callback",
      );

      return c.redirect(redirectUrl, 302);
    }

    return c.json(
      {
        error: "unauthorized",
        message: "Missing bearer token or session cookie.",
      },
      401,
    );
  }

  try {
    const verifier = createRemoteJwksVerifier({
      jwksUrl: c.env.AUTH_JWKS_URL,
      issuer: c.env.AUTH_ISSUER,
      audience: c.env.AUTH_AUDIENCE,
    });

    const user = await verifier.verify(token);

    c.set("authUser", user);
    c.set("authToken", token);

    await next();
  } catch (error) {
    return c.json(
      {
        error: "invalid_token",
        message: error instanceof Error ? error.message : "Token verification failed.",
      },
      401,
    );
  }
}
