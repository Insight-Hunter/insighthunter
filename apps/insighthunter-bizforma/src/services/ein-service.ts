import type { BizformaEnv } from "../types.js";
import { newId } from "../utils/ids.js";

export async function upsertEinApplication(
  env: BizformaEnv,
  input: {
    case_id: string;
    org_id: string;
    ss4_json: string;
    status: string;
  }
) {
  const existing = await env.BIZFORMA_DB.prepare(
    "SELECT id FROM bizforma_ein_applications WHERE case_id = ?1 AND org_id = ?2"
  ).bind(input.case_id, input.org_id).first<{ id: string }>();

  const now = new Date().toISOString();

  if (existing?.id) {
    await env.BIZFORMA_DB.prepare(`
      UPDATE bizforma_ein_applications
      SET ss4_json = ?1, status = ?2, updated_at = ?3
      WHERE id = ?4
    `).bind(input.ss4_json, input.status, now, existing.id).run();
    return existing.id;
  }

  const id = newId("ein");
  await env.BIZFORMA_DB.prepare(`
    INSERT INTO bizforma_ein_applications
      (id, case_id, org_id, ss4_json, status, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
  `).bind(id, input.case_id, input.org_id, input.ss4_json, input.status, now).run();
  return id;
}
