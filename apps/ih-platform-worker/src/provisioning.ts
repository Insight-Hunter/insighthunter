import type { Env } from './worker';
import { setRegistry } from './registry';

const TENANT_TEMPLATE_SCRIPT = `
// Minimal bootstrap — real code uploaded separately
export default { fetch: () => new Response('tenant-worker-placeholder') };
`;

export async function provisionTenant(
  env: Env,
  orgId: string,
  tier: string
): Promise<{ workerName: string }> {
  const workerName = `tenant-${orgId}`;

  // Upload tenant Worker script via Cloudflare API
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/dispatch/namespaces/ih-apps/scripts/${workerName}`;

  const formData = new FormData();
  formData.append(
    'metadata',
    JSON.stringify({
      main_module: 'worker.js',
      bindings: [
        { type: 'plain_text', name: 'ORG_ID', text: orgId },
        { type: 'plain_text', name: 'ORG_TIER', text: tier },
      ],
    })
  );
  formData.append(
    'worker.js',
    new Blob([TENANT_TEMPLATE_SCRIPT], { type: 'application/javascript+module' }),
    'worker.js'
  );

  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CF API error: ${body}`);
  }

  // Record in platform DB
  await env.IH_PLATFORM_DB.prepare(
    `INSERT INTO tenant_registry (org_id, worker_name, tier, created_at)
     VALUES (?1, ?2, ?3, datetime('now'))
     ON CONFLICT(org_id) DO UPDATE SET worker_name=excluded.worker_name, tier=excluded.tier`
  )
    .bind(orgId, workerName, tier)
    .run();

  // Record in KV registry for fast lookup
  await setRegistry(env, orgId, { workerName, tier });

  return { workerName };
}

export async function deprovisionTenant(env: Env, orgId: string): Promise<void> {
  const workerName = `tenant-${orgId}`;

  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/dispatch/namespaces/ih-apps/scripts/${workerName}`;

  await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` },
  });

  await env.IH_PLATFORM_DB.prepare(`DELETE FROM tenant_registry WHERE org_id = ?1`)
    .bind(orgId)
    .run();

  await env.IH_REGISTRY.delete(`org:${orgId}:registry`);
}
