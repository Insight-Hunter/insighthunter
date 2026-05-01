// apps/insighthunter-finops/workers/reminders/index.ts
// ih-finops-reminders — Scheduled cron + queue consumer for bill/invoice due-date reminders.
// Cron: "0 8 * * *" — runs daily at 8am UTC.

export interface Env {
  DB: D1Database;
  NOTIFICATIONS: Queue;
}

export default {
  // Daily cron sweep
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await sendBillReminders(env);
    await sendInvoiceReminders(env);
    await markOverdueInvoices(env);
  },

  // Also handle queue-sent reminder jobs (for new bills/invoices)
  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    // Queue jobs are a no-op here — reminders sent by cron, not individually
    batch.messages.forEach((m) => m.ack());
  },
} satisfies ExportedHandler<Env>;

async function sendBillReminders(env: Env): Promise<void> {
  // Bills due in 7 days, 3 days, and today
  for (const daysBefore of [7, 3, 0]) {
    const targetDate = offsetDate(daysBefore);
    const bills = await env.DB.prepare(
      `SELECT b.id, b.org_id, b.amount, b.due_date, v.name AS vendor_name
       FROM bills b LEFT JOIN vendors v ON v.id = b.vendor_id
       WHERE b.due_date = ? AND b.status IN ('approved','pending_payment')`
    ).bind(targetDate).all<{ id: string; org_id: string; amount: number; due_date: string; vendor_name: string }>();

    for (const bill of bills.results) {
      const label = daysBefore === 0 ? "due TODAY" : `due in ${daysBefore} days`;
      await env.NOTIFICATIONS.send({
        orgId: bill.org_id,
        type: "task_due",
        title: `Bill ${label} — ${bill.vendor_name ?? "Unknown vendor"}`,
        body: `$${bill.amount.toFixed(2)} payment to ${bill.vendor_name ?? "vendor"} is ${label}.`,
        actionUrl: `https://finops.insighthunter.app/bills/${bill.id}`,
        channels: ["in_app", "email"],
      });
    }
  }
}

async function sendInvoiceReminders(env: Env): Promise<void> {
  const sevenDaysOut = offsetDate(-7); // invoices past due by 7 days
  const invoices = await env.DB.prepare(
    `SELECT id, org_id, amount, due_date, customer_name, customer_email, invoice_number
     FROM ar_invoices WHERE due_date < date('now') AND status = 'sent'`
  ).all<{
    id: string; org_id: string; amount: number; due_date: string;
    customer_name: string; customer_email: string; invoice_number: string;
  }>();

  for (const inv of invoices.results) {
    await env.NOTIFICATIONS.send({
      orgId: inv.org_id, type: "invoice_overdue",
      title: `Overdue invoice — ${inv.customer_name}`,
      body: `Invoice ${inv.invoice_number} for $${inv.amount.toFixed(2)} from ${inv.customer_name} is overdue (due ${inv.due_date}).`,
      actionUrl: `https://finops.insighthunter.app/invoices/${inv.id}`,
      channels: ["in_app"],
    });
  }
}

async function markOverdueInvoices(env: Env): Promise<void> {
  await env.DB.prepare(
    "UPDATE ar_invoices SET status = 'overdue' WHERE due_date < date('now') AND status = 'sent'"
  ).run();
}

function offsetDate(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}
