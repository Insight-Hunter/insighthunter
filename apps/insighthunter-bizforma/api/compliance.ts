import { Hono } from 'hono';
import { listComplianceEvents, seedComplianceEvents } from '../services/complianceService';

export const complianceApi = new Hono();
complianceApi.get('/', async (c) => c.json({ events: await listComplianceEvents(c.env as any, c.get('auth').tenantId) }));
complianceApi.post('/seed', async (c) => {
  const body = await c.req.json<{ formationCaseId: string }>();
  await seedComplianceEvents(c.env as any, c.get('auth').tenantId, body.formationCaseId);
  return c.json({ ok: true });
});
