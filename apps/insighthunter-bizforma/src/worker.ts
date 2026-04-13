import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

import type { AuthContext, Env } from "../types/env";
import {
  buildLoginUrl,
  buildSignupUrl,
  introspectAccessToken,
} from "../utils/auth";
import {
  createSession,
  deleteSession,
  getSession,
} from "../services/sessionService";
import {
  createBusiness,
  createFormationCase,
  listBusinesses,
  listFormationCases,
  updateFormationCase,
} from "../db/queries";

type AppBindings = {
  Bindings: Env;
  Variables: {
    auth: AuthContext;
  };
};

const app = new Hono<AppBindings>();

const SESSION_COOKIE = "bizforma_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const sessionCookieOptions = {
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "Lax" as const,
  maxAge: SESSION_MAX_AGE,
};

function sanitizeRedirect(redirectTo?: string) {
  if (!redirectTo || !redirectTo.startsWith("/")) return "/app";
  if (redirectTo.startsWith("//")) return "/app";
  return redirectTo;
}

function unauthorized(c: Parameters<typeof app.get>[1] extends (c: infer C) => any ? C : never) {
  return c.json({ error: "Unauthorized" }, 401);
}

const requireAuth = createMiddleware<AppBindings>(async (c, next) => {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (!sessionId) return unauthorized(c);

  const session = await getSession(c.env, sessionId);
  if (!session) return unauthorized(c);

  c.set("auth", session.user);
  await next();
});

app.get("/health", (c) => {
  return c.json({ ok: true, service: "bizforma" });
});

app.get("/auth/login", (c) => {
  const callbackUrl = `${c.env.APP_ORIGIN}/api/session/callback?redirect_to=/app`;
  return c.redirect(buildLoginUrl(c.env, callbackUrl));
});

app.get("/auth/signup", (c) => {
  const callbackUrl = `${c.env.APP_ORIGIN}/api/session/callback?redirect_to=/app`;
  return c.redirect(buildSignupUrl(c.env, callbackUrl));
});

app.get("/api/session/callback", async (c) => {
  const accessToken = c.req.query("access_token");
  const redirectTo = sanitizeRedirect(c.req.query("redirect_to"));

  if (!accessToken) {
    return c.redirect("/?auth=missing-token");
  }

  const auth = await introspectAccessToken(c.env, accessToken);
  if (!auth) {
    return c.redirect("/?auth=invalid-token");
  }

  const sessionId = await createSession(c.env, auth);

  setCookie(c, SESSION_COOKIE, sessionId, sessionCookieOptions);

  return c.redirect(redirectTo);
});

app.get("/api/session/me", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (!sessionId) {
    return c.json({ authenticated: false });
  }

  const session = await getSession(c.env, sessionId);
  if (!session) {
    return c.json({ authenticated: false });
  }

  return c.json({
    authenticated: true,
    user: session.user,
  });
});

app.post("/api/session/logout", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE);

  if (sessionId) {
    await deleteSession(c.env, sessionId);
  }

  deleteCookie(c, SESSION_COOKIE, { path: "/" });

  return c.json({ ok: true });
});

app.use("/api/protected/*", requireAuth);

app.get("/api/protected/business", async (c) => {
  const tenantId = c.get("auth").tenantId;
  const businesses = await listBusinesses(c.env, tenantId);
  return c.json({ businesses });
});

app.post("/api/protected/business", async (c) => {
  const body = await c.req.json<{
    name: string;
    stateCode: string;
    entityType: string;
  }>();

  const tenantId = c.get("auth").tenantId;

  const business = await createBusiness(
    c.env,
    tenantId,
    body.name,
    body.stateCode,
    body.entityType
  );

  return c.json({ business }, 201);
});

app.get("/api/protected/formation", async (c) => {
  const tenantId = c.get("auth").tenantId;
  const cases = await listFormationCases(c.env, tenantId);
  return c.json({ cases });
});

app.post("/api/protected/formation", async (c) => {
  const body = await c.req.json<{
    businessId: string;
    intake: unknown;
  }>();

  const tenantId = c.get("auth").tenantId;

  const formationCase = await createFormationCase(
    c.env,
    tenantId,
    body.businessId,
    body.intake
  );

  return c.json({ formationCase }, 201);
});

app.put("/api/protected/formation/:id", async (c) => {
  const body = await c.req.json<{
    intake: unknown;
    status?: string;
  }>();

  const formationCase = await updateFormationCase(
    c.env,
    c.req.param("id"),
    body.intake,
    body.status ?? "draft"
  );

  return c.json({ formationCase });
});

app.post("/api/protected/documents/upload-placeholder", async (c) => {
  const body = await c.req.json<{
    formationCaseId: string;
    fileName?: string;
    content?: string;
  }>();

  const fileName = body.fileName?.trim() || "document";
  const key = `documents/${body.formationCaseId}/${fileName}.txt`;

  await c.env.DOCUMENTS.put(key, body.content || "placeholder");

  return c.json({ key }, 201);
});

export { FormationAgent } from "../agents/FormationAgent";
export { ComplianceAgent } from "../agents/ComplianceAgent";
export default app;
