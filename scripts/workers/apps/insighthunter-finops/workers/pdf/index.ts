// apps/insighthunter-finops/workers/pdf/index.ts
// ih-finops-pdf — Invoice PDF generation using Browser Rendering.

export interface Env {
  DB: D1Database;
  DOCS: R2Bucket;
  BROWSER: Fetcher;   // Cloudflare Browser Rendering binding
  NOTIFICATIONS: Queue;
}

interface PdfJob {
  orgId: string;
  invoiceId: string;
  invoiceNumber: string;
}

export default {
  async queue(batch: MessageBatch<PdfJob>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await generateInvoicePdf(msg.body, env);
        msg.ack();
      } catch (err) {
        console.error("PDF generation failed:", err);
        msg.retry();
      }
    }
  },
} satisfies ExportedHandler<Env>;

async function generateInvoicePdf(job: PdfJob, env: Env): Promise<void> {
  const invoice = await env.DB.prepare(
    `SELECT i.*, o.name AS org_name FROM ar_invoices i
     JOIN organizations o ON o.id = i.org_id
     WHERE i.id = ? AND i.org_id = ?`
  ).bind(job.invoiceId, job.orgId).first<{
    invoice_number: string; customer_name: string; customer_email: string;
    amount: number; due_date: string; line_items: string;
    org_name: string; created_at: string;
  }>();

  if (!invoice) return;

  const lineItems: Array<{ description: string; qty: number; amount: number }> =
    JSON.parse(invoice.line_items ?? "[]");

  const html = buildInvoiceHtml(invoice, lineItems);

  // Use Browser Rendering to convert HTML → PDF
  const response = await env.BROWSER.fetch("https://pdf.insighthunter.app/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, format: "A4", printBackground: true }),
  });

  if (!response.ok) {
    throw new Error(`PDF generation failed: ${response.status}`);
  }

  const pdfBytes = await response.arrayBuffer();
  const r2Key = `${job.orgId}/invoices/${new Date().getFullYear()}/${job.invoiceId}/${job.invoiceNumber}.pdf`;

  await env.DOCS.put(r2Key, pdfBytes, {
    httpMetadata: { contentType: "application/pdf" },
    customMetadata: { orgId: job.orgId, invoiceId: job.invoiceId },
  });

  // Record doc + update invoice
  const docId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO documents (id, org_id, uploaded_by, category, filename, r2_key, content_type, size_bytes, year, tags, created_at)
     VALUES (?, ?, 'system', 'invoices', ?, ?, 'application/pdf', ?, ?, '["invoice","generated"]', datetime('now'))`
  ).bind(docId, job.orgId, `${job.invoiceNumber}.pdf`, r2Key, pdfBytes.byteLength, new Date().getFullYear()).run();

  await env.DB.prepare(
    "UPDATE ar_invoices SET pdf_doc_id = ?, status = 'ready' WHERE id = ?"
  ).bind(docId, job.invoiceId).run();
}

function buildInvoiceHtml(
  invoice: { invoice_number: string; customer_name: string; amount: number; due_date: string; created_at: string; org_name: string },
  lineItems: Array<{ description: string; qty: number; amount: number }>
): string {
  const rows = lineItems.map((li) =>
    `<tr><td>${li.description}</td><td>${li.qty}</td><td>$${(li.amount * li.qty).toFixed(2)}</td></tr>`
  ).join("");

  return `<!doctype html><html><head><meta charset="utf-8">
<style>
  body { font-family: 'Helvetica Neue', sans-serif; color: #28251d; margin: 40px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .logo { font-size: 22px; font-weight: 700; color: #01696f; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0; }
  th { background: #f3f0ec; text-align: left; padding: 10px 12px; font-size: 13px; }
  td { padding: 10px 12px; border-bottom: 1px solid #edeae5; font-size: 14px; }
  .total { text-align: right; font-size: 18px; font-weight: 700; margin: 16px 0; }
  .footer { font-size: 12px; color: #7a7974; margin-top: 40px; border-top: 1px solid #edeae5; padding-top: 16px; }
</style></head><body>
<div class="header">
  <div class="logo">${invoice.org_name}</div>
  <div>
    <h1>Invoice</h1>
    <div style="font-size:14px;color:#7a7974">${invoice.invoice_number}</div>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px">
  <div><strong>Bill To</strong><br>${invoice.customer_name}</div>
  <div style="text-align:right">
    <div><strong>Invoice Date:</strong> ${invoice.created_at.slice(0,10)}</div>
    <div><strong>Due Date:</strong> ${invoice.due_date}</div>
  </div>
</div>
<table>
  <thead><tr><th>Description</th><th>Qty</th><th>Amount</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="total">Total Due: $${invoice.amount.toFixed(2)}</div>
<div class="footer">InsightHunter · insighthunter.app · Generated ${new Date().toLocaleDateString()}</div>
</body></html>`;
}
