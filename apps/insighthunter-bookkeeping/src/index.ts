// apps/insighthunter-bookkeeping/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getCookie } from 'hono/cookie'

export interface Env {
  DB:         D1Database
  KV:         KVNamespace
  JWT_SECRET: string
}

// ─── Auth ─────────────────────────────────────────────────────
async function requireAuth(c: any) {
  const token = getCookie(c,'ih_token') ?? c.req.header('Authorization')?.replace('Bearer ','')
  if (!token) return c.json({ error:'Unauthenticated' }, 401)
  try {
    const enc   = new TextEncoder()
    const parts = token.split('.')
    const key   = await crypto.subtle.importKey('raw', enc.encode(c.env.JWT_SECRET),
      { name:'HMAC', hash:'SHA-256' }, false, ['verify'])
    const sig   = Uint8Array.from(atob(parts[2].replace(/-/g,'+').replace(/_/g,'/')), ch => ch.charCodeAt(0))
    const ok    = await crypto.subtle.verify('HMAC', key, sig, enc.encode(`${parts[0]}.${parts[1]}`))
    if (!ok) return c.json({ error:'Invalid session' }, 401)
    const p = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')))
    if (p.exp < Date.now()/1000) return c.json({ error:'Session expired' }, 401)
    return p as { sub:string; email:string; plan:string }
  } catch { return c.json({ error:'Invalid session' }, 401) }
}

const app = new Hono<{ Bindings: Env }>()
app.use('*', cors({ origin: o => o?.includes('insighthunter.app')||o?.includes('localhost') ? o : null, credentials:true }))

// ─── Seed default categories for new users ────────────────────
async function seedCategories(db: D1Database, userId: string) {
  const defaults = [
    // Income
    { name:'Revenue',          type:'income',  color:'#10B981' },
    { name:'Consulting',       type:'income',  color:'#3B82F6' },
    { name:'Refunds Received', type:'income',  color:'#8B5CF6' },
    { name:'Other Income',     type:'income',  color:'#6366F1' },
    // Expense
    { name:'Payroll',          type:'expense', color:'#EF4444' },
    { name:'Rent & Utilities', type:'expense', color:'#F59E0B' },
    { name:'Software & Tools', type:'expense', color:'#EC4899' },
    { name:'Marketing',        type:'expense', color:'#14B8A6' },
    { name:'Office Supplies',  type:'expense', color:'#F97316' },
    { name:'Travel',           type:'expense', color:'#84CC16' },
    { name:'Professional Fees',type:'expense', color:'#A78BFA' },
    { name:'Taxes & Licenses', type:'expense', color:'#FB7185' },
    { name:'Bank Fees',        type:'expense', color:'#94A3B8' },
    { name:'Other Expense',    type:'expense', color:'#64748B' },
  ]
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO bk_categories (id,user_id,name,type,color,created_at)
     VALUES (?,?,?,?,?,datetime('now'))`)
  for (const d of defaults) {
    await stmt.bind(crypto.randomUUID(), userId, d.name, d.type, d.color).run()
  }
}

// ─── Accounts ─────────────────────────────────────────────────
app.get('/bookkeeping/accounts', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM bk_accounts WHERE user_id=? ORDER BY type,name')
    .bind(user.sub).all()
  return c.json({ accounts: results })
})

app.post('/bookkeeping/accounts', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const { name, type, opening_balance = 0, currency = 'USD', institution } =
    await c.req.json<{ name:string; type:string; opening_balance?:number; currency?:string; institution?:string }>()
  const id = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO bk_accounts (id,user_id,name,type,balance,opening_balance,currency,institution,created_at)
    VALUES (?,?,?,?,?,?,?,?,datetime('now'))`)
    .bind(id, user.sub, name, type, opening_balance, opening_balance, currency, institution||'').run()
  return c.json({ success:true, id })
})

app.put('/bookkeeping/accounts/:id', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const { name, institution } = await c.req.json<{ name?:string; institution?:string }>()
  await c.env.DB.prepare('UPDATE bk_accounts SET name=COALESCE(?,name),institution=COALESCE(?,institution) WHERE id=? AND user_id=?')
    .bind(name||null, institution||null, c.req.param('id'), user.sub).run()
  return c.json({ success:true })
})

