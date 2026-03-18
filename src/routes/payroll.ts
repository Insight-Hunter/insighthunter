import { Hono } from 'hono'
import type { Env } from '../index'
import { requireAuth } from '../middleware/auth'

export const payrollRoutes = new Hono<{ Bindings: Env }>()
payrollRoutes.use('*', requireAuth)

// ── Employees ─────────────────────────────────────────────────

payrollRoutes.get('/employees', async c => {
  const userId = c.get('userId') as string
  const rows = await c.env.DB.prepare(
    `SELECT * FROM employees WHERE user_id=? AND deleted_at IS NULL ORDER BY last_name, first_name`
  ).bind(userId).all()
  return c.json({ employees: rows.results })
})

payrollRoutes.get('/employees/:id', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  const emp = await c.env.DB.prepare(
    `SELECT * FROM employees WHERE id=? AND user_id=? AND deleted_at IS NULL`
  ).bind(id, userId).first()
  if (!emp) return c.json({ error: 'Not found' }, 404)
  return c.json({ employee: emp })
})

payrollRoutes.post('/employees', async c => {
  const userId = c.get('userId') as string
  const plan   = c.get('userPlan') as string
  const body   = await c.req.json<any>()
  const { first_name, last_name, email, employment_type, pay_type, pay_rate, filing_status, allowances, start_date } = body

  if (!first_name || !last_name || !pay_rate || !employment_type)
    return c.json({ error: 'first_name, last_name, employment_type, pay_rate required' }, 400)

  // Plan limits
  const count = await c.env.DB.prepare(
    `SELECT COUNT(*) as n FROM employees WHERE user_id=? AND deleted_at IS NULL`
  ).bind(userId).first<{ n: number }>()
  const limit = plan === 'free' ? 0 : plan === 'starter' ? 5 : plan === 'pro' ? 25 : 9999
  if ((count?.n ?? 0) >= limit)
    return c.json({ error: `Your ${plan} plan supports up to ${limit} employees. Upgrade to add more.` }, 403)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO employees (id,user_id,first_name,last_name,email,employment_type,pay_type,pay_rate,
      filing_status,allowances,start_date,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(id, userId, first_name, last_name, email??null, employment_type, pay_type??'salary',
    +pay_rate, filing_status??'single', allowances??1, start_date??null,
    new Date().toISOString()).run()

  c.env.ANALYTICS.writeDataPoint({ blobs:['employee_added', employment_type], doubles:[1], indexes:[userId] })
  return c.json({ id }, 201)
})

payrollRoutes.patch('/employees/:id', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  const body   = await c.req.json<any>()
  const fields = ['first_name','last_name','email','pay_type','pay_rate','filing_status','allowances','end_date']
    .filter(k => body[k] !== undefined)
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400)
  const sets = fields.map(f => `${f}=?`).join(',')
  const vals = fields.map(f => body[f])
  await c.env.DB.prepare(
    `UPDATE employees SET ${sets} WHERE id=? AND user_id=? AND deleted_at IS NULL`
  ).bind(...vals, id, userId).run()
  return c.json({ ok: true })
})

payrollRoutes.delete('/employees/:id', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  await c.env.DB.prepare(
    `UPDATE employees SET deleted_at=? WHERE id=? AND user_id=?`
  ).bind(new Date().toISOString(), id, userId).run()
  return c.json({ ok: true })
})

// ── Payroll Runs ──────────────────────────────────────────────

payrollRoutes.get('/runs', async c => {
  const userId = c.get('userId') as string
  const { limit = '20', offset = '0' } = c.req.query()
  const rows = await c.env.DB.prepare(
    `SELECT * FROM payroll_runs WHERE user_id=? ORDER BY pay_date DESC LIMIT ? OFFSET ?`
  ).bind(userId, +limit, +offset).all()
  return c.json({ runs: rows.results })
})

payrollRoutes.get('/runs/:id', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  const [run, lines] = await Promise.all([
    c.env.DB.prepare(
      `SELECT * FROM payroll_runs WHERE id=? AND user_id=?`
    ).bind(id, userId).first(),
    c.env.DB.prepare(
      `SELECT pl.*, e.first_name, e.last_name, e.employment_type
       FROM payroll_lines pl
       JOIN employees e ON pl.employee_id=e.id
       WHERE pl.run_id=?`
    ).bind(id).all()
  ])
  if (!run) return c.json({ error: 'Not found' }, 404)
  return c.json({ run, lines: lines.results })
})

