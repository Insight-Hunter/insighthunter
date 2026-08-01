import { Hono } from 'hono';
import { html } from 'hono/html';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { cors } from 'hono/middleware';
import type { OrgRole } from '@insighthunter/authz';

type Bindings = {
  DB: D1Database;
  KV_SESSIONS: KVNamespace;
  AUTH_SECRET: string;
  RESEND_API_KEY: string;
  APP_BASE_URL: string;
  DASHBOARD_URL: string;
  MARKETING_URL: string;
};

export interface IHSession {
  sessionId: string;
  userId: string;
  orgId: string;
  email: string;
  name: string;
  orgName: string;
  orgSlug: string;
  role: OrgRole;
  plan: string;
  mfaVerified: boolean;
  createdAt: number;
  expiresAt: number;
}

const app = new Hono<{ Bindings: Bindings }>();

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

app.use('/api/*', cors({
  origin: ['https://insighthunter.app', 'https://app.insighthunter.app'],
  credentials: true,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return (await hashPassword(password)) === hash;
}

async function createSession(
  kv: KVNamespace,
  db: D1Database,
  userId: string, orgId: string, email: string, name: string,
  orgName: string, orgSlug: string, role: OrgRole, plan: string,
  ip: string, ua: string,
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 60 * 60 * 24 * 7; // 7 days
  const session: IHSession = { sessionId, userId, orgId, email, name, orgName, orgSlug, role, plan, mfaVerified: false, createdAt: now, expiresAt };
  await kv.put(`session:${sessionId}`, JSON.stringify(session), { expirationTtl: 60 * 60 * 24 * 7 });
  await db.prepare('INSERT INTO sessions (id, user_id, org_id, ip_address, user_agent, expires_at) VALUES (?,?,?,?,?,?)')
    .bind(sessionId, userId, orgId, ip, ua, expiresAt).run();
  return sessionId;
}

async function writeAudit(db: D1Database, orgId: string, userId: string, action: string, resourceType: string, ip: string): Promise<void> {
  await db.prepare('INSERT INTO audit_logs (id, org_id, user_id, action, resource_type, ip_address, created_at) VALUES (?,?,?,?,?,?,datetime(\'now\'))')
    .bind(crypto.randomUUID(), orgId, userId, action, resourceType, ip).run();
}

async function sendEmail(apiKey: string, to: string, subject: string, body: string): Promise<void> {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'InsightHunter <noreply@insighthunter.app>', to, subject, html: body }),
  });
}

// ── Styles ───────────────────────────────────────────────────────────────────

