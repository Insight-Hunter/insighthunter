import { Hono } from 'hono';
import type { Env } from '../types/env';
import { login, register, logout } from '../services/authService';
import { verify } from 'hono/jwt';

export const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.post('/register', async c => {
  const body = await c.req.json();
  try {
    const { user, tokens } = await register(c.env.DB, c.env.KV, c.env.JWT_SECRET, body);
    return c.json({ data: { user, tokens } }, 201);
  } catch (e: any) {
    if (e.message === 'EMAIL_TAKEN') return c.json({ error: 'Email already registered' }, 409);
    throw e;
  }
});

authRoutes.post('/login', async c => {
  const body = await c.req.json();
  try {
    const { user, tokens } = await login(c.env.DB, c.env.KV, c.env.JWT_SECRET, body);
    return c.json({ data: { user, tokens } });
  } catch (e: any) {
    if (e.message === 'INVALID_CREDENTIALS') return c.json({ error: 'Invalid email or password' }, 401);
    throw e;
  }
});

authRoutes.post('/logout', async c => {
  const bearer = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!bearer) {
    return c.json({ error: 'No token provided' }, 401);
  }

  try {
    const payload = await verify(bearer, c.env.JWT_SECRET);
    if (payload && payload.sub) {
      await logout(payload.sub, c.env.KV);
      return c.json({ ok: true });
    } else {
      return c.json({ error: 'Invalid token' }, 401);
    }
  } catch (error) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
});