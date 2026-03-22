// apps/insighthunter-auth/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'

export interface Env {
  DB: D1Database
  AUTH_KV: KVNamespace
  JWT_SECRET: string        // wrangler secret put JWT_SECRET
  RESEND_API_KEY: string    // wrangler secret put RESEND_API_KEY
  SITE_URL: string          // https://insighthunter.app
}

// ── Crypto helpers ────────────────────────────────────────────
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, 256
  )
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2,'0')).join('')
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2,'0')).join('')
  return `${saltHex}:${hashHex}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const enc = new TextEncoder()
  const [saltHex, storedHash] = stored.split(':')
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)))
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, 256
  )
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2,'0')).join('')
  return hashHex === storedHash
}

async function signJWT(payload: Record<string, unknown>, secret: string, expiresInSec = 604800): Promise<string> {
  const enc = new TextEncoder()
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  const body = btoa(JSON.stringify({ ...payload, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + expiresInSec })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${body}`))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  return `${header}.${body}.${sigB64}`
}

async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const enc = new TextEncoder()
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sigBytes = Uint8Array.from(atob(parts[2].replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(`${parts[0]}.${parts[1]}`))
    if (!valid) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')))
    if (payload.exp < Math.floor(Date.now()/1000)) return null
    return payload
  } catch { return null }
}

function uuid(): string {
  return crypto.randomUUID()
}

async function sendResetEmail(to: string, resetUrl: string, apiKey: string): Promise<void> {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Insight Hunter <noreply@insighthunter.app>',
      to,
      subject: 'Reset your Insight Hunter password',
      html: `<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#0D1117;color:#fff;padding:2rem;border-radius:12px">
        <h2 style="color:#C9972B">Reset your password</h2>
        <p style="color:#94A3B8">Click the link below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:1.5rem 0;padding:.75rem 1.5rem;background:#C9972B;color:#0D1117;border-radius:8px;font-weight:700;text-decoration:none">Reset Password</a>
        <p style="color:#64748B;font-size:.8rem">If you didn't request this, ignore this email.</p>
      </div>`
    })
  })
}

// ── App ───────────────────────────────────────────────────────
const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: (origin) => origin?.includes('insighthunter.app') || origin?.includes('localhost') ? origin : null,
  credentials: true,
  allowMethods: ['GET','POST','OPTIONS'],
  allowHeaders: ['Content-Type','Authorization'],
}))

// ── POST /auth/register ───────────────────────────────────────
app.post('/auth/register', async (c) => {
  const { email, password, first_name, last_name, business_name } = await c.req.json<{
    email: string; password: string; first_name: string; last_name: string; business_name?: string
  }>()

  if (!email || !password || !first_name) {
    return c.json({ error: 'Email, password, and first name are required.' }, 400)
  }
  if (password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters.' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first()
  if (existing) return c.json({ error: 'An account with this email already exists.' }, 409)

  const id = uuid()
  const password_hash = await hashPassword(password)

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, first_name, last_name, business_name) VALUES (?,?,?,?,?,?)'
  ).bind(id, email.toLowerCase(), password_hash, first_name, last_name ?? '', business_name ?? '').run()

  const token = await signJWT({ sub: id, email: email.toLowerCase(), plan: 'lite', first_name }, c.env.JWT_SECRET)

  setCookie(c, 'ih_token', token, {
    httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 604800
  })

  return c.json({ success: true, user: { id, email, first_name, last_name, plan: 'lite' }, token })
})

// ── POST /auth/login ──────────────────────────────────────────
app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>()

  if (!email || !password) return c.json({ error: 'Email and password are required.' }, 400)

  const user = await c.env.DB.prepare(
    'SELECT id, email, password_hash, first_name, last_name, plan FROM users WHERE email = ?'
  ).bind(email.toLowerCase()).first<{ id:string; email:string; password_hash:string; first_name:string; last_name:string; plan:string }>()

  if (!user) return c.json({ error: 'Invalid email or password.' }, 401)

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return c.json({ error: 'Invalid email or password.' }, 401)

  const token = await signJWT(
    { sub: user.id, email: user.email, plan: user.plan, first_name: user.first_name },
    c.env.JWT_SECRET
  )

  setCookie(c, 'ih_token', token, {
    httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 604800
  })

  await c.env.DB.prepare('UPDATE users SET updated_at = datetime("now") WHERE id = ?').bind(user.id).run()

  return c.json({ success: true, user: { id: user.id, email: user.email, first_name: user.first_name, plan: user.plan }, token })
})

// ── POST /auth/logout ─────────────────────────────────────────
app.post('/auth/logout', (c) => {
  deleteCookie(c, 'ih_token', { path: '/' })
  return c.json({ success: true })
})

