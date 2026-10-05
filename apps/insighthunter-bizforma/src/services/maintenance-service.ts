import type { BizformaEnv } from "../types.js";
import { newId } from "../utils/ids.js";

export async function createMaintenanceEvent(
  env: BizformaEnv,
  input: {
    org_id: string;
    case_id: string;
    event_type: string;
    title: string;
    due_date?: string;
    notes?: string;
  }
) {
  const id = newId("maint");
  const now = new Date().toISOString();
  await env.BIZFORMA_DB.prepare(`
    INSERT INTO bizforma_maintenance_events
      (id, org_id, case_id, event_type, title, due_date, status, notes, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7, ?8, ?8)
  `).bind(
    id,
    input.org_id,
    input.case_id,
    input.event_type,
    input.title,
    input.due_date ?? null,
    input.notes ?? null,
    now
  ).run();
  return id;
}
