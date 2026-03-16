// apps/insighthunter-bookkeeping/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getCookie } from 'hono/cookie'

export interface Env {
  DB: D1Database
  JWT_SECRET: string  // same secret as auth worker
}

// ── JWT verify (mirrors auth worker) ─────────────────────────
async function verifyJWT(token: string, secret: string): Promise<{ sub: string; email: string; plan: string } | null> {
  try {
    const enc = new TextEncoder()
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC',hash:'SHA-256' }, false, ['verify'])
    const sigBytes = Uint8Array.from(atob(parts[2].replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(`${parts[0]}.${parts[1]}`))
    if (!valid) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')))
    if (payload.exp < Math.floor(Date.now()/1000)) return null
    return payload as { sub: string; email: string; plan: string }
  } catch { return null }
}

// ── Auth middleware ───────────────────────────────────────────
async function requireAuth(c: any): Promise<{ sub: string; email: string; plan: string } | Response> {
  const token = getCookie(c, 'ih_token') ?? c.req.header('Authorization')?.replace('Bearer ','')
  if (!token) return c.json({ error: 'Unauthenticated' }, 401)
  const user = await verifyJWT(token, c.env.JWT_SECRET)
  if (!user) return c.json({ error: 'Invalid or expired session.' }, 401)
  return user
}

function uuid() { return crypto.randomUUID() }

// ── CSV Parser ────────────────────────────────────────────────
function parseCSV(raw: string): Array<Record<string, string>> {
  const lines = raw.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,'').toLowerCase())
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g,''))
    return Object.fromEntries(headers.map((h,i) => [h, vals[i] ?? '']))
  })
}

function detectAmount(row: Record<string, string>): number {
  // Handle common CSV formats: amount, debit/credit, withdrawal/deposit
  if (row.amount)    return parseFloat(row.amount.replace(/[$,]/g,'')) || 0
  if (row.debit && row.credit) {
    const d = parseFloat(row.debit.replace(/[$,]/g,''))  || 0
    const c = parseFloat(row.credit.replace(/[$,]/g,'')) || 0
    return c - d
  }
  if (row.withdrawal && row.deposit) {
    const w = parseFloat(row.withdrawal.replace(/[$,]/g,'')) || 0
    const d = parseFloat(row.deposit.replace(/[$,]/g,''))    || 0
    return d - w
  }
  return 0
}

function autoCategory(desc: string): string {
  const d = desc.toLowerCase()
  if (/aws|cloudflare|vercel|heroku|digitalocean|hosting|server/.test(d)) return 'Software & Infrastructure'
  if (/paypal|stripe|square|venmo|client|invoice|payment/.test(d))        return 'Revenue'
  if (/amazon|office|supply|supplies|staples/.test(d))                    return 'Office Supplies'
  if (/google|facebook|meta|ads|marketing|advertising/.test(d))           return 'Marketing & Advertising'
  if (/insurance|policy/.test(d))                                          return 'Insurance'
  if (/restaurant|food|lunch|coffee|starbucks/.test(d))                   return 'Meals & Entertainment'
  if (/uber|lyft|gas|fuel|parking|travel|airline|hotel/.test(d))          return 'Travel & Transport'
  if (/phone|verizon|att|t-mobile|sprint/.test(d))                        return 'Phone & Communications'
  if (/payroll|salary|wage|contractor/.test(d))                           return 'Payroll & Contractors'
  if (/rent|lease|cowork|wework/.test(d))                                  return 'Rent & Office'
  return ''
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: o => o?.includes('insighthunter.app') || o?.includes('localhost') ? o : null,
  credentials: true, allowMethods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowHeaders: ['Content-Type','Authorization'],
}))

