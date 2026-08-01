// routes/wizard.ts — Multi-step formation wizard
import { Hono } from "hono";
import type { BizformaEnv } from "../types.js";
import {
  createSession, getSession, updateSessionStep, completeSession
} from "../services/wizard-session.js";
import { createCase } from "../services/formation.js";

export const wizard = new Hono<{ Bindings: BizformaEnv }>();

// POST /api/wizard/start — begin new wizard session
wizard.post("/start", async (c) => {
  const orgId  = c.get("orgId");
  const userId = c.get("userId");
  const session = await createSession(c.env.DB, orgId, userId);
  return c.json({ session }, 201);
});

// GET /api/wizard/:sessionId
wizard.get("/:sessionId", async (c) => {
  const { sessionId } = c.req.param();
  const session = await getSession(c.env.DB, sessionId);
  if (!session) return c.json({ error: "Session not found" }, 404);
  return c.json({ session });
});

// PATCH /api/wizard/:sessionId/step — save step data and advance
wizard.patch("/:sessionId/step", async (c) => {
  const { sessionId } = c.req.param();
  const body = await c.req.json<{ step: number; data: Record<string, unknown> }>();
  if (body.step === undefined || !body.data) {
    return c.json({ error: "step and data required" }, 400);
  }
  await updateSessionStep(c.env.DB, sessionId, body.step, body.data);
  return c.json({ ok: true, step: body.step });
});

// POST /api/wizard/:sessionId/complete — finalize + create formation case
wizard.post("/:sessionId/complete", async (c) => {
  const { sessionId } = c.req.param();
  const orgId  = c.get("orgId");
  const userId = c.get("userId");

  const session = await getSession(c.env.DB, sessionId) as {
    data_json: string; completed: number
  } | null;

  if (!session) return c.json({ error: "Session not found" }, 404);
  if (session.completed) return c.json({ error: "Session already completed" }, 409);

  const data = JSON.parse(session.data_json ?? "{}");

  const newCase = await createCase(c.env.DB, {
    org_id: orgId, user_id: userId,
    entity_type:    data.entity_type  ?? "LLC",
    state:          data.state        ?? "DE",
    business_name:  data.business_name ?? "Unnamed Business",
    status:         "draft",
    registered_agent: data.registered_agent,
    metadata_json:  JSON.stringify(data),
  });

  await completeSession(c.env.DB, sessionId);

  return c.json({ ok: true, case: newCase }, 201);
});
