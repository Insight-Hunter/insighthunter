// services/compliance-calendar.ts — Annual report, BOI, tax deadlines
import type { D1Database } from "@cloudflare/workers-types";

export interface ComplianceEvent {
  id: string;
  case_id: string;
  org_id: string;
  event_type: string;   // annual_report | boi_filing | tax_deadline | registered_agent_renewal
  title: string;
  due_date: string;
  status: string;       // pending | completed | overdue | waived
  notes?: string;
  created_at: string;
  updated_at: string;
}

export async function listEventsByCase(db: D1Database, caseId: string) {
  const r = await db.prepare(
    "SELECT * FROM bizforma_compliance_events WHERE case_id = ?1 ORDER BY due_date ASC"
  ).bind(caseId).all();
  return r.results ?? [];
}

export async function listUpcomingEvents(db: D1Database, orgId: string, daysAhead = 30) {
  const cutoff = new Date(Date.now() + daysAhead * 86400000).toISOString().split("T")[0];
  const r = await db.prepare(`
    SELECT * FROM bizforma_compliance_events
    WHERE org_id = ?1 AND status = 'pending' AND due_date <= ?2
    ORDER BY due_date ASC
  `).bind(orgId, cutoff).all();
  return r.results ?? [];
}

export async function flagOverdueEvents(db: D1Database) {
  const today = new Date().toISOString().split("T")[0];
  await db.prepare(`
    UPDATE bizforma_compliance_events
    SET status = 'overdue', updated_at = datetime('now')
    WHERE status = 'pending' AND due_date < ?1
  `).bind(today).run();
}

export async function markEventComplete(db: D1Database, eventId: string, notes?: string) {
  await db.prepare(`
    UPDATE bizforma_compliance_events
    SET status = 'completed', notes = COALESCE(?1, notes), updated_at = datetime('now')
    WHERE id = ?2
  `).bind(notes ?? null, eventId).run();
}

export async function createEvent(
  db: D1Database,
  data: Omit<ComplianceEvent, "id" | "created_at" | "updated_at">
) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO bizforma_compliance_events
      (id, case_id, org_id, event_type, title, due_date, status, notes, created_at, updated_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
  `).bind(id, data.case_id, data.org_id, data.event_type, data.title,
    data.due_date, data.status ?? "pending", data.notes ?? null, now, now).run();
}