app.delete('/bookkeeping/accounts/:id', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const txCount = await c.env.DB.prepare('SELECT COUNT(*) as n FROM bk_transactions WHERE account_id=? AND user_id=?')
    .bind(c.req.param('id'), user.sub).first<{ n:number }>()
  if ((txCount?.n ?? 0) > 0) return c.json({ error:'Cannot delete account with transactions.' }, 400)
  await c.env.DB.prepare('DELETE FROM bk_accounts WHERE id=? AND user_id=?')
    .bind(c.req.param('id'), user.sub).run()
  return c.json({ success:true })
})

// ─── Categories ───────────────────────────────────────────────
app.get('/bookkeeping/categories', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM bk_categories WHERE user_id=? ORDER BY type,name')
    .bind(user.sub).all()
  if (!results.length) {
    await seedCategories(c.env.DB, user.sub)
    const { results: seeded } = await c.env.DB.prepare(
      'SELECT * FROM bk_categories WHERE user_id=? ORDER BY type,name').bind(user.sub).all()
    return c.json({ categories: seeded })
  }
  return c.json({ categories: results })
})

app.post('/bookkeeping/categories', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const { name, type, color = '#94A3B8' } = await c.req.json<{ name:string; type:string; color?:string }>()
  const id = crypto.randomUUID()
  await c.env.DB.prepare(`INSERT INTO bk_categories (id,user_id,name,type,color,created_at) VALUES (?,?,?,?,?,datetime('now'))`)
    .bind(id, user.sub, name, type, color).run()
  return c.json({ success:true, id })
})

// ─── Transactions ─────────────────────────────────────────────
app.get('/bookkeeping/transactions', async (c) => {
  const user   = await requireAuth(c)
  if (user instanceof Response) return user
  const limit  = Math.min(+(c.req.query('limit') ?? 100), 500)
  const offset = +(c.req.query('offset') ?? 0)
  const from   = c.req.query('from')   // YYYY-MM-DD
  const to     = c.req.query('to')
  const cat    = c.req.query('category_id')
  const acct   = c.req.query('account_id')
  const type   = c.req.query('type')   // income | expense

  let sql    = `SELECT t.*, c.name as category_name, c.color as category_color,
                       a.name as account_name
                FROM bk_transactions t
                LEFT JOIN bk_categories c ON c.id = t.category_id
                LEFT JOIN bk_accounts   a ON a.id = t.account_id
                WHERE t.user_id=?`
  const params: (string|number)[] = [user.sub]

  if (from)  { sql += ' AND t.date >= ?'; params.push(from) }
  if (to)    { sql += ' AND t.date <= ?'; params.push(to)   }
  if (cat)   { sql += ' AND t.category_id = ?'; params.push(cat) }
  if (acct)  { sql += ' AND t.account_id = ?'; params.push(acct) }
  if (type)  { sql += ' AND t.type = ?'; params.push(type) }

  sql += ` ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`
  params.push(limit, offset)

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  const total = await c.env.DB.prepare(
    `SELECT COUNT(*) as n FROM bk_transactions WHERE user_id=?`).bind(user.sub).first<{n:number}>()
  return c.json({ transactions: results, total: total?.n ?? 0 })
})

