import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Env } from '../types/env';
import { hashPassword, verifyPassword, sha256Hex, generateOpaqueToken } from '../crypto';
import { signJwt, verifyJwt } from '../lib/jwt';
import type { JwtPayload, ProvisioningMessage } from '../types/env';

const REFRESH_COOKIE = 'ih_refresh';

export const authRoutes = new Hono<{ Bindings: Env }>();

// ── helpers ────────────────────────────────────────────────────────────────

async function rateLimitCheck(
  env: Env,
  ipHash: string,
): Promise<{ blocked: boolean; retryAfter?: number }> {
  const id = env.RATE_LIMITER.idFromName(ipHash);
  const stub = env.RATE_LIMITER.get(id);
  const res = await stub.fetch('http://do/check');
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? 60);
    return { blocked: true, retryAfter };
  }
  return { blocked: false };
}

async function recordFailure(env: Env, ipHash: string): Promise<void> {
  const id = env.RATE_LIMITER.idFromName(ipHash);
  const stub = env.RATE_LIMITER.get(id);
  await stub.fetch('http://do/record-failure', { method: 'POST' });
}

async function resetRateLimit(env: Env, ipHash: string): Promise<void> {
  const id = env.RATE_LIMITER.idFromName(ipHash);
  const stub = env.RATE_LIMITER.get(id);
  await stub.fetch('http://do/reset', { method: 'POST' });
}

async function getClientIpHash(req: Request): Promise<string> {
  const ip = req.headers.get('CF-Connecting-IP') ?? req.headers.get('X-Forwarded-For') ?? 'unknown';
  return sha256Hex(ip);
}

