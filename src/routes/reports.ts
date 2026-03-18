import { Hono } from 'hono'
import type { Env } from '../index'
import { requireAuth } from '../middleware/auth'

export const reportsRoutes = new Hono<{ Bindings: Env }>()
reportsRoutes.use('*', requireAuth)

// ── P&L Statement ─────────────────────────────────────────────
reportsRoutes.get('/pnl', async c => {
  const userId = c.get('userId') as string
  const { from, to } = c.req.query()
  if (!from || !to) return c.json({ error: 'from and to required' }, 400)

  const [summary, byCategory] = await Promise.all([
    c.env.DB.prepare(`
      SELECT type, SUM(amount) as total
      FROM transactions
      WHERE user_id=? AND date BETWEEN ? AND ? AND deleted_at IS NULL
      GROUP BY type
    `).bind(userId, from, to).all(),

    c.env.DB.prepare(`
      SELECT t.type, cat.name as category, cat.color,
             SUM(t.amount) as total, COUNT(*) as tx_count
      FROM transactions t
      LEFT JOIN categories cat ON t.category_id=cat.id
      WHERE t.user_id=? AND t.date BETWEEN ? AND ? AND t.deleted_at IS NULL
      GROUP BY t.type, t.category_id
      ORDER BY t.type, total DESC
    `).bind(userId, from, to).all()
  ])

  const income  = (summary.results as any[]).find(r => r.type === 'income')?.total  ?? 0
  const expense = (summary.results as any[]).find(r => r.type === 'expense')?.total ?? 0

  return c.json({
    period: { from, to },
    income:  +income,
    expense: +expense,
    net:     +income - +expense,
    margin:  income > 0 ? ((+income - +expense) / +income * 100).toFixed(2) : '0',
    by_category: byCategory.results,
  })
})

// ── Balance Sheet (Assets vs Liabilities) ─────────────────────
reportsRoutes.get('/balance-sheet', async c => {
  const userId = c.get('userId') as string
  const rows = await c.env.DB.prepare(
    `SELECT * FROM accounts WHERE user_id=? AND deleted_at IS NULL ORDER BY type, name`
  ).bind(userId).all()

  const accounts = rows.results as any[]
  const assets      = accounts.filter(a => ['checking','savings','asset'].includes(a.type))
  const liabilities = accounts.filter(a => ['credit','loan'].includes(a.type))

  const totalAssets = assets.reduce((s, a) => s + (a.balance ?? 0), 0)
  const totalLiab   = liabilities.reduce((s, a) => s + Math.abs(a.balance ?? 0), 0)

  return c.json({
    as_of: new Date().toISOString().slice(0, 10),
    assets,
    liabilities,
    total_assets:      totalAssets,
    total_liabilities: totalLiab,
    net_worth:         totalAssets - totalLiab,
  })
})

// ── Cash Flow Summary ─────────────────────────────────────────
reportsRoutes.get('/cash-flow', async c => {
  const userId = c.get('userId') as string
  const { from, to } = c.req.query()
  if (!from || !to) return c.json({ error: 'from and to required' }, 400)

  const rows = await c.env.DB.prepare(`
    SELECT strftime('%Y-%m-%d', date) as day,
           SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) as income,
           SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
    FROM transactions
    WHERE user_id=? AND date BETWEEN ? AND ? AND deleted_at IS NULL
    GROUP BY day
    ORDER BY day
  `).bind(userId, from, to).all()

  // Running balance
  let running = 0
  const daily = (rows.results as any[]).map(r => {
    running += r.income - r.expense
    return { ...r, running_balance: running }
  })

  return c.json({ from, to, daily, net_cash_flow: running })
})

