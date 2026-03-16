import type { Hono } from 'hono';
import type { Env } from '../types';
import { complianceService } from '../services/complianceService';

export function registerComplianceRoutes(
  app: Hono<{ Bindings: Env; Variables: { userId?: string } }>
) {
  const base = '/api/compliance';

  app.get(`${base}/calendar`, async (c) => {
    const userId = c.var.userId!;
    const events = await complianceService.getEventsForUser(c.env, userId);
    return c.json(events);
  });
}
