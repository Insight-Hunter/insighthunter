import { Hono }   from 'hono';
import { scoreEntity } from '../services/entityDeterminationService';
import type { Env, AuthContext } from '../types';

export const entityDeterminationRoutes = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

// POST /api/entity-determination/:caseId/answer — save a questionnaire answer
entityDeterminationRoutes.post('/:caseId/answer', async c => {
  const { orgId }  = c.get('auth');
  const caseId     = c.req.param('caseId');
  const body       = await c.req.json<{ questionKey: string; answer: string }>();
  const now        = new Date().toISOString();
  const id         = crypto.randomUUID();

  // Upsert answer
  await c.env.DB.prepare(
    `INSERT INTO questionnaire_answers (id, case_id, question_key, answer, answered_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (case_id, question_key) DO UPDATE SET answer = excluded.answer, answered_at = excluded.answered_at`
  ).bind(id, caseId, body.questionKey, body.answer, now).run();

  return c.json({ success: true });
});

// GET /api/entity-determination/:caseId/recommend — AI recommendation
entityDeterminationRoutes.get('/:caseId/recommend', async c => {
  const { orgId } = c.get('auth');
  const caseId    = c.req.param('caseId');

  const answers = await c.env.DB.prepare(
    `SELECT question_key, answer FROM questionnaire_answers WHERE case_id = ?`
  ).bind(caseId).all<{ question_key: string; answer: string }>();

  const answerMap = Object.fromEntries(
    answers.results.map(r => [r.question_key, r.answer])
  );

  const recommendation = await scoreEntity(answerMap, c.env.AI);
  return c.json({  recommendation });
});

// POST /api/entity-determination/:caseId/confirm — lock in entity choice
entityDeterminationRoutes.post('/:caseId/confirm', async c => {
  const { orgId } = c.get('auth');
  const caseId    = c.req.param('caseId');
  const { entityType } = await c.req.json<{ entityType: string }>();
  const now       = new Date().toISOString();

  await c.env.DB.prepare(
    `UPDATE formation_cases SET entity_type = ?, status = 'ENTITY_SELECTED', updated_at = ? WHERE id = ? AND org_id = ?`
  ).bind(entityType, now, caseId, orgId).run();

  return c.json({ success: true, nextStep: 'ein' });
});
