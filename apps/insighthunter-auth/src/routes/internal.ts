import { Hono } from 'hono';
import type { Env } from '../types/env';
import type { VerifyResponse } from '../types/auth';
import { verifyAccessToken } from '../services/tokenService';

export const internalRoutes = new Hono<{ Bindings: Env }>();

// Called ONLY via Service Binding — not exposed to public internet
internalRoutes.post('/verify', async c => {
  const { token } = await c.req.json<{ token: string }>();
  if (!token) return c.json<VerifyResponse>({ valid: false, context: null, error: 'NO_TOKEN' });

  const context = await verifyAccessToken(token, c.env.JWT_SECRET);
  if (!context)  return c.json<VerifyResponse>({ valid: false, context: null, error: 'INVALID_TOKEN' }, 401);

  return c.json<VerifyResponse>({ valid: true, context, error: null });
});
