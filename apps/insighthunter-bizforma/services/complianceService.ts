import type { Env } from '../types/env';

export async function seedComplianceEvents(env: Env, tenantId: string, formationCaseId: string) {
  const rows = [
    { title: 'Annual report due', dueAt: new Date(Date.now() + 86400000 * 90).toISOString(), category: 'annual_report' },
    { title: 'BOI review', dueAt: new Date(Date.now() + 86400000 * 30).toISOString(), category: 'boi' }
  ];
  for (const row of rows) {
    await env.DB.prepare(`INSERT INTO compliance_events (id, tenant_id, formation_case_id, title, due_at, category, status) VALUES (?, ?, ?, ?, ?, ?, 'upcoming')`)
      .bind(crypto.randomUUID(), tenantId, formationCaseId, row.title, row.dueAt, row.category)
      .run();
  }
}

export async function listComplianceEvents(env: Env, tenantId: string) {
  const res = await env.DB.prepare(`SELECT * FROM compliance_events WHERE tenant_id = ? ORDER BY due_at ASC`).bind(tenantId).all();
  return res.results;
}
