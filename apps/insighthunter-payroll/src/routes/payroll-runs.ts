// routes/payroll-runs.ts
// Create payroll runs, calculate gross-to-net per employee, approve run → post journal entries.

import { Hono } from 'hono';
import type { Env } from '../index.js';
import { getSession } from '../index.js';
import { calculatePayrollLine } from '../services/payroll-calculator.js';
import { writePayrollJournalEntry } from '../services/payroll-journal-writer.js';

export const payrollRunRoutes = new Hono<{ Bindings: Env }>();

type RunRow = {
  id: string; org_id: string; period_start: string; period_end: string;
  status: string; total_gross: number; total_net: number;
  employee_count: number; approved_at: string | null;
};

// GET /api/payroll-runs
payrollRunRoutes.get('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  const result = await c.env.DB.prepare(
    `SELECT * FROM payroll_runs WHERE org_id = ?1 ORDER BY created_at DESC LIMIT 50`
  ).bind(session.orgId).all<RunRow>();
  return c.json({ runs: result.results ?? [] });
});

// GET /api/payroll-runs/:id — includes line items
payrollRunRoutes.get('/:id', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  const run = await c.env.DB.prepare(
    `SELECT * FROM payroll_runs WHERE id = ?1 AND org_id = ?2`
  ).bind(c.req.param('id'), session.orgId).first<RunRow>();
  if (!run) return c.json({ error: 'Not found' }, 404);

  const lines = await c.env.DB.prepare(`
    SELECT pl.*, e.name AS employee_name
    FROM payroll_run_lines pl
    JOIN employees e ON e.id = pl.employee_id
    WHERE pl.run_id = ?1 ORDER BY e.name ASC
  `).bind(run.id).all();

  return c.json({ run, lines: lines.results ?? [] });
});

// POST /api/payroll-runs — create run + auto-calculate lines for all active employees
payrollRunRoutes.post('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  if (!['owner', 'admin'].includes(session.role)) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json<{ period_start: string; period_end: string }>();
  if (!body.period_start || !body.period_end) return c.json({ error: 'period_start and period_end required' }, 400);

  // Fetch all active employees
  const employees = await c.env.DB.prepare(`
    SELECT e.*, COALESCE(
      json_group_array(json_object('type', d.type, 'amount', d.amount, 'is_percent', d.is_percent)),
      '[]'
    ) AS deductions_json
    FROM employees e
    LEFT JOIN employee_deductions d ON d.employee_id = e.id AND d.active = 1
    WHERE e.org_id = ?1 AND e.status = 'active'
    GROUP BY e.id
  `).bind(session.orgId).all<{
    id: string; name: string; pay_type: string; pay_rate: number;
    state: string; filing_status: string; allowances: number; deductions_json: string;
  }>();

  if (!employees.results?.length) return c.json({ error: 'No active employees found' }, 400);

  // Calculate days in period for hourly proration
  const start = new Date(body.period_start);
  const end   = new Date(body.period_end);
  const days  = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

  const runId = crypto.randomUUID();
  let totalGross = 0;
  let totalNet   = 0;

  const stmts: ReturnType<D1Database['prepare']>[] = [];

  for (const emp of employees.results) {
    const deductions: { type: string; amount: number; is_percent: number }[] =
      JSON.parse(emp.deductions_json ?? '[]').filter((d: { type: string }) => d.type);

    const calc = calculatePayrollLine({
      payType:      emp.pay_type as 'salary' | 'hourly',
      payRate:      emp.pay_rate,
      days,
      state:        emp.state,
      filingStatus: emp.filing_status as 'single' | 'married',
      allowances:   emp.allowances,
      deductions,
    });

    totalGross += calc.grossPay;
    totalNet   += calc.netPay;

    stmts.push(
      c.env.DB.prepare(`
        INSERT INTO payroll_run_lines
          (id, run_id, employee_id, gross_pay, federal_tax, state_tax,
           social_security, medicare, other_deductions, net_pay, created_at)
        VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,datetime('now'))
      `).bind(
        crypto.randomUUID(), runId, emp.id,
        calc.grossPay, calc.federalTax, calc.stateTax,
        calc.socialSecurity, calc.medicare,
        calc.otherDeductions, calc.netPay,
      )
    );
  }

  // Insert run record
  stmts.unshift(
    c.env.DB.prepare(`
      INSERT INTO payroll_runs
        (id, org_id, period_start, period_end, status, total_gross, total_net, employee_count, created_at)
      VALUES (?1,?2,?3,?4,'draft',?5,?6,?7,datetime('now'))
    `).bind(runId, session.orgId, body.period_start, body.period_end,
        parseFloat(totalGross.toFixed(2)), parseFloat(totalNet.toFixed(2)), employees.results.length)
  );

  await c.env.DB.batch(stmts);
  return c.json({ id: runId, status: 'draft', totalGross, totalNet, employeeCount: employees.results.length }, 201);
});

// POST /api/payroll-runs/:id/approve — approve + post journal entries
payrollRunRoutes.post('/:id/approve', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  if (!['owner', 'admin'].includes(session.role)) return c.json({ error: 'forbidden' }, 403);

  const run = await c.env.DB.prepare(
    `SELECT * FROM payroll_runs WHERE id = ?1 AND org_id = ?2`
  ).bind(c.req.param('id'), session.orgId).first<RunRow>();
  if (!run) return c.json({ error: 'Not found' }, 404);
  if (run.status === 'approved') return c.json({ error: 'Already approved' }, 409);
  if (run.status === 'void')     return c.json({ error: 'Cannot approve a voided run' }, 409);

  const now = new Date().toISOString().slice(0, 10);

  // Write payroll journal entry
  try {
    await writePayrollJournalEntry({
      db:        c.env.DB,
      orgId:     session.orgId,
      grossPay:  run.total_gross,
      netPay:    run.total_net,
      taxes:     run.total_gross - run.total_net,
      memo:      `Payroll ${run.period_start} – ${run.period_end}`,
      postedAt:  now,
    });
  } catch (err) {
    console.error('[payroll] journal entry failed', err);
    // Non-fatal for approval itself — log and continue
  }

  await c.env.DB.prepare(
    `UPDATE payroll_runs SET status = 'approved', approved_at = datetime('now') WHERE id = ?1`
  ).bind(run.id).run();

  return c.json({ ok: true, status: 'approved' });
});

// POST /api/payroll-runs/:id/void
payrollRunRoutes.post('/:id/void', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  if (!['owner', 'admin'].includes(session.role)) return c.json({ error: 'forbidden' }, 403);

  const run = await c.env.DB.prepare(`SELECT status FROM payroll_runs WHERE id = ?1 AND org_id = ?2`)
    .bind(c.req.param('id'), session.orgId).first<{ status: string }>();
  if (!run) return c.json({ error: 'Not found' }, 404);
  if (run.status === 'approved') return c.json({ error: 'Cannot void an approved run — contact support' }, 409);

  await c.env.DB.prepare(`UPDATE payroll_runs SET status = 'void' WHERE id = ?1`).bind(c.req.param('id')).run();
  return c.json({ ok: true, status: 'void' });
});
