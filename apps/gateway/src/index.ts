import { Hono } from "hono";
import {
  createRemoteJwksVerifier,
  extractAuthToken,
  extractSessionToken,
  getLoginRedirectUrl,
  isProbablyBrowserRequest,
} from "@insighthunter/auth-shared";

type Env = {
  Bindings: {
    APP_NAME: string;
    AUTH_BASE_URL: string;
    GATEWAY_BASE_URL: string;
    AUTH_JWKS_URL: string;
    AUTH_ISSUER: string;
    AUTH_AUDIENCE: string;
  };
  Variables: {
    authUser: {
      subject: string;
      email?: string;
      orgId?: string;
    };
  };
};

const app = new Hono<Env>();

async function requireAuth(c: Parameters<typeof app.get>[1] extends never ? never : any, next: () => Promise<void>) {
  const bearerToken = extractAuthToken(c.req.raw);
  const sessionToken = extractSessionToken(c.req.raw);
  const token = bearerToken ?? sessionToken;

  if (!token) {
    if (isProbablyBrowserRequest(c.req.raw)) {
      return c.redirect(getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.GATEWAY_BASE_URL), 302);
    }

    return c.json({ error: "unauthorized" }, 401);
  }

  try {
    const verifier = createRemoteJwksVerifier({
      jwksUrl: c.env.AUTH_JWKS_URL,
      issuer: c.env.AUTH_ISSUER,
      audience: c.env.AUTH_AUDIENCE,
    });

    const user = await verifier.verify(token);
    c.set("authUser", user);
    await next();
  } catch {
    return c.json({ error: "invalid_token" }, 401);
  }
}

app.get("/health", (c) => c.json({ ok: true, service: c.env.APP_NAME }));

app.get("/", (c) => {
  return c.json({
    service: c.env.APP_NAME,
    routes: ["/health", "/me"],
  });
});

app.get("/me", requireAuth, (c) => {
  return c.json({
    ok: true,
    user: c.get("authUser"),
  });
});

export default app;
