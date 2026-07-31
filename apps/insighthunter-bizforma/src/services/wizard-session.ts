const SESSION_TTL_DAYS = 7;

export interface WizardSessionData {
  entity_type?: string;
  business_name?: string;
  name_alternatives?: string[];
  state?: string;
  owners?: Array<{ name: string; ownership_pct: number; role: string }>;
  principal_address?: string;
  registered_agent?: string;
  registered_agent_type?: "self" | "service";
  business_purpose?: string;
  industry?: string;
  naics_code?: string;
  management_type?: "member_managed" | "manager_managed";
  managers?: Array<{ name: string; title: string }>;
  tax_election?: "default" | "s_corp" | "c_corp";
  fiscal_year_end?: string;
  oa_clauses?: Array<{ section: string; content: string }>;
  need_ein?: boolean;
  has_employees?: boolean;
  confirmed?: boolean;
  [key: string]: unknown;
}

export async function createWizardSession(
  db: D1Database,
  tenantId: string,
  userId: string,
  caseId?: string
): Promise<string> {
  const id = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  await db.prepare(
    `INSERT INTO formation_wizard_sessions
     (id, formation_case_id, tenant_id, user_id, session_data, current_step, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, '{}', 1, ?, datetime('now'), datetime('now'))`
  ).bind(id, caseId ?? null, tenantId, userId, expiresAt.toISOString()).run();

  return id;
}

export async function getWizardSession(
  db: D1Database,
  sessionId: string,
  tenantId: string
): Promise<{
  id: string;
  current_step: number;
  total_steps: number;
  session_data: WizardSessionData;
  formation_case_id: string | null;
} | null> {
  const row = await db.prepare(
    `SELECT id, formation_case_id, current_step, total_steps, session_data, expires_at
     FROM formation_wizard_sessions
     WHERE id = ? AND tenant_id = ?`
  ).bind(sessionId, tenantId).first<{
    id: string;
    formation_case_id: string | null;
    current_step: number;
    total_steps: number;
    session_data: string;
    expires_at: string;
  }>();

  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) return null;

  let parsed: WizardSessionData = {};
  try {
    parsed = JSON.parse(row.session_data || "{}") as WizardSessionData;
  } catch {
    parsed = {};
  }

  return {
    id: row.id,
    formation_case_id: row.formation_case_id,
    current_step: row.current_step,
    total_steps: row.total_steps,
    session_data: parsed,
  };
}

export async function updateWizardSession(
  db: D1Database,
  sessionId: string,
  tenantId: string,
  patch: { current_step?: number; session_data?: Partial<WizardSessionData>; formation_case_id?: string }
): Promise<boolean> {
  const existing = await db.prepare(
    `SELECT session_data
     FROM formation_wizard_sessions
     WHERE id = ? AND tenant_id = ?`
  ).bind(sessionId, tenantId).first<{ session_data: string }>();

  if (!existing) return false;

  let merged = existing.session_data || "{}";
  if (patch.session_data) {
    try {
      merged = JSON.stringify({
        ...(existing.session_data ? JSON.parse(existing.session_data) : {}),
        ...patch.session_data,
      });
    } catch {
      merged = JSON.stringify(patch.session_data);
    }
  }

  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + SESSION_TTL_DAYS);

  await db.prepare(
    `UPDATE formation_wizard_sessions SET
       current_step = COALESCE(?, current_step),
       session_data = ?,
       formation_case_id = COALESCE(?, formation_case_id),
       expires_at = ?,
       updated_at = datetime('now')
     WHERE id = ? AND tenant_id = ?`
  ).bind(
    patch.current_step ?? null,
    merged,
    patch.formation_case_id ?? null,
    newExpiry.toISOString(),
    sessionId,
    tenantId
  ).run();

  return true;
}

export async function deleteWizardSession(
  db: D1Database,
  sessionId: string,
  tenantId: string
): Promise<void> {
  await db.prepare(
    `DELETE FROM formation_wizard_sessions
     WHERE id = ? AND tenant_id = ?`
  ).bind(sessionId, tenantId).run();
}

export async function purgeExpiredSessions(db: D1Database): Promise<number> {
  const result = await db.prepare(
    `DELETE FROM formation_wizard_sessions
     WHERE expires_at < datetime('now')`
  ).run();

  return result.meta?.changes ?? 0;
}
