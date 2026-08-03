// apps/insighthunter-insights — Financial KPI & Insights Worker
// Deployed at insights.insighthunter.app
// Auth: reads X-* identity headers from apps/gateway — no KV lookup here.

import { Hono } from 'hono';
import { cors } from 'hono/cors';

// ── Types ─────────────────────────────────────────────────────────────────────

type Env = {
  DB: D1Database;
  AUTH_URL: string;
  DASHBOARD_URL: string;
  ENVIRONMENT: string;
};

type Session = {
  userId:  string;
  orgId:   string;
  email:   string;
  name:    string;
  role:    string;
  orgName: string;
  orgSlug: string;
  orgPlan: string;
};

// ── Session helper ───────────────────────────────────────────────────────────

function getSession(req: Request): Session | null {
  const userId  = req.headers.get('X-User-Id');
  const orgId   = req.headers.get('X-Org-Id');
  const role    = req.headers.get('X-User-Role');
  const email   = req.headers.get('X-User-Email');
  if (!userId || !orgId || !role || !email) return null;
  return {
    userId,  orgId, role, email,
    name:    req.headers.get('X-User-Name')  ?? email,
    orgName: req.headers.get('X-Org-Name')   ?? 'My Org',
    orgSlug: req.headers.get('X-Org-Slug')   ?? '',
    orgPlan: req.headers.get('X-Org-Plan')   ?? 'starter',
  };
}

// ── KPI computation helpers ──────────────────────────────────────────────────
//
// All financial data lives in journal_lines → journal_entries → accounts.
// Account types: ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
//
// Core accounting identities used here:
//   Revenue   = SUM(credit) on REVENUE accounts
//   Expenses  = SUM(debit)  on EXPENSE accounts
//   Net Income = Revenue - Expenses
//   Cash      = SUM(debit - credit) on ASSET accounts with code LIKE '1%'

type KPIRow = { label: string; value: number; prev_value: number; unit: 'currency' | 'percent' | 'days'; trend: 'up' | 'down' | 'flat' };

async function getKPIs(db: D1Database, orgId: string): Promise<KPIRow[]> {
  // Current period: this calendar month
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]!;
  const prev  = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]!;

  const sql = `
    SELECT
      a.type AS account_type,
      SUM(jl.debit)  AS total_debit,
      SUM(jl.credit) AS total_credit
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id
    JOIN accounts a ON jl.account_id = a.id
    WHERE a.organization_id = ?1
      AND je.posted_at >= ?2
    GROUP BY a.type`;

  const [cur, prv] = await Promise.all([
    db.prepare(sql).bind(orgId, start).all<{ account_type: string; total_debit: number; total_credit: number }>(),
    db.prepare(sql).bind(orgId, prev).all<{ account_type: string; total_debit: number; total_credit: number }>(),
  ]);

  const agg = (rows: typeof cur.results, type: string) =>
    rows?.find(r => r.account_type === type) ?? { total_debit: 0, total_credit: 0 };

  const rev    = agg(cur.results, 'REVENUE');  const prevRev  = agg(prv.results, 'REVENUE');
  const exp    = agg(cur.results, 'EXPENSE');  const prevExp  = agg(prv.results, 'EXPENSE');
  const asset  = agg(cur.results, 'ASSET');

  const revenue   = rev.total_credit - rev.total_debit;
  const expenses  = exp.total_debit - exp.total_credit;
  const netIncome = revenue - expenses;
  const cash      = asset.total_debit - asset.total_credit;
  const burnRate  = expenses > 0 ? expenses : 0;
  const runway    = burnRate > 0 ? Math.round((cash / burnRate) * 30) : 999; // days

  const pRevenue  = prevRev.total_credit - prevRev.total_debit;
  const pExpenses = prevExp.total_debit - prevExp.total_credit;
  const pNet      = pRevenue - pExpenses;

  const trend = (cur: number, prv: number): 'up' | 'down' | 'flat' =>
    cur > prv * 1.01 ? 'up' : cur < prv * 0.99 ? 'down' : 'flat';

  return [
    { label: 'Revenue',       value: revenue,   prev_value: pRevenue,  unit: 'currency', trend: trend(revenue, pRevenue) },
    { label: 'Expenses',      value: expenses,  prev_value: pExpenses, unit: 'currency', trend: trend(expenses, pExpenses) },
    { label: 'Net Income',    value: netIncome, prev_value: pNet,      unit: 'currency', trend: trend(netIncome, pNet) },
    { label: 'Cash Balance',  value: cash,      prev_value: cash,      unit: 'currency', trend: 'flat' },
    { label: 'Monthly Burn',  value: burnRate,  prev_value: pExpenses, unit: 'currency', trend: trend(burnRate, pExpenses) },
    { label: 'Runway',        value: runway,    prev_value: runway,    unit: 'days',     trend: 'flat' },
  ];
}

