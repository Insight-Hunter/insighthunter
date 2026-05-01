import type { MessageBatch } from "@cloudflare/workers-types";
import type { Env } from "../types/env";

type ReminderQueueMessage =
  | {
      type: "seed-compliance-calendar";
      formationCaseId: string;
      businessId: string;
      tenantId: string;
    }
  | {
      type: "send-compliance-reminder";
      businessId: string;
      tenantId: string;
      complianceEvent: {
        id: string;
        title: string;
        dueDate: string;
        type: string;
        status: "pending" | "scheduled" | "completed" | "overdue";
      };
    };

export async function handleReminderQueue(batch: MessageBatch<ReminderQueueMessage>, env: Env) {
  for (const message of batch.messages) {
    try {
      const job = message.body;

      if (job.type === "seed-compliance-calendar") {
        const id = env.COMPLIANCE_AGENT.idFromName(job.businessId);
        const stub = env.COMPLIANCE_AGENT.get(id);

        await stub.fetch("https://compliance-agent/generate", {
          method: "POST",
          body: JSON.stringify({
            businessId: job.businessId,
            tenantId: job.tenantId,
            events: [],
          }),
        });
      }

      if (job.type === "send-compliance-reminder") {
        await env.ANALYTICS.writeDataPoint({
          blobs: ["compliance-reminder", job.businessId, job.complianceEvent.type],
          doubles: [Date.now()],
          indexes: [job.tenantId],
        });
      }

      message.ack();
    } catch {
      message.retry();
    }
  }
}