const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--brand:#0ea5e9;--dark:#0f172a;--card:#1e293b;--text:#e2e8f0;--muted:#94a3b8;--err:#ef4444;--ok:#22c55e}
  body{font-family:system-ui,sans-serif;background:var(--dark);color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center}
  .card{background:var(--card);border:1px solid #334155;border-radius:16px;padding:2.5rem;width:100%;max-width:420px}
  .logo{text-align:center;font-size:1.5rem;font-weight:900;color:var(--brand);margin-bottom:1.5rem}
  h1{text-align:center;font-size:1.5rem;font-weight:800;margin-bottom:.5rem}
  .sub{text-align:center;color:var(--muted);font-size:.9rem;margin-bottom:2rem}
  label{display:block;font-size:.85rem;font-weight:600;color:var(--muted);margin-bottom:.35rem}
  input{width:100%;background:var(--dark);border:1px solid #334155;border-radius:8px;padding:.75rem 1rem;color:var(--text);font-size:.95rem;margin-bottom:1rem;outline:none}
  input:focus{border-color:var(--brand)}
  .btn{width:100%;background:var(--brand);color:#fff;border:none;border-radius:8px;padding:.85rem;font-size:1rem;font-weight:700;cursor:pointer;margin-top:.5rem}
  .btn:hover{opacity:.9}
  .lnk{text-align:center;margin-top:1.25rem;font-size:.85rem;color:var(--muted)}
  .lnk a{color:var(--brand);text-decoration:none;font-weight:600}
  .err{background:#ef444420;border:1px solid var(--err);color:var(--err);border-radius:8px;padding:.75rem;font-size:.85rem;margin-bottom:1rem}
  .ok{background:#22c55e20;border:1px solid var(--ok);color:var(--ok);border-radius:8px;padding:.75rem;font-size:.85rem;margin-bottom:1rem}
  .div{text-align:center;color:var(--muted);font-size:.8rem;margin:1rem 0}
`;

// ── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ ok: true, service: 'insighthunter-auth', ts: Date.now() }));

// GET /login
app.get('/login', (c) => {
  const error = c.req.query('error');
  const success = c.req.query('success');
  const redirect = c.req.query('redirect') ?? '';
  const errMsg = error === 'invalid' ? 'Invalid email or password.' : error === 'expired' ? 'Session expired. Please sign in again.' : error === 'no_org' ? 'No organization found for this account.' : null;
  const okMsg = success === 'verified' ? 'Email verified! You can now sign in.' : success === 'password_reset' ? 'Password updated. Please sign in.' : null;
  return c.html(html`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign In — InsightHunter</title><style>${CSS}</style></head>
<body><div class="card">
  <div class="logo">⚡ InsightHunter</div>
  <h1>Welcome back</h1><p class="sub">Sign in to your account</p>
  ${errMsg ? html`<div class="err">${errMsg}</div>` : ''}
  ${okMsg ? html`<div class="ok">${okMsg}</div>` : ''}
  <form method="POST" action="/login">
    <input type="hidden" name="redirect" value="${redirect}"/>
    <label>Email</label><input type="email" name="email" placeholder="you@company.com" required autocomplete="email"/>
    <label>Password</label><input type="password" name="password" placeholder="••••••••" required autocomplete="current-password"/>
    <button class="btn" type="submit">Sign In</button>
  </form>
  <div class="lnk"><a href="/forgot-password">Forgot password?</a></div>
  <div class="div">— or —</div>
  <div class="lnk">New to InsightHunter? <a href="/register">Create account</a></div>
</div></body></html>`);
});

// POST /login
app.post('/login', async (c) => {
  const body = await c.req.parseBody();
  const email = (body.email as string)?.toLowerCase().trim();
  const password = body.password as string;
  const redirect = (body.redirect as string) || c.env.DASHBOARD_URL;
  const ip = c.req.header('CF-Connecting-IP') ?? '0.0.0.0';
  const ua = c.req.header('User-Agent') ?? '';
  if (!email || !password) return c.redirect('/login?error=invalid');
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email)
    .first<{ id: string; email: string; password_hash: string; name: string; email_verified: number }>();
  if (!user || !(await verifyPassword(password, user.password_hash))) return c.redirect('/login?error=invalid');
  const member = await c.env.DB.prepare(`
    SELECT om.role, om.org_id, o.name as org_name, o.slug as org_slug, o.plan
    FROM org_members om JOIN organizations o ON o.id = om.org_id
    WHERE om.user_id = ? AND om.accepted_at IS NOT NULL ORDER BY om.created_at ASC LIMIT 1
  `).bind(user.id).first<{ role: string; org_id: string; org_name: string; org_slug: string; plan: string }>();
  if (!member) return c.redirect('/login?error=no_org');
  const sessionId = await createSession(c.env.KV_SESSIONS, c.env.DB, user.id, member.org_id, user.email, user.name, member.org_name, member.org_slug, member.role as OrgRole, member.plan, ip, ua);
  await writeAudit(c.env.DB, member.org_id, user.id, 'user.login', 'session', ip);
  setCookie(c, 'ih_session', sessionId, { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 60 * 60 * 24 * 7, domain: '.insighthunter.app', path: '/' });
  return c.redirect(redirect);
});

// GET /register
app.get('/register', (c) => {
  const plan = c.req.query('plan') ?? 'starter';
  const error = c.req.query('error');
  const errMsg = error === 'exists' ? 'An account with that email already exists.' : error === 'weak_password' ? 'Password must be at least 8 characters.' : error === 'missing' ? 'All fields are required.' : null;
  return c.html(html`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Create Account — InsightHunter</title><style>${CSS}</style></head>
<body><div class="card">
  <div class="logo">⚡ InsightHunter</div>
  <h1>Get started free</h1><p class="sub">Create your business account</p>
  ${errMsg ? html`<div class="err">${errMsg}</div>` : ''}
  <form method="POST" action="/register">
    <input type="hidden" name="plan" value="${plan}"/>
    <label>Full Name</label><input type="text" name="name" placeholder="James Turner" required autocomplete="name"/>
    <label>Work Email</label><input type="email" name="email" placeholder="james@company.com" required autocomplete="email"/>
    <label>Company Name</label><input type="text" name="company" placeholder="Acme LLC" required/>
    <label>Password</label><input type="password" name="password" placeholder="Min 8 characters" required minlength="8" autocomplete="new-password"/>
    <button class="btn" type="submit">Create Account</button>
  </form>
  <div class="lnk">Already have an account? <a href="/login">Sign in</a></div>
</div></body></html>`);
});

// POST /register
app.post('/register', async (c) => {
  const body = await c.req.parseBody();
  const email = (body.email as string)?.toLowerCase().trim();
  const name = (body.name as string)?.trim();
  const company = (body.company as string)?.trim();
  const password = body.password as string;
  const plan = (body.plan as string) || 'starter';
  const ip = c.req.header('CF-Connecting-IP') ?? '0.0.0.0';
  if (!email || !name || !company || !password) return c.redirect('/register?error=missing');
  if (password.length < 8) return c.redirect('/register?error=weak_password');
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return c.redirect('/register?error=exists');
  const userId = crypto.randomUUID();
  const orgId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const tokenId = crypto.randomUUID();
  const verifyToken = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const orgSlug = company.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const now = Math.floor(Date.now() / 1000);
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO users (id, email, password_hash, name, email_verified) VALUES (?,?,?,?,0)').bind(userId, email, passwordHash, name),
    c.env.DB.prepare('INSERT INTO organizations (id, name, slug, plan, owner_id) VALUES (?,?,?,?,?)').bind(orgId, company, orgSlug, plan, userId),
    c.env.DB.prepare('INSERT INTO org_members (id, org_id, user_id, role, accepted_at) VALUES (?,?,?,\'owner\',?)').bind(memberId, orgId, userId, now),
    c.env.DB.prepare('INSERT INTO verification_tokens (id, user_id, token, type, expires_at) VALUES (?,?,?,\'email_verify\',?)').bind(tokenId, userId, verifyToken, now + 86400),
  ]);
  const verifyUrl = `${c.env.APP_BASE_URL}/verify-email?token=${verifyToken}`;
  await sendEmail(c.env.RESEND_API_KEY, email, 'Verify your InsightHunter account',
    `<p>Hi ${name},</p><p>Click below to verify your email:</p><p><a href="${verifyUrl}" style="background:#0ea5e9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Verify Email</a></p><p>Expires in 24 hours.</p>`);
  await writeAudit(c.env.DB, orgId, userId, 'user.register', 'user', ip);
  return c.redirect('/check-email?email=' + encodeURIComponent(email));
});

// GET /verify-email
app.get('/verify-email', async (c) => {
  const token = c.req.query('token');
  if (!token) return c.redirect('/login?error=invalid_token');
  const now = Math.floor(Date.now() / 1000);
  const rec = await c.env.DB.prepare(`SELECT user_id FROM verification_tokens WHERE token = ? AND type = 'email_verify' AND expires_at > ? AND used_at IS NULL`).bind(token, now).first<{ user_id: string }>();
  if (!rec) return c.redirect('/login?error=invalid_token');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(rec.user_id),
    c.env.DB.prepare('UPDATE verification_tokens SET used_at = ? WHERE token = ?').bind(now, token),
  ]);
  return c.redirect('/login?success=verified');
});

// GET /logout
app.get('/logout', async (c) => {
  const sessionId = getCookie(c, 'ih_session');
  if (sessionId) {
    await c.env.KV_SESSIONS.delete(`session:${sessionId}`);
    await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
  }
  deleteCookie(c, 'ih_session', { domain: '.insighthunter.app', path: '/' });
  return c.redirect(c.env.MARKETING_URL);
});

// GET /check-email
app.get('/check-email', (c) => {
  const email = c.req.query('email') ?? '';
  return c.html(html`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Check Your Email</title><style>${CSS}</style></head>
<body><div class="card" style="text-align:center">
  <div class="logo">⚡ InsightHunter</div>
  <div style="font-size:3rem;margin-bottom:1rem">📧</div>
  <h1>Check your email</h1>
  <p class="sub" style="margin-bottom:1.5rem">We sent a verification link to <strong>${email}</strong>.</p>
  <div class="lnk"><a href="/login">Return to Sign In</a></div>
</div></body></html>`);
});

// GET /forgot-password
app.get('/forgot-password', (c) => {
  return c.html(html`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Reset Password</title><style>${CSS}</style></head>
<body><div class="card">
  <div class="logo">⚡ InsightHunter</div>
  <h1>Reset password</h1><p class="sub">Enter your email to receive a reset link</p>
  <form method="POST" action="/forgot-password">
    <label>Email</label><input type="email" name="email" placeholder="you@company.com" required/>
    <button class="btn" type="submit">Send Reset Link</button>
  </form>
  <div class="lnk"><a href="/login">Back to Sign In</a></div>
</div></body></html>`);
});

// POST /forgot-password
app.post('/forgot-password', async (c) => {
  const body = await c.req.parseBody();
  const email = (body.email as string)?.toLowerCase().trim();
  if (!email) return c.redirect('/forgot-password');
  const user = await c.env.DB.prepare('SELECT id, name FROM users WHERE email = ?').bind(email).first<{ id: string; name: string }>();
  if (user) {
    const resetToken = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await c.env.DB.prepare('INSERT INTO verification_tokens (id, user_id, token, type, expires_at) VALUES (?,?,?,\'password_reset\',?)')
      .bind(crypto.randomUUID(), user.id, resetToken, now + 3600).run();
    const resetUrl = `${c.env.APP_BASE_URL}/reset-password?token=${resetToken}`;
    await sendEmail(c.env.RESEND_API_KEY, email, 'Reset your InsightHunter password',
      `<p>Hi ${user.name},</p><p>Click to reset your password (expires in 1 hour):</p><p><a href="${resetUrl}" style="background:#0ea5e9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">Reset Password</a></p>`);
  }
  return c.redirect('/check-email?email=' + encodeURIComponent(email));
});

// GET /reset-password
app.get('/reset-password', (c) => {
  const token = c.req.query('token') ?? '';
  const error = c.req.query('error');
  return c.html(html`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>New Password</title><style>${CSS}</style></head>
<body><div class="card">
  <div class="logo">⚡ InsightHunter</div>
  <h1>Set new password</h1><p class="sub">Choose a strong password for your account</p>
  ${error ? html`<div class="err">Invalid or expired reset link.</div>` : ''}
  <form method="POST" action="/reset-password">
    <input type="hidden" name="token" value="${token}"/>
    <label>New Password</label><input type="password" name="password" placeholder="Min 8 characters" required minlength="8"/>
    <button class="btn" type="submit">Update Password</button>
  </form>
</div></body></html>`);
});

// POST /reset-password
app.post('/reset-password', async (c) => {
  const body = await c.req.parseBody();
  const token = body.token as string;
  const password = body.password as string;
  if (!token || !password || password.length < 8) return c.redirect(`/reset-password?token=${token}&error=1`);
  const now = Math.floor(Date.now() / 1000);
  const rec = await c.env.DB.prepare(`SELECT user_id FROM verification_tokens WHERE token = ? AND type = 'password_reset' AND expires_at > ? AND used_at IS NULL`).bind(token, now).first<{ user_id: string }>();
  if (!rec) return c.redirect('/login?error=invalid_token');
  const passwordHash = await hashPassword(password);
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, rec.user_id),
    c.env.DB.prepare('UPDATE verification_tokens SET used_at = ? WHERE token = ?').bind(now, token),
    c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(rec.user_id),
  ]);
  return c.redirect('/login?success=password_reset');
});

// API: Validate session — called by other Workers via service binding or HTTP
app.get('/api/session', async (c) => {
  const sessionId = getCookie(c, 'ih_session') ?? c.req.header('X-Session-Token');
  if (!sessionId) return c.json({ valid: false }, 401);
  const session = await c.env.KV_SESSIONS.get(`session:${sessionId}`, 'json') as IHSession | null;
  if (!session || session.expiresAt < Math.floor(Date.now() / 1000)) return c.json({ valid: false }, 401);
  return c.json({ valid: true, session });
});

// API: /api/session (legacy /session/:token stub for backwards compat)
app.get('/session/:token', (c) => c.json({
  ok: true,
  session: { token: c.req.param('token'), user: { subject: 'demo-user', email: 'demo@insighthunter.app' }, expiresAt: new Date(Date.now() + 3600000).toISOString() },
}));

export default app;
