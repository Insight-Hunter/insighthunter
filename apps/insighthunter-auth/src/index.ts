import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AuthUser, JWTPayload } from '@ih/types';
import { signJWT, verifyJWT, extractBearer, jwtToAuthUser } from '@ih/auth-client';

// ─── Env binding types ────────────────────────────────────────────────────────

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  REFRESH_TOKENS: KVNamespace;
  AUTH_EVENTS: AnalyticsEngineDataset;
  JWT_SECRET: string;
  ACCESS_TOKEN_TTL: string;
  REFRESH_TOKEN_TTL: string;
}

// ─── Password hashing (HMAC-SHA256 + random salt) ─────────────────────────────

async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.randomUUID().replace(/-/g, '');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(salt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(plain));
  const hash = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${hash}:${salt}`;
}

async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [, salt] = stored.split(':');
  if (!salt) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(salt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(plain));
  const hash = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${hash}:${salt}` === stored;
}

// ─── CORS allowed origins ─────────────────────────────────────────────────────

const ALLOWED_ORIGINS = /^https:\/\/(www\.)?insighthunter\.app$|^https:\/\/.*\.insighthunter\.app$/;

// ─── Hono app ─────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: (origin) => ALLOWED_ORIGINS.test(origin ?? '') ? origin! : 'https://insighthunter.app',
  allowHeaders: ['Authorization', 'Content-Type', 'X-Internal-Secret'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// ─── Helper: build tokens ─────────────────────────────────────────────────────

async function issueTokenPair(
  user: { id: string; email: string; name: string; role: string },
  org: { id: string; tier: string },
  env: Env
): Promise<{ accessToken: string; refreshToken: string }> {
  const ttl = parseInt(env.ACCESS_TOKEN_TTL, 10);
  const payload = {
    sub: user.id,
    org: org.id,
    email: user.email,
    name: user.name,
    tier: org.tier as AuthUser['tier'],
    role: user.role,
  };
  const accessToken = await signJWT(payload as Omit<JWTPayload, 'iat' | 'exp'>, env.JWT_SECRET, ttl);
  const refreshToken = crypto.randomUUID() + crypto.randomUUID();
  const refreshTTL = parseInt(env.REFRESH_TOKEN_TTL, 10);
  await env.REFRESH_TOKENS.put(
    refreshToken,
    JSON.stringify({ userId: user.id, orgId: org.id }),
    { expirationTtl: refreshTTL }
  );
  return { accessToken, refreshToken };
}

// ─── Helper: internal secret guard ───────────────────────────────────────────

function requireInternalSecret(c: { req: { header: (k: string) => string | undefined }; json: Function }, secret: string): boolean {
  return c.req.header('X-Internal-Secret') === secret;
}

// ─── POST /auth/register ──────────────────────────────────────────────────────

app.post('/auth/register', async (c) => {
  const body = await c.req.json<{ email: string; password: string; name: string; org_name: string }>();
  if (!body.email || !body.password || !body.name || !body.org_name) {
    return c.json({ error: 'Missing required fields', code: 'MISSING_FIELDS' }, 400);
  }
  if (body.password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters', code: 'WEAK_PASSWORD' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first();
  if (existing) return c.json({ error: 'Email already registered', code: 'EMAIL_TAKEN' }, 409);

  const orgId = crypto.randomUUID().replace(/-/g, '');
  const userId = crypto.randomUUID().replace(/-/g, '');
  const passwordHash = await hashPassword(body.password);

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO orgs (id, name, tier, owner_id) VALUES (?, ?, 'free', ?)`
    ).bind(orgId, body.org_name, userId),
    c.env.DB.prepare(
      `INSERT INTO users (id, email, name, password_hash, org_id, role) VALUES (?, ?, ?, ?, ?, 'owner')`
    ).bind(userId, body.email.toLowerCase(), body.name, passwordHash, orgId),
  ]);

  const tokens = await issueTokenPair(
    { id: userId, email: body.email, name: body.name, role: 'owner' },
    { id: orgId, tier: 'free' },
    c.env
  );

  c.env.AUTH_EVENTS.writeDataPoint({
    blobs: ['register', body.email],
    indexes: [orgId],
  });

  return c.json({
    ...tokens,
    user: { userId, orgId, email: body.email, name: body.name, tier: 'free', role: 'owner' },
  }, 201);
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────

app.post('/auth/login', async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  if (!body.email || !body.password) {
    return c.json({ error: 'Email and password required', code: 'MISSING_FIELDS' }, 400);
  }

  const row = await c.env.DB.prepare(`
    SELECT u.id, u.email, u.name, u.password_hash, u.role, u.org_id,
           o.tier, o.worker_script
    FROM users u JOIN orgs o ON o.id = u.org_id
    WHERE u.email = ?
  `).bind(body.email.toLowerCase()).first<{
    id: string; email: string; name: string; password_hash: string;
    role: string; org_id: string; tier: string; worker_script: string | null;
  }>();

  if (!row) return c.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, 401);

  const valid = await verifyPassword(body.password, row.password_hash);
  if (!valid) return c.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, 401);

  await c.env.DB.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).bind(row.id).run();

  const tokens = await issueTokenPair(
    { id: row.id, email: row.email, name: row.name, role: row.role },
    { id: row.org_id, tier: row.tier },
    c.env
  );

  c.env.AUTH_EVENTS.writeDataPoint({
    blobs: ['login', row.email],
    indexes: [row.org_id],
  });

  return c.json({
    ...tokens,
    user: { userId: row.id, orgId: row.org_id, email: row.email, name: row.name, tier: row.tier, role: row.role },
  });
});

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

app.post('/auth/refresh', async (c) => {
  const { refresh_token } = await c.req.json<{ refresh_token: string }>();
  if (!refresh_token) return c.json({ error: 'refresh_token required', code: 'MISSING_TOKEN' }, 400);

  const stored = await c.env.REFRESH_TOKENS.get(refresh_token);
  if (!stored) return c.json({ error: 'Invalid or expired refresh token', code: 'INVALID_REFRESH' }, 401);

  const { userId, orgId } = JSON.parse(stored) as { userId: string; orgId: string };

  const row = await c.env.DB.prepare(`
    SELECT u.id, u.email, u.name, u.role, o.tier
    FROM users u JOIN orgs o ON o.id = u.org_id
    WHERE u.id = ?
  `).bind(userId).first<{ id: string; email: string; name: string; role: string; tier: string }>();

  if (!row) return c.json({ error: 'User not found', code: 'USER_NOT_FOUND' }, 404);

  // Rotate: delete old, issue new
  await c.env.REFRESH_TOKENS.delete(refresh_token);

  const tokens = await issueTokenPair(
    { id: row.id, email: row.email, name: row.name, role: row.role },
    { id: orgId, tier: row.tier },
    c.env
  );

  return c.json(tokens);
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────

app.post('/auth/logout', async (c) => {
  const { refresh_token } = await c.req.json<{ refresh_token: string }>();
  if (refresh_token) await c.env.REFRESH_TOKENS.delete(refresh_token);
  return c.json({ message: 'Logged out' });
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

app.get('/auth/me', async (c) => {
  const token = extractBearer(c.req.header('Authorization'));
  if (!token) return c.json({ error: 'No token provided', code: 'NO_TOKEN' }, 401);

  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    const row = await c.env.DB.prepare(`
      SELECT u.id, u.email, u.name, u.role, u.created_at,
             o.id as org_id, o.name as org_name, o.tier, o.custom_domain, o.stripe_sub_id
      FROM users u JOIN orgs o ON o.id = u.org_id
      WHERE u.id = ?
    `).bind(payload.sub).first<{
      id: string; email: string; name: string; role: string; created_at: string;
      org_id: string; org_name: string; tier: string; custom_domain: string | null; stripe_sub_id: string | null;
    }>();
    if (!row) return c.json({ error: 'User not found', code: 'USER_NOT_FOUND' }, 404);
    return c.json({ user: row });
  } catch (err) {
    return c.json({ error: 'Invalid token', code: 'INVALID_TOKEN' }, 401);
  }
});

// ─── POST /auth/verify  (internal service-to-service) ────────────────────────

app.post('/auth/verify', async (c) => {
  if (!requireInternalSecret(c, c.env.JWT_SECRET)) {
    return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403);
  }
  const { token } = await c.req.json<{ token: string }>();
  if (!token) return c.json({ error: 'token required', code: 'MISSING_TOKEN' }, 400);

  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    const user = jwtToAuthUser(payload);
    // Enrich name from token extended claims
    (user as unknown as Record<string, unknown>).name = (payload as unknown as Record<string, string>).name ?? '';
    return c.json(user);
  } catch {
    return c.json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' }, 401);
  }
});

// ─── PATCH /auth/org  (internal) ──────────────────────────────────────────────

app.patch('/auth/org', async (c) => {
  if (!requireInternalSecret(c, c.env.JWT_SECRET)) {
    return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403);
  }
  const { orgId, tier, worker_script } = await c.req.json<{ orgId: string; tier?: string; worker_script?: string }>();
  const updates: string[] = [];
  const vals: unknown[] = [];
  if (tier) { updates.push('tier = ?'); vals.push(tier); }
  if (worker_script !== undefined) { updates.push('worker_script = ?'); vals.push(worker_script); }
  updates.push("updated_at = datetime('now')");
  vals.push(orgId);

  await c.env.DB.prepare(`UPDATE orgs SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
  const org = await c.env.DB.prepare('SELECT * FROM orgs WHERE id = ?').bind(orgId).first();
  return c.json(org);
});

// ─── GET /auth/org/:orgId  (internal) ────────────────────────────────────────

app.get('/auth/org/:orgId', async (c) => {
  if (!requireInternalSecret(c, c.env.JWT_SECRET)) {
    return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403);
  }
  const org = await c.env.DB.prepare('SELECT * FROM orgs WHERE id = ?').bind(c.req.param('orgId')).first();
  if (!org) return c.json({ error: 'Org not found', code: 'ORG_NOT_FOUND' }, 404);
  return c.json(org);
});

// ─── POST /auth/forgot-password ───────────────────────────────────────────────

app.post('/auth/forgot-password', async (c) => {
  const { email } = await c.req.json<{ email: string }>();
  const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email?.toLowerCase()).first<{ id: string }>();

  if (user) {
    const token = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = btoa(token).slice(0, 64);
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();
    await c.env.DB.prepare(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, tokenHash, expiresAt).run();
    // In production send email; in MVP log to console
    console.log(`[PASSWORD RESET] token=${token} hash=${tokenHash} userId=${user.id}`);
  }

  return c.json({ message: 'If that email exists, a reset link has been sent.' });
});

