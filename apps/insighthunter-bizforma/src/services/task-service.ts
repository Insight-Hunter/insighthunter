import type { BizformaEnv } from "../types.js";
import { newId } from "../utils/ids.js";

export async function createTask(
  env: BizformaEnv,
  input: {
    org_id: string;
    case_id?: string;
    title: string;
    description?: string;
    due_date?: string;
    assigned_to?: string;
    priority?: string;
  }
) {
  const id = newId("task");
  const now = new Date().toISOString();
  await env.BIZFORMA_DB.prepare(`
    INSERT INTO bizforma_tasks
      (id, org_id, case_id, title, description, due_date, assigned_to, priority, status, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'open', ?9, ?9)
  `).bind(
    id,
    input.org_id,
    input.case_id ?? null,
    input.title,
    input.description ?? null,
    input.due_date ?? null,
    input.assigned_to ?? null,
    input.priority ?? "medium",
    now
  ).run();
  return id;
}

export async function listTasksByOrg(env: BizformaEnv, orgId: string) {
  const result = await env.BIZFORMA_DB.prepare(
    "SELECT * FROM bizforma_tasks WHERE org_id = ?1 ORDER BY created_at DESC"
  ).bind(orgId).all();
  return result.results ?? [];
}
