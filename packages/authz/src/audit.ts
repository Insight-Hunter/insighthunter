// Audit log helpers — wraps the audit_logs table written by insighthunter-auth
export interface AuditEvent {
  orgId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(db: D1Database, event: AuditEvent): Promise<void> {
  await db
    .prepare(`
      INSERT INTO audit_logs (id, org_id, user_id, action, resource_type, resource_id, ip_address, user_agent, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)
    .bind(
      crypto.randomUUID(),
      event.orgId,
      event.userId,
      event.action,
      event.resourceType,
      event.resourceId ?? null,
      event.ipAddress ?? null,
      event.userAgent ?? null,
      event.metadata ? JSON.stringify(event.metadata) : null,
    )
    .run();
}

export async function getAuditLog(
  db: D1Database,
  orgId: string,
  limit = 50,
  offset = 0,
): Promise<
  {
    id: string;
    action: string;
    resource_type: string;
    user_id: string;
    created_at: string;
    ip_address: string | null;
  }[]
> {
  const { results } = await db
    .prepare(`
      SELECT al.id, al.action, al.resource_type, al.user_id, al.created_at, al.ip_address
      FROM audit_logs al
      WHERE al.org_id = ?
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `)
    .bind(orgId, limit, offset)
    .all();
  return results as never;
}
