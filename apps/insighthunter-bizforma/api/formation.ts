import { Hono } from 'hono';
import { createFormationCase, listFormationCases } from '../services/formationService';

export const formationApi = new Hono();
formationApi.get('/', async (c) => c.json({ cases: await listFormationCases(c.env as any, c.get('auth').tenantId) }));
formationApi.post('/', async (c) => {
  const body = await c.req.json<{ businessId: string; intakeJson: string }>();
  return c.json({ formationCase: await createFormationCase(c.env as any, c.get('auth').tenantId, body.businessId, body.intakeJson) });
});
