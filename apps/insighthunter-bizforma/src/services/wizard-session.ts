// services/wizard-session.ts — Multi-step formation wizard state
import type { D1Database } from "@cloudflare/workers-types";

export interface WizardSession {
  id: string;
  org_id: string;
  user_id: string;
  step: number;       // 0-based current step
  total_steps: number;
  data_json: string;  // accumulated form data
  completed: number;  // 0 | 1
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export async function createSession(db: D1Database, orgId: string, userId: string) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 7 * 86400000).toISOString(); // 7 days
  await db.prepare(`
    INSERT INTO bizforma_wizard_sessions
      (id, org_id, user_id, step, total_steps, data_json, completed, expires_at, created_at, updated_at)
    VALUES (?1,?2,?3,0,6,'{}',0,?4,?5,?5)
  `).bind(id, orgId, userId, expires, now).run();
  return getSession(db, id);
}

export async function getSession(db: D1Database, id: string) {
  return db.prepare("SELECT * FROM bizforma_wizard_sessions WHERE id = ?1").bind(id).first();
}

export async function updateSessionStep(
  db: D1Database, id: string, step: number, data: Record<string, unknown>
) {
  await db.prepare(`
    UPDATE bizforma_wizard_sessions
    SET step = ?1, data_json = ?2, updated_at = datetime('now')
    WHERE id = ?3
  `).bind(step, JSON.stringify(data), id).run();
}

export async function completeSession(db: D1Database, id: string) {
  await db.prepare(`
    UPDATE bizforma_wizard_sessions
    SET completed = 1, updated_at = datetime('now') WHERE id = ?1
  `).bind(id).run();
}

export async function purgeExpiredSessions(db: D1Database) {
  await db.prepare(
    "DELETE FROM bizforma_wizard_sessions WHERE expires_at < datetime('now') AND completed = 0"
  ).run();
}