payrollRoutes.post('/runs', async c => {
  const userId = c.get('userId') as string
  const body   = await c.req.json<any>()
  const { pay_period, pay_date } = body
  if (!pay_period || !pay_date)
    return c.json({ error: 'pay_period and pay_date required' }, 400)

  const employees = await c.env.DB.prepare(
    `SELECT * FROM employees WHERE user_id=? AND deleted_at IS NULL AND (end_date IS NULL OR end_date >= ?)`
  ).bind(userId, pay_date).all()

  if (!employees.results.length)
    return c.json({ error: 'No active employees found.' }, 422)

  const runId = crypto.randomUUID()
  let totalGross = 0, totalTax = 0, totalNet = 0

  // Calculate each employee line
  const lines = (employees.results as any[]).map(emp => {
    const gross    = emp.pay_type === 'salary' ? emp.pay_rate / 26 : emp.pay_rate * (body.hours?.[emp.id] ?? 80)
    const fedTax   = emp.employment_type === 'w2' ? gross * 0.22 : 0
    const fica     = emp.employment_type === 'w2' ? gross * 0.0765 : 0
    const stateTax = emp.employment_type === 'w2' ? gross * 0.055 : 0
    const tax      = fedTax + fica + stateTax
    const net      = gross - tax
    totalGross += gross; totalTax += tax; totalNet += net
    return { id: crypto.randomUUID(), run_id: runId, employee_id: emp.id, gross, fed_tax: fedTax, fica, state_tax: stateTax, net }
  })

  // Insert run + lines in a batch
  const stmts = [
    c.env.DB.prepare(`
      INSERT INTO payroll_runs (id,user_id,pay_period,pay_date,status,total_gross,total_tax,total_net,created_at)
      VALUES (?,?,?,?,'draft',?,?,?,?)
    `).bind(runId, userId, pay_period, pay_date, totalGross, totalTax, totalNet, new Date().toISOString()),
    ...lines.map(l => c.env.DB.prepare(`
      INSERT INTO payroll_lines (id,run_id,employee_id,gross,fed_tax,fica,state_tax,net)
      VALUES (?,?,?,?,?,?,?,?)
    `).bind(l.id, l.run_id, l.employee_id, l.gross, l.fed_tax, l.fica, l.state_tax, l.net))
  ]
  await c.env.DB.batch(stmts)

  c.env.ANALYTICS.writeDataPoint({
    blobs: ['payroll_run_created'], doubles: [totalGross], indexes: [userId]
  })
  return c.json({ id: runId, total_gross: totalGross, total_tax: totalTax, total_net: totalNet, lines }, 201)
})

payrollRoutes.post('/runs/:id/approve', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  const run = await c.env.DB.prepare(
    `SELECT * FROM payroll_runs WHERE id=? AND user_id=?`
  ).bind(id, userId).first<any>()
  if (!run)             return c.json({ error: 'Not found' }, 404)
  if (run.status !== 'draft') return c.json({ error: 'Already approved' }, 409)

  await c.env.DB.prepare(
    `UPDATE payroll_runs SET status='approved', approved_at=? WHERE id=?`
  ).bind(new Date().toISOString(), id).run()

  // Auto-post payroll expense to bookkeeping
  await c.env.DB.prepare(`
    INSERT INTO transactions (id,user_id,description,amount,type,date,notes,created_at)
    VALUES (?,?,?,?,'expense',?,?,?)
  `).bind(crypto.randomUUID(), userId, `Payroll — ${run.pay_period}`,
    run.total_gross, run.pay_date, `Payroll run ID: ${id}`, new Date().toISOString()).run()

  // Queue payroll notifications
  await c.env.PAYROLL_QUEUE.send({ type: 'payroll_approved', runId: id, userId })
  return c.json({ ok: true })
})

// ── YTD Summary ───────────────────────────────────────────────

payrollRoutes.get('/ytd', async c => {
  const userId = c.get('userId') as string
  const year   = new Date().getFullYear()
  const row    = await c.env.DB.prepare(`
    SELECT SUM(total_gross) as gross, SUM(total_tax) as tax,
           SUM(total_net) as net, COUNT(*) as runs
    FROM payroll_runs
    WHERE user_id=? AND status='approved'
      AND strftime('%Y', pay_date)=?
  `).bind(userId, String(year)).first<any>()
  return c.json({ ytd: { gross: row?.gross ?? 0, tax: row?.tax ?? 0, net: row?.net ?? 0, runs: row?.runs ?? 0 } })
})
