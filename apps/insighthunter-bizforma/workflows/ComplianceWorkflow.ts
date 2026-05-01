import type { WorkflowEntrypoint, WorkflowStep } from "cloudflare:workers";
import type { Env } from "../types/env";

type ComplianceWorkflowParams = {
  businessId: string;
  tenantId: string;
  events: Array<{
    id: string;
    title: string;
    dueDate: string;
    type: string;
    status: "pending" | "scheduled" | "completed" | "overdue";
  }>;
};

export class ComplianceWorkflow implements WorkflowEntrypoint<Env, ComplianceWorkflowParams> {
  async run(event: WorkflowStep<ComplianceWorkflowParams>, env: Env): Promise<void> {
    const input = event.input;

    await event.do("sync-compliance-agent", async () => {
      const id = env.COMPLIANCE_AGENT.idFromName(input.businessId);
      const stub = env.COMPLIANCE_AGENT.get(id);

      await stub.fetch("https://compliance-agent/generate", {
        method: "POST",
        body: JSON.stringify({
          businessId: input.businessId,
          tenantId: input.tenantId,
          events: input.events,
        }),
      });
    });

    await event.sleep("wait-before-reminders", "5 minutes");

    await event.do("enqueue-reminders", async () => {
      for (const complianceEvent of input.events) {
        await env.REMINDER_QUEUE.send({
          type: "send-compliance-reminder",
          businessId: input.businessId,
          tenantId: input.tenantId,
          complianceEvent,
        });
      }
    });
  }
}
