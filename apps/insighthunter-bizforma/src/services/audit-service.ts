import type { BizformaEnv } from "../types.js";
import { newId } from "../utils/ids.js";

export async function writeAuditEvent(
  env: BizformaEnv,
  input: {
    org_id: string;
    user_id?: string | null;
    entity_type: string;
    entity_id: string;
    action: string;
    metadata?: unknown;
  }
): Promise<void> {
  const now = new Date().toISOString();
  await env.BIZFORMA_DB.prepare(`
    INSERT INTO bizforma_audit_events
      (id, org_id, user_id, entity_type, entity_id, action, metadata_json, created_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
  `)
    .bind(
      newId("audit"),
      input.org_id,
      input.user_id ?? null,
      input.entity_type,
      input.entity_id,
      input.action,
      JSON.stringify(input.metadata ?? {}),
      now
    )
    .run();
}
