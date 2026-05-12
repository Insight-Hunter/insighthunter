import type { Env } from '../types/env';

export interface DBUser {
  id: string;
  email: string;
  password_hash: string;
  org_id: string;
  tier: string;
  is_active: number;
}

export class AuthService {
  constructor(private env: Env) {}

  async findUserByEmail(email: string): Promise<DBUser | null> {
    return await this.env.IH_AUTH_DB.prepare(
      `SELECT id, email, password_hash, org_id, tier, is_active FROM users WHERE email = ?1 LIMIT 1`
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

  async createUser( { id: string; email: string; passwordHash: string; orgId: string; tier: string }): Promise<void> {
    await this.env.IH_AUTH_DB.prepare(
      `INSERT INTO users (id, email, password_hash, org_id, tier, is_active, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 1, datetime('now'))`
    ).bind(data.id, data.email.toLowerCase(), data.passwordHash, data.orgId, data.tier).run();
  }
}
