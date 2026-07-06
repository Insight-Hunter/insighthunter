import { Hono } from "hono";
import { extractAuthToken, extractSessionToken, getLoginRedirectUrl, isProbablyBrowserRequest } from "@insighthunter/auth-shared";

type SessionResponse = {
  ok: boolean;
  session?: {
    token: string;
    user: {
      subject: string;
      email?: string;
      orgId?: string;
    };
    expiresAt: string;
  };
};

type Env = {
  Bindings: {
    APP_NAME: string;
    AUTH_BASE_URL: string;
    GATEWAY_BASE_URL: string;
  };
  Variables: {
    authUser: {
      subject: string;
      email?: string;
      orgId?: string;
    };
    authToken: string;
  };
};

const app = new Hono<Env>();

async function requireAuth(c: any, next: () => Promise<void>) {
  const token = extractAuthToken(c.req.raw) ?? extractSessionToken(c.req.raw);

  if (!token) {
    if (isProbablyBrowserRequest(c.req.raw)) {
      return c.redirect(getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.GATEWAY_BASE_URL), 302);
    }

    return c.json({ error: "unauthorized" }, 401);
  }

  const response = await fetch(`${c.env.AUTH_BASE_URL}/session/${encodeURIComponent(token)}`);

  if (!response.ok) {
    return c.json({ error: "invalid_session" }, 401);
  }

  const data = (await response.json()) as SessionResponse;

  if (!data.ok || !data.session) {
    return c.json({ error: "invalid_session" }, 401);
  }

  c.set("authUser", data.session.user);
  c.set("authToken", token);

  await next();
}

app.get("/health", (c) => c.json({ ok: true, service: c.env.APP_NAME }));

app.get("/me", requireAuth, (c) => {
  return c.json({
    ok: true,
    user: c.get("authUser")
  });
});

app.get("/handoff", requireAuth, (c) => {
  const appName = c.req.query("app") ?? "main";
  const baseMap: Record<string, string> = {
    main: "https://insighthunter.app/dashboard",
    bizforma: "https://bizforma.insighthunter.app/"
  };

  const redirectTarget = baseMap[appName] ?? baseMap.main;
  const url = new URL(redirectTarget);
  url.searchParams.set("from", "gateway");

  return c.redirect(url.toString(), 302);
});

export default app;
