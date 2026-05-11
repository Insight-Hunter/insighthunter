import type { MessageBatch } from "@cloudflare/workers-types";
import type { Env } from "../types/env";

type DocumentQueueMessage = {
  type: "formation-summary" | "operating-agreement" | "w9-pdf" | "1099-pdf";
  formationCaseId?: string;
  businessId: string;
  tenantId: string;
  payload?: Record<string, unknown>;
};

export async function handleDocumentQueue(batch: MessageBatch<DocumentQueueMessage>, env: Env) {
  for (const message of batch.messages) {
    try {
      const job = message.body;
      const key = `generated/${job.tenantId}/${job.businessId}/${job.type}-${Date.now()}.json`;

      await env.DOCUMENTS.put(
        key,
        JSON.stringify({
          ...job,
          generatedAt: new Date().toISOString(),
          status: "queued-output",
        }),
        {
          httpMetadata: {
            contentType: "application/json",
          },
        },
      );

      message.ack();
    } catch (error) {
      message.retry();
    }
  }
}
