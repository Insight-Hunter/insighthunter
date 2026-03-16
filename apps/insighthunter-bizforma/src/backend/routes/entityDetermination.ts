import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types';
import { entityDeterminationService } from '../services/entityDeterminationService';

export function registerEntityDeterminationRoutes(
  app: Hono<{ Bindings: Env; Variables: { userId?: string } }>
) {
  const base = '/api/entity';

  app.post(`${base}/questionnaire`, async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body) throw new HTTPException(400, { message: 'Invalid questionnaire payload' });

    const result = await entityDeterminationService.scoreAndRecommend(c.env, body);
    return c.json(result);
  });
}
