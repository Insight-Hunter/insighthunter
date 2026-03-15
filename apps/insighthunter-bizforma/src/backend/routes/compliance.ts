import { Hono }             from 'hono';
import { seedComplianceEvents } from '../services/complianceService';
import type { Env, AuthContext, ComplianceEvent } from '../types';

export const complianceRoutes = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

// GET /api/compliance — list org compliance events
complianceRoutes.get('/', async c => {
  const { orgId } = c.get('auth');
  const rows = await c.env.DB.prepare(
    `SELECT * FROM compliance_events WHERE org_id = ? ORDER BY due_date ASC`
  ).bind(orgId).all<ComplianceEvent>();
  return c.json({  rows.results });
});

// POST /api/compliance/:caseId/seed — generate events after formation complete
complianceRoutes.post('/:caseId/seed', async c => {
  const { orgId } = c.get('auth');
  const caseId    = c.req.param('caseId');

  const formation = await c.env.DB.prepare(
    `SELECT entity_type, state FROM formation_cases WHERE id = ? AND org_id = ?`
  ).bind(caseId, orgId).first<{ entity_type: string; state: string }>();
  if (!formation) return c.json({ error: 'Not found' }, 404);

  const events = await seedComplianceEvents(
    c.env.DB, caseId, orgId,
    formation.entity_type as any, formation.state
  );
  return c.json({  events });
});

// PATCH /api/compliance/:eventId/complete
complianceRoutes.patch('/:eventId/complete', async c => {
  const { orgId } = c.get('auth');
  const eventId   = c.req.param('eventId');
  const now       = new Date().toISOString();

  await c.env.DB.prepare(
    `UPDATE compliance_events SET status = 'complete', updated_at = ? WHERE id = ? AND org_id = ?`
  ).bind(now, eventId, orgId).run();

  return c.json({ success: true });
});
