import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { z } from 'zod';
import type { Env, SessionPayload } from '../types/env.js';
import { signJwt, verifyJwt, generateRefreshToken, hashToken, hashPassword, verifyPassword } from '../lib/jwt.js';

const auth = new Hono<{ Bindings: Env }>();
const REFRESH_COOKIE = 'ih_refresh';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(128),
  organizationName: z.string().min(2).max(120),
  tier: z.enum(['startup', 'standard', 'pro']).default('startup'),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

async function hashIp(request: Request): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function logAuditEvent(env: Env, fields: { tenantId?: string; userId?: string; eventType: string; outcome: 'success' | 'failure'; ipHash: string; userAgent: string; details?: unknown }) {
  await env.AUTH_DB.prepare(
    `INSERT INTO auth_audit_log (tenant_id, user_id, event_type, outcome, ip_hash, user_agent, details_json) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(fields.tenantId ?? null, fields.userId ?? null, fields.eventType, fields.outcome, fields.ipHash, fields.userAgent, fields.details ? JSON.stringify(fields.details) : null).run();
}

async function issueSession(env: Env, payload: Omit<SessionPayload, 'iat' | 'exp'>) {
  const now = Math.floor(Date.now() / 1000);
  const accessTtl = parseInt(env.ACCESS_TOKEN_TTL_SECONDS, 10);
  const sessionPayload: SessionPayload = { ...payload, iat: now, exp: now + accessTtl };
  const accessToken = await signJwt(sessionPayload, env.JWT_SECRET);
  await env.SESSION_KV.put(`session:${payload.sub}`, JSON.stringify(sessionPayload), { expirationTtl: accessTtl });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = await hashToken(refreshToken);
  const refreshTtl = parseInt(env.REFRESH_TOKEN_TTL_SECONDS, 10);
  await env.AUTH_DB.prepare(
    `INSERT INTO refresh_tokens (id, user_id, tenant_id, token_hash, expires_at) VALUES (?, ?, ?, ?, datetime('now', '+' || ? || ' seconds'))`
  ).bind(crypto.randomUUID(), payload.sub, payload.tenantId, refreshTokenHash, refreshTtl).run();

  return { accessToken, refreshToken, refreshTtl };
}

auth.post('/register', async (c) => {
  const body = registerSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: 'invalid_input', details: body.error.flatten() }, 400);
  const { email, password, organizationName, tier } = body.data;
  const ipHash = await hashIp(c.req.raw);
  const userAgent = c.req.header('User-Agent') ?? 'unknown';

  const existing = await c.env.AUTH_DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    await logAuditEvent(c.env, { eventType: 'register', outcome: 'failure', ipHash, userAgent, details: { reason: 'email_exists' } });
    return c.json({ error: 'email_already_registered' }, 409);
  }

  const tenantId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await c.env.AUTH_DB.batch([
    c.env.AUTH_DB.prepare('INSERT INTO tenants (id, organization_name, tier, status) VALUES (?, ?, ?, ?)').bind(tenantId, organizationName, tier, 'provisioning'),
    c.env.AUTH_DB.prepare(`INSERT INTO users (id, tenant_id, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'owner', 'pending_verification')`).bind(userId, tenantId, email, passwordHash),
    c.env.AUTH_DB.prepare('INSERT INTO provisioning_jobs (id, tenant_id, status) VALUES (?, ?, ?)').bind(crypto.randomUUID(), tenantId, 'queued'),
  ]);

  await c.env.PROVISIONING_QUEUE.send({ tenantId, userId, organizationName, tier });
  const { accessToken, refreshToken, refreshTtl } = await issueSession(c.env, { sub: userId, tenantId, role: 'owner', tier });
  setCookie(c, REFRESH_COOKIE, refreshToken, { httpOnly: true, secure: true, sameSite: 'Strict', path: '/api/auth', maxAge: refreshTtl });
  await logAuditEvent(c.env, { tenantId, userId, eventType: 'register', outcome: 'success', ipHash, userAgent });

  return c.json({ accessToken, tenantId, userId, tier, provisioning: true }, 201);
});

auth.post('/login', async (c) => {
  const body = loginSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: 'invalid_input' }, 400);
  const { email, password } = body.data;
  const ipHash = await hashIp(c.req.raw);
  const userAgent = c.req.header('User-Agent') ?? 'unknown';

  const rateLimiter = c.env.RATE_LIMITER.get(c.env.RATE_LIMITER.idFromName(`login:${ipHash}`));
  if ((await rateLimiter.fetch('https://internal/check')).status === 429) {
    return c.json({ error: 'too_many_attempts' }, 429);
  }

  const user = await c.env.AUTH_DB.prepare(
    `SELECT u.id, u.tenant_id, u.password_hash, u.role, u.status, t.tier FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.email = ?`
  ).bind(email).first<{ id: string; tenant_id: string; password_hash: string | null; role: SessionPayload['role']; status: string; tier: SessionPayload['tier'] }>();

  if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
    await rateLimiter.fetch('https://internal/record-failure');
    await logAuditEvent(c.env, { userId: user?.id, eventType: 'login', outcome: 'failure', ipHash, userAgent });
    return c.json({ error: 'invalid_credentials' }, 401);
  }
  if (user.status === 'disabled') return c.json({ error: 'account_disabled' }, 403);

  const { accessToken, refreshToken, refreshTtl } = await issueSession(c.env, { sub: user.id, tenantId: user.tenant_id, role: user.role, tier: user.tier });
  setCookie(c, REFRESH_COOKIE, refreshToken, { httpOnly: true, secure: true, sameSite: 'Strict', path: '/api/auth', maxAge: refreshTtl });
  await c.env.AUTH_DB.prepare("UPDATE users SET last_login_at = datetime('now'), failed_login_count = 0 WHERE id = ?").bind(user.id).run();
  await logAuditEvent(c.env, { tenantId: user.tenant_id, userId: user.id, eventType: 'login', outcome: 'success', ipHash, userAgent });

  return c.json({ accessToken, tenantId: user.tenant_id, userId: user.id, role: user.role, tier: user.tier });
});

auth.post('/verify', async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return c.json({ authenticated: false }, 401);
  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ authenticated: false }, 401);
  const cached = await c.env.SESSION_KV.get(`session:${payload.sub}`);
  if (!cached) return c.json({ authenticated: false }, 401);
  return c.json({ authenticated: true, tenantId: payload.tenantId, userId: payload.sub, role: payload.role, tier: payload.tier });
});

auth.post('/refresh', async (c) => {
  const refreshToken = getCookie(c, REFRESH_COOKIE);
  if (!refreshToken) return c.json({ error: 'no_refresh_token' }, 401);
  const tokenHash = await hashToken(refreshToken);
  const record = await c.env.AUTH_DB.prepare(
    `SELECT rt.id, rt.user_id, rt.tenant_id, rt.revoked_at, rt.expires_at, u.role, t.tier
     FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id JOIN tenants t ON t.id = rt.tenant_id WHERE rt.token_hash = ?`
  ).bind(tokenHash).first<{ id: string; user_id: string; tenant_id: string; revoked_at: string | null; expires_at: string; role: SessionPayload['role']; tier: SessionPayload['tier'] }>();

  if (!record || record.revoked_at || new Date(record.expires_at) < new Date()) {
    deleteCookie(c, REFRESH_COOKIE, { path: '/api/auth' });
    return c.json({ error: 'invalid_refresh_token' }, 401);
  }

  await c.env.AUTH_DB.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE id = ?").bind(record.id).run();
  const { accessToken, refreshToken: newRefreshToken, refreshTtl } = await issueSession(c.env, { sub: record.user_id, tenantId: record.tenant_id, role: record.role, tier: record.tier });
  setCookie(c, REFRESH_COOKIE, newRefreshToken, { httpOnly: true, secure: true, sameSite: 'Strict', path: '/api/auth', maxAge: refreshTtl });
  return c.json({ accessToken });
});

auth.post('/logout', async (c) => {
  const refreshToken = getCookie(c, REFRESH_COOKIE);
  if (refreshToken) {
    const tokenHash = await hashToken(refreshToken);
    await c.env.AUTH_DB.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ?").bind(tokenHash).run();
  }
  deleteCookie(c, REFRESH_COOKIE, { path: '/api/auth' });
  return c.json({ success: true });
});

auth.get('/session', async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return c.json({ authenticated: false }, 401);
  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ authenticated: false }, 401);
  return c.json({ authenticated: true, tenantId: payload.tenantId, userId: payload.sub, role: payload.role, tier: payload.tier });
});

export default auth;
