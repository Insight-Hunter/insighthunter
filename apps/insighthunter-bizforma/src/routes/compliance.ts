import { Hono } from "hono";
import type { BizformaEnv } from "../types.js";
import type { AuthContext } from "../middleware/auth.js";
import {
  seedComplianceCalendar,
  getComplianceEvents,
  markComplianceEventComplete,
  flagOverdueEvents,
} from "../services/compliance-calendar.js";

type HonoEnv = { Bindings: BizformaEnv; Variables: { auth: AuthContext } };

const compliance = new Hono<HonoEnv>();

compliance.get("/:caseId", async (c) => {
  const { tenantId } = c.get("auth");
  const caseId = c.req.param("caseId");
  const { status, from, to } = c.req.query();

  const events = await getComplianceEvents(c.env.DB, caseId, tenantId, { status, from, to });
  return c.json({ case_id: caseId, events, count: events.length });
});

compliance.post("/:caseId/seed", async (c) => {
  const { tenantId } = c.get("auth");
  const caseId = c.req.param("caseId");

  const formation = await c.env.DB.prepare(
    "SELECT entity_type, state, created_at FROM formation_cases WHERE id = ? AND tenant_id = ?"
  ).bind(caseId, tenantId).first<{ entity_type: string; state: string; created_at: string }>();

  if (!formation) return c.json({ error: "formation_case_not_found" }, 404);

  const count = await seedComplianceCalendar(
    c.env.DB,
    caseId,
    tenantId,
    formation.entity_type,
    formation.state,
    formation.created_at
  );

  c.env.ANALYTICS.writeDataPoint({
    blobs: [tenantId, caseId, formation.entity_type, formation.state],
    indexes: ["compliance_calendar_seeded"],
  });

  return c.json({ seeded: true, events_created: count });
});

compliance.patch("/events/:eventId/complete", async (c) => {
  const { tenantId } = c.get("auth");
  const eventId = c.req.param("eventId");
  const updated = await markComplianceEventComplete(c.env.DB, eventId, tenantId);
  if (!updated) return c.json({ error: "not_found" }, 404);
  return c.json({ event_id: eventId, status: "completed" });
});

compliance.post("/flag-overdue", async (c) => {
  const secret = c.req.header("x-internal-secret");
  if (!secret || secret !== c.env.INTERNAL_SECRET) {
    return c.json({ error: "forbidden" }, 403);
  }
  const count = await flagOverdueEvents(c.env.DB);
  return c.json({ flagged: count });
});

export { compliance };
