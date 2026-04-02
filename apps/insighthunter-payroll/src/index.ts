import { Hono } from 'hono';
import type { AuthUser } from '@ih/types';
import { TIER_LIMITS, tierAtLeast } from '@ih/tier-config';

interface Env {
  DB: D1Database;
  PAY_STUBS: R2Bucket;
  PAYROLL_CACHE: KVNamespace;
  PAYROLL_QUEUE: Queue;
  PAYROLL_EVENTS: AnalyticsEngineDataset;
}

interface IHLocals { user: AuthUser }

// ─── Tax calculation helpers ──────────────────────────────────────────────────

interface TaxResult {
  gross_pay: number;
  federal_income_tax: number;
  state_income_tax: number;
  social_security: number;
  medicare: number;
  net_pay: number;
}

function calculateTaxes(annualizedGross: number, grossPay: number): TaxResult {
  // Federal income tax (simplified 2024 brackets)
  let federalAnnual = 0;
  if (annualizedGross <= 11_000)       federalAnnual = annualizedGross * 0.10;
  else if (annualizedGross <= 44_725)  federalAnnual = 1_100 + (annualizedGross - 11_000) * 0.12;
  else if (annualizedGross <= 95_375)  federalAnnual = 5_147 + (annualizedGross - 44_725) * 0.22;
  else                                  federalAnnual = 16_290 + (annualizedGross - 95_375) * 0.24;

  const federalRatio = annualizedGross > 0 ? federalAnnual / annualizedGross : 0;
  const federal_income_tax = Math.round(grossPay * federalRatio * 100) / 100;

  // State income tax (flat 5% estimate)
  const state_income_tax = Math.round(grossPay * 0.05 * 100) / 100;

  // FICA
  const annualSS = Math.min(annualizedGross, 160_200);
  const ssRatio = annualizedGross > 0 ? annualSS / annualizedGross : 0;
  const social_security = Math.round(grossPay * ssRatio * 0.062 * 100) / 100;
  const medicare = Math.round(grossPay * 0.0145 * 100) / 100;

  const totalTax = federal_income_tax + state_income_tax + social_security + medicare;
  const net_pay = Math.round((grossPay - totalTax) * 100) / 100;

  return { gross_pay: grossPay, federal_income_tax, state_income_tax, social_security, medicare, net_pay };
}

function calculateEmployeeGross(emp: {
  pay_type: string; pay_rate: number; hours_per_week: number;
  period_start: string; period_end: string;
}): { grossPay: number; hoursWorked: number; annualized: number } {
  const days = Math.round((new Date(emp.period_end).getTime() - new Date(emp.period_start).getTime()) / 86_400_000);
  const weeks = days / 7;

  if (emp.pay_type === 'hourly') {
    const hoursWorked = emp.hours_per_week * weeks;
    const grossPay = Math.round(hoursWorked * emp.pay_rate * 100) / 100;
    const annualized = emp.pay_rate * emp.hours_per_week * 52;
    return { grossPay, hoursWorked, annualized };
  } else {
    // Salary: annual / 52 * weeks
    const grossPay = Math.round((emp.pay_rate / 52) * weeks * 100) / 100;
    return { grossPay, hoursWorked: 0, annualized: emp.pay_rate };
  }
}

// ─── Generate pay stub HTML ───────────────────────────────────────────────────