async function getCashFlow(db: D1Database, orgId: string): Promise<{ month: string; inflow: number; outflow: number; net: number }[]> {
  const rows = await db.prepare(`
    SELECT
      strftime('%Y-%m', je.posted_at) AS month,
      SUM(CASE WHEN a.type = 'REVENUE' THEN jl.credit - jl.debit ELSE 0 END) AS inflow,
      SUM(CASE WHEN a.type = 'EXPENSE' THEN jl.debit - jl.credit ELSE 0 END) AS outflow
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id
    JOIN accounts a ON jl.account_id = a.id
    WHERE a.organization_id = ?1
      AND je.posted_at >= date('now', '-12 months')
    GROUP BY month
    ORDER BY month ASC`)
    .bind(orgId)
    .all<{ month: string; inflow: number; outflow: number }>();

  return (rows.results ?? []).map(r => ({
    month:   r.month,
    inflow:  r.inflow  ?? 0,
    outflow: r.outflow ?? 0,
    net:     (r.inflow ?? 0) - (r.outflow ?? 0),
  }));
}

async function getPnL(
  db: D1Database,
  orgId: string,
  from: string,
  to: string,
): Promise<{ account: string; type: string; debit: number; credit: number; net: number }[]> {
  const rows = await db.prepare(`
    SELECT
      a.name  AS account,
      a.type  AS type,
      a.code  AS code,
      SUM(jl.debit)  AS debit,
      SUM(jl.credit) AS credit
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id
    JOIN accounts a ON jl.account_id = a.id
    WHERE a.organization_id = ?1
      AND a.type IN ('REVENUE','EXPENSE')
      AND je.posted_at BETWEEN ?2 AND ?3
      AND a.archived = 0
    GROUP BY a.id
    ORDER BY a.type, a.code`)
    .bind(orgId, from, to)
    .all<{ account: string; type: string; code: string; debit: number; credit: number }>();

  return (rows.results ?? []).map(r => ({
    account: r.account,
    type:    r.type,
    debit:   r.debit  ?? 0,
    credit:  r.credit ?? 0,
    net: r.type === 'REVENUE'
      ? (r.credit ?? 0) - (r.debit ?? 0)
      : (r.debit  ?? 0) - (r.credit ?? 0),
  }));
}

async function computeAndStoreHealthScore(
  db: D1Database,
  orgId: string,
): Promise<{ score: number; label: string; breakdown: Record<string, number> }> {
  // Pull last 3 months of cash flow for trend metrics
  const cf = await getCashFlow(db, orgId);
  const recent = cf.slice(-3);

  const avgInflow  = recent.length ? recent.reduce((s, r) => s + r.inflow,  0) / recent.length : 0;
  const avgOutflow = recent.length ? recent.reduce((s, r) => s + r.outflow, 0) / recent.length : 0;
  const avgNet     = avgInflow - avgOutflow;

  // Compute 6 metric scores (0–100)
  const cashScore       = Math.min(100, Math.max(0, avgNet >= 0 ? 70 + Math.min(30, avgNet / 1000) : Math.max(0, 70 + avgNet / 1000)));
  const revenueGrowth   = cf.length >= 2 ? ((cf[cf.length-1]?.inflow ?? 0) - (cf[cf.length-2]?.inflow ?? 0)) / Math.max(1, cf[cf.length-2]?.inflow ?? 1) * 100 : 0;
  const growthScore     = Math.min(100, Math.max(0, 50 + revenueGrowth));
  const burnScore       = avgOutflow > 0 ? Math.min(100, Math.max(0, 100 - (avgOutflow / Math.max(1, avgInflow)) * 100)) : 80;
  const debtScore       = 70; // placeholder until liabilities tracked
  const concentrationScore = 65; // placeholder until customer data tracked
  const complianceScore = 80; // placeholder until compliance module live

  const breakdown: Record<string, number> = {
    cash_position:          Math.round(cashScore),
    revenue_growth:         Math.round(growthScore),
    debt_risk:              Math.round(debtScore),
    payroll_burden:         Math.round(burnScore),
    customer_concentration: Math.round(concentrationScore),
    compliance_status:      Math.round(complianceScore),
  };

  const weights: Record<string, number> = {
    cash_position: 25, revenue_growth: 20, debt_risk: 20,
    payroll_burden: 15, customer_concentration: 10, compliance_status: 10,
  };

  const score = Math.round(
    Object.entries(weights).reduce((s, [k, w]) => s + (breakdown[k] ?? 0) * w, 0) / 100
  );
  const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Attention';

  // Upsert metrics into D1 for dashboard consumption
  const now = new Date().toISOString();
  const stmts = Object.entries(breakdown).map(([key, val]) =>
    db.prepare(`INSERT INTO org_health_metrics (id, org_id, metric_key, metric_value, recorded_at)
                VALUES (?1, ?2, ?3, ?4, ?5)
                ON CONFLICT(org_id, metric_key) DO UPDATE SET metric_value=?4, recorded_at=?5`)
      .bind(crypto.randomUUID(), orgId, key, val, now)
  );
  await db.batch(stmts);

  return { score, label, breakdown };
}

