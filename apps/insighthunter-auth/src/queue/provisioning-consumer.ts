import type { Env, ProvisioningMessage } from '../types/env';

type QueueMessage = MessageBatch<ProvisioningMessage>;

async function updateJobStatus(
  db: Env['AUTH_DB'],
  tenantId: string,
  status: string,
  detail?: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE provisioning_jobs SET status = ?, detail = ?, updated_at = ? WHERE tenant_id = ? AND status NOT IN ('active','failed')`,
    )
    .bind(status, detail ?? null, now, tenantId)
    .run();
}

async function createTenantDatabase(env: Env, tenantId: string): Promise<string> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/d1/database`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: `ih-tenant-${tenantId}` }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CF D1 create failed: ${res.status} ${body}`);
  }
  const json = (await res.json()) as { result: { uuid: string } };
  return json.result.uuid;
}

export async function handleProvisioningQueue(batch: QueueMessage, env: Env): Promise<void> {
  for (const msg of batch.messages) {
    const { tenantId, userId, tier, businessName } = msg.body;
    const now = new Date().toISOString();

    try {
      await updateJobStatus(env.AUTH_DB, tenantId, 'provisioning');

      // Step 1 — create isolated tenant D1
      const dbId = await createTenantDatabase(env, tenantId);

      // Step 2 — store DB metadata in auth DB
      await env.AUTH_DB.prepare(
        `UPDATE tenants SET db_id = ?, updated_at = ? WHERE id = ?`,
      ).bind(dbId, now, tenantId).run();

      // Step 3 — call bookkeeping service to seed chart of accounts
      const seedRes = await env.BOOKKEEPING_SERVICE.fetch(
        new Request('http://bookkeeping/internal/seed-chart-of-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, dbId, tier }),
        }),
      );
      if (!seedRes.ok) {
        const err = await seedRes.text();
        throw new Error(`Bookkeeping seed failed: ${err}`);
      }

      // Step 4 — mark tenant active
      await env.AUTH_DB.prepare(
        `UPDATE tenants SET status = 'active', updated_at = ? WHERE id = ?`,
      ).bind(now, tenantId).run();

      await updateJobStatus(env.AUTH_DB, tenantId, 'active');

      env.AUTH_ANALYTICS.writeDataPoint({
        blobs: ['tenant_provisioned', tier, tenantId],
        doubles: [1],
        indexes: [tenantId],
      });

      msg.ack();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await updateJobStatus(env.AUTH_DB, tenantId, 'failed', detail);

      await env.AUTH_DB.prepare(
        `UPDATE tenants SET status = 'provisioning_failed', updated_at = ? WHERE id = ?`,
      ).bind(now, tenantId).run();

      env.AUTH_ANALYTICS.writeDataPoint({
        blobs: ['tenant_provision_failed', tier ?? '', tenantId],
        doubles: [1],
        indexes: [tenantId],
      });

      msg.retry();
    }
  }
}
