// apps/insighthunter-payroll/src/index.ts
// Payroll Worker — gross-to-net calculations, pay runs, stubs
// Tax tables: 2026 IRS Publication 15-T (Percentage Method)
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getCookie } from 'hono/cookie'

export interface Env {
  DB:         D1Database
  KV:         KVNamespace
  JWT_SECRET: string
  STRIPE_KEY: string      // for ACH payouts (future)
}

// ─── Auth helper ─────────────────────────────────────────────
async function requireAuth(c: any) {
  const token = getCookie(c,'ih_token') ?? c.req.header('Authorization')?.replace('Bearer ','')
  if (!token) return c.json({ error:'Unauthenticated' }, 401)
  try {
    const enc = new TextEncoder()
    const parts = token.split('.')
    const key = await crypto.subtle.importKey('raw', enc.encode(c.env.JWT_SECRET),
      { name:'HMAC', hash:'SHA-256' }, false, ['verify'])
    const sig = Uint8Array.from(atob(parts[2].replace(/-/g,'+').replace(/_/g,'/')), ch => ch.charCodeAt(0))
    const ok  = await crypto.subtle.verify('HMAC', key, sig, enc.encode(`${parts[0]}.${parts[1]}`))
    if (!ok) return c.json({ error:'Invalid session' }, 401)
    const p = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')))
    if (p.exp < Date.now()/1000) return c.json({ error:'Session expired' }, 401)
    return p as { sub:string; email:string; plan:string }
  } catch { return c.json({ error:'Invalid session' }, 401) }
}

// ─── 2026 Federal Tax Tables (Percentage Method) ─────────────
// Source: IRS Publication 15-T — projected from 2025 with ~2.6% inflation adj.
// Per-payroll standard withholding amounts by filing status:
const STANDARD_WITHHOLDING = {
  single:          346.15,  // $9,000 / 26 pays (bi-weekly)
  married_jointly: 692.31,
  head_household:  519.23,
}

// Percentage method brackets — Single (Table for Bi-Weekly payroll)
// [over, not_over, flat, percent, over_amount]
type Bracket = [number, number | null, number, number, number]
const TAX_BRACKETS_BIWEEKLY: Record<string,Bracket[]> = {
  single: [
    [0,    288,    0,     0,    0],
    [288,  1015,   0,    10,  288],
    [1015, 3260,   72.7, 12, 1015],
    [3260, 6260,  342.1, 22, 3260],
    [6260, 11548, 1002.1,24, 6260],
    [11548,23196, 2271.3,32,11548],
    [23196,28808, 5998.9,35,23196],
    [28808,null,  7963.1,37,28808],
  ],
  married_jointly: [
    [0,    1092,   0,     0,     0],
    [1092, 2085,   0,    10,  1092],
    [2085, 6573,   99.3, 12,  2085],
    [6573, 12573,  637.9,22,  6573],
    [12573,23148, 1957.9,24, 12573],
    [23148,46392, 4495.9,32, 23148],
    [46392,57615,11934.9,35, 46392],
    [57615,null, 15856.9,37, 57615],
  ],
}
// Use single brackets for all other statuses as conservative estimate
TAX_BRACKETS_BIWEEKLY['head_household'] = TAX_BRACKETS_BIWEEKLY['single']
TAX_BRACKETS_BIWEEKLY['single_higher']  = TAX_BRACKETS_BIWEEKLY['single']

// ─── Tax calculation engine ───────────────────────────────────
function calcFederalWithholding(
  grossBiweekly: number,
  filingStatus: string,
  allowances: number,    // W-4 (legacy) or 0 for new W-4
  additionalWithholding = 0
): number {
  const sw = STANDARD_WITHHOLDING[filingStatus as keyof typeof STANDARD_WITHHOLDING]
             ?? STANDARD_WITHHOLDING.single
  const taxable = Math.max(0, grossBiweekly - sw - (allowances * 175))
  const brackets = TAX_BRACKETS_BIWEEKLY[filingStatus] ?? TAX_BRACKETS_BIWEEKLY['single']
  let tax = 0
  for (const [over, notOver, flat, pct, overAmt] of brackets) {
    if (taxable <= over) break
    const top = notOver === null ? taxable : Math.min(taxable, notOver)
    tax = flat + (top - overAmt) * (pct / 100)
    if (notOver === null || taxable <= notOver) break
  }
  return Math.max(0, tax + additionalWithholding)
}