// ── App ───────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env }>();

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
});

// CORS for API routes called from app.insighthunter.app
app.use('/api/*', cors({
  origin: (o) => (o?.endsWith('.insighthunter.app') ? o : null),
  credentials: true,
}));

// ── Auth guard ─────────────────────────────────────────────────────────────

app.use('/*', async (c, next) => {
  if (c.req.path === '/health') return next();
  const session = getSession(c.req.raw);
  if (!session) {
    const isHtml = (c.req.header('Accept') ?? '').includes('text/html');
    if (isHtml) return c.redirect(`${c.env.AUTH_URL}/login?redirect=${encodeURIComponent(c.req.url)}`, 302);
    return c.json({ error: 'unauthorized' }, 401);
  }
  return next();
});

// ── Public ────────────────────────────────────────────────────────────────────

app.get('/health', (c) =>
  c.json({ ok: true, service: 'insighthunter-insights', ts: Date.now(), env: c.env.ENVIRONMENT }),
);

// ── API Routes ────────────────────────────────────────────────────────────────

// GET /api/kpis — 6 core KPIs for current month vs prior month
app.get('/api/kpis', async (c) => {
  const session = getSession(c.req.raw)!;
  const kpis = await getKPIs(c.env.DB, session.orgId);
  return c.json({ orgId: session.orgId, period: 'MTD', kpis });
});

// GET /api/cashflow?months=12 — monthly cash in/out/net
app.get('/api/cashflow', async (c) => {
  const session = getSession(c.req.raw)!;
  const data = await getCashFlow(c.env.DB, session.orgId);
  return c.json({ orgId: session.orgId, cashflow: data });
});

// GET /api/pnl?from=YYYY-MM-DD&to=YYYY-MM-DD — P&L by account
app.get('/api/pnl', async (c) => {
  const session = getSession(c.req.raw)!;
  const now   = new Date();
  const from  = c.req.query('from') ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]!;
  const to    = c.req.query('to')   ?? now.toISOString().split('T')[0]!;
  const lines = await getPnL(c.env.DB, session.orgId, from, to);

  const revenue  = lines.filter(l => l.type === 'REVENUE').reduce((s, l) => s + l.net, 0);
  const expenses = lines.filter(l => l.type === 'EXPENSE').reduce((s, l) => s + l.net, 0);

  return c.json({
    orgId: session.orgId, from, to,
    summary: { revenue, expenses, netIncome: revenue - expenses },
    lines,
  });
});

// GET /api/health-score — compute + store 6-factor business health score
app.get('/api/health-score', async (c) => {
  const session = getSession(c.req.raw)!;
  const result  = await computeAndStoreHealthScore(c.env.DB, session.orgId);
  return c.json({ orgId: session.orgId, ...result });
});

// GET /api/summary — all KPIs + health score in one call (used by dashboard)
app.get('/api/summary', async (c) => {
  const session = getSession(c.req.raw)!;
  const [kpis, cashflow, health] = await Promise.all([
    getKPIs(c.env.DB, session.orgId),
    getCashFlow(c.env.DB, session.orgId),
    computeAndStoreHealthScore(c.env.DB, session.orgId),
  ]);
  return c.json({ orgId: session.orgId, kpis, cashflow, health });
});

