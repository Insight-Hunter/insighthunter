import type { AuthContext, Env } from '../types/env';

export async function createSession(env: Env, user: AuthContext) {
  const sessionId = crypto.randomUUID();
  await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify({ user }), { expirationTtl: 60 * 60 * 24 * 7 });
  await env.DB.prepare(`INSERT INTO sessions (id, tenant_id, user_id, email, roles_json) VALUES (?, ?, ?, ?, ?)`)
    .bind(sessionId, user.tenantId, user.sub, user.email ?? null, JSON.stringify(user.roles))
    .run();
  return sessionId;
}

export async function getSession(env: Env, sessionId: string) {
  const raw = await env.SESSIONS.get(`session:${sessionId}`);
  return raw ? JSON.parse(raw) as { user: AuthContext } : null;
}
