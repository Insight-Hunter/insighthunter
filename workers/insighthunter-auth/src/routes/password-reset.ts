import { Hono } from 'hono';
import type { Env } from '../types/env';
import { forgotPassword, resetPassword } from '../services/authService';

export const passwordResetRoutes = new Hono<{ Bindings: Env }>();

passwordResetRoutes.post('/forgot-password', async c => {
  const body = await c.req.json();
  try {
    await forgotPassword(c.env.DB, c.env.KV, body.email);
    return c.json({ ok: true });
  } catch (e: any) {
    if (e.message === 'USER_NOT_FOUND') return c.json({ error: 'User not found' }, 404);
    throw e;
  }
});

passwordResetRoutes.post('/reset-password', async c => {
  const body = await c.req.json();
  try {
    await resetPassword(c.env.DB, c.env.KV, body.token, body.password);
    return c.json({ ok: true });
  } catch (e: any) {
    if (e.message === 'INVALID_TOKEN') return c.json({ error: 'Invalid or expired token' }, 400);
    throw e;
  }
});
