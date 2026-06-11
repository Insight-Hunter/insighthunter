import type { Env } from '../types/env';
import { sendPasswordResetEmail } from './emailService';

export interface DBUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  org_id: string;
  tier: string;
  is_active: number;
}

export class AuthService {
  constructor(private env: Env) {}

  async findUserByEmail(email: string): Promise<DBUser | null> {
    return await this.env.IH_AUTH_DB.prepare(
      `SELECT id, email, name, password_hash, org_id, tier, is_active FROM users WHERE email = ?1 LIMIT 1`
    ).bind(email.toLowerCase()).first<DBUser>();
  }

  async validateCredentials(email: string, password: string): Promise<DBUser | null> {
    const user = await this.findUserByEmail(email);
    if (!user || !user.is_active) return null;
    const valid = await this.verifyPassword(password, user.password_hash);
    return valid ? user : null;
  }

  async hashPassword(password: string): Promise<string> {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 },
      key, 256
    );
    const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `pbkdf2:${saltHex}:${hashHex}`;
  }

  async verifyPassword(password: string, stored: string): Promise<boolean> {
    const parts = stored.split(':');
    if (parts[0] !== 'pbkdf2' || parts.length !== 3) return false;
    const enc = new TextEncoder();
    const salt = new Uint8Array(parts[1].match(/.{2}/g)!.map(h => parseInt(h, 16)));
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 },
      key, 256
    );
    const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === parts[2];
  }

  async createUser(data: { id: string; email: string; name: string; passwordHash: string; orgId: string; tier: string }): Promise<void> {
    await this.env.IH_AUTH_DB.prepare(
      `INSERT INTO users (id, email, name, password_hash, org_id, tier, is_active, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, datetime('now'))`
    ).bind(data.id, data.email.toLowerCase(), data.name, data.passwordHash, data.orgId, data.tier).run();
  }
}

// ── Standalone service functions (used by password-reset route) ──────────────

/**
 * Creates a KV-backed reset token and sends the reset email via MailChannels.
 * Always returns silently for unknown emails (prevents email enumeration).
 */
export async function forgotPassword(
  db: D1Database,
  kv: KVNamespace,
  env: Env,
  email: string
): Promise<void> {
  const user = await db
    .prepare(`SELECT id, email, name, is_active FROM users WHERE email = ?1 LIMIT 1`)
    .bind(email.toLowerCase())
    .first<{ id: string; email: string; name: string; is_active: number }>();

  // Silently return for unknown / suspended users — no enumeration
  if (!user || !user.is_active) return;

  // Generate a secure random token (64 hex chars)
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // Store token in KV: key = reset:<token>, value = userId, TTL = 1 hour
  await kv.put(`reset:${token}`, user.id, { expirationTtl: 3600 });

  // Fire the email via emailService (MailChannels)
  await sendPasswordResetEmail(env, user.email, user.name ?? 'there', token);
}

/**
 * Validates the KV token, hashes the new password, updates the DB, then
 * deletes the token so it can only be used once.
 */
export async function resetPassword(
  db: D1Database,
  kv: KVNamespace,
  token: string,
  newPassword: string
): Promise<void> {
  const userId = await kv.get(`reset:${token}`);
  if (!userId) throw new Error('INVALID_TOKEN');

  // Hash the new password (PBKDF2 — same algo as the class above)
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const key = await crypto.subtle.importKey('raw', enc.encode(newPassword), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 },
    key, 256
  );
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  const passwordHash = `pbkdf2:${saltHex}:${hashHex}`;

  // Update DB
  await db
    .prepare(`UPDATE users SET password_hash = ?1, updated_at = datetime('now') WHERE id = ?2`)
    .bind(passwordHash, userId)
    .run();

  // Invalidate the token immediately (one-time use)
  await kv.delete(`reset:${token}`);
}
