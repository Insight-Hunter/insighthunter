import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { rateLimiter } from 'hono/rate-limiter';

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  ANALYTICS: AnalyticsEngineDataset;
  JWT_SECRET: string;
  MAILCHANNELS_URL: string;
  APP_URL: string;
}

// ── JWT helpers ──────────────────────────────────────────────────────────────
async function signJWT(payload: Record<string, unknown>, secret: string, expiresInSec = 86400): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
  const body = btoa(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSec })).replace(/=/g, '');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${header}.${body}.${sigB64}`;
}

async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const [header, body, sig] = token.split('.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)), new TextEncoder().encode(`${header}.${body}`));
    if (!valid) return null;
    const payload = JSON.parse(atob(body)) as Record<string, unknown>;
    if ((payload.exp as number) < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, keyMaterial, 256);
  return `${btoa(String.fromCharCode(...salt))}.${btoa(String.fromCharCode(...new Uint8Array(derived)))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split('.');
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, keyMaterial, 256);
  return btoa(String.fromCharCode(...new Uint8Array(derived))) === hashB64;
}

function ok<T>(data: T, status = 200) { return Response.json({ success: true, data }, { status }); }
function err(error: string, status = 400) { return Response.json({ success: false, error }, { status }); }

// ── App ──────────────────────────────────────────────────────────────────────
const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({ origin: ['https://insighthunter.app', 'http://localhost:4321'], credentials: true }));

