import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type {
  D1Database,
  ExecutionContext,
  Fetcher,
  KVNamespace,
  MessageBatch,
  Queue,
} from "@cloudflare/workers-types";

import sessionRoutes from "../api/session";
import { handleDocumentQueue } from "../queues/documentQueue";
import { handleReminderQueue } from "../queues/reminderQueue";
import {
  advanceFormationStage,
  createFormationCase,
  getFormationOverview,
} from "../services/formationService";
import {
  getComplianceDashboard,
  seedComplianceCalendar,
} from "../services/complianceService";
import {
  getWizardSession,
  saveWizardSession,
} from "../services/sessionService";

export type AuthContext = {
  sub: string;
  email?: string;
  tenantId?: string;
  roles: string[];
};

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  AUTH_ORIGIN: string;
  AUTH_AUDIENCE: string;
  ASSETS: Fetcher;
  DOCUMENT_QUEUE: Queue;
  REMINDER_QUEUE: Queue;
};

type Variables = {
  auth: AuthContext;
};

type Env = {
  Bindings: Bindings;
  Variables: Variables;
};

const app = new Hono<Env>();

async function introspectAuth(
  request: Request,
  env: Bindings,
): Promise<AuthContext> {
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

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status);
  }

  console.error("Unhandled worker error", error);
  return c.json({ error: "Internal Server Error" }, 500);
});

app.get("/api/health", (c) => {
  return c.json({
    ok: true,
    app: "bizforma",
  });
});

app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/health") {
    return next();
  }

  const auth = await introspectAuth(c.req.raw, c.env);
  c.set("auth", auth);
  await next();
});

app.route("/api/session", sessionRoutes);

app.post("/api/session", async (c) => {
  const body = await c.req.json<{
    sessionId: string;
    tenantId: string;
    userId: string;
    payload: Record<string, unknown>;
  }>();

  const session = await saveWizardSession(c.env as never, body);
  return c.json(session);
});

app.get("/api/session/:id", async (c) => {
  const session = await getWizardSession(c.env as never, c.req.param("id"));
  return c.json(session ?? { error: "Not found" }, session ? 200 : 404);
});

app.post("/api/formation", async (c) => {
  const auth = c.get("auth");

  const body = await c.req.json<{
    legalName?: string;
    preferredName?: string;
    formationState?: string;
    entityType?: string;
    intake?: Record<string, unknown>;
  }>();

  const created = await createFormationCase(c.env as never, {
    tenantId: auth.tenantId ?? "default",
    ownerUserId: auth.sub,
    legalName: body.legalName,
    preferredName: body.preferredName,
    formationState: body.formationState,
    entityType: body.entityType,
    intake: body.intake,
  });

  return c.json(created, 201);
});

app.get("/api/formation/:id", async (c) => {
  const result = await getFormationOverview(c.env as never, c.req.param("id"));
  return c.json(result ?? { error: "Not found" }, result ? 200 : 404);
});

app.put("/api/formation/:id/stage", async (c) => {
  const body = await c.req.json<{
    stage: string;
    status: string;
    progress: number;
    intake?: Record<string, unknown>;
  }>();

  const updated = await advanceFormationStage(c.env as never, {
    formationCaseId: c.req.param("id"),
    ...body,
  });

  return c.json(updated);
});

app.post("/api/compliance/seed", async (c) => {
  const auth = c.get("auth");

  const body = await c.req.json<{
    businessId: string;
    stateCode: string;
  }>();

  const result = await seedComplianceCalendar(c.env as never, {
    tenantId: auth.tenantId ?? "default",
    businessId: body.businessId,
    stateCode: body.stateCode,
  });

  return c.json({ events: result });
});

app.get("/api/compliance/:businessId", async (c) => {
  const result = await getComplianceDashboard(
    c.env as never,
    c.req.param("businessId"),
  );

  return c.json(result);
});

app.all("*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default {
  fetch: app.fetch,

  async queue(batch: MessageBatch<unknown>, env: Bindings, _ctx: ExecutionContext) {
    const queueName = (batch as { queue?: string }).queue;

    if (queueName === "bizforma-document-queue") {
      return handleDocumentQueue(batch as never, env as never);
    }

    if (queueName === "bizforma-reminder-queue") {
      return handleReminderQueue(batch as never, env as never);
    }

    console.warn("Unhandled queue batch", { queueName });
  },
};
