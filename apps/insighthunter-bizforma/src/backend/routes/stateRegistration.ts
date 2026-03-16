import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types';
import { stateRegistrationService } from '../services/stateRegistrationService';

export function registerStateRegistrationRoutes(
  app: Hono<{ Bindings: Env; Variables: { userId?: string } }>
) {
  const base = '/api/state-registration';

  app.get(`${base}/wizard`, async (c) => {
    const state = c.req.query('state');
    if (!state) throw new HTTPException(400, { message: 'state is required' });

    const wizard = await stateRegistrationService.getWizardConfig(c.env, state);
    return c.json(wizard);
  });
}