// ── GET /bookkeeping/summary ──────────────────────────────────
app.get('/bookkeeping/summary', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user

  const [income, expenses, uncat] = await Promise.all([
    c.env.DB.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions
      WHERE user_id=? AND amount>0 AND strftime('%Y',date)=strftime('%Y','now')`).bind(user.sub).first<{total:number}>(),
    c.env.DB.prepare(`SELECT COALESCE(SUM(ABS(amount)),0) as total FROM transactions
      WHERE user_id=? AND amount<0 AND strftime('%Y',date)=strftime('%Y','now')`).bind(user.sub).first<{total:number}>(),
    c.env.DB.prepare(`SELECT COUNT(*) as n FROM transactions
      WHERE user_id=? AND (category IS NULL OR category='')`).bind(user.sub).first<{n:number}>(),
  ])

  // Monthly averages for runway calc
  const monthly = await c.env.DB.prepare(`
    SELECT strftime('%Y-%m', date) as month, SUM(CASE WHEN amount<0 THEN ABS(amount) ELSE 0 END) as expenses
    FROM transactions WHERE user_id=?
    GROUP BY month ORDER BY month DESC LIMIT 6`).bind(user.sub).all<{month:string;expenses:number}>()

  const avg = monthly.results?.length
    ? monthly.results.reduce((s, r) => s + (r.expenses||0), 0) / monthly.results.length : 0

  return c.json({ summary: {
    total_income:           Math.round((income?.total ?? 0) * 100) / 100,
    total_expenses:         Math.round((expenses?.total ?? 0) * 100) / 100,
    uncategorized:          uncat?.n ?? 0,
    avg_monthly_expenses:   Math.round(avg * 100) / 100,
    open_invoices:          0,  // placeholder until Invoice module
    cash_balance:           0,  // placeholder until bank connect
  }})
})

// ── GET /bookkeeping/transactions ─────────────────────────────
app.get('/bookkeeping/transactions', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user

  const limit  = Math.min(parseInt(c.req.query('limit')  ?? '20'), 100)
  const offset = parseInt(c.req.query('offset') ?? '0')
  const type   = c.req.query('type')  // income | expense
  const uncat  = c.req.query('uncategorized')

  let where = 'WHERE user_id=?'
  const binds: unknown[] = [user.sub]
  if (type === 'income')  { where += ' AND amount>0' }
  if (type === 'expense') { where += ' AND amount<0' }
  if (uncat === '1')      { where += " AND (category IS NULL OR category='')" }

  const [rows, count] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM transactions ${where} ORDER BY date DESC LIMIT ? OFFSET ?`)
      .bind(...binds, limit, offset).all<{id:string;date:string;description:string;amount:number;category:string}>(),
    c.env.DB.prepare(`SELECT COUNT(*) as n FROM transactions ${where}`).bind(...binds).first<{n:number}>(),
  ])

  return c.json({ transactions: rows.results ?? [], total: count?.n ?? 0 })
})

// ── POST /bookkeeping/transactions ────────────────────────────
app.post('/bookkeeping/transactions', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user

  const body = await c.req.json<{date:string;description:string;amount:number;category?:string}>()
  if (!body.date || !body.description || body.amount === undefined)
    return c.json({ error: 'date, description, and amount are required.' }, 400)

  const cat = body.category || autoCategory(body.description)
  const id  = uuid()
  await c.env.DB.prepare(
    'INSERT INTO transactions (id,user_id,date,description,amount,category) VALUES (?,?,?,?,?,?)'
  ).bind(id, user.sub, body.date, body.description, body.amount, cat).run()

  return c.json({ success: true, id, category: cat }, 201)
})

// ── PUT /bookkeeping/transactions/:id ─────────────────────────
app.put('/bookkeeping/transactions/:id', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user

  const { category, description } = await c.req.json<{category?:string;description?:string}>()
  const id = c.req.param('id')
  await c.env.DB.prepare(
    'UPDATE transactions SET category=COALESCE(?,category), description=COALESCE(?,description) WHERE id=? AND user_id=?'
  ).bind(category??null, description??null, id, user.sub).run()

  return c.json({ success: true })
})

// ── POST /bookkeeping/transactions/import ─────────────────────
app.post('/bookkeeping/transactions/import', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user

  const { csv } = await c.req.json<{ csv: string }>()
  if (!csv) return c.json({ error: 'csv field is required.' }, 400)

  const rows = parseCSV(csv)
  if (!rows.length) return c.json({ error: 'No parseable rows found in CSV.' }, 400)

  let imported = 0
  const stmt = c.env.DB.prepare(
    'INSERT OR IGNORE INTO transactions (id,user_id,date,description,amount,category) VALUES (?,?,?,?,?,?)'
  )

  // Batch in groups of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i+50).map(row => {
      const date = row.date || row.transaction_date || row.posted_date || new Date().toISOString().slice(0,10)
      const desc = row.description || row.memo || row.name || 'Import'
      const amt  = detectAmount(row)
      const cat  = autoCategory(desc)
      return stmt.bind(uuid(), user.sub, date, desc, amt, cat)
    })
    const results = await c.env.DB.batch(batch)
    imported += results.filter(r => r.success && r.meta?.changes > 0).length
  }

  return c.json({ success: true, imported, total_rows: rows.length })
})

// ── GET /bookkeeping/categories ───────────────────────────────
app.get('/bookkeeping/categories', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user

  const rows = await c.env.DB.prepare(
    `SELECT category, COUNT(*) as count, SUM(amount) as total
     FROM transactions WHERE user_id=? AND category!=''
     GROUP BY category ORDER BY count DESC`
  ).bind(user.sub).all()

  return c.json({ categories: rows.results ?? [] })
})

export default app
