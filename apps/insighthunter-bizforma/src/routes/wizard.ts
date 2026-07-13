import { Hono } from "hono";
import type { BizformaEnv } from "../types.js";
import type { AuthContext } from "../middleware/auth.js";
import {
  createWizardSession,
  getWizardSession,
  updateWizardSession,
  deleteWizardSession,
} from "../services/wizard-session.js";

type HonoEnv = { Bindings: BizformaEnv; Variables: { auth: AuthContext } };

const wizard = new Hono<HonoEnv>();

// POST /api/wizard/sessions — start a new wizard session
wizard.post("/sessions", async (c) => {
  const { tenantId, userId } = c.get("auth");
  const body = await c.req.json<{ formation_case_id?: string }>().catch(() => ({}));
  const sessionId = await createWizardSession(c.env.DB, tenantId, userId, body.formation_case_id);
  return c.json({ session_id: sessionId, current_step: 1, total_steps: 11 }, 201);
});

// GET /api/wizard/sessions/:id — load wizard session state
wizard.get("/sessions/:id", async (c) => {
  const { tenantId } = c.get("auth");
  const session = await getWizardSession(c.env.DB, c.req.param("id"), tenantId);
  if (!session) return c.json({ error: "session_not_found_or_expired" }, 404);
  return c.json(session);
});

// PATCH /api/wizard/sessions/:id — save step data and advance
wizard.patch("/sessions/:id", async (c) => {
  const { tenantId } = c.get("auth");
  const body = await c.req.json<{
    current_step?: number;
    session_data?: Record<string, unknown>;
    formation_case_id?: string;
  }>();

  const updated = await updateWizardSession(c.env.DB, c.req.param("id"), tenantId, body);
  if (!updated) return c.json({ error: "session_not_found_or_expired" }, 404);

  const session = await getWizardSession(c.env.DB, c.req.param("id"), tenantId);
  return c.json({ updated: true, session });
});

// DELETE /api/wizard/sessions/:id — abandon wizard session
wizard.delete("/sessions/:id", async (c) => {
  const { tenantId } = c.get("auth");
  await deleteWizardSession(c.env.DB, c.req.param("id"), tenantId);
  return c.json({ deleted: true });
});

export { wizard };
