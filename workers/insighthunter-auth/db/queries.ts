import type { User, Role } from "@/types";

// ── Orgs ──────────────────────────────────────────────────────────────────────
export async function createOrg(
  db: D1Database,
  id: string,
  name: string,
  tier = "lite"
): Promise<void> {
  await db
    .prepare("INSERT INTO orgs (id, name, tier) VALUES (?, ?, ?)")
    .bind(id, name, tier)
    .run();
}

export async function getOrgById(db: D1Database, id: string): Promise<{ id: string; name: string; tier: string } | null> {
  return db.prepare("SELECT * FROM orgs WHERE id = ?").bind(id).first();
}

// ── Users ─────────────────────────────────────────────────────────────────────
export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  return db.prepare("SELECT * FROM users WHERE email = ?").bind(email.toLowerCase()).first<User>();
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<User>();
}

export async function createUser(
  db: D1Database,
  user: Pick<User, "id" | "org_id" | "email" | "name" | "password_hash" | "role" | "tier">
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (id, org_id, email, name, password_hash, role, tier, email_verified, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending')`
    )
    .bind(user.id, user.org_id, user.email.toLowerCase(), user.name, user.password_hash, user.role, user.tier)
    .run();
}

export async function verifyUserEmail(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare("UPDATE users SET email_verified = 1, status = 'active', updated_at = datetime('now') WHERE id = ?")
    .bind(userId)
    .run();
}

export async function updateUserPassword(db: D1Database, userId: string, hash: string): Promise<void> {
  await db
    .prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(hash, userId)
    .run();
}

export async function updateUserStatus(db: D1Database, userId: string, status: string): Promise<void> {
  await db
    .prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(status, userId)
    .run();
}

export async function updateUser(db: D1Database, userId: string, data: { name?: string; email?: string }): Promise<void> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');

    await db
        .prepare(`UPDATE users SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
        .bind(...values, userId)
        .run();
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export async function insertSession(
  db: D1Database,
  id: string,
  userId: string,
  orgId: string,
  ip: string,
  userAgent: string,
  expiresAt: string
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO sessions (id, user_id, org_id, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(id, userId, orgId, ip, userAgent, expiresAt)
    .run();
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}

export async function deleteAllUserSessions(db: D1Database, userId: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
}

export async function purgeExpiredSessions(db: D1Database): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
}

// ── Roles ─────────────────────────────────────────────────────────────────────
export async function getUserRole(db: D1Database, orgId: string, userId: string): Promise<Role | null> {
  const row = await db
    .prepare("SELECT role FROM roles WHERE org_id = ? AND user_id = ?")
    .bind(orgId, userId)
    .first<{ role: Role }>();
  return row?.role ?? null;
}

export async function upsertRole(
  db: D1Database,
  id: string,
  orgId: string,
  userId: string,
  role: Role,
  grantedBy: string
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO roles (id, org_id, user_id, role, granted_by)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(org_id, user_id) DO UPDATE SET role = excluded.role, granted_by = excluded.granted_by`
    )
    .bind(id, orgId, userId, role, grantedBy)
    .run();
}

export async function listOrgRoles(
  db: D1Database,
  orgId: string
): Promise<{ userId: string; role: Role; grantedBy: string; createdAt: string }[]> {
  const { results } = await db
    .prepare("SELECT user_id as userId, role, granted_by as grantedBy, created_at as createdAt FROM roles WHERE org_id = ?")
    .bind(orgId)
    .all<{ userId: string; role: Role; grantedBy: string; createdAt: string }>();
  return results;
}

// ── Audit log ─────────────────────────────────────────────────────────────────
export async function insertAuditLog(
  db: D1Database,
  orgId: string,
  userId: string | null,
  action: string,
  ip: string,
  meta?: Record<string, unknown>
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO audit_log (id, org_id, user_id, action, ip, meta) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(crypto.randomUUID(), orgId, userId, action, ip, meta ? JSON.stringify(meta) : null)
    .run();
}
