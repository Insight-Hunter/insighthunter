// services/invoice-pdf.ts
// Generates a PDF for an invoice using Cloudflare Browser Rendering,
// then stores it in R2 for later download.

type InvoiceForPdf = {
  id: string;
  number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  memo: string | null;
  client_name?: string;
  client_email?: string;
  client_address?: string;
};

type LineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

function buildInvoiceHtml(invoice: InvoiceForPdf, lineItems: LineItem[], orgName: string): string {
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
  const rows = lineItems
    .map(
      (l) =>
        `<tr><td>${l.description}</td><td style="text-align:center">${l.quantity}</td>
      <td style="text-align:right">${fmt(l.unit_price)}</td>
      <td style="text-align:right">${fmt(l.amount)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body{font-family:system-ui,sans-serif;color:#1e293b;padding:48px;max-width:750px;margin:0 auto}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
  .brand{font-size:1.5rem;font-weight:900;color:#0ea5e9}
  .invoice-meta{text-align:right;font-size:.85rem;color:#64748b}
  .invoice-meta strong{color:#1e293b;font-size:1.1rem}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-bottom:2rem;font-size:.88rem}
  .label{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:.25rem}
  table{width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:.88rem}
  th{background:#f1f5f9;padding:.6rem .75rem;text-align:left;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
  td{padding:.6rem .75rem;border-bottom:1px solid #e2e8f0}
  .totals{margin-left:auto;width:260px;font-size:.88rem}
  .totals tr td:first-child{color:#64748b}
  .totals tr td:last-child{text-align:right;font-weight:600}
  .total-row td{font-size:1rem;font-weight:800;color:#0ea5e9;border-top:2px solid #e2e8f0;padding-top:.75rem}
  .memo{margin-top:2rem;font-size:.82rem;color:#64748b;border-top:1px solid #e2e8f0;padding-top:1rem}
  .status-badge{display:inline-block;border-radius:6px;padding:.2rem .65rem;font-size:.75rem;font-weight:700;
    background:${invoice.status === "paid" ? "#dcfce7" : "#dbeafe"};color:${invoice.status === "paid" ? "#16a34a" : "#1d4ed8"}}
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${orgName}</div>
    </div>
    <div class="invoice-meta">
      <div><strong>INVOICE</strong></div>
      <div>${invoice.number}</div>
      <div style="margin-top:.4rem"><span class="status-badge">${invoice.status.toUpperCase()}</span></div>
    </div>
  </div>
  <div class="parties">
    <div>
      <div class="label">Bill To</div>
      <div style="font-weight:600">${invoice.client_name ?? "Client"}</div>
      ${invoice.client_email ? `<div>${invoice.client_email}</div>` : ""}
      ${invoice.client_address ? `<div style="white-space:pre-line">${invoice.client_address}</div>` : ""}
    </div>
    <div style="text-align:right">
      <div><span class="label">Issue Date</span> ${invoice.issue_date}</div>
      ${invoice.due_date ? `<div style="margin-top:.4rem"><span class="label">Due Date</span> ${invoice.due_date}</div>` : ""}
    </div>
  </div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totals">
    <tr><td>Subtotal</td><td>${fmt(invoice.subtotal)}</td></tr>
    ${invoice.tax_rate > 0 ? `<tr><td>Tax (${invoice.tax_rate}%)</td><td>${fmt(invoice.tax_amount)}</td></tr>` : ""}
    <tr class="total-row"><td>Total</td><td>${fmt(invoice.total_amount)}</td></tr>
    ${invoice.amount_paid > 0 ? `<tr><td>Amount Paid</td><td>${fmt(invoice.amount_paid)}</td></tr>` : ""}
    ${invoice.amount_paid > 0 ? `<tr><td>Balance Due</td><td>${fmt(invoice.total_amount - invoice.amount_paid)}</td></tr>` : ""}
  </table>
  ${invoice.memo ? `<div class="memo"><strong>Notes:</strong> ${invoice.memo}</div>` : ""}
</body>
</html>`;
}

export async function generateInvoicePdf(opts: {
  env: { INVOICE_PDFS: R2Bucket; BROWSER: Fetcher };
  invoice: InvoiceForPdf;
  lineItems: LineItem[];
  orgName: string;
}): Promise<string> {
  const { env, invoice, lineItems, orgName } = opts;
  const html = buildInvoiceHtml(invoice, lineItems, orgName);

  // Cloudflare Browser Rendering — POST HTML, receive PDF bytes
  const browserRes = await env.BROWSER.fetch("https://html2pdf.browserworker.internal/pdf", {
    method: "POST",
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: html,
  });

  if (!browserRes.ok) {
    throw new Error(`Browser Rendering failed: ${browserRes.status} ${await browserRes.text()}`);
  }

  const pdfBytes = await browserRes.arrayBuffer();
  const key = `pdfs/${invoice.id}.pdf`;

  await env.INVOICE_PDFS.put(key, pdfBytes, {
    httpMetadata: { contentType: "application/pdf" },
    customMetadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      generatedAt: new Date().toISOString(),
    },
  });

  return key;
}
