/**
 * db/queries.ts
 * Typed D1 query helpers for insighthunter-auth.
 * All tables: orgs · users · sessions · audit_log · roles
 *
 * Usage:
 *   import { UserQueries } from '../db/queries';
 *   const user = await UserQueries.findByEmail(env.DB, 'user@example.com');
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type OrgTier   = 'lite' | 'standard' | 'pro';
export type OrgStatus = 'active' | 'suspended' | 'cancelled';
export type UserRole  = 'owner' | 'admin' | 'member' | 'viewer';
export type UserTier  = 'lite' | 'standard' | 'pro';
export type UserStatus = 'pending' | 'active' | 'suspended';

export interface Org {
  id:         string;
  name:       string;
  tier:       OrgTier;
  status:     OrgStatus;
  created_at: string;
  updated_at: string;
}

export interface User {
  id:             string;
  org_id:         string;
  email:          string;
  name:           string;
  password_hash:  string;
  role:           UserRole;
  tier:           UserTier;
  email_verified: number; // 0 | 1 — SQLite boolean
  status:         UserStatus;
  created_at:     string;
  updated_at:     string;
}

export interface Session {
  id:         string;
  user_id:    string;
  org_id:     string;
  ip:         string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
}

export interface AuditLog {
  id:         string;
  org_id:     string;
  user_id:    string | null;
  action:     string;
  ip:         string | null;
  meta:       string | null; // JSON string
  created_at: string;
}

export interface Role {
  id:         string;
  org_id:     string;
  user_id:    string;
  role:       UserRole;
  granted_by: string | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
};

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: <T = unknown>(col?: string) => Promise<T | null>;
  all:   <T = unknown>() => Promise<{ results: T[] }>;
  run:   () => Promise<{ success: boolean; meta: Record<string, unknown> }>;
};

// ─── Org Queries ─────────────────────────────────────────────────────────────

export const OrgQueries = {

  async findById(db: D1Database, id: string): Promise<Org | null> {
    return db.prepare('SELECT * FROM orgs WHERE id = ?')
      .bind(id)
      .first<Org>();
  },

  async create(
    db: D1Database,
    params: Pick<Org, 'id' | 'name' | 'tier'>
  ): Promise<void> {
    await db
      .prepare('INSERT INTO orgs (id, name, tier) VALUES (?, ?, ?)')
      .bind(params.id, params.name, params.tier)
      .run();
  },

  async updateStatus(
    db: D1Database,
    id: string,
    status: OrgStatus
  ): Promise<void> {
    await db
      .prepare("UPDATE orgs SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(status, id)
      .run();
  },

  async updateTier(
    db: D1Database,
    id: string,
    tier: OrgTier
  ): Promise<void> {
    await db
      .prepare("UPDATE orgs SET tier = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(tier, id)
      .run();
  },

};

// ─── User Queries ─────────────────────────────────────────────────────────────

export const UserQueries = {

  async findById(db: D1Database, id: string): Promise<User | null> {
    return db.prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<User>();
  },

  async findByEmail(db: D1Database, email: string): Promise<User | null> {
    return db.prepare('SELECT * FROM users WHERE email = ?')
      .bind(email.toLowerCase().trim())
      .first<User>();
  },

  async findByOrg(db: D1Database, orgId: string): Promise<User[]> {
    const { results } = await db
      .prepare('SELECT * FROM users WHERE org_id = ? ORDER BY created_at ASC')
      .bind(orgId)
      .all<User>();
    return results;
  },

  async create(
    db: D1Database,
    params: Pick<User, 'id' | 'org_id' | 'email' | 'name' | 'password_hash' | 'role' | 'tier'>
  ): Promise<void> {
    await db
      .prepare(`
        INSERT INTO users (id, org_id, email, name, password_hash, role, tier)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        params.id,
        params.org_id,
        params.email.toLowerCase().trim(),
        params.name,
        params.password_hash,
        params.role,
        params.tier,
      )
      .run();
  },

  async setEmailVerified(db: D1Database, id: string): Promise<void> {
    await db
      .prepare("UPDATE users SET email_verified = 1, status = 'active', updated_at = datetime('now') WHERE id = ?")
      .bind(id)
      .run();
  },

  async updatePassword(
    db: D1Database,
    id: string,
    passwordHash: string
  ): Promise<void> {
    await db
      .prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(passwordHash, id)
      .run();
  },

  async updateStatus(
    db: D1Database,
    id: string,
    status: UserStatus
  ): Promise<void> {
    await db
      .prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(status, id)
      .run();
  },

  async updateRole(
    db: D1Database,
    id: string,
    role: UserRole
  ): Promise<void> {
    await db
      .prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(role, id)
      .run();
  },

  async delete(db: D1Database, id: string): Promise<void> {
    await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  },

};

// ─── Session Queries ──────────────────────────────────────────────────────────

export const SessionQueries = {

  async findById(db: D1Database, id: string): Promise<Session | null> {
    return db
      .prepare("SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')")
      .bind(id)
      .first<Session>();
  },

  async findAllByUser(db: D1Database, userId: string): Promise<Session[]> {
    const { results } = await db
      .prepare("SELECT * FROM sessions WHERE user_id = ? AND expires_at > datetime('now') ORDER BY created_at DESC")
      .bind(userId)
      .all<Session>();
    return results;
  },

  async create(
    db: D1Database,
    params: Pick<Session, 'id' | 'user_id' | 'org_id' | 'ip' | 'user_agent' | 'expires_at'>
  ): Promise<void> {
    await db
      .prepare(`
        INSERT INTO sessions (id, user_id, org_id, ip, user_agent, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        params.id,
        params.user_id,
        params.org_id,
        params.ip ?? null,
        params.user_agent ?? null,
        params.expires_at,
      )
      .run();
  },

  async deleteById(db: D1Database, id: string): Promise<void> {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
  },

  async deleteAllByUser(db: D1Database, userId: string): Promise<void> {
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
  },

  /** Purge all rows whose expires_at is in the past. Call from cron. */
  async purgeExpired(db: D1Database): Promise<void> {
    await db
      .prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')")
      .run();
  },

};