// ── Monthly Trend (12 months) ──────────────────────────────────
reportsRoutes.get('/trend', async c => {
  const userId = c.get('userId') as string
  const { months = '12' } = c.req.query()

  const rows = await c.env.DB.prepare(`
    SELECT strftime('%Y-%m', date) as month,
           SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) as income,
           SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense,
           COUNT(*) as tx_count
    FROM transactions
    WHERE user_id=? AND deleted_at IS NULL
      AND date >= date('now', '-${+months} months')
    GROUP BY month
    ORDER BY month
  `).bind(userId).all()

  return c.json({
    months: +months,
    trend: (rows.results as any[]).map(r => ({
      ...r,
      net:    r.income - r.expense,
      margin: r.income > 0 ? ((r.income - r.expense) / r.income * 100).toFixed(1) : '0',
    }))
  })
})

// ── Top Vendors / Payees ──────────────────────────────────────
reportsRoutes.get('/top-vendors', async c => {
  const userId = c.get('userId') as string
  const { from, to, limit = '10' } = c.req.query()
  if (!from || !to) return c.json({ error: 'from and to required' }, 400)

  const rows = await c.env.DB.prepare(`
    SELECT description, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE user_id=? AND type='expense'
      AND date BETWEEN ? AND ? AND deleted_at IS NULL
    GROUP BY LOWER(TRIM(description))
    ORDER BY total DESC
    LIMIT ?
  `).bind(userId, from, to, +limit).all()

  return c.json({ vendors: rows.results })
})

// ── Export CSV (streamed) ─────────────────────────────────────
reportsRoutes.get('/export/transactions', async c => {
  const userId = c.get('userId') as string
  const plan   = c.get('userPlan') as string
  if (plan === 'free') return c.json({ error: 'CSV export requires Starter plan or above.' }, 403)

  const { from, to, type } = c.req.query()
  if (!from || !to) return c.json({ error: 'from and to required' }, 400)

  let sql = `SELECT t.date, t.description, cat.name as category, acc.name as account,
                    t.amount, t.type, t.reconciled, t.notes
             FROM transactions t
             LEFT JOIN categories cat ON t.category_id=cat.id
             LEFT JOIN accounts   acc ON t.account_id=acc.id
             WHERE t.user_id=? AND t.date BETWEEN ? AND ? AND t.deleted_at IS NULL`
  const params: any[] = [userId, from, to]
  if (type) { sql += ' AND t.type=?'; params.push(type) }
  sql += ' ORDER BY t.date DESC, t.created_at DESC'

  const rows = await c.env.DB.prepare(sql).bind(...params).all()

  const header = 'Date,Description,Category,Account,Amount,Type,Reconciled,Notes\n'
  const lines  = (rows.results as any[]).map(r =>
    [r.date, `"${r.description}"`, r.category??'', r.account??'',
     r.amount, r.type, r.reconciled?'Yes':'No', `"${r.notes??''}"`].join(',')
  ).join('\n')

  c.env.ANALYTICS.writeDataPoint({ blobs:['export_csv'], doubles:[rows.results.length], indexes:[userId] })

  return new Response(header + lines, {
    headers: {
      'Content-Type':        'text/csv',
      'Content-Disposition': `attachment; filename="insighthunter-${from}-${to}.csv"`,
    }
  })
})

// ── Payroll Summary for Reports ────────────────────────────────
reportsRoutes.get('/payroll-summary', async c => {
  const userId = c.get('userId') as string
  const { from, to } = c.req.query()
  if (!from || !to) return c.json({ error: 'from and to required' }, 400)

  const rows = await c.env.DB.prepare(`
    SELECT SUM(total_gross) as gross, SUM(total_tax) as tax,
           SUM(total_net) as net, COUNT(*) as runs
    FROM payroll_runs
    WHERE user_id=? AND status='approved' AND pay_date BETWEEN ? AND ?
  `).bind(userId, from, to).first<any>()

  return c.json({
    period: { from, to },
    gross: rows?.gross ?? 0,
    tax:   rows?.tax   ?? 0,
    net:   rows?.net   ?? 0,
    runs:  rows?.runs  ?? 0,
  })
})
