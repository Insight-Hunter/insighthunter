// apps/insighthunter-auth/src/lib/auth.ts
import * as jose from 'jose';
import * as bcrypt from 'bcryptjs';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const BCRYPT_ROUNDS = 10;

interface Env {
  DB: D1Database;
  LOGIN_SESSION_CACHE: KVNamespace;
  RATE_LIMIT: KVNamespace;
  ANALYTICS: AnalyticsEngineDataset;
  JWT_SECRET: string;
  VERIFY_EMAIL_JWT_SECRET: string;
  MAGIC_LINK_JWT_SECRET: string;
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  APP_DOMAIN: string;
  APP_NAME: string;
}

// ── Rate Limiting ────────────────────────────────────────────────────────────
// Adapted from zcsd/sveltekit-cloudflare-template pattern
export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const raw   = await kv.get(key);
  const count = raw ? parseInt(raw) : 0;

  if (count >= limit) return { allowed: false, remaining: 0 };

  await kv.put(key, String(count + 1), { expirationTtl: windowSeconds });
  return { allowed: true, remaining: limit - count - 1 };
}

// ── Turnstile CAPTCHA Verification ───────────────────────────────────────────
export async function verifyTurnstile(token: string, secretKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    });
    const data = await res.json() as { success: boolean };
    return data.success;
  } catch {
    return false;
  }
}

// ── Password ─────────────────────────────────────────────────────────────────
export const hashPassword   = (pw: string) => bcrypt.hash(pw, BCRYPT_ROUNDS);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

// ── JWT ──────────────────────────────────────────────────────────────────────
export async function signAuthJWT(
  userId: string,
  email: string,
  secret: string
): Promise<string> {
  return new jose.SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(secret));
}

export async function verifyJWT(token: string, secret: string) {
  const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(secret));
  return payload;
}

export async function signEmailJWT(
  email: string,
  secret: string,
  expiresIn = '24h'
): Promise<string> {
  return new jose.SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

// ── Session (KV cache + D1 backup) ───────────────────────────────────────────
// Pattern from zcsd template: KV for fast lookup, D1 for persistence
export async function createSession(
  env: Env,
  userId: string,
  email: string
): Promise<string> {
  const token     = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

  // KV: fast edge lookup
  await env.LOGIN_SESSION_CACHE.put(
    `session:${token}`,
    JSON.stringify({ userId, email }),
    { expirationTtl: SESSION_TTL_SECONDS }
  );

  // D1: persistent backup
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`
  ).bind(token, userId, expiresAt).run();

  return token;
}

export async function getSession(
  env: Env,
  token: string
): Promise<{ userId: string; email: string } | null> {
  const cached = await env.LOGIN_SESSION_CACHE.get(`session:${token}`);
  if (cached) return JSON.parse(cached);

  // KV miss -- check D1 (handles KV eviction edge case)
  const row = await env.DB.prepare(
    `SELECT s.user_id, u.email FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > datetime('now')`
  ).bind(token).first<{ user_id: string; email: string }>();

  if (!row) return null;

  // Re-hydrate KV
  await env.LOGIN_SESSION_CACHE.put(
    `session:${token}`,
    JSON.stringify({ userId: row.user_id, email: row.email }),
    { expirationTtl: SESSION_TTL_SECONDS }
  );
  return { userId: row.user_id, email: row.email };
}

export async function deleteSession(env: Env, token: string): Promise<void> {
  await env.LOGIN_SESSION_CACHE.delete(`session:${token}`);
  await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(token).run();
}

// ── Resend Email ─────────────────────────────────────────────────────────────
export async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'InsightHunter <noreply@insighthunter.app>', to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error: ${err}`);
  }
}

export function verificationEmailHtml(appName: string, verifyUrl: string): string {
  return `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:2rem">
      <h2 style="color:#111827">Verify your email</h2>
      <p style="color:#4b5563">Thanks for signing up for ${appName}. Click below to verify your email address.</p>
      <a href="${verifyUrl}"
         style="display:inline-block;background:#007aff;color:#fff;padding:.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:500;margin:1rem 0">
        Verify Email
      </a>
      <p style="color:#9ca3af;font-size:.875rem">This link expires in 24 hours. If you didn't sign up, ignore this email.</p>
    </div>`;
}

export function magicLinkEmailHtml(appName: string, magicUrl: string): string {
  return `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:2rem">
      <h2 style="color:#111827">Your sign-in link</h2>
      <p style="color:#4b5563">Click below to sign in to ${appName}. This link expires in 15 minutes.</p>
      <a href="${magicUrl}"
         style="display:inline-block;background:#007aff;color:#fff;padding:.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:500;margin:1rem 0">
        Sign In to ${appName}
      </a>
      <p style="color:#9ca3af;font-size:.875rem">If you didn't request this, ignore this email.</p>
    </div>`;
}

export function auditLog(
  env: Env,
  action: string,
  userId: string | null,
  ip: string,
  userAgent: string,
  metadata?: Record<string, unknown>
): void {
  // Fire-and-forget -- non-blocking
  env.DB.prepare(
    `INSERT INTO audit_log (user_id, action, ip_address, user_agent, metadata)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(userId, action, ip, userAgent, JSON.stringify(metadata ?? {})).run();
}
