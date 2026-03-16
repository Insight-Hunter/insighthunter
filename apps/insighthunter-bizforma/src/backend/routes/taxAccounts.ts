import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types';
import { taxAccountService } from '../services/taxAccountService';

export function registerTaxAccountRoutes(
  app: Hono<{ Bindings: Env; Variables: { userId?: string } }>
) {
  const base = '/api/tax-accounts';

  app.get(`${base}/checklist`, async (c) => {
    const state = c.req.query('state');
    const entityType = c.req.query('entityType');
    if (!state || !entityType) {
      throw new HTTPException(400, { message: 'state and entityType are required' });
    }

    const checklist = await taxAccountService.buildChecklist(c.env, {
      state,
      entityType,
    });

    return c.json(checklist);
  });
}
