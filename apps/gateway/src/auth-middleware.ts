import type { Context, Next } from "hono";
import {
  extractAuthToken,
  extractSessionToken,
  getLoginRedirectUrl,
  isProbablyBrowserRequest,
  type AuthenticatedUser,
} from "./../../../packages/auth-shared";

type GatewayBindings = {
  APP_NAME: string;
  AUTH_BASE_URL: string;
  GATEWAY_BASE_URL: string;
};

type GatewayVariables = {
  authUser: AuthenticatedUser;
  authToken: string;
};

export type GatewayEnv = {
  Bindings: GatewayBindings;
  Variables: GatewayVariables;
};

function decodeUserFromToken(token: string): AuthenticatedUser | null {
  if (!token.trim()) {
    return null;
  }

  return {
    subject: "placeholder-user",
  };
}

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

  const user = decodeUserFromToken(token);

  if (!user) {
    return c.json(
      {
        error: "invalid_token",
        message: "Token could not be parsed.",
      },
      401,
    );
  }

  c.set("authUser", user);
  c.set("authToken", token);

  await next();
}
