import { Hono } from 'hono';
import type { AppBindings } from '../types/env';
import { createFormationCase, getFormationCase, listFormationCases, updateFormationCase } from '../services/formationService';

const formation = new Hono<AppBindings>();

const safeListFormationCases = async (env: AppBindings['Bindings'], tenantId: string) => {
  return typeof listFormationCases === 'function' ? listFormationCases(env, tenantId) : [];
};

formation.get('/', async (c) => {
  const auth = c.get('auth');
  return c.json({ ok: true, cases: await safeListFormationCases(c.env, auth.tenantId) });
});

formation.post('/', async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json();
  const record = await createFormationCase(c.env, auth.tenantId, body.businessId, body.intakeAnswers ?? {});
  return c.json({ ok: true, formationCase: record }, 201);
});

formation.get('/:id', async (c) => {
  const auth = c.get('auth');
  if (typeof getFormationCase !== 'function') {
    return c.json({ ok: false, error: 'Formation service unavailable' }, 500);
  }
  const record = await getFormationCase(c.env, auth.tenantId, c.req.param('id'));
  if (!record) return c.json({ ok: false, error: 'Not found' }, 404);
  return c.json({ ok: true, formationCase: record });
});

formation.put('/:id', async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json();
  if (typeof updateFormationCase !== 'function') {
    return c.json({ ok: false, error: 'Formation update is not available' }, 500);
  }
  const record = await updateFormationCase(c.env, auth.tenantId, c.req.param('id'), body);
  if (!record) return c.json({ ok: false, error: 'Not found' }, 404);
  return c.json({ ok: true, formationCase: record });
});

export default formation;