// ─── POST /auth/reset-password ────────────────────────────────────────────────

app.post('/auth/reset-password', async (c) => {
  const { token, new_password } = await c.req.json<{ token: string; new_password: string }>();
  if (!token || !new_password || new_password.length < 8) {
    return c.json({ error: 'Invalid request', code: 'INVALID_REQUEST' }, 400);
  }

  const tokenHash = btoa(token).slice(0, 64);
  const row = await c.env.DB.prepare(`
    SELECT id, user_id, expires_at, used FROM password_resets
    WHERE token_hash = ? AND used = 0
  `).bind(tokenHash).first<{ id: string; user_id: string; expires_at: string; used: number }>();

  if (!row || new Date(row.expires_at) < new Date()) {
    return c.json({ error: 'Invalid or expired reset token', code: 'INVALID_RESET_TOKEN' }, 400);
  }

  const passwordHash = await hashPassword(new_password);
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, row.user_id),
    c.env.DB.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').bind(row.id),
  ]);

  return c.json({ message: 'Password reset successful' });
});

// ─── PATCH /auth/profile ──────────────────────────────────────────────────────

app.patch('/auth/profile', async (c) => {
  const token = extractBearer(c.req.header('Authorization'));
  if (!token) return c.json({ error: 'No token provided', code: 'NO_TOKEN' }, 401);

  let payload: JWTPayload;
  try {
    payload = await verifyJWT(token, c.env.JWT_SECRET);
  } catch {
    return c.json({ error: 'Invalid token', code: 'INVALID_TOKEN' }, 401);
  }

  const body = await c.req.json<{ name?: string; current_password?: string; new_password?: string }>();
  const updates: string[] = [];
  const vals: unknown[] = [];

  if (body.name) { updates.push('name = ?'); vals.push(body.name); }

  if (body.new_password) {
    if (!body.current_password) return c.json({ error: 'current_password required', code: 'MISSING_CURRENT_PW' }, 400);
    const user = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(payload.sub).first<{ password_hash: string }>();
    if (!user || !(await verifyPassword(body.current_password, user.password_hash))) {
      return c.json({ error: 'Current password is incorrect', code: 'WRONG_PASSWORD' }, 400);
    }
    updates.push('password_hash = ?');
    vals.push(await hashPassword(body.new_password));
  }

  if (updates.length === 0) return c.json({ error: 'No fields to update', code: 'NO_CHANGES' }, 400);
  vals.push(payload.sub);
  await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();

  const updated = await c.env.DB.prepare('SELECT id, email, name, role, org_id FROM users WHERE id = ?').bind(payload.sub).first();
  return c.json(updated);
});

export default app;
