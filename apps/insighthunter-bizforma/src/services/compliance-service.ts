import type { BizformaEnv } from "../types.js";
import { newId } from "../utils/ids.js";

export async function listUpcomingEvents(env: BizformaEnv, orgId: string, days: number) {
  const result = await env.BIZFORMA_DB.prepare(`
    SELECT *
    FROM bizforma_compliance_events
    WHERE org_id = ?1
      AND status IN ('pending', 'due_soon', 'overdue')
      AND date(due_date) <= date('now', '+' || ?2 || ' day')
    ORDER BY due_date ASC
  `).bind(orgId, days).all();
  return result.results ?? [];
}

export async function listEventsByCase(env: BizformaEnv, caseId: string, orgId: string) {
  const result = await env.BIZFORMA_DB.prepare(
    "SELECT * FROM bizforma_compliance_events WHERE case_id = ?1 AND org_id = ?2 ORDER BY due_date ASC"
  ).bind(caseId, orgId).all();
  return result.results ?? [];
}

export async function createComplianceEvent(
  env: BizformaEnv,
  input: {
    case_id: string;
    org_id: string;
    event_type: string;
    title: string;
    due_date: string;
    notes?: string;
  }
) {
  const id = newId("evt");
  const now = new Date().toISOString();
  await env.BIZFORMA_DB.prepare(`
    INSERT INTO bizforma_compliance_events
      (id, case_id, org_id, event_type, title, due_date, status, notes, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7, ?8, ?8)
  `).bind(id, input.case_id, input.org_id, input.event_type, input.title, input.due_date, input.notes ?? null, now).run();
  return id;
}

export async function markComplianceEventComplete(
  env: BizformaEnv,
  eventId: string,
  orgId: string,
  notes?: string
) {
  const now = new Date().toISOString();
  await env.BIZFORMA_DB.prepare(`
    UPDATE bizforma_compliance_events
    SET status = 'completed', completed_at = ?1, notes = COALESCE(?2, notes), updated_at = ?1
    WHERE id = ?3 AND org_id = ?4
  `).bind(now, notes ?? null, eventId, orgId).run();
}
