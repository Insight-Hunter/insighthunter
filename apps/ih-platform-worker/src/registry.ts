import type { Env } from './worker';

export interface TenantRecord {
  workerName: string;
  tier: string;
}

export async function getRegistry(env: Env, orgId: string): Promise<TenantRecord | null> {
  const raw = await env.IH_REGISTRY.get(`org:${orgId}:registry`, 'json');
  return raw as TenantRecord | null;
}

export async function setRegistry(env: Env, orgId: string, record: TenantRecord): Promise<void> {
  await env.IH_REGISTRY.put(`org:${orgId}:registry`, JSON.stringify(record), {
    expirationTtl: 86400 * 365, // 1 year
  });
}
