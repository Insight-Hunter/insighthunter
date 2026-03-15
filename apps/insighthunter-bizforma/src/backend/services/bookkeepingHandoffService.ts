import type { Env, EntityType } from '../types';

export async function handoffToBookkeeping(
  env:        Env,
  orgId:      string,
  entityType: EntityType,
  caseId:     string,
): Promise<void> {
  const res = await env.BOOKKEEPING_WORKER.fetch(
    new Request('https://bookkeeping/internal/seed-coa', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ orgId, entityType, sourceFormationCaseId: caseId }),
    })
  );
  if (!res.ok) {
    console.error(`[bizforma] bookkeeping handoff failed for org ${orgId}:`, await res.text());
  }
}
