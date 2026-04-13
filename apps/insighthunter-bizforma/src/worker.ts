import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import sessionRoutes from "../api/session";
import type { AuthContext } from "../services/sessionService";

type Env = {
  Bindings: {
    DB: D1Database;
    SESSIONS: KVNamespace;
    AUTH_ORIGIN: string;
    AUTH_AUDIENCE: string;
    ASSETS: Fetcher;
  };
  Variables: {
    auth: AuthContext;
  };
};

const app = new Hono<Env>();

async function introspectAuth(request: Request, env: Env["Bindings"]): Promise<AuthContext> {
  const authHeader = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");

  const response = await fetch(`${env.AUTH_ORIGIN}/api/introspect`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authHeader ? { authorization: authHeader } : {}),
      ...(cookie ? { cookie } : {}),
      "x-app-audience": env.AUTH_AUDIENCE,
    },
    body: JSON.stringify({
      audience: env.AUTH_AUDIENCE,
    }),
  });

  if (!response.ok) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const payload = (await response.json()) as {
    active: boolean;
    sub?: string;
    email?: string;
    tenantId?: string;
    roles?: string[];
  };

  if (!payload.active || !payload.sub) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  return {
    sub: payload.sub,
    email: payload.email,
    tenantId: payload.tenantId,
    roles: payload.roles ?? [],
  };
}

app.use("/api/*", async (c, next) => {
  const auth = await introspectAuth(c.req.raw, c.env);
  c.set("auth", auth);
  await next();
});

app.get("/api/health", (c) => {
  return c.json({
    ok: true,
    app: "bizforma",
  });
});

app.route("/api/session", sessionRoutes);

app.all("*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
