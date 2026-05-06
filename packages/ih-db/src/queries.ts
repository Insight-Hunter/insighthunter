// Base query helper that enforces org_id on every query
export function orgQuery(db: D1Database, orgId: string) {
  return {
    first: <T>(sql: string, ...bindings: unknown[]) =>
      db.prepare(sql).bind(orgId, ...bindings).first<T>(),
    all: <T>(sql: string, ...bindings: unknown[]) =>
      db.prepare(sql).bind(orgId, ...bindings).all<T>(),
    run: (sql: string, ...bindings: unknown[]) =>
      db.prepare(sql).bind(orgId, ...bindings).run(),
  };
}

// Generate a new UUID
export function newId(): string {
  return crypto.randomUUID();
}

// Validate that orgId matches before any operation
export function assertOrgId(contextOrgId: string, tokenOrgId: string): void {
  if (contextOrgId !== tokenOrgId) {
    throw new Error(`Tenant isolation violation: ${contextOrgId} !== ${tokenOrgId}`);
  }
}