// ── SSR Dashboard UI ───────────────────────────────────────────────────────────

app.get('/', async (c) => {
  const session = getSession(c.req.raw)!;
  const firstName = session.name.split(' ')[0] ?? session.name;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Insights — InsightHunter</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--brand:#0ea5e9;--dark:#0f172a;--nav:#080f1e;--card:#1a2540;--text:#e2e8f0;--muted:#64748b;--border:#1e3a5f;--green:#22c55e;--red:#ef4444;--yellow:#f59e0b}
    body{font-family:system-ui,sans-serif;background:var(--dark);color:var(--text);min-height:100vh}
    nav{background:var(--nav);border-bottom:1px solid var(--border);padding:.9rem 2rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
    .logo{font-weight:900;font-size:1.1rem;color:var(--brand)}
    .nav-right{display:flex;align-items:center;gap:1rem;font-size:.83rem;color:var(--muted)}
    .back-link{color:var(--brand);text-decoration:none;font-weight:600}
    main{max-width:1280px;margin:0 auto;padding:2rem}
    h1{font-size:1.6rem;font-weight:800;margin-bottom:.25rem}
    .sub{color:var(--muted);font-size:.9rem;margin-bottom:2rem}
    /* KPI grid */
    .kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;margin-bottom:2rem}
    .kpi-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem}
    .kpi-label{font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:.4rem}
    .kpi-value{font-size:1.6rem;font-weight:800;color:var(--text)}
    .kpi-trend{font-size:.78rem;margin-top:.3rem}
    .trend-up{color:var(--green)} .trend-down{color:var(--red)} .trend-flat{color:var(--muted)}
    /* Section */
    .section-title{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin:2rem 0 .85rem}
    /* Chart area */
    .chart-wrap{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.5rem;margin-bottom:2rem}
    .chart-wrap h3{font-size:.85rem;font-weight:700;margin-bottom:1rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
    canvas{width:100%!important;max-height:260px}
    /* P&L table */
    table{width:100%;border-collapse:collapse;font-size:.85rem}
    th{text-align:left;color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;padding:.5rem .75rem;border-bottom:1px solid var(--border)}
    td{padding:.55rem .75rem;border-bottom:1px solid #182030;color:var(--text)}
    tr:last-child td{border-bottom:none}
    .positive{color:var(--green)} .negative{color:var(--red)}
    .summary-row td{font-weight:700;border-top:2px solid var(--border);padding-top:.75rem}
    /* Health score */
    .health-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.5rem;display:flex;align-items:center;gap:2rem;flex-wrap:wrap}
    .hs-score{font-size:3.5rem;font-weight:900;color:var(--green);line-height:1}
    .hs-label{font-size:.9rem;color:var(--muted);margin-top:.3rem}
    .hs-breakdown{display:flex;flex-wrap:wrap;gap:.75rem}
    .hs-item{background:#0ea5e910;border:1px solid var(--border);border-radius:8px;padding:.5rem .85rem;text-align:center}
    .hs-key{font-size:.65rem;text-transform:capitalize;color:var(--muted)}
    .hs-val{font-size:1.1rem;font-weight:800}
    .loading{color:var(--muted);font-style:italic;padding:2rem 0}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
</head>
<body>
  <nav>
    <div class="logo">📊 Insights</div>
    <div class="nav-right">
      <span>${session.orgName}</span>
      <a class="back-link" href="${c.env.DASHBOARD_URL}">← Dashboard</a>
    </div>
  </nav>
  <main>
    <h1>Financial Insights</h1>
    <p class="sub">Welcome, ${firstName} · ${session.orgName} · <span id="period">Loading…</span></p>

    <div class="section-title">Key Performance Indicators</div>
    <div class="kpi-grid" id="kpi-grid"><p class="loading">Loading KPIs…</p></div>

    <div class="chart-wrap">
      <h3>Cash Flow — Last 12 Months</h3>
      <canvas id="cf-chart"></canvas>
    </div>

    <div class="section-title">Profit &amp; Loss — Month to Date</div>
    <div class="chart-wrap">
      <table>
        <thead><tr><th>Account</th><th>Type</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody id="pnl-body"><tr><td colspan="3" class="loading">Loading P&amp;L…</td></tr></tbody>
        <tfoot id="pnl-foot"></tfoot>
      </table>
    </div>

    <div class="section-title">Business Health Score</div>
    <div class="health-card">
      <div>
        <div class="hs-score" id="hs-score">—</div>
        <div class="hs-label" id="hs-label">Computing…</div>
      </div>
      <div class="hs-breakdown" id="hs-breakdown"></div>
    </div>
  </main>

  <script>
    const fmt = (v, unit) => {
      if (unit === 'currency') return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
      if (unit === 'days') return v + ' days';
      return v;
    };

    (async () => {
      try {
        const [kpiRes, cfRes, pnlRes, hsRes] = await Promise.all([
          fetch('/api/kpis',         {credentials:'include'}),
          fetch('/api/cashflow',     {credentials:'include'}),
          fetch('/api/pnl',          {credentials:'include'}),
          fetch('/api/health-score', {credentials:'include'}),
        ]);

        const [kd, cd, pd, hd] = await Promise.all([kpiRes.json(), cfRes.json(), pnlRes.json(), hsRes.json()]);

        // Period label
        document.getElementById('period').textContent = new Date().toLocaleString('en-US',{month:'long',year:'numeric'});

        // KPIs
        const grid = document.getElementById('kpi-grid');
        grid.innerHTML = kd.kpis.map(k => {
          const delta = k.value - k.prev_value;
          const pct   = k.prev_value ? Math.round(Math.abs(delta) / Math.abs(k.prev_value) * 100) : 0;
          const tClass = k.trend === 'up' ? 'trend-up' : k.trend === 'down' ? 'trend-down' : 'trend-flat';
          const arrow  = k.trend === 'up' ? '↑' : k.trend === 'down' ? '↓' : '—';
          return '<div class="kpi-card"><div class="kpi-label">'+k.label+'</div><div class="kpi-value">'+fmt(k.value, k.unit)+'</div><div class="kpi-trend '+tClass+'">'+arrow+' '+pct+'% vs last month</div></div>';
        }).join('');

        // Cash flow chart
        const labels  = cd.cashflow.map(r => r.month);
        const inflows  = cd.cashflow.map(r => r.inflow);
        const outflows = cd.cashflow.map(r => r.outflow);
        new Chart(document.getElementById('cf-chart').getContext('2d'), {
          type: 'bar',
          data: {
            labels,
            datasets: [
              { label: 'Inflow',  data: inflows,  backgroundColor: '#22c55e80', borderColor: '#22c55e', borderWidth: 2 },
              { label: 'Outflow', data: outflows, backgroundColor: '#ef444480', borderColor: '#ef4444', borderWidth: 2 },
            ],
          },
          options: {
            responsive: true, plugins:{ legend:{ labels:{ color:'#94a3b8' } } },
            scales:{ x:{ ticks:{ color:'#64748b' }, grid:{ color:'#1e3a5f' } }, y:{ ticks:{ color:'#64748b' }, grid:{ color:'#1e3a5f' } } },
          },
        });

        // P&L table
        const tbody = document.getElementById('pnl-body');
        tbody.innerHTML = pd.lines.map(l =>
          '<tr><td>'+l.account+'</td><td>'+l.type+'</td><td style="text-align:right" class="'+(l.net>=0?'positive':'negative')+'">'+fmt(l.net,'currency')+'</td></tr>'
        ).join('') || '<tr><td colspan="3" class="loading">No transactions this period</td></tr>';

        const foot = document.getElementById('pnl-foot');
        foot.innerHTML = '<tr class="summary-row"><td colspan="2">Net Income</td><td style="text-align:right" class="'+(pd.summary.netIncome>=0?'positive':'negative')+'">'+fmt(pd.summary.netIncome,'currency')+'</td></tr>';

        // Health score
        document.getElementById('hs-score').textContent = hd.score;
        document.getElementById('hs-label').textContent  = hd.label;
        const bk = document.getElementById('hs-breakdown');
        bk.innerHTML = Object.entries(hd.breakdown).map(([k,v]) =>
          '<div class="hs-item"><div class="hs-key">'+k.replace(/_/g,' ')+'</div><div class="hs-val">'+v+'</div></div>'
        ).join('');

      } catch(e) { console.error(e); }
    })();
  </script>
</body>
</html>`;

  return c.html(html);
});

export default app;
