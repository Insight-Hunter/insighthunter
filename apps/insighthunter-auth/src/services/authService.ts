import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import type { AuthUser, LoginRequest, RegisterRequest, TokenPair } from '../types/auth';
import { hashPassword, verifyPassword } from '../lib/password';
import { issueTokenPair } from './tokenService';

export async function register(
  db: D1Database, kv: KVNamespace, secret: string, input: RegisterRequest
): Promise<{ user: AuthUser; tokens: TokenPair }> {
  const existing = await db.prepare('SELECT id FROM users WHERE email=?').bind(input.email).first();
  if (existing) throw new Error('EMAIL_TAKEN');

  const orgId   = crypto.randomUUID();
  const userId  = crypto.randomUUID();
  const hash    = await hashPassword(input.password);
  const now     = new Date().toISOString();

  await db.batch([
    db.prepare('INSERT INTO orgs (id,name,plan,owner_id,created_at,updated_at) VALUES (?,?,?,?,?,?)')
      .bind(orgId, input.orgName, 'free', userId, now, now),
    db.prepare('INSERT INTO users (id,org_id,email,name,password_hash,role,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind(userId, orgId, input.email.toLowerCase(), input.name, hash, 'owner', now, now),
  ]);

  const user: AuthUser = { id: userId, orgId, email: input.email, name: input.name, role: 'owner', plan: 'free', createdAt: now };
  const tokens = await issueTokenPair(user, secret, kv);
  return { user, tokens };
}

export async function login(
  db: D1Database, kv: KVNamespace, secret: string, input: LoginRequest
): Promise<{ user: AuthUser; tokens: TokenPair }> {
  const row = await db.prepare(
    'SELECT u.*, o.plan FROM users u JOIN orgs o ON o.id=u.org_id WHERE u.email=? AND u.is_active=1'
  ).bind(input.email.toLowerCase()).first<any>();

  if (!row) throw new Error('INVALID_CREDENTIALS');
  const valid = await verifyPassword(input.password, row.password_hash);
  if (!valid)  throw new Error('INVALID_CREDENTIALS');

  await db.prepare('UPDATE users SET last_login=? WHERE id=?').bind(new Date().toISOString(), row.id).run();

  const user: AuthUser = { id: row.id, orgId: row.org_id, email: row.email, name: row.name, role: row.role, plan: row.plan, createdAt: row.created_at };
  const tokens = await issueTokenPair(user, secret, kv);
  return { user, tokens };
}

export async function logout(userId: string, kv: KVNamespace): Promise<void> {
  const list = await kv.list({ prefix: `refresh:${userId}:` });
  await Promise.all(list.keys.map(k => kv.delete(k.name)));
}