// ─── Audit Log Queries ────────────────────────────────────────────────────────

export const AuditQueries = {

  async log(
    db: D1Database,
    params: Pick<AuditLog, 'id' | 'org_id' | 'action'> &
            Partial<Pick<AuditLog, 'user_id' | 'ip' | 'meta'>>
  ): Promise<void> {
    await db
      .prepare(`
        INSERT INTO audit_log (id, org_id, user_id, action, ip, meta)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        params.id,
        params.org_id,
        params.user_id ?? null,
        params.action,
        params.ip ?? null,
        params.meta ?? null,
      )
      .run();
  },

  async findByOrg(
    db: D1Database,
    orgId: string,
    limit = 100
  ): Promise<AuditLog[]> {
    const { results } = await db
      .prepare('SELECT * FROM audit_log WHERE org_id = ? ORDER BY created_at DESC LIMIT ?')
      .bind(orgId, limit)
      .all<AuditLog>();
    return results;
  },

  async findByUser(
    db: D1Database,
    userId: string,
    limit = 50
  ): Promise<AuditLog[]> {
    const { results } = await db
      .prepare('SELECT * FROM audit_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
      .bind(userId, limit)
      .all<AuditLog>();
    return results;
  },

};

// ─── Role Queries ─────────────────────────────────────────────────────────────

export const RoleQueries = {

  async findByOrgUser(
    db: D1Database,
    orgId: string,
    userId: string
  ): Promise<Role | null> {
    return db
      .prepare('SELECT * FROM roles WHERE org_id = ? AND user_id = ?')
      .bind(orgId, userId)
      .first<Role>();
  },

  async findByOrg(db: D1Database, orgId: string): Promise<Role[]> {
    const { results } = await db
      .prepare('SELECT * FROM roles WHERE org_id = ? ORDER BY created_at ASC')
      .bind(orgId)
      .all<Role>();
    return results;
  },

  async upsert(
    db: D1Database,
    params: Pick<Role, 'id' | 'org_id' | 'user_id' | 'role'> &
            Partial<Pick<Role, 'granted_by'>>
  ): Promise<void> {
    await db
      .prepare(`
        INSERT INTO roles (id, org_id, user_id, role, granted_by)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(org_id, user_id) DO UPDATE SET
          role       = excluded.role,
          granted_by = excluded.granted_by
      `)
      .bind(
        params.id,
        params.org_id,
        params.user_id,
        params.role,
        params.granted_by ?? null,
      )
      .run();
  },

  async delete(
    db: D1Database,
    orgId: string,
    userId: string
  ): Promise<void> {
    await db
      .prepare('DELETE FROM roles WHERE org_id = ? AND user_id = ?')
      .bind(orgId, userId)
      .run();
  },

};
