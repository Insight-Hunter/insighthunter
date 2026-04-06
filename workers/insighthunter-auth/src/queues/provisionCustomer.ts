import type { Env } from "../types";
import { TenantProvisioningService } from "../services/tenantProvisioningService";

interface ProvisionMessage {
  type: "provision" | "seed_bookkeeping" | "deprovision";
  orgId: string;
  tier?: string;
  kvNamespaceId?: string;
  retryCount?: number;
}

export async function handleProvisionQueue(
  batch: MessageBatch<ProvisionMessage>,
  env: Env
): Promise<void> {
  for (const msg of batch.messages) {
    const job = msg.body;

    try {
      if (job.type === "provision") {
        // Retry provisioning that failed during signup
        const provisioner = new TenantProvisioningService(env);
        const provisioned = await provisioner.provision(job.orgId, job.tier!);
        const now = new Date().toISOString();

        await env.DB.prepare(
          `INSERT OR REPLACE INTO tenant_workers
             (org_id, script_name, kv_namespace_id, dispatch_namespace, tier, provisioned_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(
            job.orgId,
            provisioned.scriptName,
            provisioned.kvNamespaceId,
            provisioned.dispatchNamespace,
            job.tier,
            now
          )
          .run();

        msg.ack();
      } else if (job.type === "seed_bookkeeping") {
        // Call BookkeepingAgent DO to seed Chart of Accounts
        const id = env.BOOKKEEPING_AGENT.idFromName(job.orgId);
        const agent = env.BOOKKEEPING_AGENT.get(id);
        await agent.fetch("https://internal/seed", {
          method: "POST",
          body: JSON.stringify({ orgId: job.orgId, tier: job.tier }),
        });
        msg.ack();
      } else if (job.type === "deprovision") {
        // Hard delete: remove Worker + KV from Cloudflare
        const provisioner = new TenantProvisioningService(env);
        await provisioner.deprovision(job.orgId, job.kvNamespaceId!);
        msg.ack();
      }
    } catch (err) {
      console.error(`Queue job failed [${job.type}] org=${job.orgId}:`, err);
      const retries = job.retryCount ?? 0;
      if (retries < 3) {
        msg.retry({ delaySeconds: Math.pow(2, retries) * 30 }); // 30s, 60s, 120s
      } else {
        // Dead-letter: mark in D1 for manual review
        await env.DB.prepare(
          `INSERT INTO provisioning_failures (org_id, job_type, error, created_at)
           VALUES (?, ?, ?, ?)`
        )
          .bind(job.orgId, job.type, String(err), new Date().toISOString())
          .run();
        msg.ack(); // ack to prevent infinite loop
      }
    }
  }
}
