import type { BizformaEnv } from "../types.js";
import { newId } from "../utils/ids.js";

export async function createWizardSession(env: BizformaEnv, orgId: string, userId: string) {
  const id = newId("wiz");
  const now = new Date().toISOString();
  await env.BIZFORMA_DB.prepare(`
    INSERT INTO bizforma_wizard_sessions
      (id, org_id, user_id, current_step, completed, data_json, created_at, updated_at)
    VALUES (?1, ?2, ?3, 1, 0, '{}', ?4, ?4)
  `).bind(id, orgId, userId, now).run();
  return getWizardSession(env, id, orgId);
}

export async function getWizardSession(env: BizformaEnv, id: string, orgId: string) {
  return env.BIZFORMA_DB.prepare(
    "SELECT * FROM bizforma_wizard_sessions WHERE id = ?1 AND org_id = ?2"
  ).bind(id, orgId).first();
}

export async function updateWizardStep(
  env: BizformaEnv,
  sessionId: string,
  orgId: string,
  step: number,
  data: Record<string, unknown>
) {
  const session = await getWizardSession(env, sessionId, orgId) as { data_json?: string } | null;
  const existing = session?.data_json ? JSON.parse(session.data_json) : {};
  const merged = { ...existing, ...data };
  const now = new Date().toISOString();

  await env.BIZFORMA_DB.prepare(`
    UPDATE bizforma_wizard_sessions
    SET current_step = ?1, data_json = ?2, updated_at = ?3
    WHERE id = ?4 AND org_id = ?5
  `).bind(step, JSON.stringify(merged), now, sessionId, orgId).run();
}

export async function completeWizardSession(env: BizformaEnv, sessionId: string, orgId: string) {
  const now = new Date().toISOString();
  await env.BIZFORMA_DB.prepare(`
    UPDATE bizforma_wizard_sessions
    SET completed = 1, updated_at = ?1
    WHERE id = ?2 AND org_id = ?3
  `).bind(now, sessionId, orgId).run();
}
