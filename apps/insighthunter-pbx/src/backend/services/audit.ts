// Tenant-bound audit trail (docs/insight-pbx-master-prompt.md §3.2, §8.1).

export interface AuditEventInput {
  orgId: string;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAuditEvent(db: D1Database, event: AuditEventInput) {
  await db
    .prepare(
      `INSERT INTO audit_log (org_id, actor_user_id, action, resource_type, resource_id, metadata, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(
      event.orgId,
      event.actorUserId ?? null,
      event.action,
      event.resourceType,
      event.resourceId ?? null,
      event.metadata ? JSON.stringify(event.metadata) : null,
      new Date().toISOString(),
    )
    .run();
}
