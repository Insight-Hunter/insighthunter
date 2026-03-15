import { Hono }            from 'hono';
import { getStateRules }   from '../utils/stateRules';
import type { Env, AuthContext, StateRegistration } from '../types';

export const stateRegistrationRoutes = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

// GET /api/state-registration/:caseId
stateRegistrationRoutes.get('/:caseId', async c => {
  const caseId = c.req.param('caseId');
  const row    = await c.env.DB.prepare(
    `SELECT * FROM state_registrations WHERE case_id = ?`
  ).bind(caseId).first<StateRegistration>();

  if (!row) return c.json({  null });

  // Attach state-specific instructions
  const rules  = getStateRules(row.state, row.filing_type as any);
  return c.json({  { ...row, rules } });
});

// POST /api/state-registration/:caseId — initiate
stateRegistrationRoutes.post('/:caseId', async c => {
  const { orgId } = c.get('auth');
  const caseId    = c.req.param('caseId');
  const body      = await c.req.json<{ filingType: string }>();
  const id        = crypto.randomUUID();
  const now       = new Date().toISOString();

  const formation = await c.env.DB.prepare(
    `SELECT state, entity_type FROM formation_cases WHERE id = ? AND org_id = ?`
  ).bind(caseId, orgId).first<{ state: string; entity_type: string }>();
  if (!formation) return c.json({ error: 'Formation not found' }, 404);

  const rules    = getStateRules(formation.state, body.filingType as any);

  await c.env.DB.prepare(
    `INSERT INTO state_registrations (id, case_id, state, filing_type, filing_fee, status, confirmation_number, filed_at, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, ?)`
  ).bind(id, caseId, formation.state, body.filingType, rules.feeCents, now).run();

  return c.json({  { id, rules } }, 201);
});

// PATCH /api/state-registration/:caseId/complete
stateRegistrationRoutes.patch('/:caseId/complete', async c => {
  const { orgId }         = c.get('auth');
  const caseId            = c.req.param('caseId');
  const { confirmationNumber } = await c.req.json<{ confirmationNumber: string }>();
  const now               = new Date().toISOString();

  await c.env.DB.prepare(
    `UPDATE state_registrations SET status = 'approved', confirmation_number = ?, filed_at = ? WHERE case_id = ?`
  ).bind(confirmationNumber, now, caseId).run();

  await c.env.DB.prepare(
    `UPDATE formation_cases SET status = 'STATE_REG_COMPLETE', updated_at = ? WHERE id = ?`
  ).bind(now, caseId).run();

  return c.json({ success: true, nextStep: 'tax_accounts' });
});