// ── GET /auth/me ──────────────────────────────────────────────
app.get('/auth/me', async (c) => {
  const token = getCookie(c, 'ih_token') ?? c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return c.json({ error: 'Unauthenticated' }, 401)

  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Invalid or expired session.' }, 401)

  const user = await c.env.DB.prepare(
    'SELECT id, email, first_name, last_name, business_name, plan, created_at FROM users WHERE id = ?'
  ).bind(payload.sub).first()

  return user ? c.json({ user }) : c.json({ error: 'User not found.' }, 404)
})

// ── POST /auth/forgot-password ────────────────────────────────
app.post('/auth/forgot-password', async (c) => {
  const { email } = await c.req.json<{ email: string }>()
  if (!email) return c.json({ error: 'Email is required.' }, 400)

  const user = await c.env.DB.prepare('SELECT id, first_name FROM users WHERE email = ?')
    .bind(email.toLowerCase()).first<{ id:string; first_name:string }>()

  // Always return success to prevent email enumeration
  if (!user) return c.json({ success: true, message: 'If that email exists, a reset link has been sent.' })

  const token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2,'0')).join('')
  const expires = new Date(Date.now() + 3600_000).toISOString()

  await c.env.DB.prepare(
    'INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES (?,?,?,?)'
  ).bind(uuid(), user.id, token, expires).run()

  const resetUrl = `${c.env.SITE_URL}/auth/reset-password.html?token=${token}`
  await sendResetEmail(email, resetUrl, c.env.RESEND_API_KEY)

  return c.json({ success: true, message: 'If that email exists, a reset link has been sent.' })
})

// ── POST /auth/reset-password ─────────────────────────────────
app.post('/auth/reset-password', async (c) => {
  const { token, password } = await c.req.json<{ token:string; password:string }>()
  if (!token || !password) return c.json({ error: 'Token and password are required.' }, 400)
  if (password.length < 8) return c.json({ error: 'Password must be at least 8 characters.' }, 400)

  const reset = await c.env.DB.prepare(
    'SELECT id, user_id, expires_at, used FROM password_resets WHERE token_hash = ?'
  ).bind(token).first<{ id:string; user_id:string; expires_at:string; used:number }>()

  if (!reset || reset.used || new Date(reset.expires_at) < new Date()) {
    return c.json({ error: 'This reset link is invalid or has expired.' }, 400)
  }

  const password_hash = await hashPassword(password)
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').bind(password_hash, reset.user_id).run()
  await c.env.DB.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').bind(reset.id).run()

  return c.json({ success: true, message: 'Password updated. You can now sign in.' })
})

export default app
// src/index.ts
import { Hono } from "hono";
import OAuthProvider from "@cloudflare/workers-oauth-provider";

// Your protected API routes
const api = new Hono<{ Bindings: Env }>();

api.get("/me", (c) => {
  // Access authenticated user props injected by the OAuth layer
  const { userId, email, scopes } = c.env.USER_PROPS as any;
  return c.json({ userId, email, scopes });
});

api.get("/dashboard", (c) => {
  // Your Insight Hunter dashboard data
  return c.json({ message: "Protected data here" });
});

// Auth handler — renders login UI and verifies credentials
async function handleLogin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET") {
    // Return your login page HTML
    return new Response(`
      <form method="POST" action="/authorize">
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />
        <button type="submit">Login</button>
      </form>
    `, { headers: { "Content-Type": "text/html" } });
  }

  if (request.method === "POST") {
    const body = await request.formData();
    const email = body.get("email") as string;
    const password = body.get("password") as string;

    // Validate against your D1 users table
    // const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
    //   .bind(email).first();

    const isValid = email && password; // Replace with real D1 check

    if (!isValid) {
      return new Response("Invalid credentials", { status: 401 });
    }

    // Return user identity — library binds this to the issued token
    return new Response(JSON.stringify({
      login: true,
      userId: "user-123",       // from D1
      email,
      scopes: ["read", "write"] // what this user can do
    }), { headers: { "Content-Type": "application/json" } });
  }

  return new Response("Method not allowed", { status: 405 });
}

// Export the OAuthProvider as your Worker entrypoint
export default new OAuthProvider({
  apiRoute: "/api",             // All /api/* routes go to your Hono app
  apiHandler: api.fetch,        // Your Hono handler
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",  // Optional: dynamic client registration
  defaultScopes: ["read"],
  kvNamespace: "OAUTH_KV",      // KV binding name from wrangler.toml
  loginHandler: handleLogin,    // Your auth logic above
});
