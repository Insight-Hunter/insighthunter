import { Hono }             from 'hono';
import { getTaxAccountChecklist } from '../services/taxAccountService';
import type { Env, AuthContext, TaxAccount } from '../types';

export const taxAccountRoutes = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

// GET /api/tax-accounts/:caseId
taxAccountRoutes.get('/:caseId', async c => {
  const caseId  = c.req.param('caseId');
  const rows    = await c.env.DB.prepare(
    `SELECT * FROM tax_accounts WHERE case_id = ?`
  ).bind(caseId).all<TaxAccount>();

  if (rows.results.length === 0) {
    const formation = await c.env.DB.prepare(
      `SELECT entity_type, state FROM formation_cases WHERE id = ?`
    ).bind(caseId).first<{ entity_type: string; state: string }>();
    if (!formation) return c.json({ error: 'Not found' }, 404);
    const checklist = getTaxAccountChecklist(formation.entity_type as any, formation.state);
    return c.json({  checklist, seeded: false });
  }

  return c.json({  rows.results, seeded: true });
});

// POST /api/tax-accounts/:caseId/seed — generate checklist
taxAccountRoutes.post('/:caseId/seed', async c => {
  const { orgId } = c.get('auth');
  const caseId    = c.req.param('caseId');
  const formation = await c.env.DB.prepare(
    `SELECT entity_type, state FROM formation_cases WHERE id = ? AND org_id = ?`
  ).bind(caseId, orgId).first<{ entity_type: string; state: string }>();
  if (!formation) return c.json({ error: 'Not found' }, 404);

  const checklist = getTaxAccountChecklist(formation.entity_type as any, formation.state);
  const now       = new Date().toISOString();
  const inserts   = checklist.map(item =>
    c.env.DB.prepare(
      `INSERT OR IGNORE INTO tax_accounts (id, case_id, account_type, status, account_id, completed_at, created_at)
       VALUES (?, ?, ?, 'not_started', NULL, NULL, ?)`
    ).bind(crypto.randomUUID(), caseId, item, now)
  );
  await c.env.DB.batch(inserts);
  return c.json({ success: true, items: checklist });
});

// PATCH /api/tax-accounts/:caseId/:accountType/complete
taxAccountRoutes.patch('/:caseId/:accountType/complete', async c => {
  const caseId      = c.req.param('caseId');
  const accountType = c.req.param('accountType');
  const { accountId } = await c.req.json<{ accountId?: string }>();
  const now         = new Date().toISOString();

  await c.env.DB.prepare(
    `UPDATE tax_accounts SET status = 'complete', account_id = ?, completed_at = ? WHERE case_id = ? AND account_type = ?`
  ).bind(accountId ?? null, now, caseId, accountType).run();

  // Check if all complete → advance formation status
  const remaining = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM tax_accounts WHERE case_id = ? AND status != 'complete'`
  ).bind(caseId).first<{ cnt: number }>();

  if (remaining?.cnt === 0) {
    await c.env.DB.prepare(
      `UPDATE formation_cases SET status = 'TAX_SETUP_COMPLETE', updated_at = ? WHERE id = ?`
    ).bind(now, caseId).run();
  }

  return c.json({ success: true, allComplete: remaining?.cnt === 0 });
});
o