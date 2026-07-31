import { Hono } from "hono";
import type { BizformaEnv } from "../types.js";
import type { AuthContext } from "../middleware/auth.js";
import {
  getComplianceEvents,
  seedComplianceCalendar,
  markComplianceEventComplete,
  flagOverdueEvents,
} from "../services/compliance-calendar.js";

type HonoEnv = { Bindings: BizformaEnv; Variables: { auth: AuthContext } };

const dashboard = new Hono<HonoEnv>();

dashboard.get("/", async (c) => {
  const { tenantId } = c.get("auth");

  const { results: formationResults } = await c.env.DB.prepare(
    `SELECT id, entity_type, business_name, state, status, wizard_step, created_at, updated_at
     FROM formation_cases
     WHERE tenant_id = ?
     ORDER BY created_at DESC`
  ).bind(tenantId).all();

  const formationCases = formationResults ?? [];
  const latestCase = formationCases[0] as Record<string, unknown> | undefined;

  let complianceCount = 0;
  let wizardCount = 0;

  if (latestCase?.id) {
    const events = await getComplianceEvents(c.env.DB, String(latestCase.id), tenantId);
    complianceCount = events.length;
  }

  const { results: wizardResults } = await c.env.DB.prepare(
    `SELECT COUNT(*) AS count
     FROM wizard_sessions
     WHERE tenant_id = ?`
  ).bind(tenantId).all();

  const wizardRow = wizardResults?.[0] as Record<string, unknown> | undefined;
  wizardCount = Number(wizardRow?.count ?? 0);

  return c.json({
    tenant_id: tenantId,
    stats: {
      formation_cases: formationCases.length,
      compliance_events: complianceCount,
      wizard_sessions: wizardCount,
    },
    latest_case: latestCase ?? null,
    cases: formationCases,
  });
});

dashboard.get("/case/:caseId", async (c) => {
  const { tenantId } = c.get("auth");
  const caseId = c.req.param("caseId");
  const { status, from, to } = c.req.query();

  const events = await getComplianceEvents(c.env.DB, caseId, tenantId, {
    status,
    from,
    to,
  });

  return c.json({
    case_id: caseId,
    events,
    count: events.length,
  });
});

dashboard.post("/case/:caseId/seed", async (c) => {
  const { tenantId } = c.get("auth");
  const caseId = c.req.param("caseId");

  const formation = await c.env.DB.prepare(
    `SELECT entity_type, state, created_at
     FROM formation_cases
     WHERE id = ? AND tenant_id = ?`
  ).bind(caseId, tenantId).first<{ entity_type: string; state: string; created_at: string }>();

  if (!formation) return c.json({ error: "formation_case_not_found" }, 404);

  const createdCount = await seedComplianceCalendar(
    c.env.DB,
    caseId,
    tenantId,
    formation.entity_type,
    formation.state,
    formation.created_at
  );

  c.env.ANALYTICS?.writeDataPoint?.({
    blobs: [tenantId, caseId, formation.entity_type, formation.state],
    indexes: ["compliance_calendar_seeded"],
  });

  return c.json({ seeded: true, events_created: createdCount });
});

dashboard.patch("/events/:eventId/complete", async (c) => {
  const { tenantId } = c.get("auth");
  const eventId = c.req.param("eventId");

  const updated = await markComplianceEventComplete(c.env.DB, eventId, tenantId);
  if (!updated) return c.json({ error: "not_found" }, 404);

  return c.json({
    event_id: eventId,
    status: "completed",
  });
});

dashboard.post("/flag-overdue", async (c) => {
  const secret = c.req.header("x-internal-secret");
  if (!secret || secret !== c.env.INTERNAL_SECRET) {
    return c.json({ error: "forbidden" }, 403);
  }

  const flagged = await flagOverdueEvents(c.env.DB);
  return c.json({ flagged });
});

export { dashboard };
