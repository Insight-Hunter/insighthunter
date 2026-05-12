// apps/insighthunter-finops/workers/receipts/index.ts
// ih-finops-receipts — Queue consumer: OCR receipt processing + amount validation.

export interface Env {
  DB: D1Database;
  DOCS: R2Bucket;
  AI: Ai;
  NOTIFICATIONS: Queue;
}

interface ReceiptJob {
  orgId: string;
  reimId: string;
  docId: string;
}

export default {
  async queue(batch: MessageBatch<ReceiptJob>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await processReceipt(msg.body, env);
        msg.ack();
      } catch (err) {
        console.error("Receipt processing failed:", err);
        msg.retry();
      }
    }
  },
} satisfies ExportedHandler<Env>;

async function processReceipt(job: ReceiptJob, env: Env): Promise<void> {
  // Get document r2 key
  const doc = await env.DB.prepare(
    "SELECT r2_key, content_type FROM documents WHERE id = ? AND org_id = ?"
  ).bind(job.docId, job.orgId).first<{ r2_key: string; content_type: string }>();

  if (!doc) {
    console.warn("Receipt doc not found:", job.docId);
    return;
  }

  // Fetch from R2
  const obj = await env.DOCS.get(doc.r2_key);
  if (!obj) return;

  // Convert to base64 for AI vision
  const bytes = await obj.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));

  // Run Workers AI OCR (llava for image understanding)
  let extractedAmount: number | null = null;
  let extractedDate: string | null = null;
  let extractedVendor: string | null = null;

  try {
    const result = await env.AI.run("@cf/llava-hf/llava-1.5-7b-hf", {
      prompt: "Extract from this receipt: 1) total amount, 2) date, 3) vendor/merchant name. Reply in JSON: {amount: number, date: string YYYY-MM-DD, vendor: string}",
      image: base64,
      max_tokens: 100,
    }) as { description: string };

    const parsed = JSON.parse(result.description.match(/\{.*\}/s)?.[0] ?? "{}");
    extractedAmount = typeof parsed.amount === "number" ? parsed.amount : null;
    extractedDate   = parsed.date ?? null;
    extractedVendor = parsed.vendor ?? null;
  } catch {
    console.warn("OCR extraction failed for receipt:", job.docId);
  }

  // Update reimbursement with OCR data
  await env.DB.prepare(
    `UPDATE reimbursements
     SET ocr_amount = ?, ocr_date = ?, ocr_vendor = ?, ocr_processed = 1, ocr_processed_at = datetime('now')
     WHERE id = ? AND org_id = ?`
  ).bind(extractedAmount, extractedDate, extractedVendor, job.reimId, job.orgId).run();

  // Flag amount mismatch
  const reim = await env.DB.prepare(
    "SELECT amount FROM reimbursements WHERE id = ?"
  ).bind(job.reimId).first<{ amount: number }>();

  if (reim && extractedAmount && Math.abs(reim.amount - extractedAmount) > 0.50) {
    await env.NOTIFICATIONS.send({
      orgId: job.orgId, type: "alert_created",
      title: "Receipt amount mismatch",
      body: `Reimbursement claims $${reim.amount} but receipt shows $${extractedAmount}. Please review.`,
      actionUrl: `https://finops.insighthunter.app/reimbursements/${job.reimId}`,
      channels: ["in_app"],
    });
  }
}