function setRefreshCookie(c: { header: (k: string, v: string) => void }, token: string, ttl: number): void {
  const expires = new Date(Date.now() + ttl * 1000);
  const cookie = [
    `${REFRESH_COOKIE}=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    `Expires=${expires.toUTCString()}`,
  ].join('; ');
  c.header('Set-Cookie', cookie);
}

// ── POST /register ─────────────────────────────────────────────────────────

authRoutes.post('/register', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string; businessName?: string; tier?: string }>().catch(() => null);
  if (!body?.email || !body?.password) {
    return c.json({ error: 'invalid_input', message: 'email and password are required' }, 400);
  }

  const email = body.email.trim().toLowerCase();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email) || body.password.length < 10) {
    return c.json({ error: 'invalid_input', message: 'invalid email or password too short (min 10 chars)' }, 400);
  }

  const existing = await c.env.AUTH_DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();
  if (existing) {
    return c.json({ error: 'conflict', message: 'email already registered' }, 409);
  }

  const tenantId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const tier = body.tier ?? 'startup';
  const businessName = body.businessName?.trim() ?? '';
  const passwordHash = await hashPassword(body.password);
  const now = new Date().toISOString();

  await c.env.AUTH_DB.batch([
    c.env.AUTH_DB.prepare(
      `INSERT INTO tenants (id, business_name, tier, status, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', ?, ?)`,
    ).bind(tenantId, businessName, tier, now, now),
    c.env.AUTH_DB.prepare(
      `INSERT INTO users (id, tenant_id, email, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'owner', 'active', ?, ?)`,
    ).bind(userId, tenantId, email, passwordHash, now, now),
    c.env.AUTH_DB.prepare(
      `INSERT INTO provisioning_jobs (id, tenant_id, status, created_at, updated_at)
       VALUES (?, ?, 'queued', ?, ?)`,
    ).bind(crypto.randomUUID(), tenantId, now, now),
  ]);

  const msg: ProvisioningMessage = { tenantId, userId, email, businessName, tier, enqueuedAt: now };
  await c.env.PROVISIONING_QUEUE.send(msg);

  c.env.AUTH_ANALYTICS.writeDataPoint({
    blobs: ['user_registered', tier, tenantId],
    doubles: [1],
    indexes: [tenantId],
  });

  const accessTtl = Number(c.env.ACCESS_TOKEN_TTL_SECONDS ?? 900);
  const refreshTtl = Number(c.env.REFRESH_TOKEN_TTL_SECONDS ?? 2592000);

  const accessToken = await signJwt(
    { sub: userId, tenantId, role: 'owner', tier, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + accessTtl },
    c.env.JWT_SECRET,
  );

  const refreshRaw = generateOpaqueToken();
  const refreshHash = await sha256Hex(refreshRaw);
  const refreshExpires = new Date(Date.now() + refreshTtl * 1000).toISOString();

  await c.env.AUTH_DB.prepare(
    `INSERT INTO refresh_tokens (id, user_id, tenant_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), userId, tenantId, refreshHash, refreshExpires, now).run();

  await c.env.SESSION_KV.put(
    `session:${userId}`,
    JSON.stringify({ userId, tenantId, role: 'owner', tier }),
    { expirationTtl: accessTtl },
  );

  setRefreshCookie(c as unknown as { header: (k: string, v: string) => void }, refreshRaw, refreshTtl);

  return c.json({ accessToken, userId, tenantId }, 201);
});

// ── POST /login ─────────────────────────────────────────────────────────────

authRoutes.post('/login', async (c) => {
  const ipHash = await getClientIpHash(c.req.raw);
  const { blocked, retryAfter } = await rateLimitCheck(c.env, ipHash);
  if (blocked) {
    return c.json({ error: 'rate_limited', message: 'too many failed attempts' }, 429, {
      'Retry-After': String(retryAfter ?? 60),
    });
  }

  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => null);
  if (!body?.email || !body?.password) {
    await recordFailure(c.env, ipHash);
    return c.json({ error: 'invalid_input', message: 'email and password are required' }, 400);
  }

  const email = body.email.trim().toLowerCase();
  const user = await c.env.AUTH_DB.prepare(
    'SELECT id, tenant_id, password_hash, role, status FROM users WHERE email = ?',
  ).bind(email).first<{ id: string; tenant_id: string; password_hash: string; role: string; status: string }>();

  if (!user || user.status !== 'active') {
    await recordFailure(c.env, ipHash);
    return c.json({ error: 'unauthorized', message: 'invalid credentials' }, 401);
  }

  const valid = await verifyPassword(body.password, user.password_hash);
  if (!valid) {
    await recordFailure(c.env, ipHash);
    return c.json({ error: 'unauthorized', message: 'invalid credentials' }, 401);
  }

  await resetRateLimit(c.env, ipHash);

  const tenant = await c.env.AUTH_DB.prepare('SELECT tier FROM tenants WHERE id = ?').bind(user.tenant_id).first<{ tier: string }>();
  const tier = tenant?.tier ?? 'startup';

  const accessTtl = Number(c.env.ACCESS_TOKEN_TTL_SECONDS ?? 900);
  const refreshTtl = Number(c.env.REFRESH_TOKEN_TTL_SECONDS ?? 2592000);
  const now = new Date().toISOString();

  const payload: JwtPayload = {
    sub: user.id,
    tenantId: user.tenant_id,
    role: user.role,
    tier,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + accessTtl,
  };
  const accessToken = await signJwt(payload, c.env.JWT_SECRET);

  const refreshRaw = generateOpaqueToken();
  const refreshHash = await sha256Hex(refreshRaw);
  const refreshExpires = new Date(Date.now() + refreshTtl * 1000).toISOString();

  await c.env.AUTH_DB.prepare(
    `INSERT INTO refresh_tokens (id, user_id, tenant_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), user.id, user.tenant_id, refreshHash, refreshExpires, now).run();

  await c.env.SESSION_KV.put(
    `session:${user.id}`,
    JSON.stringify({ userId: user.id, tenantId: user.tenant_id, role: user.role, tier }),
    { expirationTtl: accessTtl },
  );

  await c.env.AUTH_DB.prepare(
    `INSERT INTO auth_audit_log (id, user_id, tenant_id, event, created_at) VALUES (?, ?, ?, 'login', ?)`,
  ).bind(crypto.randomUUID(), user.id, user.tenant_id, now).run();

  c.env.AUTH_ANALYTICS.writeDataPoint({
    blobs: ['user_login', tier, user.tenant_id],
    doubles: [1],
    indexes: [user.tenant_id],
  });

  setRefreshCookie(c as unknown as { header: (k: string, v: string) => void }, refreshRaw, refreshTtl);
  return c.json({ accessToken, userId: user.id, tenantId: user.tenant_id });
});

// ── POST /refresh ────────────────────────────────────────────────────────────

