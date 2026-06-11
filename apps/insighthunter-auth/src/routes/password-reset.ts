import { Hono } from 'hono';
import type { Env } from '../types/env';
import { forgotPassword, resetPassword } from '../services/authService';

export const passwordResetRoutes = new Hono<{ Bindings: Env }>();

// POST /auth/forgot-password
// Body: { email: string }
// Always returns 200 to prevent email enumeration
passwordResetRoutes.post('/forgot-password', async c => {
  const body = await c.req.json().catch(() => ({}));
  if (!body.email || typeof body.email !== 'string') {
    return c.json({ error: 'email is required' }, 400);
  }
  // forgotPassword never throws for unknown emails — safe to await unconditionally
  await forgotPassword(c.env.IH_AUTH_DB, c.env.KV, c.env, body.email);
  return c.json({ ok: true });
});

// POST /auth/reset-password
// Body: { token: string, password: string }
passwordResetRoutes.post('/reset-password', async c => {
  const body = await c.req.json().catch(() => ({}));
  if (!body.token || !body.password) {
    return c.json({ error: 'token and password are required' }, 400);
  }
  try {
    await resetPassword(c.env.IH_AUTH_DB, c.env.KV, body.token, body.password);
    return c.json({ ok: true });
  } catch (e: any) {
    if (e.message === 'INVALID_TOKEN') {
      return c.json({ error: 'Invalid or expired reset link' }, 400);
    }
    throw e;
  }
});
