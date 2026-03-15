import { Hono }        from 'hono';
import { buildSS4Data } from '../services/einService';
import type { Env, AuthContext, EINApplication } from '../types';

export const einRoutes = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

// GET /api/ein/:caseId
einRoutes.get('/:caseId', async c => {
  const caseId = c.req.param('caseId');
  const row    = await c.env.DB.prepare(
    `SELECT * FROM ein_applications WHERE case_id = ?`
  ).bind(caseId).first<EINApplication>();
  return c.json({  row ?? null });
});

// POST /api/ein/:caseId — create / update EIN application draft
einRoutes.post('/:caseId', async c => {
  const { orgId } = c.get('auth');
  const caseId    = c.req.param('caseId');
  const body      = await c.req.json<Partial<EINApplication>>();
  const id        = crypto.randomUUID();
  const now       = new Date().toISOString();

  const existing = await c.env.DB.prepare(
    `SELECT id FROM ein_applications WHERE case_id = ?`
  ).bind(caseId).first<{ id: string }>();

  if (existing) {
    await c.env.DB.prepare(
      `UPDATE ein_applications SET legal_name = ?, trade_name_dba = ?, responsible_party = ?,
       address = ?, reason_for_applying = ?, updated_at = ? WHERE case_id = ?`
    ).bind(
      body.legalName, body.tradeNameDBA, body.responsibleParty,
      JSON.stringify(body.address), body.reasonForApplying, now, caseId
    ).run();
    return c.json({ success: true });
  }

  await c.env.DB.prepare(
    `INSERT INTO ein_applications (id, case_id, legal_name, trade_name_dba, responsible_party,
     address, reason_for_applying, status, ein, submitted_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', NULL, NULL, ?)`
  ).bind(
    id, caseId, body.legalName, body.tradeNameDBA, body.responsibleParty,
    JSON.stringify(body.address), body.reasonForApplying, now
  ).run();

  return c.json({  { id } }, 201);
});

// GET /api/ein/:caseId/ss4-preview — AI-prefilled SS-4 data
einRoutes.get('/:caseId/ss4-preview', async c => {
  const { orgId } = c.get('auth');
  const caseId    = c.req.param('caseId');

  const [app, formation] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM ein_applications WHERE case_id = ?`).bind(caseId).first(),
    c.env.DB.prepare(`SELECT * FROM formation_cases WHERE id = ?`).bind(caseId).first(),
  ]);

  const ss4 = buildSS4Data(app as any, formation as any);
  return c.json({  ss4 });
});