// ── Register ─────────────────────────────────────────────────────────────────
app.post('/register', async c => {
  const { name, email, password, tier = 'lite' } = await c.req.json<{ name: string; email: string; password: string; tier?: string }>();
  if (!name || !email || !password) return err('name, email and password are required');
  if (password.length < 8) return err('Password must be at least 8 characters');

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first();
  if (existing) return err('An account with this email already exists', 409);

  const userId  = crypto.randomUUID();
  const orgId   = crypto.randomUUID();
  const hashed  = await hashPassword(password);

  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO orgs (id, name, tier, created_at) VALUES (?, ?, ?, ?)').bind(orgId, `${name}'s Org`, tier, new Date().toISOString()),
    c.env.DB.prepare('INSERT INTO users (id, org_id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(userId, orgId, name, email.toLowerCase(), hashed, 'owner', new Date().toISOString()),
  ]);

  const token = await signJWT({ userId, orgId, role: 'owner', tier }, c.env.JWT_SECRET);
  await c.env.SESSIONS.put(`session:${token}`, JSON.stringify({ userId, orgId }), { expirationTtl: 86400 });

  c.env.ANALYTICS.writeDataPoint({ blobs: ['register', tier], indexes: [orgId] });
  return ok({ token, userId, orgId, tier }, 201);
});

// ── Login ────────────────────────────────────────────────────────────────────
app.post('/login', async c => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();
  if (!email || !password) return err('email and password are required');

  const user = await c.env.DB.prepare(
    'SELECT u.id, u.org_id, u.name, u.email, u.password_hash, u.role, o.tier FROM users u JOIN orgs o ON o.id = u.org_id WHERE u.email = ?'
  ).bind(email.toLowerCase()).first<{ id: string; org_id: string; name: string; email: string; password_hash: string; role: string; tier: string }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) return err('Invalid email or password', 401);

  const token = await signJWT({ userId: user.id, orgId: user.org_id, role: user.role, tier: user.tier }, c.env.JWT_SECRET);
  await c.env.SESSIONS.put(`session:${token}`, JSON.stringify({ userId: user.id, orgId: user.org_id }), { expirationTtl: 86400 });

  c.env.ANALYTICS.writeDataPoint({ blobs: ['login'], indexes: [user.org_id] });
  return ok({ token, userId: user.id, orgId: user.org_id, name: user.name, tier: user.tier });
});

// ── Me ───────────────────────────────────────────────────────────────────────
app.get('/me', async c => {
  const token = c.req.header('Authorization')?.slice(7);
  if (!token) return err('Unauthorized', 401);

  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) return err('Invalid or expired token', 401);

  const user = await c.env.DB.prepare(
    'SELECT u.id, u.name, u.email, u.role, o.tier, o.id as org_id, o.name as org_name FROM users u JOIN orgs o ON o.id = u.org_id WHERE u.id = ?'
  ).bind(payload.userId).first();

  if (!user) return err('User not found', 404);
  return ok(user);
});

// ── Logout ───────────────────────────────────────────────────────────────────
app.post('/logout', async c => {
  const token = c.req.header('Authorization')?.slice(7);
  if (token) await c.env.SESSIONS.delete(`session:${token}`);
  return ok({ message: 'Logged out' });
});

// ── Forgot Password ──────────────────────────────────────────────────────────
app.post('/forgot-password', async c => {
  const { email } = await c.req.json<{ email: string }>();
  const user = await c.env.DB.prepare('SELECT id, name FROM users WHERE email = ?').bind(email?.toLowerCase()).first<{ id: string; name: string }>();

  // Always return success to prevent email enumeration
  if (!user) return ok({ message: 'If that email exists, a reset link has been sent.' });

  const resetToken = crypto.randomUUID();
  await c.env.SESSIONS.put(`reset:${resetToken}`, user.id, { expirationTtl: 3600 });

  // Send via MailChannels
  await fetch(c.env.MAILCHANNELS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email, name: user.name }] }],
      from: { email: 'noreply@insighthunter.app', name: 'Insight Hunter' },
      subject: 'Reset your Insight Hunter password',
      content: [{ type: 'text/plain', value: `Reset your password: ${c.env.APP_URL}/auth/reset-password?token=${resetToken}\n\nThis link expires in 1 hour.` }],
    }),
  });

  return ok({ message: 'If that email exists, a reset link has been sent.' });
});

// ── Reset Password ───────────────────────────────────────────────────────────
app.post('/reset-password', async c => {
  const { token, password } = await c.req.json<{ token: string; password: string }>();
  if (!token || !password || password.length < 8) return err('Valid token and password (8+ chars) required');

  const userId = await c.env.SESSIONS.get(`reset:${token}`);
  if (!userId) return err('Reset token is invalid or expired', 400);

  const hashed = await hashPassword(password);
  await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hashed, userId).run();
  await c.env.SESSIONS.delete(`reset:${token}`);

  return ok({ message: 'Password updated. Please sign in.' });
});

// ── Verify token (internal service use) ─────────────────────────────────────
app.post('/verify', async c => {
  const { token } = await c.req.json<{ token: string }>();
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) return err('Invalid token', 401);
  return ok(payload);
});

export default app;

// ─── Internal endpoints (X-Internal-Secret gated) ────────────────────────────
// Called exclusively by insighthunter-dispatch via service binding

function requireInternal(c: { req: { header: (k: string) => string | undefined } }, secret: string): boolean {
  return c.req.header('X-Internal-Secret') === secret;
}

// POST https://internal/auth/verify — returns full AuthUser from token
app.post('/auth/verify', async c => {
  if (!requireInternal(c, c.env.JWT_SECRET)) return err('Forbidden', 403);
  const { token } = await c.req.json<{ token: string }>();
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) return err('Invalid token', 401);

  // Hydrate full AuthUser from DB (includes tier, orgName, workerScript)
  const row = await c.env.DB.prepare(`
    SELECT u.id as "userId", u.org_id as "orgId", u.name, u.email, u.role,
           o.tier, o.name as "orgName", o.worker_script as "workerScript"
    FROM users u JOIN orgs o ON o.id = u.org_id
    WHERE u.id = ?
  `).bind(payload.userId).first<{
    userId: string; orgId: string; name: string; email: string;
    role: string; tier: string; orgName: string; workerScript: string | null;
  }>();

  if (!row) return err('User not found', 404);
  return ok(row);
});

// GET https://internal/auth/org/:orgId — returns org with worker_script
app.get('/auth/org/:orgId', async c => {
  if (!requireInternal(c, c.env.JWT_SECRET)) return err('Forbidden', 403);
  const org = await c.env.DB.prepare(
    'SELECT id, name, tier, worker_script, created_at FROM orgs WHERE id = ?'
  ).bind(c.req.param('orgId')).first();
  if (!org) return err('Org not found', 404);
  return ok(org);
});

// PATCH https://internal/auth/org — update worker_script on org
app.patch('/auth/org', async c => {
  if (!requireInternal(c, c.env.JWT_SECRET)) return err('Forbidden', 403);
  const { orgId, worker_script } = await c.req.json<{ orgId: string; worker_script: string | null }>();
  if (!orgId) return err('orgId required');
  await c.env.DB.prepare('UPDATE orgs SET worker_script = ? WHERE id = ?')
    .bind(worker_script ?? null, orgId).run();
  return ok({ updated: true });
});