function generatePayStubHTML(emp: Record<string, unknown>, run: Record<string, unknown>, line: Record<string, unknown>): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Pay Stub</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; color: #333; }
  .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  td, th { padding: 8px; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #f5f5f5; font-weight: bold; }
  .total { font-weight: bold; font-size: 1.1em; }
  .net { color: #2a7c3f; font-size: 1.3em; font-weight: bold; }
</style></head>
<body>
<div class="header">
  <h2>InsightHunter Payroll</h2>
  <p><strong>Employee:</strong> ${emp.first_name} ${emp.last_name} (${emp.email})</p>
  <p><strong>Pay Period:</strong> ${run.period_start} — ${run.period_end} | <strong>Pay Date:</strong> ${run.pay_date}</p>
</div>
<table>
  <tr><th>Description</th><th style="text-align:right">Amount</th></tr>
  <tr><td>Gross Pay</td><td style="text-align:right">$${Number(line.gross_pay).toFixed(2)}</td></tr>
  <tr><td>Federal Income Tax</td><td style="text-align:right">-$${Number(line.federal_income_tax).toFixed(2)}</td></tr>
  <tr><td>State Income Tax</td><td style="text-align:right">-$${Number(line.state_income_tax).toFixed(2)}</td></tr>
  <tr><td>Social Security (6.2%)</td><td style="text-align:right">-$${Number(line.social_security).toFixed(2)}</td></tr>
  <tr><td>Medicare (1.45%)</td><td style="text-align:right">-$${Number(line.medicare).toFixed(2)}</td></tr>
  <tr class="total"><td>Net Pay</td><td class="net" style="text-align:right">$${Number(line.net_pay).toFixed(2)}</td></tr>
</table>
</body></html>`;
}

// ─── App ──────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env; Variables: IHLocals }>();

app.use('*', async (c, next) => {
  const raw = c.req.header('X-IH-User');
  if (!raw) return c.json({ error: 'Missing user context', code: 'NO_USER' }, 401);
  try { c.set('user', JSON.parse(raw) as AuthUser); } catch {
    return c.json({ error: 'Invalid user context', code: 'BAD_USER' }, 400);
  }
  // Tier gate: payroll requires standard or above
  const user = c.get('user');
  if (!tierAtLeast(user.tier, 'standard')) {
    return c.json({ error: 'Payroll requires standard plan or above', code: 'TIER_REQUIRED', required: 'standard' }, 403);
  }
  return next();
});

// ─── Employees ────────────────────────────────────────────────────────────────

app.get('/employees', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.DB.prepare('SELECT * FROM employees WHERE org_id = ? AND is_active = 1 ORDER BY last_name ASC').bind(user.orgId).all();
  return c.json(results);
});

app.post('/employees', async (c) => {
  const user = c.get('user');
  const limit = TIER_LIMITS[user.tier].payroll_employees;
  if (limit !== null) {
    const { cnt } = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM employees WHERE org_id = ? AND is_active = 1').bind(user.orgId).first<{ cnt: number }>() ?? { cnt: 0 };
    if (cnt >= limit) return c.json({ error: `Employee limit (${limit}) reached for your plan`, code: 'LIMIT_REACHED' }, 403);
  }

  const body = await c.req.json<{
    first_name: string; last_name: string; email: string; pay_type: string; pay_rate: number;
    employment_type?: string; hours_per_week?: number; filing_status?: string;
    federal_allowances?: number; state?: string; start_date?: string; ssn_last4?: string;
  }>();

  if (!body.first_name || !body.last_name || !body.email || !body.pay_type || !body.pay_rate) {
    return c.json({ error: 'first_name, last_name, email, pay_type, pay_rate required', code: 'MISSING_FIELDS' }, 400);
  }

  const id = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.prepare(`
    INSERT INTO employees (id, org_id, first_name, last_name, email, ssn_last4, employment_type, pay_type, pay_rate, hours_per_week, filing_status, federal_allowances, state, start_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.orgId, body.first_name, body.last_name, body.email, body.ssn_last4 ?? null, body.employment_type ?? 'fulltime', body.pay_type, body.pay_rate, body.hours_per_week ?? 40, body.filing_status ?? 'single', body.federal_allowances ?? 1, body.state ?? null, body.start_date ?? null).run();

  return c.json(await c.env.DB.prepare('SELECT * FROM employees WHERE id = ?').bind(id).first(), 201);
});

app.patch('/employees/:id', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<Record<string, unknown>>();
  const allowed = ['first_name','last_name','email','pay_type','pay_rate','hours_per_week','filing_status','federal_allowances','state','employment_type'];
  const updates: string[] = [];
  const vals: unknown[] = [];
  for (const key of allowed) {
    if (key in body) { updates.push(`${key} = ?`); vals.push(body[key]); }
  }
  if (!updates.length) return c.json({ error: 'No fields', code: 'NO_CHANGES' }, 400);
  vals.push(c.req.param('id'), user.orgId);
  await c.env.DB.prepare(`UPDATE employees SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`).bind(...vals).run();
  return c.json(await c.env.DB.prepare('SELECT * FROM employees WHERE id = ?').bind(c.req.param('id')).first());
});

app.delete('/employees/:id', async (c) => {
  const user = c.get('user');
  await c.env.DB.prepare('UPDATE employees SET is_active = 0 WHERE id = ? AND org_id = ?').bind(c.req.param('id'), user.orgId).run();
  return c.json({ deactivated: true });
});

