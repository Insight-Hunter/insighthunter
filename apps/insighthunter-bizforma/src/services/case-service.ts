import type { BizformaEnv, CaseStatus } from "../types.js";
import { newId } from "../utils/ids.js";

export async function listCasesByOrg(env: BizformaEnv, orgId: string) {
  const result = await env.BIZFORMA_DB.prepare(
    "SELECT * FROM bizforma_cases WHERE org_id = ?1 ORDER BY updated_at DESC"
  ).bind(orgId).all();
  return result.results ?? [];
}

export async function getCaseById(env: BizformaEnv, id: string, orgId: string) {
  return env.BIZFORMA_DB.prepare(
    "SELECT * FROM bizforma_cases WHERE id = ?1 AND org_id = ?2"
  ).bind(id, orgId).first();
}

export async function createCase(
  env: BizformaEnv,
  input: {
    org_id: string;
    user_id: string;
    entity_type: string;
    state: string;
    business_name: string;
    registered_agent?: string;
    metadata_json?: string;
  }
) {
  const id = newId("case");
  const now = new Date().toISOString();
  await env.BIZFORMA_DB.prepare(`
    INSERT INTO bizforma_cases
      (id, org_id, user_id, entity_type, state, business_name, registered_agent, status, metadata_json, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'draft', ?8, ?9, ?9)
  `)
    .bind(
      id,
      input.org_id,
      input.user_id,
      input.entity_type,
      input.state,
      input.business_name,
      input.registered_agent ?? null,
      input.metadata_json ?? "{}",
      now
    )
    .run();

  return getCaseById(env, id, input.org_id);
}

export async function updateCaseStatus(
  env: BizformaEnv,
  id: string,
  orgId: string,
  status: CaseStatus
) {
  const now = new Date().toISOString();
  await env.BIZFORMA_DB.prepare(
    "UPDATE bizforma_cases SET status = ?1, updated_at = ?2 WHERE id = ?3 AND org_id = ?4"
  ).bind(status, now, id, orgId).run();
}

export async function assertCaseOwnership(env: BizformaEnv, caseId: string, orgId: string) {
  const row = await getCaseById(env, caseId, orgId);
  return !!row;
}
