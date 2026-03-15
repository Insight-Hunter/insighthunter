import { Hono }   from 'hono';
import { nanoid } from 'nanoid';
import type { Env, AuthContext, FormationCase } from '../types';

export const formationRoutes = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

// GET /api/formations — list org's cases
formationRoutes.get('/', async c => {
  const { orgId } = c.get('auth');
  const rows = await c.env.DB.prepare(
    `SELECT * FROM formation_cases WHERE org_id = ? ORDER BY created_at DESC`
  ).bind(orgId).all<FormationCase>();
  return c.json({  rows.results });
});

// GET /api/formations/:id
formationRoutes.get('/:id', async c => {
  const { orgId }  = c.get('auth');
  const caseId     = c.req.param('id');
  const row        = await c.env.DB.prepare(
    `SELECT * FROM formation_cases WHERE id = ? AND org_id = ?`
  ).bind(caseId, orgId).first<FormationCase>();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({  row });
});

// POST /api/formations — create new formation case
formationRoutes.post('/', async c => {
  const { orgId, userId } = c.get('auth');
  const body = await c.req.json<{ businessName: string; state: string }>();
  const id   = nanoid();
  const now  = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO formation_cases (id, org_id, user_id, business_name, entity_type, status, state, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, 'QUESTIONNAIRE', ?, ?, ?)`
  ).bind(id, orgId, userId, body.businessName, body.state, now, now).run();

  // Spin up FormationAgent DO
  const stub = c.env.FORMATION_AGENT.get(c.env.FORMATION_AGENT.idFromName(id));
  await stub.fetch(new Request(`https://agent/init`, {
    method: 'POST',
    body:   JSON.stringify({ caseId: id, orgId }),
  }));

  const created = await c.env.DB.prepare(
    `SELECT * FROM formation_cases WHERE id = ?`
  ).bind(id).first<FormationCase>();
  return c.json({  created }, 201);
});

// PATCH /api/formations/:id/status
formationRoutes.patch('/:id/status', async c => {
  const { orgId }  = c.get('auth');
  const caseId     = c.req.param('id');
  const { status } = await c.req.json<{ status: string }>();
  const now        = new Date().toISOString();

  await c.env.DB.prepare(
    `UPDATE formation_cases SET status = ?, updated_at = ? WHERE id = ? AND org_id = ?`
  ).bind(status, now, caseId, orgId).run();

  return c.json({ success: true });
});
