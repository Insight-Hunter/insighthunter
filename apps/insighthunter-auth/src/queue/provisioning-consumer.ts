import type { Env, ProvisioningMessage } from '../types/env';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

async function createTenantD1Database(env: Env, tenantId: string) {
  const name = `insighthunter-tenant-${tenantId}`;
  const res = await fetch(`${CF_API_BASE}/accounts/${env.CF_ACCOUNT_ID}/d1/database`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`D1 create failed (${res.status}): ${await res.text()}`);
  const json = await res.json<{ result: { uuid: string; name: string } }>();
  return { id: json.result.uuid, name: json.result.name };
}

async function bindDispatchNamespaceScript(env: Env, tenantId: string) {
  const namespace = 'insighthunter-tenants';
  const scriptName = `tenant-${tenantId}`;
  const res = await fetch(
    `${CF_API_BASE}/accounts/${env.CF_ACCOUNT_ID}/workers/dispatch/namespaces/${namespace}/scripts/${scriptName}`,
    { method: 'PUT', headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` }, body: new FormData() }
  );
  if (!res.ok) throw new Error(`Dispatch namespace bind failed (${res.status}): ${await res.text()}`);
  return { namespace, scriptName };
}

async function seedChartOfAccounts(env: Env, tenantId: string) {
  const res = await env.BOOKKEEPING_SERVICE.fetch('https://internal/api/internal/seed-chart-of-accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId }),
  });
  if (!res.ok) throw new Error(`Chart-of-accounts seeding failed (${res.status}): ${await res.text()}`);
}

async function updateJobStatus(env: Env, tenantId: string, status: 'in_progress' | 'completed' | 'failed', step?: string, lastError?: string) {
  await env.AUTH_DB.prepare(
    `UPDATE provisioning_jobs
     SET status = ?, step = ?, last_error = ?, completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE completed_at END
     WHERE tenant_id = ? AND status != 'completed'`
  ).bind(status, step ?? null, lastError ?? null, status, tenantId).run();
}

export async function handleProvisioningBatch(batch: MessageBatch<ProvisioningMessage>, env: Env) {
  for (const message of batch.messages) {
    const { tenantId } = message.body;
    try {
      await updateJobStatus(env, tenantId, 'in_progress', 'create_d1_database');
      const database = await createTenantD1Database(env, tenantId);

      await updateJobStatus(env, tenantId, 'in_progress', 'bind_dispatch_namespace');
      const dispatch = await bindDispatchNamespaceScript(env, tenantId);

      await updateJobStatus(env, tenantId, 'in_progress', 'seed_chart_of_accounts');
      await seedChartOfAccounts(env, tenantId);

      await env.AUTH_DB.prepare(
        `UPDATE tenants
         SET status = 'active', d1_database_id = ?, d1_database_name = ?, dispatch_namespace = ?, dispatch_script_name = ?
         WHERE id = ?`
      ).bind(database.id, database.name, dispatch.namespace, dispatch.scriptName, tenantId).run();

      await updateJobStatus(env, tenantId, 'completed', 'done');
      env.AUTH_ANALYTICS.writeDataPoint({ blobs: ['tenant_provisioned', tenantId], doubles: [1], indexes: [tenantId] });
      message.ack();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown provisioning error';
      await updateJobStatus(env, tenantId, 'failed', undefined, errorMessage);
      env.AUTH_ANALYTICS.writeDataPoint({ blobs: ['tenant_provisioning_failed', tenantId, errorMessage], doubles: [1], indexes: [tenantId] });
      message.retry();
    }
  }
}