// ─── Payroll Runs ─────────────────────────────────────────────────────────────

app.get('/runs', async (c) => {
  const user = c.get('user');
  const { page = '1', limit = '20' } = c.req.query();
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(100, parseInt(limit, 10));
  const { results } = await c.env.DB.prepare('SELECT * FROM payroll_runs WHERE org_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(user.orgId, limitNum, (pageNum - 1) * limitNum).all();
  return c.json(results);
});

app.get('/runs/:id', async (c) => {
  const user = c.get('user');
  const run = await c.env.DB.prepare('SELECT * FROM payroll_runs WHERE id = ? AND org_id = ?').bind(c.req.param('id'), user.orgId).first();
  if (!run) return c.json({ error: 'Payroll run not found', code: 'NOT_FOUND' }, 404);
  const { results: items } = await c.env.DB.prepare(`
    SELECT pli.*, e.first_name, e.last_name, e.email FROM payroll_line_items pli
    JOIN employees e ON e.id = pli.employee_id WHERE pli.run_id = ?
  `).bind(c.req.param('id')).all();
  return c.json({ ...run, line_items: items });
});

app.post('/runs', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ period_start: string; period_end: string; pay_date: string }>();
  if (!body.period_start || !body.period_end || !body.pay_date) {
    return c.json({ error: 'period_start, period_end, pay_date required', code: 'MISSING_FIELDS' }, 400);
  }
  const id = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.prepare('INSERT INTO payroll_runs (id, org_id, period_start, period_end, pay_date, created_by) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, user.orgId, body.period_start, body.period_end, body.pay_date, user.userId).run();
  return c.json(await c.env.DB.prepare('SELECT * FROM payroll_runs WHERE id = ?').bind(id).first(), 201);
});

