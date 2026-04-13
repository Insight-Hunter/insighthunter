import type { Env } from '../types/env';

export async function createBusiness(env: Env, tenantId: string, name: string, stateCode: string, entityType: string) {
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO businesses (id, tenant_id, name, state_code, entity_type) VALUES (?, ?, ?, ?, ?)`).bind(id, tenantId, name, stateCode, entityType).run();
  return { id, name, stateCode, entityType };
}

export async function listBusinesses(env: Env, tenantId: string) {
  const res = await env.DB.prepare(`SELECT * FROM businesses WHERE tenant_id = ? ORDER BY created_at DESC`).bind(tenantId).all();
  return res.results;
}
