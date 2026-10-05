import { Hono } from "hono";
import type { AppBindings } from "../types.js";
import { badRequest, conflict, notFound, ok } from "../utils/http.js";
import { wizardStepSchema } from "../utils/validators.js";
import { completeWizardSession, createWizardSession, getWizardSession, updateWizardStep } from "../services/wizard-service.js";
import { createCase } from "../services/case-service.js";

export const wizard = new Hono<AppBindings>();

wizard.post("/start", async (c) => {
  const session = await createWizardSession(c.env, c.get("orgId"), c.get("userId"));
  return ok(c, { session }, 201);
});

wizard.get("/:sessionId", async (c) => {
  const session = await getWizardSession(c.env, c.req.param("sessionId"), c.get("orgId"));
  if (!session) return notFound(c, "Session not found");
  return ok(c, { session });
});

wizard.patch("/:sessionId/step", async (c) => {
  const parsed = wizardStepSchema.safeParse(await c.req.json());
  if (!parsed.success) return badRequest(c, "Invalid payload", parsed.error.flatten());

  await updateWizardStep(c.env, c.req.param("sessionId"), c.get("orgId"), parsed.data.step, parsed.data.data);
  return ok(c, { ok: true, step: parsed.data.step });
});

wizard.post("/:sessionId/complete", async (c) => {
  const session = await getWizardSession(c.env, c.req.param("sessionId"), c.get("orgId")) as { data_json?: string; completed?: number } | null;
  if (!session) return notFound(c, "Session not found");
  if (session.completed) return conflict(c, "Session already completed");

  const data = JSON.parse(session.data_json ?? "{}");
  const newCase = await createCase(c.env, {
    org_id: c.get("orgId"),
    user_id: c.get("userId"),
    entity_type: data.entity_type ?? "LLC",
    state: data.state ?? "DE",
    business_name: data.business_name ?? "Unnamed Business",
    registered_agent: data.registered_agent,
    metadata_json: JSON.stringify(data)
  });

  await completeWizardSession(c.env, c.req.param("sessionId"), c.get("orgId"));
  return ok(c, { ok: true, case: newCase }, 201);
});
