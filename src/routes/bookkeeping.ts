import { Hono } from 'hono'
import type { Env } from '../index'
import { requireAuth } from '../middleware/auth'

export const bookkeepingRoutes = new Hono<{ Bindings: Env }>()
bookkeepingRoutes.use('*', requireAuth)

// Summary — income, expense, net, by_category for a date range
bookkeepingRoutes.get('/summary', async c => {
  const userId = c.get('userId') as string
  const { from, to } = c.req.query()
  if (!from || !to) return c.json({ error: 'from and to required' }, 400)

  const rows = await c.env.DB.prepare(`
    SELECT t.type, SUM(t.amount) as total,
           cat.name as category_name, cat.color as category_color, cat.id as category_id
    FROM transactions t
    LEFT JOIN categories cat ON t.category_id = cat.id
    WHERE t.user_id=? AND t.date BETWEEN ? AND ? AND t.deleted_at IS NULL
    GROUP BY t.type, t.category_id
  `).bind(userId, from, to).all()

  const income  = rows.results.filter((r:any)=>r.type==='income').reduce((s:number,r:any)=>s+(+r.total),0)
  const expense = rows.results.filter((r:any)=>r.type==='expense').reduce((s:number,r:any)=>s+(+r.total),0)
  const by_category = rows.results.map((r:any)=>({
    type:r.type, total:+r.total, name:r.category_name, color:r.category_color, id:r.category_id
  }))
  return c.json({ income, expense, net: income-expense, by_category })
})

// Transactions list with pagination + filters
bookkeepingRoutes.get('/transactions', async c => {
  const userId = c.get('userId') as string
  const { limit='50', offset='0', from, to, type, account_id, category_id, q } = c.req.query()

  let sql = `SELECT t.*, cat.name as category_name, cat.color as category_color,
                    acc.name as account_name
             FROM transactions t
             LEFT JOIN categories cat ON t.category_id=cat.id
             LEFT JOIN accounts acc   ON t.account_id=acc.id
             WHERE t.user_id=? AND t.deleted_at IS NULL`
  const params: any[] = [userId]
  if (from)        { sql += ' AND t.date >= ?';          params.push(from) }
  if (to)          { sql += ' AND t.date <= ?';          params.push(to) }
  if (type)        { sql += ' AND t.type = ?';           params.push(type) }
  if (account_id)  { sql += ' AND t.account_id = ?';     params.push(account_id) }
  if (category_id) { sql += ' AND t.category_id = ?';    params.push(category_id) }
  if (q)           { sql += ' AND t.description LIKE ?'; params.push('%'+q+'%') }

  const countSql = sql.replace(/SELECT t\.\*.*?FROM/, 'SELECT COUNT(*) as n FROM')
  const [data, count] = await Promise.all([
    c.env.DB.prepare(sql + ` ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`)
      .bind(...params, +limit, +offset).all(),
    c.env.DB.prepare(countSql).bind(...params).first<{n:number}>()
  ])
  return c.json({ transactions: data.results, total: count?.n ?? 0 })
})

// 12-month trend — income and expense by month
bookkeepingRoutes.get('/trend', async c => {
  const userId = c.get('userId') as string
  const rows = await c.env.DB.prepare(`
    SELECT strftime('%Y-%m', date) as month, type, SUM(amount) as total
    FROM transactions
    WHERE user_id=? AND deleted_at IS NULL
      AND date >= date('now','-12 months')
    GROUP BY month, type
    ORDER BY month
  `).bind(userId).all()
  return c.json({ trend: rows.results })
})

// Accounts list
bookkeepingRoutes.get('/accounts', async c => {
  const userId = c.get('userId') as string
  const rows = await c.env.DB.prepare(
    `SELECT * FROM accounts WHERE user_id=? AND deleted_at IS NULL ORDER BY name`
  ).bind(userId).all()
  return c.json({ accounts: rows.results })
})

// Create transaction
bookkeepingRoutes.post('/transactions', async c => {
  const userId = c.get('userId') as string
  const body   = await c.req.json<any>()
  const { description, amount, type, date, account_id, category_id, notes, reconciled } = body
  if (!description || !amount || !type || !date)
    return c.json({ error: 'description, amount, type, date required' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO transactions (id,user_id,description,amount,type,date,account_id,category_id,notes,reconciled,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).bind(id, userId, description, +amount, type, date, account_id??null, category_id??null, notes??null, reconciled?1:0, new Date().toISOString()).run()
  c.env.ANALYTICS.writeDataPoint({ blobs:['tx_created',type], doubles:[+amount], indexes:[userId] })
  return c.json({ id }, 201)
})

// Update transaction
bookkeepingRoutes.patch('/transactions/:id', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  const body   = await c.req.json<any>()
  const fields = ['description','amount','type','date','account_id','category_id','notes','reconciled']
    .filter(k => body[k] !== undefined)
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400)
  const sets   = fields.map(f=>`${f}=?`).join(',')
  const vals   = fields.map(f=>f==='reconciled'?(body[f]?1:0):body[f])
  await c.env.DB.prepare(
    `UPDATE transactions SET ${sets},updated_at=? WHERE id=? AND user_id=? AND deleted_at IS NULL`
  ).bind(...vals, new Date().toISOString(), id, userId).run()
  return c.json({ ok: true })
})

// Soft-delete transaction
bookkeepingRoutes.delete('/transactions/:id', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  await c.env.DB.prepare(
    `UPDATE transactions SET deleted_at=? WHERE id=? AND user_id=?`
  ).bind(new Date().toISOString(), id, userId).run()
  return c.json({ ok: true })
})
