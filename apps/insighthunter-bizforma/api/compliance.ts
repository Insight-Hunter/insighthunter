import { Hono } from 'hono';
import type { AppBindings } from '../types/env';
import { createComplianceEvent, generateBaselineCompliance, listComplianceEvents } from '../services/complianceService';

const compliance = new Hono<AppBindings>();
const safeListComplianceEvents =
  typeof listComplianceEvents === 'function' ? listComplianceEvents : undefined;

compliance.get('/:businessId', async (c) => {
  const auth = c.get('auth');
  if (!safeListComplianceEvents) {
    return c.json({ ok: false, error: 'listComplianceEvents is not available' }, 500);
  }
  return c.json({ ok: true, events: await safeListComplianceEvents(c.env, auth.tenantId, c.req.param('businessId')) });
});

compliance.post('/:businessId', async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json();
  return c.json({ ok: true, event: await createComplianceEvent(c.env, auth.tenantId, c.req.param('businessId'), body) }, 201);
});

compliance.post('/:businessId/generate', async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json();
  const events = await generateBaselineCompliance(c.env, auth.tenantId, c.req.param('businessId'), body.stateCode);
  return c.json({ ok: true, events });
});

export default compliance;
