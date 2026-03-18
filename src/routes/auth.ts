import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import type { Env } from '../index'

export const authRoutes = new Hono<{ Bindings: Env }>()

// ── Register ─────────────────────────────────────────────────
authRoutes.post('/register', async c => {
  const { email, password, name } = await c.req.json<any>()
  if (!email || !password) return c.json({ error: 'email and password required' }, 400)

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email.toLowerCase()).first()
  if (existing) return c.json({ error: 'Email already registered' }, 409)

  const id           = crypto.randomUUID()
  const passwordHash = await hashPassword(password, c.env.ENCRYPTION_KEY)

  await c.env.DB.prepare(
    `INSERT INTO users (id,email,name,password_hash,plan,created_at) VALUES (?,?,?,?,'free',?)`
  ).bind(id, email.toLowerCase(), name??null, passwordHash, new Date().toISOString()).run()

  const sessionId = await createSession(c, id, 'free')
  setSessionCookie(c, sessionId)
  return c.json({ ok: true, userId: id }, 201)
})

// ── Login ────────────────────────────────────────────────────
authRoutes.post('/login', async c => {
  const { email, password } = await c.req.json<any>()
  if (!email || !password) return c.json({ error: 'email and password required' }, 400)

  const user = await c.env.DB.prepare(
    'SELECT id, password_hash, plan, name FROM users WHERE email=?'
  ).bind(email.toLowerCase()).first<any>()

  if (!user) return c.json({ error: 'Invalid credentials' }, 401)

  const valid = await verifyPassword(password, user.password_hash, c.env.ENCRYPTION_KEY)
  if (!valid)  return c.json({ error: 'Invalid credentials' }, 401)

  const sessionId = await createSession(c, user.id, user.plan)
  setSessionCookie(c, sessionId)
  c.env.ANALYTICS.writeDataPoint({ blobs:['login'], doubles:[1], indexes:[user.id] })
  return c.json({ ok: true, name: user.name, plan: user.plan })
})

// ── Me ───────────────────────────────────────────────────────
authRoutes.get('/me', async c => {
  const sessionId = getCookieValue(c.req.header('Cookie')??'', 'ih_session')
  if (!sessionId) return c.json({ error: 'Not authenticated' }, 401)
  const session = await c.env.SESSIONS.get(sessionId, { type: 'json' }) as any
  if (!session)  return c.json({ error: 'Session expired' }, 401)
  const user = await c.env.DB.prepare(
    'SELECT id, email, name, plan, created_at FROM users WHERE id=?'
  ).bind(session.userId).first<any>()
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json({ user })
})

// ── Logout ───────────────────────────────────────────────────
authRoutes.post('/logout', async c => {
  const sessionId = getCookieValue(c.req.header('Cookie')??'', 'ih_session')
  if (sessionId) await c.env.SESSIONS.delete(sessionId)
  deleteCookie(c, 'ih_session', { path:'/', domain: getDomain(c.env.APP_URL) })
  return c.json({ ok: true })
})

// ── Change Password ───────────────────────────────────────────
authRoutes.post('/change-password', async c => {
  const sessionId = getCookieValue(c.req.header('Cookie')??'', 'ih_session')
  if (!sessionId) return c.json({ error: 'Unauthorized' }, 401)
  const session = await c.env.SESSIONS.get(sessionId, { type:'json' }) as any
  if (!session)  return c.json({ error: 'Session expired' }, 401)
  const { current, password } = await c.req.json<any>()
  if (!current || !password || password.length < 10) return c.json({ error: 'Invalid input' }, 400)
  const user = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id=?').bind(session.userId).first<any>()
  const valid = await verifyPassword(current, user.password_hash, c.env.ENCRYPTION_KEY)
  if (!valid) return c.json({ error: 'Current password incorrect' }, 401)
  const newHash = await hashPassword(password, c.env.ENCRYPTION_KEY)
  await c.env.DB.prepare('UPDATE users SET password_hash=?,updated_at=? WHERE id=?')
    .bind(newHash, new Date().toISOString(), session.userId).run()
  return c.json({ ok: true })
})

// ── Helpers ───────────────────────────────────────────────────
async function hashPassword(pw: string, key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data    = encoder.encode(pw + key)
  const hash    = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
}

async function verifyPassword(pw: string, hash: string, key: string): Promise<boolean> {
  return (await hashPassword(pw, key)) === hash
}

async function createSession(c: any, userId: string, plan: string): Promise<string> {
  const sessionId = crypto.randomUUID()
  await c.env.SESSIONS.put(sessionId, JSON.stringify({ userId, plan, createdAt: Date.now() }), {
    expirationTtl: +c.env.SESSION_TTL_SECONDS,
  })
  return sessionId
}

function setSessionCookie(c: any, sessionId: string) {
  setCookie(c, 'ih_session', sessionId, {
    httpOnly: true, secure: true, sameSite: 'Lax',
    path: '/', maxAge: 86400,
  })
}

function getDomain(url: string): string {
  try { return new URL(url).hostname } catch { return '' }
}

function getCookieValue(cookieStr: string, name: string): string | undefined {
  return cookieStr.split(';').map(c=>c.trim()).find(c=>c.startsWith(name+'='))?.split('=')[1]
}
