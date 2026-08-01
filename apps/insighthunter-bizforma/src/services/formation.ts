// services/formation.ts — Business formation case CRUD
import type { D1Database } from "@cloudflare/workers-types";

export interface FormationCase {
  id: string;
  org_id: string;
  user_id: string;
  entity_type: string;   // LLC | S-Corp | C-Corp | Sole Proprietorship | Partnership
  state: string;
  business_name: string;
  status: string;        // draft | in_review | filed | active | rejected
  registered_agent?: string;
  ein?: string;
  formation_date?: string;
  metadata_json?: string;
  created_at: string;
  updated_at: string;
}

export async function createCase(
  db: D1Database,
  data: Omit<FormationCase, "id" | "created_at" | "updated_at">
): Promise<FormationCase> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO bizforma_cases
      (id, org_id, user_id, entity_type, state, business_name, status,
       registered_agent, ein, formation_date, metadata_json, created_at, updated_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)
  `).bind(id, data.org_id, data.user_id, data.entity_type, data.state,
    data.business_name, data.status ?? "draft",
    data.registered_agent ?? null, data.ein ?? null,
    data.formation_date ?? null, data.metadata_json ?? null, now, now).run();
  return getCaseById(db, id) as Promise<FormationCase>;
}

export async function getCaseById(db: D1Database, id: string) {
  return db.prepare("SELECT * FROM bizforma_cases WHERE id = ?1").bind(id).first();
}

export async function listCasesByOrg(db: D1Database, orgId: string) {
  const result = await db.prepare(
    "SELECT * FROM bizforma_cases WHERE org_id = ?1 ORDER BY created_at DESC"
  ).bind(orgId).all();
  return result.results ?? [];
}

export async function updateCaseStatus(
  db: D1Database, id: string, status: string, meta?: Record<string, unknown>
) {
  await db.prepare(`
    UPDATE bizforma_cases
    SET status = ?1, metadata_json = COALESCE(?2, metadata_json), updated_at = datetime('now')
    WHERE id = ?3
  `).bind(status, meta ? JSON.stringify(meta) : null, id).run();
}