function calcFICA(grossBiweekly: number, ytdGross: number): {
  ss_employee: number; ss_employer: number
  medicare_employee: number; medicare_employer: number
  additional_medicare: number
} {
  const SS_WAGE_BASE = 176700  // 2026 estimated
  const ssWages = Math.min(Math.max(0, SS_WAGE_BASE - ytdGross), grossBiweekly)
  return {
    ss_employee:         ssWages * 0.062,
    ss_employer:         ssWages * 0.062,
    medicare_employee:   grossBiweekly * 0.0145,
    medicare_employer:   grossBiweekly * 0.0145,
    additional_medicare: Math.max(0, grossBiweekly - 7692.31) * 0.009, // ~$200k/yr
  }
}

// Simplified state tax flat-rate table (2026 estimates)
const STATE_TAX_RATES: Record<string, number> = {
  AL:0.05,AK:0,AZ:0.025,AR:0.047,CA:0.093,CO:0.044,CT:0.065,DE:0.066,
  FL:0,GA:0.055,HI:0.08,ID:0.058,IL:0.0495,IN:0.0315,IA:0.06,KS:0.057,
  KY:0.045,LA:0.042,ME:0.075,MD:0.0575,MA:0.05,MI:0.0425,MN:0.0985,
  MS:0.05,MO:0.054,MT:0.069,NE:0.0664,NV:0,NH:0,NJ:0.1075,NM:0.059,
  NY:0.109,NC:0.0475,ND:0.029,OH:0.04,OK:0.05,OR:0.099,PA:0.0307,
  RI:0.0599,SC:0.064,SD:0,TN:0,TX:0,UT:0.0485,VT:0.0875,VA:0.0575,
  WA:0,WV:0.065,WI:0.0765,WY:0,DC:0.1075
}

function calcStateTax(grossBiweekly: number, stateCode: string): number {
  const rate = STATE_TAX_RATES[stateCode.toUpperCase()] ?? 0.05
  return grossBiweekly * rate
}

function calcDeductions(grossBiweekly: number, deductions: Deduction[]): number {
  return deductions.reduce((sum, d) => {
    if (d.type === 'flat')       return sum + d.amount
    if (d.type === 'percent')    return sum + (grossBiweekly * d.amount / 100)
    return sum
  }, 0)
}

interface Deduction { name:string; type:'flat'|'percent'; amount:number; pre_tax:boolean }

function grossToNet(params: {
  gross_pay:    number
  filing_status: string
  allowances:   number
  additional_withholding: number
  state_code:   string
  ytd_gross:    number
  deductions:   Deduction[]
}) {
  const { gross_pay, filing_status, allowances, additional_withholding,
    state_code, ytd_gross, deductions } = params

  const preTaxDeds  = deductions.filter(d => d.pre_tax)
  const postTaxDeds = deductions.filter(d => !d.pre_tax)
  const preTaxAmt   = calcDeductions(gross_pay, preTaxDeds)
  const taxableWage = gross_pay - preTaxAmt

  const federalWH   = calcFederalWithholding(taxableWage, filing_status, allowances, additional_withholding)
  const fica        = calcFICA(taxableWage, ytd_gross)
  const stateWH     = calcStateTax(taxableWage, state_code)
  const postTaxAmt  = calcDeductions(gross_pay, postTaxDeds)

  const totalTax = federalWH + fica.ss_employee + fica.medicare_employee
                 + fica.additional_medicare + stateWH
  const netPay   = gross_pay - preTaxAmt - totalTax - postTaxAmt

  return {
    gross_pay,
    pre_tax_deductions: preTaxAmt,
    taxable_wages: taxableWage,
    federal_income_tax: +federalWH.toFixed(2),
    social_security:    +fica.ss_employee.toFixed(2),
    medicare:           +(fica.medicare_employee + fica.additional_medicare).toFixed(2),
    state_income_tax:   +stateWH.toFixed(2),
    total_taxes:        +totalTax.toFixed(2),
    post_tax_deductions: +postTaxAmt.toFixed(2),
    net_pay:            +Math.max(0, netPay).toFixed(2),
    employer_ss:        +fica.ss_employer.toFixed(2),
    employer_medicare:  +fica.medicare_employer.toFixed(2),
    total_employer_cost:+(gross_pay + fica.ss_employer + fica.medicare_employer).toFixed(2),
  }
}

// ─── App ──────────────────────────────────────────────────────
const app = new Hono<{ Bindings: Env }>()
app.use('*', cors({ origin: o => o?.includes('insighthunter.app')||o?.includes('localhost') ? o : null, credentials:true }))

