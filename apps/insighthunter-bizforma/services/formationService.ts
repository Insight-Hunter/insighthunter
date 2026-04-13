import type { Env } from '../types/env';

export async function createFormationCase(env: Env, tenantId: string, businessId: string, intakeJson: string) {
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO formation_cases (id, tenant_id, business_id, status, intake_json) VALUES (?, ?, ?, 'draft', ?)`)
    .bind(id, tenantId, businessId, intakeJson)
    .run();
  return { id, businessId, status: 'draft' };
}

export async function listFormationCases(env: Env, tenantId: string) {
  const res = await env.DB.prepare(`SELECT * FROM formation_cases WHERE tenant_id = ? ORDER BY created_at DESC`).bind(tenantId).all();
  return res.results;
}
