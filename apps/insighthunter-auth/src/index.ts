import { Hono } from 'hono';
import type { AuthUser, JWTPayload } from '@ih/types';
import { signJWT, verifyJWT, extractBearer, jwtToAuthUser } from '@ih/auth-client';
import { createSetupIntentHandler } from './routes/payment';

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  REFRESH_TOKENS: KVNamespace;
  AUTH_EVENTS: AnalyticsEngineDataset;
  JWT_SECRET: string;
  ACCESS_TOKEN_TTL: string;
  REFRESH_TOKEN_TTL: string;
}

type Bindings = { Bindings: Env };

const ALLOWED_ORIGINS = new Set([
  'https://insighthunter.app',
  'https://www.insighthunter.app',
  'https://app.insighthunter.app',
  'https://lite.insighthunter.app',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
]);

function buildCorsHeaders(origin?: string | null) {
  const allowOrigin =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : 'https://insighthunter.app';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, X-Internal-Secret',
    'Vary': 'Origin',
  };
}

type UserTokenInput = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type OrgTokenInput = {
  id: string;
  tier: string;
};

const app = new Hono<Bindings>();

app.use('*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(c.req.header('Origin')),
    });
  }
  await next();
});

async function hashPassword(plain: string): Promise<string> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(plain),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 600000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${salt}:${hash}`;
}

async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [saltHex, storedHash] = stored.split(':');
  if (!saltHex || !storedHash) return false;

  const salt = new Uint8Array(
    (saltHex.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)),
  );

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(plain),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 600000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return hash === storedHash;
}

async function issueTokenPair(
  user: UserTokenInput,
  org: OrgTokenInput,
  env: Env,
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

  const accessToken = await signJWT(payload, env.JWT_SECRET, ttl);
  const refreshToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const refreshTTL = parseInt(env.REFRESH_TOKEN_TTL, 10);

  await env.REFRESH_TOKENS.put(
    refreshToken,
    JSON.stringify({ userId: user.id, orgId: org.id }),
    { expirationTtl: refreshTTL },
  );

  return { accessToken, refreshToken };
}

function requireInternalSecret(c: any, secret: string): boolean {
  return c.req.header('X-Internal-Secret') === secret;
}

async function requireAuth(c: any): Promise<JWTPayload | Response> {
  const origin = c.req.header('Origin');
  const token = extractBearer(c.req.header('Authorization'));

  if (!token) {
    return c.json(
      { error: 'No token provided', code: 'NO_TOKEN' },
      401,
      buildCorsHeaders(origin),
    );
  }

  try {
    return (await verifyJWT(token, c.env.JWT_SECRET)) as JWTPayload;
  } catch {
    return c.json(
      { error: 'Invalid token', code: 'INVALID_TOKEN' },
      401,
      buildCorsHeaders(origin),
    );
  }
}

app.get('/health', (c) =>
  c.json({ status: 'ok', service: 'ih-auth' }, 200, buildCorsHeaders(c.req.header('Origin'))),
);

for (const path of [
  '/auth/register',
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/profile',
  '/auth/payment/setup-intent',
]) {
  app.options(path, (c) =>
    new Response(null, {
      status: 204,
      headers: buildCorsHeaders(c.req.header('Origin')),
    }),
  );
}

app.post('/auth/register', async (c) => {
  const origin = c.req.header('Origin');
  const body = await c.req.json<{
    email: string;
    password: string;
    name: string;
    org_name: string;
  }>();

  if (!body.email || !body.password || !body.name || !body.org_name) {
    return c.json(
      { error: 'Missing required fields', code: 'MISSING_FIELDS' },
      400,
      buildCorsHeaders(origin),
    );
  }

  if (body.password.length < 8) {
    return c.json(
      { error: 'Password must be at least 8 characters', code: 'WEAK_PASSWORD' },
      400,
      buildCorsHeaders(origin),
    );
  }

  const email = body.email.toLowerCase().trim();

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first();

  if (existing) {
    return c.json(
      { error: 'Email already registered', code: 'EMAIL_TAKEN' },
      409,
      buildCorsHeaders(origin),
    );
  }

  const orgId = crypto.randomUUID().replace(/-/g, '');
  const userId = crypto.randomUUID().replace(/-/g, '');
  const passwordHash = await hashPassword(body.password);

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO orgs (id, name, tier, owner_id) VALUES (?, ?, 'free', ?)`,
    ).bind(orgId, body.org_name, userId),
    c.env.DB.prepare(
      `INSERT INTO users (id, email, name, password_hash, org_id, role)
       VALUES (?, ?, ?, ?, ?, 'owner')`,
    ).bind(userId, email, body.name, passwordHash, orgId),
  ]);

  const tokens = await issueTokenPair(
    { id: userId, email, name: body.name, role: 'owner' },
    { id: orgId, tier: 'free' },
    c.env,
  );

  c.env.AUTH_EVENTS.writeDataPoint({
    blobs: ['register', email],
    indexes: [orgId],
  });

  return c.json(
    {
      ...tokens,
      user: {
        userId,
        orgId,
        email,
        name: body.name,
        tier: 'free',
        role: 'owner',
      },
    },
    201,
    buildCorsHeaders(origin),
  );
});