// ─── Employees ───────────────────────────────────────────────
app.get('/payroll/employees', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM payroll_employees WHERE user_id=? AND active=1 ORDER BY last_name')
    .bind(user.sub).all()
  return c.json({ employees: results })
})

app.post('/payroll/employees', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const body = await c.req.json<{
    first_name:string; last_name:string; email:string
    employment_type:'w2'|'1099'; pay_type:'salary'|'hourly'
    pay_rate:number; filing_status:string; allowances:number
    additional_withholding:number; state_code:string
    deductions?: Deduction[]
  }>()
  const id = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO payroll_employees
      (id,user_id,first_name,last_name,email,employment_type,pay_type,pay_rate,
       filing_status,allowances,additional_withholding,state_code,deductions,active,hired_at,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1,date('now'),datetime('now'))`)
    .bind(id,user.sub,body.first_name,body.last_name,body.email,body.employment_type,
      body.pay_type,body.pay_rate,body.filing_status??'single',body.allowances??0,
      body.additional_withholding??0,body.state_code??'GA',
      JSON.stringify(body.deductions??[]))
    .run()
  return c.json({ success:true, id })
})

app.put('/payroll/employees/:id', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const body = await c.req.json<Record<string,unknown>>()
  const allowed = ['first_name','last_name','email','pay_rate','filing_status',
    'allowances','additional_withholding','state_code','deductions','active']
  const sets = Object.keys(body).filter(k => allowed.includes(k))
    .map(k => `${k}=?`).join(',')
  if (!sets) return c.json({ error:'No valid fields' }, 400)
  const vals = Object.keys(body).filter(k => allowed.includes(k))
    .map(k => k==='deductions' ? JSON.stringify(body[k]) : body[k])
  await c.env.DB.prepare(`UPDATE payroll_employees SET ${sets},updated_at=datetime('now') WHERE id=? AND user_id=?`)
    .bind(...vals, c.req.param('id'), user.sub).run()
  return c.json({ success:true })
})

app.delete('/payroll/employees/:id', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  await c.env.DB.prepare("UPDATE payroll_employees SET active=0 WHERE id=? AND user_id=?")
    .bind(c.req.param('id'), user.sub).run()
  return c.json({ success:true })
})

// ─── Pay stub calculator (preview) ───────────────────────────
app.post('/payroll/calculate', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const { employee_id, gross_pay, override_gross } =
    await c.req.json<{ employee_id:string; gross_pay?:number; override_gross?:number }>()

  const emp = await c.env.DB.prepare(
    'SELECT * FROM payroll_employees WHERE id=? AND user_id=?')
    .bind(employee_id, user.sub)
    .first<{pay_rate:number;pay_type:string;filing_status:string;allowances:number;
      additional_withholding:number;state_code:string;deductions:string;employment_type:string}>()
  if (!emp) return c.json({ error:'Employee not found' }, 404)

  const ytdRow = await c.env.DB.prepare(
    "SELECT COALESCE(SUM(gross_pay),0) as ytd FROM payroll_stubs WHERE employee_id=? AND strftime('%Y',pay_date)=strftime('%Y',date('now'))")
    .bind(employee_id).first<{ ytd:number }>()

  const grossBiweekly = override_gross ?? gross_pay ?? (emp.pay_type==='salary' ? emp.pay_rate/26 : emp.pay_rate*80)
  const deductions: Deduction[] = JSON.parse(emp.deductions || '[]')
  const result = grossToNet({
    gross_pay:   grossBiweekly,
    filing_status: emp.filing_status,
    allowances:  emp.allowances,
    additional_withholding: emp.additional_withholding,
    state_code:  emp.state_code,
    ytd_gross:   ytdRow?.ytd ?? 0,
    deductions,
  })

  return c.json({ stub: result, employee_type: emp.employment_type })
})

// ─── Pay Runs ─────────────────────────────────────────────────
app.get('/payroll/runs', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM payroll_runs WHERE user_id=? ORDER BY pay_date DESC LIMIT 20')
    .bind(user.sub).all()
  return c.json({ runs: results })
})

app.post('/payroll/runs', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const { pay_date, pay_period_start, pay_period_end, employees: empOverrides = [] } =
    await c.req.json<{
      pay_date:string; pay_period_start:string; pay_period_end:string
      employees?: Array<{ id:string; gross_pay:number }>
    }>()

  const { results: emps } = await c.env.DB.prepare(
    'SELECT * FROM payroll_employees WHERE user_id=? AND active=1')
    .bind(user.sub).all<{id:string;first_name:string;last_name:string;pay_type:string;
      pay_rate:number;filing_status:string;allowances:number;additional_withholding:number;
      state_code:string;deductions:string;employment_type:string}>()

  if (!emps.length) return c.json({ error:'No active employees.' }, 400)

  const runId = crypto.randomUUID()
  const stubs = []
  let totalGross = 0, totalNet = 0, totalTax = 0

  for (const emp of emps) {
    const override = empOverrides.find(e => e.id === emp.id)
    const ytdRow = await c.env.DB.prepare(
      "SELECT COALESCE(SUM(gross_pay),0) as ytd FROM payroll_stubs WHERE employee_id=? AND strftime('%Y',pay_date)=?")
      .bind(emp.id, pay_date.slice(0,4)).first<{ ytd:number }>()
    const gross = override?.gross_pay ?? (emp.pay_type==='salary' ? emp.pay_rate/26 : emp.pay_rate*80)
    const deductions: Deduction[] = JSON.parse(emp.deductions||'[]')
    const calc = grossToNet({
      gross_pay:gross, filing_status:emp.filing_status,
      allowances:emp.allowances, additional_withholding:emp.additional_withholding,
      state_code:emp.state_code, ytd_gross:ytdRow?.ytd??0, deductions,
    })
    const stubId = crypto.randomUUID()
    stubs.push({ ...calc, employee_id:emp.id, stub_id:stubId, name:`${emp.first_name} ${emp.last_name}` })
    totalGross += gross
    totalNet   += calc.net_pay
    totalTax   += calc.total_taxes

    await c.env.DB.prepare(`
      INSERT INTO payroll_stubs
        (id,run_id,employee_id,pay_date,gross_pay,federal_tax,ss_tax,medicare_tax,
         state_tax,total_taxes,pre_tax_deductions,post_tax_deductions,net_pay,
         employer_ss,employer_medicare,calc_detail,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`)
      .bind(stubId,runId,emp.id,pay_date,gross,calc.federal_income_tax,calc.social_security,
        calc.medicare,calc.state_income_tax,calc.total_taxes,calc.pre_tax_deductions,
        calc.post_tax_deductions,calc.net_pay,calc.employer_ss,calc.employer_medicare,
        JSON.stringify(calc))
      .run()
  }

  await c.env.DB.prepare(`
    INSERT INTO payroll_runs
      (id,user_id,pay_date,pay_period_start,pay_period_end,employee_count,
       total_gross,total_net,total_taxes,status,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,'draft',datetime('now'))`)
    .bind(runId,user.sub,pay_date,pay_period_start,pay_period_end,
      emps.length,+totalGross.toFixed(2),+totalNet.toFixed(2),+totalTax.toFixed(2))
    .run()

  return c.json({ run_id:runId, stubs, summary:{ total_gross:+totalGross.toFixed(2),
    total_net:+totalNet.toFixed(2), total_taxes:+totalTax.toFixed(2), employee_count:emps.length }})
})

// Approve a pay run (changes status from draft → approved)
app.post('/payroll/runs/:id/approve', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  await c.env.DB.prepare(
    "UPDATE payroll_runs SET status='approved',approved_at=datetime('now') WHERE id=? AND user_id=?")
    .bind(c.req.param('id'), user.sub).run()
  return c.json({ success:true })
})

// GET stubs for a run
app.get('/payroll/runs/:id/stubs', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const run = await c.env.DB.prepare('SELECT id FROM payroll_runs WHERE id=? AND user_id=?')
    .bind(c.req.param('id'), user.sub).first()
  if (!run) return c.json({ error:'Run not found' }, 404)
  const { results } = await c.env.DB.prepare(
    `SELECT s.*,e.first_name,e.last_name,e.employment_type
     FROM payroll_stubs s
     JOIN payroll_employees e ON e.id=s.employee_id
     WHERE s.run_id=?`)
    .bind(c.req.param('id')).all()
  return c.json({ stubs: results })
})

// ─── YTD Summary ──────────────────────────────────────────────
app.get('/payroll/ytd', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  const year = c.req.query('year') ?? new Date().getFullYear().toString()
  const row = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(r.total_gross),0) as gross,
           COALESCE(SUM(r.total_net),0) as net,
           COALESCE(SUM(r.total_taxes),0) as taxes,
           COUNT(*) as runs
    FROM payroll_runs r
    WHERE r.user_id=? AND strftime('%Y',r.pay_date)=? AND r.status='approved'`)
    .bind(user.sub, year).first()
  return c.json({ ytd: row, year })
})

export default app