app.post('/bookkeeping/transactions', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const body = await c.req.json<{
    date:string; description:string; amount:number; type:'income'|'expense'
    account_id:string; category_id?:string; notes?:string; reconciled?:boolean
  }>()

  if (!body.date || !body.description || !body.amount || !body.type || !body.account_id)
    return c.json({ error:'Missing required fields' }, 400)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO bk_transactions
      (id,user_id,account_id,category_id,date,description,amount,type,notes,reconciled,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`)
    .bind(id, user.sub, body.account_id, body.category_id||null,
      body.date, body.description, Math.abs(body.amount), body.type,
      body.notes||'', body.reconciled?1:0)
    .run()

  // Update account balance
  const delta = body.type === 'income' ? Math.abs(body.amount) : -Math.abs(body.amount)
  await c.env.DB.prepare('UPDATE bk_accounts SET balance=balance+? WHERE id=? AND user_id=?')
    .bind(delta, body.account_id, user.sub).run()

  return c.json({ success:true, id })
})

app.put('/bookkeeping/transactions/:id', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const body = await c.req.json<{
    date?:string; description?:string; amount?:number; type?:string
    category_id?:string; notes?:string; reconciled?:boolean
  }>()
  const old = await c.env.DB.prepare('SELECT * FROM bk_transactions WHERE id=? AND user_id=?')
    .bind(c.req.param('id'), user.sub).first<{amount:number;type:string;account_id:string}>()
  if (!old) return c.json({ error:'Not found' }, 404)

  // Reverse old balance effect
  const oldDelta = old.type === 'income' ? -old.amount : old.amount
  await c.env.DB.prepare('UPDATE bk_accounts SET balance=balance+? WHERE id=? AND user_id=?')
    .bind(oldDelta, old.account_id, user.sub).run()

  await c.env.DB.prepare(`
    UPDATE bk_transactions SET
      date=COALESCE(?,date), description=COALESCE(?,description),
      amount=COALESCE(?,amount), type=COALESCE(?,type),
      category_id=COALESCE(?,category_id), notes=COALESCE(?,notes),
      reconciled=COALESCE(?,reconciled)
    WHERE id=? AND user_id=?`)
    .bind(body.date||null, body.description||null,
      body.amount!=null ? Math.abs(body.amount) : null,
      body.type||null, body.category_id||null, body.notes||null,
      body.reconciled!=null ? (body.reconciled?1:0) : null,
      c.req.param('id'), user.sub).run()

  // Apply new balance effect
  const newAmt  = body.amount  != null ? Math.abs(body.amount)  : old.amount
  const newType = body.type    ?? old.type
  const newDelta = newType === 'income' ? newAmt : -newAmt
  await c.env.DB.prepare('UPDATE bk_accounts SET balance=balance+? WHERE id=? AND user_id=?')
    .bind(newDelta, old.account_id, user.sub).run()

  return c.json({ success:true })
})

app.delete('/bookkeeping/transactions/:id', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const tx = await c.env.DB.prepare('SELECT * FROM bk_transactions WHERE id=? AND user_id=?')
    .bind(c.req.param('id'), user.sub).first<{amount:number;type:string;account_id:string}>()
  if (!tx) return c.json({ error:'Not found' }, 404)
  const delta = tx.type === 'income' ? -tx.amount : tx.amount
  await c.env.DB.prepare('UPDATE bk_accounts SET balance=balance+? WHERE id=? AND user_id=?')
    .bind(delta, tx.account_id, user.sub).run()
  await c.env.DB.prepare('DELETE FROM bk_transactions WHERE id=? AND user_id=?')
    .bind(c.req.param('id'), user.sub).run()
  return c.json({ success:true })
})

// ─── P&L Summary ──────────────────────────────────────────────
app.get('/bookkeeping/summary', async (c) => {
  const user  = await requireAuth(c)
  if (user instanceof Response) return user
  const from  = c.req.query('from') ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const to    = c.req.query('to')   ?? new Date().toISOString().split('T')[0]

  const income = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) as total FROM bk_transactions WHERE user_id=? AND type='income' AND date BETWEEN ? AND ?`)
    .bind(user.sub, from, to).first<{total:number}>()

  const expense = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) as total FROM bk_transactions WHERE user_id=? AND type='expense' AND date BETWEEN ? AND ?`)
    .bind(user.sub, from, to).first<{total:number}>()

  const byCategory = await c.env.DB.prepare(
    `SELECT c.name, c.color, t.type, COALESCE(SUM(t.amount),0) as total
     FROM bk_transactions t
     LEFT JOIN bk_categories c ON c.id = t.category_id
     WHERE t.user_id=? AND t.date BETWEEN ? AND ?
     GROUP BY t.category_id, t.type ORDER BY total DESC`)
    .bind(user.sub, from, to).all()

  const totalIncome  = income?.total  ?? 0
  const totalExpense = expense?.total ?? 0

  return c.json({
    from, to,
    income:  +totalIncome.toFixed(2),
    expense: +totalExpense.toFixed(2),
    net:     +(totalIncome - totalExpense).toFixed(2),
    by_category: byCategory.results,
  })
})

// ─── Monthly trend (last 6 months) ────────────────────────────
app.get('/bookkeeping/trend', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const { results } = await c.env.DB.prepare(`
    SELECT strftime('%Y-%m', date) as month,
           type,
           COALESCE(SUM(amount),0) as total
    FROM bk_transactions
    WHERE user_id=?
      AND date >= date('now','-6 months')
    GROUP BY month, type
    ORDER BY month ASC`)
    .bind(user.sub).all()
  return c.json({ trend: results })
})

export default app
