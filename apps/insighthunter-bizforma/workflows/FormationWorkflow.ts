import type { WorkflowEntrypoint, WorkflowStep } from "cloudflare:workers";
import type { Env } from "../types/env";

type FormationWorkflowParams = {
  formationCaseId: string;
  businessId: string;
  tenantId: string;
};

export class FormationWorkflow implements WorkflowEntrypoint<Env, FormationWorkflowParams> {
  async run(event: WorkflowStep<FormationWorkflowParams>, env: Env): Promise<void> {
    const input = event.input;

    await event.do("set-formation-agent-stage-intake", async () => {
      const id = env.FORMATION_AGENT.idFromName(input.formationCaseId);
      const stub = env.FORMATION_AGENT.get(id);
      await stub.fetch("https://formation-agent/message", {
        method: "POST",
        body: JSON.stringify({
          type: "update-stage",
          stage: "entity-review",
          status: "in_progress",
          progress: 20,
        }),
      });
    });

    await event.do("queue-document-prep", async () => {
      await env.DOCUMENT_QUEUE.send({
        type: "formation-summary",
        formationCaseId: input.formationCaseId,
        businessId: input.businessId,
        tenantId: input.tenantId,
      });
    });

    await event.do("queue-initial-compliance-plan", async () => {
      await env.REMINDER_QUEUE.send({
        type: "seed-compliance-calendar",
        formationCaseId: input.formationCaseId,
        businessId: input.businessId,
        tenantId: input.tenantId,
      });
    });

    await event.do("set-formation-agent-stage-ready", async () => {
      const id = env.FORMATION_AGENT.idFromName(input.formationCaseId);
      const stub = env.FORMATION_AGENT.get(id);
      await stub.fetch("https://formation-agent/message", {
        method: "POST",
        body: JSON.stringify({
          type: "update-stage",
          stage: "formation-ready",
          status: "ready",
          progress: 100,
        }),
      });
    });
  }
}
