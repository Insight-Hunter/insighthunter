import { Hono } from "hono";
import { z } from "zod";
import {
  getWizardSession,
  listWizardSessionsForUser,
  upsertWizardSession,
  type AuthContext,
  type SessionServiceEnv,
} from "../services/sessionService";

type Bindings = SessionServiceEnv & {
  AUTH_ORIGIN: string;
  AUTH_AUDIENCE: string;
};

type Variables = {
  auth: AuthContext;
};

const sessionSchema = z.object({
  sessionId: z.string().min(8).max(128),
  currentStep: z.number().int().min(0).max(100),
  data: z.record(z.string(), z.record(z.string(), z.unknown())),
});

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.get("/", async (c) => {
  const auth = c.get("auth");
  const sessionId = c.req.query("sessionId");

  if (sessionId) {
    const record = await getWizardSession(c.env, auth, sessionId);

    if (!record) {
      return c.json(
        {
          ok: false,
          error: "SESSION_NOT_FOUND",
        },
        404
      );
    }

    return c.json({
      ok: true,
      session: record,
    });
  }

  const sessions = await listWizardSessionsForUser(c.env, auth);

  return c.json({
    ok: true,
    sessions,
  });
});

app.post("/", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json();
  const parsed = sessionSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        ok: false,
        error: "INVALID_SESSION_PAYLOAD",
        issues: parsed.error.flatten(),
      },
      400
    );
  }

  const record = await upsertWizardSession(c.env, auth, parsed.data);

  return c.json(
    {
      ok: true,
      session: record,
    },
    201
  );
});

app.put("/", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json();
  const parsed = sessionSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        ok: false,
        error: "INVALID_SESSION_PAYLOAD",
        issues: parsed.error.flatten(),
      },
      400
    );
  }

  const record = await upsertWizardSession(c.env, auth, parsed.data);

  return c.json({
    ok: true,
    session: record,
  });
});

export default app;
