import type { D1Database } from "@cloudflare/workers-types";

export type DbSession = {
  id: string;
  tenant_id: string;
  user_id: string;
  payload_json: string;
};

export type DbBusiness = {
  id: string;
  tenant_id: string;
  owner_user_id: string;
  legal_name: string | null;
  preferred_name: string | null;
  formation_state: string | null;
  entity_type: string | null;
  status: string;
};

export type DbFormationCase = {
  id: string;
  tenant_id: string;
  business_id: string;
  stage: string;
  status: string;
  progress: number;
  intake_json: string;
};

export async function getSessionById(db: D1Database, id: string) {
  return db
    .prepare(`SELECT * FROM sessions WHERE id = ?1 LIMIT 1`)
    .bind(id)
    .first<DbSession | null>();
}

export async function upsertSession(
  db: D1Database,
  input: { id: string; tenantId: string; userId: string; payloadJson: string },
) {
  await db
    .prepare(`
      INSERT INTO sessions (id, tenant_id, user_id, payload_json, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        payload_json = excluded.payload_json,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(input.id, input.tenantId, input.userId, input.payloadJson)
    .run();

  return getSessionById(db, input.id);
}

export async function insertBusiness(
  db: D1Database,
  input: {
    id: string;
    tenantId: string;
    ownerUserId: string;
    legalName?: string;
    preferredName?: string;
    formationState?: string;
    entityType?: string;
  },
) {
  await db
    .prepare(`
      INSERT INTO businesses (
        id, tenant_id, owner_user_id, legal_name, preferred_name, formation_state, entity_type, status
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'draft')
    `)
    .bind(
      input.id,
      input.tenantId,
      input.ownerUserId,
      input.legalName ?? null,
      input.preferredName ?? null,
      input.formationState ?? null,
      input.entityType ?? null,
    )
    .run();

  return db.prepare(`SELECT * FROM businesses WHERE id = ?1`).bind(input.id).first<DbBusiness>();
}

export async function getBusinessById(db: D1Database, id: string) 