app.post('/auth/login', async (c) => {
  const origin = c.req.header('Origin');
  const body = await c.req.json<{ email: string; password: string }>();

  if (!body.email || !body.password) {
    return c.json(
      { error: 'Email and password required', code: 'MISSING_FIELDS' },
      400,
      buildCorsHeaders(origin),
    );
  }

  const email = body.email.toLowerCase().trim();

  const row = await c.env.DB.prepare(`
    SELECT u.id, u.email, u.name, u.password_hash, u.role, u.org_id,
           o.tier, o.worker_script
    FROM users u
    JOIN orgs o ON o.id = u.org_id
    WHERE u.email = ?
  `).bind(email).first<{
    id: string;
    email: string;
    name: string;
    password_hash: string;
    role: string;
    org_id: string;
    tier: string;
    worker_script: string | null;
  }>();

  if (!row) {
    return c.json(
      { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
      401,
      buildCorsHeaders(origin),
    );
  }

  const valid = await verifyPassword(body.password, row.password_hash);

  if (!valid) {
    return c.json(
      { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
      401,
      buildCorsHeaders(origin),
    );
  }

  await c.env.DB.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`)
    .bind(row.id)
    .run();

  const tokens = await issueTokenPair(
    { id: row.id, email: row.email, name: row.name, role: row.role },
    { id: row.org_id, tier: row.tier },
    c.env,
  );

  c.env.AUTH_EVENTS.writeDataPoint({
    blobs: ['login', row.email],
    indexes: [row.org_id],
  });

  return c.json(
    {
      ...tokens,
      user: {
        userId: row.id,
        orgId: row.org_id,
        email: row.email,
        name: row.name,
        tier: row.tier,
        role: row.role,
      },
    },
    200,
    buildCorsHeaders(origin),
  );
});

app.post('/auth/refresh', async (c) => {
  const origin = c.req.header('Origin');
  const { refresh_token } = await c.req.json<{ refresh_token: string }>();

  if (!refresh_token) {
    return c.json(
      { error: 'refresh_token required', code: 'MISSING_TOKEN' },
      400,
      buildCorsHeaders(origin),
    );
  }

  const stored = await c.env.REFRESH_TOKENS.get(refresh_token);

  if (!stored) {
    return c.json(
      { error: 'Invalid or expired refresh token', code: 'INVALID_REFRESH' },
      401,
      buildCorsHeaders(origin),
    );
  }

  const { userId, orgId } = JSON.parse(stored) as { userId: string; orgId: string };

  const row = await c.env.DB.prepare(`
    SELECT u.id, u.email, u.name, u.role, o.tier
    FROM users u
    JOIN orgs o ON o.id = u.org_id
    WHERE u.id = ?
  `).bind(userId).first<{
    id: string;
    email: string;
    name: string;
    role: string;
    tier: string;
  }>();

  if (!row) {
    return c.json(
      { error: 'User not found', code: 'USER_NOT_FOUND' },
      404,
      buildCorsHeaders(origin),
    );
  }

  await c.env.REFRESH_TOKENS.delete(refresh_token);

  const tokens = await issueTokenPair(
    { id: row.id, email: row.email, name: row.name, role: row.role },
    { id: orgId, tier: row.tier },
    c.env,
  );

  return c.json(tokens, 200, buildCorsHeaders(origin));
});

app.post('/auth/logout', async (c) => {
  const origin = c.req.header('Origin');
  const body = await c.req.json<{ refresh_token?: string }>();

  if (body.refresh_token) {
    await c.env.REFRESH_TOKENS.delete(body.refresh_token);
  }

  return c.json({ message: 'Logged out' }, 200, buildCorsHeaders(origin));
});

app.get('/auth/me', async (c) => {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;

  const origin = c.req.header('Origin');

  const row = await c.env.DB.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.created_at,
           o.id as org_id, o.name as org_name, o.tier, o.custom_domain, o.stripe_sub_id
    FROM users u
    JOIN orgs o ON o.id = u.org_id
    WHERE u.id = ?
  `).bind(auth.sub).first<{
    id: string;
    email: string;
    name: string;
    role: string;
    created_at: string;
    org_id: string;
    org_name: string;
    tier: string;
    custom_domain: string | null;
    stripe_sub_id: string | null;
  }>();

  if (!row) {
    return c.json(
      { error: 'User not found', code: 'USER_NOT_FOUND' },
      404,
      buildCorsHeaders(origin),
    );
  }

  return c.json({ user: row }, 200, buildCorsHeaders(origin));
});

app.post('/auth/verify', async (c) => {
  const origin = c.req.header('Origin');

  if (!requireInternalSecret(c, c.env.JWT_SECRET)) {
    return c.json(
      { error: 'Forbidden', code: 'FORBIDDEN' },
      403,
      buildCorsHeaders(origin),
    );
  }

  const { token } = await c.req.json<{ token: string }>();

  if (!token) {
    return c.json(
      { error: 'token required', code: 'MISSING_TOKEN' },
      400,
      buildCorsHeaders(origin),
    );
  }

  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    const user = jwtToAuthUser(payload);
    (user as Record<string, unknown>).name =
      (payload as Record<string, unknown>).name ?? '';
    return c.json(user, 200, buildCorsHeaders(origin));
  } catch {
    return c.json(
      { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
      401,
      buildCorsHeaders(origin),
    );
  }
});

app.patch('/auth/org', async (c) => {
  const origin = c.req.header('Origin');

  if (!requireInternalSecret(c, c.env.JWT_SECRET)) {
    return c.json(
      { error: 'Forbidden', code: 'FORBIDDEN' },
      403,
      buildCorsHeaders(origin),
    );
  }

  const { orgId, tier, worker_script } = await c.req.json<{
    orgId: string;
    tier?: string;
    worker_script?: string;
  }>();

  if (!orgId) {
    return c.json(
      { error: 'orgId required', code: 'MISSING_ORG_ID' },
      400,
      buildCorsHeaders(origin),
    );
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (tier) {
    updates.push('tier = ?');
    values.push(tier);
  }

  if (worker_script !== undefined) {
    updates.push('worker_script = ?');
    values.push(worker_script);
  }

  if (updates.length === 0) {
    return c.json(
      { error: 'No fields to update', code: 'NO_CHANGES' },
      400,
      buildCorsHeaders(origin),
    );
  }

  updates.push(`updated_at = datetime('now')`);
  values.push(orgId);

  await c.env.DB.prepare(`UPDATE orgs SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const org = await c.env.DB.prepare('SELECT * FROM orgs WHERE id = ?')
    .bind(orgId)
    .first();

  return c.json(org, 200, buildCorsHeaders(origin));
});

app.get('/auth/org/:orgId', async (c) => {
  const origin = c.req.header('Origin');

  if (!requireInternalSecret(c, c.env.JWT_SECRET)) {
    return c.json(
      { error: 'Forbidden', code: 'FORBIDDEN' },
      403,
      buildCorsHeaders(origin),
    );
  }

  const org = await c.env.DB.prepare('SELECT * FROM orgs WHERE id = ?')
    .bind(c.req.param('orgId'))
    .first();

  if (!org) {
    return c.json(
      { error: 'Org not found', code: 'ORG_NOT_FOUND' },
      404,
      buildCorsHeaders(origin),
    );
  }

  return c.json(org, 200, buildCorsHeaders(origin));
});

app.post('/auth/forgot-password', async (c) => {
  const origin = c.req.header('Origin');
  const { email } = await c.req.json<{ email: string }>();
  const normalizedEmail = email?.toLowerCase().trim();

  const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(normalizedEmail)
    .first<{ id: string }>();

  if (user) {
    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const tokenHash = btoa(token).slice(0, 64);
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();

    await c.env.DB.prepare(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    )
      .bind(user.id, tokenHash, expiresAt)
      .run();

    console.log(`[PASSWORD RESET] token=${token} hash=${tokenHash} userId=${user.id}`);
  }

  return c.json(
    { message: 'If that email exists, a reset link has been sent.' },
    200,
    buildCorsHeaders(origin),
  );
});

app.post('/auth/reset-password', async (c) => {
  const origin = c.req.header('Origin');
  const { token, new_password } = await c.req.json<{
    token: string;
    new_password: string;
  }>();

  if (!token || !new_password || new_password.length < 8) {
    return c.json(
      { error: 'Invalid request', code: 'INVALID_REQUEST' },
      400,
      buildCorsHeaders(origin),
    );
  }

  const tokenHash = btoa(token).slice(0, 64);

  const row = await c.env.DB.prepare(`
    SELECT id, user_id, expires_at, used
    FROM password_resets
    WHERE token_hash = ? AND used = 0
  `).bind(tokenHash).first<{
    id: string;
    user_id: string;
    expires_at: string;
    used: number;
  }>();

  if (!row || new Date(row.expires_at) < new Date()) {
    return c.json(
      { error: 'Invalid or expired reset token', code: 'INVALID_RESET_TOKEN' },
      400,
      buildCorsHeaders(origin),
    );
  }

  const passwordHash = await hashPassword(new_password);

  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(
      passwordHash,
      row.user_id,
    ),
    c.env.DB.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').bind(row.id),
  ]);

  return c.json(
    { message: 'Password reset successful' },
    200,
    buildCorsHeaders(origin),
  );
});

app.patch('/auth/profile', async (c) => {
  const origin = c.req.header('Origin');
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;

  const body = await c.req.json<{
    name?: string;
    current_password?: string;
    new_password?: string;
  }>();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name) {
    updates.push('name = ?');
    values.push(body.name);
  }

  if (body.new_password) {
    if (!body.current_password) {
      return c.json(
        { error: 'current_password required', code: 'MISSING_CURRENT_PW' },
        400,
        buildCorsHeaders(origin),
      );
    }

    const user = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(auth.sub)
      .first<{ password_hash: string }>();

    if (!user || !(await verifyPassword(body.current_password, user.password_hash))) {
      return c.json(
        { error: 'Current password is incorrect', code: 'WRONG_PASSWORD' },
        400,
        buildCorsHeaders(origin),
      );
    }

    updates.push('password_hash = ?');
    values.push(await hashPassword(body.new_password));
  }

  if (updates.length === 0) {
    return c.json(
      { error: 'No fields to update', code: 'NO_CHANGES' },
      400,
      buildCorsHeaders(origin),
    );
  }

  values.push(auth.sub);

  await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const updated = await c.env.DB.prepare(
    'SELECT id, email, name, role, org_id FROM users WHERE id = ?',
  )
    .bind(auth.sub)
    .first();

  return c.json(updated, 200, buildCorsHeaders(origin));
});

app.post('/auth/payment/setup-intent', createSetupIntentHandler);

app.notFound((c) =>
  c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404, buildCorsHeaders(c.req.header('Origin'))),
);

app.onError((err, c) => {
  console.error(err);
  return c.json(
    { error: 'Internal error', code: 'INTERNAL_ERROR' },
    500,
    buildCorsHeaders(c.req.header('Origin')),
  );
});

export default app;