authRoutes.post('/refresh', async (c) => {
  const rawCookie = getCookie(c, REFRESH_COOKIE);
  if (!rawCookie) return c.json({ error: 'unauthorized', message: 'missing refresh token' }, 401);

  const tokenHash = await sha256Hex(rawCookie);
  const stored = await c.env.AUTH_DB.prepare(
    `SELECT id, user_id, tenant_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = ?`,
  ).bind(tokenHash).first<{ id: string; user_id: string; tenant_id: string; expires_at: string; revoked: number }>();

  if (!stored || stored.revoked || new Date(stored.expires_at) < new Date()) {
    deleteCookie(c, REFRESH_COOKIE);
    return c.json({ error: 'unauthorized', message: 'invalid or expired refresh token' }, 401);
  }

  // Rotate token
  const now = new Date().toISOString();
  await c.env.AUTH_DB.prepare('UPDATE refresh_tokens SET revoked = 1, updated_at = ? WHERE id = ?').bind(now, stored.id).run();

  const user = await c.env.AUTH_DB.prepare(
    'SELECT role, status FROM users WHERE id = ?',
  ).bind(stored.user_id).first<{ role: string; status: string }>();

  if (!user || user.status !== 'active') {
    return c.json({ error: 'unauthorized', message: 'account inactive' }, 401);
  }

  const tenant = await c.env.AUTH_DB.prepare('SELECT tier FROM tenants WHERE id = ?').bind(stored.tenant_id).first<{ tier: string }>();
  const tier = tenant?.tier ?? 'startup';

  const accessTtl = Number(c.env.ACCESS_TOKEN_TTL_SECONDS ?? 900);
  const refreshTtl = Number(c.env.REFRESH_TOKEN_TTL_SECONDS ?? 2592000);

  const payload: JwtPayload = {
    sub: stored.user_id,
    tenantId: stored.tenant_id,
    role: user.role,
    tier,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + accessTtl,
  };
  const accessToken = await signJwt(payload, c.env.JWT_SECRET);

  const newRaw = generateOpaqueToken();
  const newHash = await sha256Hex(newRaw);
  const newExpires = new Date(Date.now() + refreshTtl * 1000).toISOString();

  await c.env.AUTH_DB.prepare(
    `INSERT INTO refresh_tokens (id, user_id, tenant_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), stored.user_id, stored.tenant_id, newHash, newExpires, now).run();

  await c.env.SESSION_KV.put(
    `session:${stored.user_id}`,
    JSON.stringify({ userId: stored.user_id, tenantId: stored.tenant_id, role: user.role, tier }),
    { expirationTtl: accessTtl },
  );

  setRefreshCookie(c as unknown as { header: (k: string, v: string) => void }, newRaw, refreshTtl);
  return c.json({ accessToken });
});

// ── POST /logout ─────────────────────────────────────────────────────────────

authRoutes.post('/logout', async (c) => {
  const rawCookie = getCookie(c, REFRESH_COOKIE);
  if (rawCookie) {
    const tokenHash = await sha256Hex(rawCookie);
    const now = new Date().toISOString();
    await c.env.AUTH_DB.prepare(
      'UPDATE refresh_tokens SET revoked = 1, updated_at = ? WHERE token_hash = ?',
    ).bind(now, tokenHash).run();
  }

  const auth = c.req.header('Authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    const payload = await verifyJwt(token, c.env.JWT_SECRET).catch(() => null);
    if (payload) {
      await c.env.SESSION_KV.delete(`session:${payload.sub}`);
    }
  }

  deleteCookie(c, REFRESH_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

// ── POST /verify (internal service-to-service) ───────────────────────────────

authRoutes.post('/verify', async (c) => {
  const body = await c.req.json<{ token?: string }>().catch(() => null);
  if (!body?.token) return c.json({ error: 'invalid_input', message: 'token required' }, 400);

  const payload = await verifyJwt(body.token, c.env.JWT_SECRET).catch(() => null);
  if (!payload) return c.json({ error: 'unauthorized', message: 'invalid token' }, 401);

  const cached = await c.env.SESSION_KV.get(`session:${payload.sub}`);
  if (!cached) return c.json({ error: 'unauthorized', message: 'session expired' }, 401);

  return c.json({ valid: true, payload });
});

// ── GET /session ──────────────────────────────────────────────────────────────

authRoutes.get('/session', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'unauthorized' }, 401);

  const token = auth.slice(7);
  const payload = await verifyJwt(token, c.env.JWT_SECRET).catch(() => null);
  if (!payload) return c.json({ error: 'unauthorized' }, 401);

  const cached = await c.env.SESSION_KV.get(`session:${payload.sub}`);
  if (!cached) return c.json({ error: 'unauthorized', message: 'session expired' }, 401);

  return c.json(JSON.parse(cached));
});
