import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import type { Env } from '../types/env';
import type { AuthContext } from '../types/auth';
import { getUserById, updateUser } from '../db/queries';
import { hashPassword, verifyPassword } from '../lib/password';
import { trackAuthEvent } from '../lib/analytics';

// Define a type for Hono's context, including variables set by middleware
type HonoContext = {
  Bindings: Env,
  Variables: {
    auth: AuthContext
  }
}

export const meRoutes = new Hono<HonoContext>();

// ── Auth Middleware ─────────────────────────────────────────────────────────────
// This middleware protects all /me/* routes and sets the auth context.
meRoutes.use('/me/*', async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }
  
  try {
    const payload = await verify(token, c.env.JWT_SECRET);
    if (!payload.sub || !payload.orgId || !payload.role) {
      return c.json({ error: 'Unauthorized: Invalid token payload' }, 401);
    }
    
    c.set('auth', {
      userId: payload.sub,
      orgId: payload.orgId as string,
      role: payload.role as string,
    });
  } catch (error) {
    return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401);
  }
  
  await next();
});


// ── GET /me ───────────────────────────────────────────────────────────────────
meRoutes.get('/me', async c => {
  const ctx = c.get('auth');
  const user = await getUserById(c.env.DB, ctx.userId);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Use destructuring to safely exclude sensitive fields from the response
  const { password_hash, ...safeUser } = user;
  return c.json(safeUser);
});

// ── PATCH /me ─────────────────────────────────────────────────────────────────
// Update user's name and/or email
meRoutes.patch('/me', async c => {
  const ctx = c.get('auth');
  const body = await c.req.json<{ name?: string; email?: string }>();

  if (!body.name && !body.email) {
    return c.json({ error: 'Nothing to update' }, 400);
  }

  if (body.email) {
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ? AND id != ?'
    ).bind(body.email.toLowerCase(), ctx.userId).first();
    if (existing) {
      return c.json({ error: 'Email already in use' }, 409);
    }
  }

  await updateUser(c.env.DB, ctx.userId, {
    ...(body.name && { name: body.name }),
    ...(body.email && { email: body.email.toLowerCase() }),
  });

  trackAuthEvent(c.env, 'user_updated', ctx.orgId, { userId: ctx.userId });
  return c.json({ ok: true });
});

// ── POST /me/password ─────────────────────────────────────────────────────────
meRoutes.post('/me/password', async c => {
  const ctx = c.get('auth');
  const body = await c.req.json<{ currentPassword?: string; newPassword?: string }>();
  
  if (!body.currentPassword || !body.newPassword) {
    return c.json({ error: 'Both currentPassword and newPassword are required' }, 400);
  }
  if (body.newPassword.length < 8) {
    return c.json({ error: 'New password must be at least 8 characters long' }, 400);
  }

  const row = await c.env.DB.prepare(
    'SELECT password_hash FROM users WHERE id = ?'
  ).bind(ctx.userId).first<{ password_hash: string }>();
  
  if (!row) {
    return c.json({ error: 'User not found' }, 404);
  }

  const valid = await verifyPassword(body.currentPassword, row.password_hash);
  if (!valid) {
    return c.json({ error: 'The current password is incorrect' }, 403);
  }

  const newHash = await hashPassword(body.newPassword);
  await c.env.DB.prepare(
    'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?'
  ).bind(newHash, new Date().toISOString(), ctx.userId).run();

  // For security, revoke all refresh tokens, forcing re-login on all devices
  const list = await c.env.KV.list({ prefix: `refresh:${ctx.userId}:` });
  await Promise.all(list.keys.map(k => c.env.KV.delete(k.name)));

  trackAuthEvent(c.env, 'password_changed', ctx.orgId, { userId: ctx.userId });
  return c.json({ ok: true, message: 'Password updated successfully. Please log in again.' });
});

// ── DELETE /me ────────────────────────────────────────────────────────────────
// Soft-deletes the user by marking them as inactive
meRoutes.delete('/me', async c => {
  const ctx = c.get('auth');

  if (ctx.role === 'owner') {
    return c.json({ error: 'Organization owners must delete the organization via DELETE /auth/org.' }, 400);
  }

  await c.env.DB.prepare(
    'UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?'
  ).bind(new Date().toISOString(), ctx.userId).run();

  // Revoke all access and refresh tokens
  const list = await c.env.KV.list({ prefix: `refresh:${ctx.userId}:` });
  await Promise.all(list.keys.map(k => c.env.KV.delete(k.name)));

  trackAuthEvent(c.env, 'user_deactivated', ctx.orgId, { userId: ctx.userId });
  return c.json({ ok: true });
});
