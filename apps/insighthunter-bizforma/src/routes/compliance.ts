import { Hono } from "hono";
import type { AppBindings } from "../types.js";
import { badRequest, ok } from "../utils/http.js";
import { createComplianceEventSchema } from "../utils/validators.js";
import { createComplianceEvent, listEventsByCase, listUpcomingEvents, markComplianceEventComplete } from "../services/compliance-service.js";
import { assertCaseOwnership } from "../services/case-service.js";

export const compliance = new Hono<AppBindings>();

compliance.get("/upcoming", async (c) => {
  const days = Number(c.req.query("days") ?? 30);
  const events = await listUpcomingEvents(c.env, c.get("orgId"), days);
  return ok(c, { events });
});

compliance.get("/case/:caseId", async (c) => {
  const events = await listEventsByCase(c.env, c.req.param("caseId"), c.get("orgId"));
  return ok(c, { events });
});

compliance.post("/case/:caseId", async (c) => {
  const parsed = createComplianceEventSchema.safeParse(await c.req.json());
  if (!parsed.success) return badRequest(c, "Invalid payload", parsed.error.flatten());

  const caseId = c.req.param("caseId");
  const orgId = c.get("orgId");
  const owned = await assertCaseOwnership(c.env, caseId, orgId);
  if (!owned) return badRequest(c, "Case not found");

  const eventId = await createComplianceEvent(c.env, {
    case_id: caseId,
    org_id: orgId,
    ...parsed.data
  });

  const agentId = c.env.COMPLIANCE_AGENT.idFromName(orgId);
  await c.env.COMPLIANCE_AGENT.get(agentId).fetch("https://compliance-agent/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orgId,
      caseId,
      eventId,
      status: "pending",
      dueDate: parsed.data.due_date
    })
  });

  return ok(c, { ok: true, event_id: eventId }, 201);
});

compliance.patch("/events/:eventId/complete", async (c) => {
  const body = await c.req.json<{ notes?: string }>();
  const eventId = c.req.param("eventId");
  const orgId = c.get("orgId");
  await markComplianceEventComplete(c.env, eventId, orgId, body.notes);
  const events = await c.env.BIZFORMA_DB.prepare(
    "SELECT case_id FROM bizforma_compliance_events WHERE id = ?1 AND org_id = ?2"
  ).bind(eventId, orgId).first<{ case_id: string }>();
  if (events) {
    const agentId = c.env.COMPLIANCE_AGENT.idFromName(orgId);
    await c.env.COMPLIANCE_AGENT.get(agentId).fetch("https://compliance-agent/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, caseId: events.case_id, eventId, status: "completed" })
    });
  }
  return ok(c, { ok: true });
});
