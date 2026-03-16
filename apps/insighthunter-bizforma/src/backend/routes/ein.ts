import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types';
import { einService } from '../services/einService';

export function registerEinRoutes(
  app: Hono<{ Bindings: Env; Variables: { userId?: string } }>
) {
  const base = '/api/ein';

  app.post(`${base}/prefill`, async (c) => {
    const userId = c.var.userId!;
    const body = await c.req.json().catch(() => null);
    if (!body) throw new HTTPException(400, { message: 'Invalid EIN payload' });

    const res = await einService.buildSs4Draft(c.env, userId, body);
    return c.json(res);
  });
}
