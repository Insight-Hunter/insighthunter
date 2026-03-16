// src/backend/invoice-management.ts
import { DurableObject } from "cloudflare:workers";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax: number;
  total: number;
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
  paidDate?: string;
  currency: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'other';
  reference?: string;
  notes?: string;
}

export class InvoiceManager extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Invoice CRUD
    if (path.includes('/invoices') && request.method === 'POST') {
      return this.createInvoice(request);
    }

    if (path.includes('/invoices') && request.method === 'GET') {
      return this.getInvoices(request);
    }

    if (path.match(/\/invoices\/[\w-]+$/) && request.method === 'GET') {
      return this.getInvoice(request);
    }

    if (path.match(/\/invoices\/[\w-]+$/) && request.method === 'PUT') {
      return this.updateInvoice(request);
    }

    if (path.match(/\/invoices\/[\w-]+$/) && request.method === 'DELETE') {
      return this.deleteInvoice(request);
    }

    // Invoice actions
    if (path.includes('/send')) {
      return this.sendInvoice(request);
    }

    if (path.includes('/record-payment')) {
      return this.recordPayment(request);
    }

    if (path.includes('/generate-pdf')) {
      return this.generateInvoicePDF(request);
    }

    // Invoice analytics
    if (path.includes('/analytics/aging')) {
      return this.getAgingReport(request);
    }

    if (path.includes('/analytics/revenue')) {
      return this.getRevenueAnalytics(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  private async createInvoice(request: Request): Promise<Response> {
    try {
      const invoice: Partial<Invoice> = await request.json();

      // Generate invoice number if not provided
      if (!invoice.invoiceNumber) {
        invoice.invoiceNumber = await this.generateInvoiceNumber();
      }

      // Calculate totals
      const subtotal = invoice.items!.reduce((sum, item) => sum + item.amount, 0);
      const tax = invoice.items!.reduce(
        (sum, item) => sum + (item.amount * (item.taxRate || 0)) / 100,
        0
      );
      const total = subtotal + tax;

      const newInvoice: Invoice = {
        id: crypto.randomUUID(),
        invoiceNumber: invoice.invoiceNumber,
        clientId: invoice.clientId!,
        clientName: invoice.clientName!,
        issueDate: invoice.issueDate || new Date().toISOString().split('T')[0],
        dueDate: invoice.dueDate!,
        status: invoice.status || 'draft',
        subtotal,
        tax,
        total,
        items: invoice.items!,
        notes: invoice.notes,
        terms: invoice.terms,
        currency: invoice.currency || 'USD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.ctx.storage.put(`invoice:${newInvoice.id}`, newInvoice);

      // Create accounting entry if invoice is not draft
      if (newInvoice.status !== 'draft') {
        await this.createInvoiceAccountingEntry(newInvoice);
      }

      return Response.json({ success: true, invoice: newInvoice });
    } catch (error) {
      return Response.json(
        { error: 'Failed to create invoice' },
        { status: 500 }
      );
    }
  }

  private async getInvoices(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const clientId = url.searchParams.get('clientId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const invoices = await this.ctx.storage.list<Invoice>({ prefix: 'invoice:' });
    let filtered = Array.from(invoices.values());

    if (status) {
      filtered = filtered.filter((inv) => inv.status === status);
    }

    if (clientId) {
      filtered = filtered.filter((inv) => inv.clientId === clientId);
    }

    if (startDate) {
      filtered = filtered.filter((inv) => inv.issueDate >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter((inv) => inv.issueDate <= endDate);
    }

    // Sort by issue date descending
    filtered.sort(
      (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
    );

    return Response.json({ invoices: filtered });
  }

  private async getInvoice(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const invoiceId = url.pathname.split('/').pop();

    const invoice = await this.ctx.storage.get<Invoice>(`invoice:${invoiceId}`);

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return Response.json({ invoice });
  }

  private async updateInvoice(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const invoiceId = url.pathname.split('/').pop();

    const existing = await this.ctx.storage.get<Invoice>(`invoice:${invoiceId}`);

    if (!existing) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const updates: Partial<Invoice> = await request.json();

    // Recalculate totals if items changed
    let subtotal = existing.subtotal;
    let tax = existing.tax;
    let total = existing.total;

    if (updates.items) {
      subtotal = updates.items.reduce((sum, item) => sum + item.amount, 0);
      tax = updates.items.reduce(
        (sum, item) => sum + (item.amount * (item.taxRate || 0)) / 100,
        0
      );
      total = subtotal + tax;
    }

    const updated: Invoice = {
      ...existing,
      ...updates,
      subtotal,
      tax,
      total,
      updatedAt: new Date().toISOString(),
    };

    await this.ctx.storage.put(`invoice:${invoiceId}`, updated);

    return Response.json({ success: true, invoice: updated });
  }

  private async deleteInvoice(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const invoiceId = url.pathname.split('/').pop();

    const invoice = await this.ctx.storage.get<Invoice>(`invoice:${invoiceId}`);

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'paid') {
      return Response.json(
        { error: 'Cannot delete paid invoice' },
        { status: 400 }
      );
    }

    await this.ctx.storage.delete(`invoice:${invoiceId}`);

    return Response.json({ success: true });
  }

  private async sendInvoice(request: Request): Promise<Response> {
    const { invoiceId, email, message } = await request.json();

    const invoice = await this.ctx.storage.get<Invoice>(`invoice:${invoiceId}`);

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Update status to sent
    invoice.status = 'sent';
    invoice.updatedAt = new Date().toISOString();

    await this.ctx.storage.put(`invoice:${invoiceId}`, invoice);

    // TODO: Integrate with email service (SendGrid, etc.)
    console.log(`Sending invoice ${invoice.invoiceNumber} to ${email}`);

    return Response.json({ success: true, message: 'Invoice sent' });
  }

  private async recordPayment(request: Request): Promise<Response> {
    const payment: Payment = await request.json();

    const invoice = await this.ctx.storage.get<Invoice>(
      `invoice:${payment.invoiceId}`
    );

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Store payment
    payment.id = crypto.randomUUID();
    await this.ctx.storage.put(`payment:${payment.id}`, payment);

    // Update invoice status
    invoice.status = 'paid';
    invoice.paidDate = payment.date;
    invoice.updatedAt = new Date().toISOString();

    await this.ctx.storage.put(`invoice:${payment.invoiceId}`, invoice);

    // Create accounting entry
    await this.createPaymentAccountingEntry(invoice, payment);

    return Response.json({ success: true, payment });
  }

  private async generateInvoicePDF(request: Request): Promise<Response> {
    const { invoiceId } = await request.json();

    const invoice = await this.ctx.storage.get<Invoice>(`invoice:${invoiceId}`);

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Generate HTML template
    const html = this.generateInvoiceHTML(invoice);

    // TODO: Convert HTML to PDF using a service like Puppeteer on Workers
    // For now, return HTML
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  private async getAgingReport(request: Request): Promise<Response> {
    const invoices = await this.ctx.storage.list<Invoice>({ prefix: 'invoice:' });
    const unpaid = Array.from(invoices.values()).filter(
      (inv) => inv.status !== 'paid' && inv.status !== 'cancelled'
    );

    const today = new Date();
    const aging = {
      current: 0, // 0-30 days
      days31to60: 0,
      days61to90: 0,
      over90: 0,
      total: 0,
    };

    for (const invoice of unpaid) {
      const dueDate = new Date(invoice.dueDate);
      const daysPastDue = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      aging.total += invoice.total;

      if (daysPastDue <= 0) {
        aging.current += invoice.total;
      } else if (daysPastDue <= 30) {
        aging.current += invoice.total;
      } else if (daysPastDue <= 60) {
        aging.days31to60 += invoice.total;
      } else if (daysPastDue <= 90) {
        aging.days61to90 += invoice.total;
      } else {
        aging.over90 += invoice.total;
      }
    }

    return Response.json({ aging, unpaidCount: unpaid.length });
  }

  private async getRevenueAnalytics(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const invoices = await this.ctx.storage.list<Invoice>({ prefix: 'invoice:' });
    let filtered = Array.from(invoices.values());

    if (startDate) {
      filtered = filtered.filter((inv) => inv.issueDate >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter((inv) => inv.issueDate <= endDate);
    }

    const analytics = {
      totalRevenue: 0,
      paidRevenue: 0,
      unpaidRevenue: 0,
      invoiceCount: filtered.length,
      paidCount: 0,
      unpaidCount: 0,
      averageInvoiceValue: 0,
      topClients: [] as Array<{ clientName: string; revenue: number }>,
    };

    const clientRevenue = new Map<string, number>();

    for (const invoice of filtered) {
      analytics.totalRevenue += invoice.total;

      if (invoice.status === 'paid') {
        analytics.paidRevenue += invoice.total;
        analytics.paidCount++;
      } else if (invoice.status !== 'cancelled') {
        analytics.unpaidRevenue += invoice.total;
        analytics.unpaidCount++;
      }

      // Track client revenue
      const current = clientRevenue.get(invoice.clientName) || 0;
      clientRevenue.set(invoice.clientName, current + invoice.total);
    }

    analytics.averageInvoiceValue =
      analytics.invoiceCount > 0
        ? analytics.totalRevenue / analytics.invoiceCount
        : 0;

    // Top clients
    analytics.topClients = Array.from(clientRevenue.entries())
      .map(([clientName, revenue]) => ({ clientName, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return Response.json({ analytics });
  }

  // Helper methods

  private async generateInvoiceNumber(): Promise<string> {
    const count = await this.ctx.storage.get<number>('invoice_counter') || 0;
    const newCount = count + 1;
    await this.ctx.storage.put('invoice_counter', newCount);

    const year = new Date().getFullYear();
    return `INV-${year}-${String(newCount).padStart(5, '0')}`;
  }

  private async createInvoiceAccountingEntry(invoice: Invoice): Promise<void> {
    // Create journal entry for invoice
    const entry = {
      id: crypto.randomUUID(),
      date: invoice.issueDate,
      description: `Invoice ${invoice.invoiceNumber} - ${invoice.clientName}`,
      entries: [
        {
          accountId: 'accounts-receivable',
          accountName: 'Accounts Receivable',
          type: 'debit' as const,
          amount: invoice.total,
        },
        {
          accountId: 'sales-revenue',
          accountName: 'Sales Revenue',
          type: 'credit' as const,
          amount: invoice.subtotal,
        },
      ],
      status: 'posted',
      createdAt: new Date().toISOString(),
      source: 'invoice',
      sourceId: invoice.id,
    };

    // Add tax entry if applicable
    if (invoice.tax > 0) {
      entry.entries.push({
        accountId: 'sales-tax-payable',
        accountName: 'Sales Tax Payable',
        type: 'credit' as const,
        amount: invoice.tax,
      });
    }

    await this.ctx.storage.put(`tx:${entry.id}`, entry);
  }

  private async createPaymentAccountingEntry(
    invoice: Invoice,
    payment: Payment
  ): Promise<void> {
    const entry = {
      id: crypto.randomUUID(),
      date: payment.date,
      description: `Payment for Invoice ${invoice.invoiceNumber}`,
      entries: [
        {
          accountId: 'cash',
          accountName: 'Cash',
          type: 'debit' as const,
          amount: payment.amount,
        },
        {
          accountId: 'accounts-receivable',
          accountName: 'Accounts Receivable',
          type: 'credit' as const,
          amount: payment.amount,
        },
      ],
      status: 'posted',
      createdAt: new Date().toISOString(),
      source: 'payment',
      sourceId: payment.id,
    };

    await this.ctx.storage.put(`tx:${entry.id}`, entry);
  }

  private generateInvoiceHTML(invoice: Invoice): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .company { font-size: 24px; font-weight: bold; }
    .invoice-details { text-align: right; }
    .client-details { margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #667eea; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #ddd; }
    .totals { text-align: right; }
    .total-row { font-size: 18px; font-weight: bold; }
    .notes { margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">InsightHunter Bookkeeping</div>
    <div class="invoice-details">
      <h2>INVOICE</h2>
      <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Date:</strong> ${invoice.issueDate}</p>
      <p><strong>Due Date:</strong> ${invoice.dueDate}</p>
    </div>
  </div>

  <div class="client-details">
    <h3>Bill To:</h3>
    <p><strong>${invoice.clientName}</strong></p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Quantity</th>
        <th>Unit Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${invoice.currency} ${item.unitPrice.toFixed(2)}</td>
          <td>${invoice.currency} ${item.amount.toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <p><strong>Subtotal:</strong> ${invoice.currency} ${invoice.subtotal.toFixed(2)}</p>
    <p><strong>Tax:</strong> ${invoice.currency} ${invoice.tax.toFixed(2)}</p>
    <p class="total-row"><strong>Total:</strong> ${invoice.currency} ${invoice.total.toFixed(2)}</p>
  </div>

  ${invoice.notes ? `
    <div class="notes">
      <h4>Notes:</h4>
      <p>${invoice.notes}</p>
    </div>
  ` : ''}

  ${invoice.terms ? `
    <div class="notes">
      <h4>Terms & Conditions:</h4>
      <p>${invoice.terms}</p>
    </div>
  ` : ''}
</body>
</html>
    `;
  }
}
