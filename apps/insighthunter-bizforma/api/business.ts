import { Hono } from 'hono';
import { createBusiness, listBusinesses } from '../services/businessService';

export const businessApi = new Hono();
businessApi.get('/', async (c) => c.json({ businesses: await listBusinesses(c.env as any, c.get('auth').tenantId) }));
businessApi.post('/', async (c) => {
  const body = await c.req.json<{ name: string; stateCode: string; entityType: string }>();
  return c.json({ business: await createBusiness(c.env as any, c.get('auth').tenantId, body.name, body.stateCode, body.entityType) });
});