app.post('/runs/:id/calculate', async (c) => {
  const user = c.get('user');
  const runId = c.req.param('id');
  const run = await c.env.DB.prepare('SELECT * FROM payroll_runs WHERE id = ? AND org_id = ?').bind(runId, user.orgId).first<{
    id: string; period_start: string; period_end: string; pay_date: string; status: string;
  }>();
  if (!run) return c.json({ error: 'Run not found', code: 'NOT_FOUND' }, 404);
  if (run.status !== 'DRAFT') return c.json({ error: 'Only DRAFT runs can be calculated', code: 'NOT_DRAFT' }, 400);

  const { results: employees } = await c.env.DB.prepare('SELECT * FROM employees WHERE org_id = ? AND is_active = 1').bind(user.orgId).all<{
    id: string; pay_type: string; pay_rate: number; hours_per_week: number;
    first_name: string; last_name: string;
  }>();

  if (!employees.length) return c.json({ error: 'No active employees', code: 'NO_EMPLOYEES' }, 400);

  // Delete existing line items and recalculate
  const stmts: D1PreparedStatement[] = [
    c.env.DB.prepare('DELETE FROM payroll_line_items WHERE run_id = ?').bind(runId),
  ];

  let totalGross = 0, totalTaxes = 0, totalNet = 0;

  const lineItems: TaxResult[] = [];
  for (const emp of employees) {
    const { grossPay, hoursWorked, annualized } = calculateEmployeeGross({
      pay_type: emp.pay_type,
      pay_rate: emp.pay_rate,
      hours_per_week: emp.hours_per_week,
      period_start: run.period_start,
      period_end: run.period_end,
    });
    const taxes = calculateTaxes(annualized, grossPay);
    totalGross += grossPay;
    totalTaxes += taxes.federal_income_tax + taxes.state_income_tax + taxes.social_security + taxes.medicare;
    totalNet += taxes.net_pay;

    const lineId = crypto.randomUUID().replace(/-/g, '');
    stmts.push(c.env.DB.prepare(`
      INSERT INTO payroll_line_items (id, run_id, employee_id, gross_pay, federal_income_tax, state_income_tax, social_security, medicare, net_pay, hours_worked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(lineId, runId, emp.id, taxes.gross_pay, taxes.federal_income_tax, taxes.state_income_tax, taxes.social_security, taxes.medicare, taxes.net_pay, hoursWorked || null));
    lineItems.push(taxes);
  }

  stmts.push(c.env.DB.prepare(`UPDATE payroll_runs SET total_gross = ?, total_taxes = ?, total_net = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(Math.round(totalGross * 100) / 100, Math.round(totalTaxes * 100) / 100, Math.round(totalNet * 100) / 100, runId));

  await c.env.DB.batch(stmts);
  c.env.PAYROLL_EVENTS.writeDataPoint({ blobs: ['calculate_run', runId], indexes: [user.orgId] });

  return c.json({ calculated: employees.length, total_gross: totalGross, total_taxes: totalTaxes, total_net: totalNet });
});

app.post('/runs/:id/submit', async (c) => {
  const user = c.get('user');
  const runId = c.req.param('id');
  const run = await c.env.DB.prepare('SELECT * FROM payroll_runs WHERE id = ? AND org_id = ?').bind(runId, user.orgId).first<{ status: string }>();
  if (!run) return c.json({ error: 'Run not found', code: 'NOT_FOUND' }, 404);
  if (run.status !== 'DRAFT') return c.json({ error: 'Only DRAFT runs can be submitted', code: 'NOT_DRAFT' }, 400);

  await c.env.DB.prepare("UPDATE payroll_runs SET status = 'PROCESSING', updated_at = datetime('now') WHERE id = ?").bind(runId).run();
  await c.env.PAYROLL_QUEUE.send({ type: 'process_payroll_run', runId, orgId: user.orgId });
  return c.json({ submitted: true, runId });
});

app.get('/runs/:id/paystubs/:empId', async (c) => {
  const user = c.get('user');
  const { id: runId, empId } = c.req.param();
  const line = await c.env.DB.prepare('SELECT * FROM payroll_line_items pli JOIN payroll_runs r ON r.id = pli.run_id WHERE pli.run_id = ? AND pli.employee_id = ? AND r.org_id = ?')
    .bind(runId, empId, user.orgId).first<{ pay_stub_r2_key: string }>();
  if (!line?.pay_stub_r2_key) return c.json({ error: 'Pay stub not yet generated', code: 'NOT_READY' }, 404);
  const obj = await c.env.PAY_STUBS.get(line.pay_stub_r2_key);
  if (!obj) return c.json({ error: 'Pay stub file not found', code: 'STORAGE_ERROR' }, 404);
  return new Response(obj.body, { headers: { 'Content-Type': 'text/html' } });
});

// ─── Summary ──────────────────────────────────────────────────────────────────

app.get('/summary', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.DB.prepare(`
    SELECT strftime('%Y-%m', pay_date) as month, SUM(total_gross) as gross, SUM(total_net) as net, SUM(total_taxes) as taxes
    FROM payroll_runs WHERE org_id = ? AND status = 'COMPLETE'
    GROUP BY month ORDER BY month DESC LIMIT 12
  `).bind(user.orgId).all();
  return c.json(results);
});

// ─── Queue consumer: generate pay stubs ──────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return app.fetch(request, env);
  },

  async queue(batch: MessageBatch<{ type: string; runId: string; orgId: string }>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const { runId, orgId } = message.body;
      try {
        // Get run and all line items with employee data
        const run = await env.DB.prepare('SELECT * FROM payroll_runs WHERE id = ?').bind(runId).first<Record<string, unknown>>();
        if (!run) { message.ack(); continue; }

        const { results: items } = await env.DB.prepare(`
          SELECT pli.*, e.first_name, e.last_name, e.email FROM payroll_line_items pli
          JOIN employees e ON e.id = pli.employee_id WHERE pli.run_id = ?
        `).bind(runId).all<Record<string, unknown>>();

        // Generate pay stubs for each employee
        const stmts: D1PreparedStatement[] = [];
        for (const item of items) {
          const r2Key = `pay-stubs/${orgId}/${runId}/${item.employee_id}.html`;
          const html = generatePayStubHTML(item, run, item);
          await env.PAY_STUBS.put(r2Key, html, { httpMetadata: { contentType: 'text/html' } });
          stmts.push(env.DB.prepare('UPDATE payroll_line_items SET pay_stub_r2_key = ? WHERE id = ?').bind(r2Key, item.id));
        }

        stmts.push(env.DB.prepare("UPDATE payroll_runs SET status = 'COMPLETE', updated_at = datetime('now') WHERE id = ?").bind(runId));
        if (stmts.length) await env.DB.batch(stmts);
        message.ack();
      } catch (err) {
        console.error('Payroll queue error:', err);
        message.retry();
      }
    }
  },
};
