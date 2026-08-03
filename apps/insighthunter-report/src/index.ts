// apps/insighthunter-report — Financial report generation
// Deployed at reports.insighthunter.app
// Auth: reads X-* identity headers injected by apps/gateway.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { reportRoutes } from './routes/reports.js';
import { exportRoutes } from './routes/export.js';

export type Env = {
  DB: D1Database;
  AUTH_URL: string;
  DASHBOARD_URL: string;
  ENVIRONMENT: string;
};

export type Session = {
  userId: string; orgId: string; email: string;
  name: string; role: string; orgName: string; orgPlan: string;
};

export function getSession(req: Request): Session | null {
  const userId = req.headers.get('X-User-Id');
  const orgId  = req.headers.get('X-Org-Id');
  const role   = req.headers.get('X-User-Role');
  const email  = req.headers.get('X-User-Email');
  if (!userId || !orgId || !role || !email) return null;
  return {
    userId, orgId, role, email,
    name:    req.headers.get('X-User-Name')  ?? email,
    orgName: req.headers.get('X-Org-Name')   ?? 'My Org',
    orgPlan: req.headers.get('X-Org-Plan')   ?? 'starter',
  };
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
});

app.use('/api/*', cors({
  origin: (o) => (o?.endsWith('.insighthunter.app') ? o : null),
  credentials: true,
}));

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

app.get('/health', (c) =>
  c.json({ ok: true, service: 'insighthunter-report', ts: Date.now(), env: c.env.ENVIRONMENT }),
);

app.route('/api/reports', reportRoutes);
app.route('/api/export',  exportRoutes);

// SSR Dashboard
app.get('/', async (c) => {
  const session = getSession(c.req.raw)!;
  const now = new Date();
  const fy_start = `${now.getFullYear()}-01-01`;
  const today = now.toISOString().slice(0, 10);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Reports — InsightHunter</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--brand:#0ea5e9;--dark:#0f172a;--nav:#080f1e;--card:#1a2540;--text:#e2e8f0;--muted:#64748b;--border:#1e3a5f;--green:#22c55e;--red:#ef4444}
    body{font-family:system-ui,sans-serif;background:var(--dark);color:var(--text);min-height:100vh}
    nav{background:var(--nav);border-bottom:1px solid var(--border);padding:.9rem 2rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
    .logo{font-weight:900;font-size:1.1rem;color:var(--brand)}
    .nav-right{display:flex;align-items:center;gap:1rem;font-size:.83rem;color:var(--muted)}
    .back-link{color:var(--brand);text-decoration:none;font-weight:600}
    main{max-width:1280px;margin:0 auto;padding:2rem}
    .report-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.25rem;margin-bottom:2.5rem}
    .report-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.5rem;cursor:pointer;transition:border-color .15s,transform .1s}
    .report-card:hover{border-color:var(--brand);transform:translateY(-1px)}
    .rc-icon{font-size:1.75rem;margin-bottom:.6rem}
    .rc-title{font-weight:700;font-size:.95rem;margin-bottom:.25rem}
    .rc-desc{font-size:.8rem;color:var(--muted);line-height:1.45}
    .rc-actions{display:flex;gap:.5rem;margin-top:1rem}
    .btn{background:var(--brand);color:#fff;border:none;border-radius:8px;padding:.5rem 1rem;font-size:.8rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}
    .btn:hover{opacity:.85}
    .btn-ghost{background:none;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:.45rem .9rem;font-size:.78rem;cursor:pointer;text-decoration:none}
    .btn-ghost:hover{border-color:var(--brand);color:var(--brand)}
    /* Report viewer */
    #report-view{display:none}
    .report-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem}
    .report-title{font-size:1.1rem;font-weight:800}
    .report-meta{font-size:.78rem;color:var(--muted)}
    .card{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:1.5rem}
    .card-body{padding:1.5rem}
    table{width:100%;border-collapse:collapse;font-size:.83rem}
    th{text-align:left;color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;padding:.55rem .9rem;border-bottom:1px solid var(--border)}
    td{padding:.6rem .9rem;border-bottom:1px solid #182030}
    tr:last-child td{border-bottom:none}
    tr:hover td{background:#1e2d45}
    .section-header td{font-weight:700;color:var(--brand);background:#0e1e35;font-size:.78rem;text-transform:uppercase;letter-spacing:.05em}
    .subtotal td{font-weight:700;border-top:1px solid var(--border)}
    .total td{font-weight:800;color:var(--text);border-top:2px solid var(--brand);font-size:.9rem}
    .amount{text-align:right}
    .amount-pos{color:var(--green)} .amount-neg{color:var(--red)}
    .filters{display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;margin-bottom:1.25rem}
    .filters label{font-size:.78rem;color:var(--muted)}
    .filters input,.filters select{background:var(--card);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:.38rem .65rem;font-size:.82rem}
    .spinner{color:var(--muted);padding:2rem;text-align:center;font-style:italic}
  </style>
</head>
<body>
  <nav>
    <div class="logo">📊 Reports</div>
    <div class="nav-right">
      <span>${session.orgName}</span>
      <a class="back-link" href="${c.env.DASHBOARD_URL}">← Dashboard</a>
    </div>
  </nav>
  <main>
    <!-- Report picker -->
    <div id="report-picker">
      <h2 style="margin-bottom:1.25rem;font-size:1rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em">Financial Reports</h2>
      <div class="report-grid">
        <div class="report-card" onclick="openReport('profit-loss')">
          <div class="rc-icon">📈</div>
          <div class="rc-title">Profit &amp; Loss</div>
          <div class="rc-desc">Revenue, expenses, and net income for any period. Also called the Income Statement.</div>
          <div class="rc-actions">
            <button class="btn" onclick="event.stopPropagation();openReport('profit-loss')">View</button>
            <a class="btn-ghost" href="/api/export/profit-loss?format=csv&from=${fy_start}&to=${today}" target="_blank">CSV</a>
          </div>
        </div>
        <div class="report-card" onclick="openReport('balance-sheet')">
          <div class="rc-icon">⚖️</div>
          <div class="rc-title">Balance Sheet</div>
          <div class="rc-desc">Assets, liabilities, and equity snapshot at a point in time.</div>
          <div class="rc-actions">
            <button class="btn" onclick="event.stopPropagation();openReport('balance-sheet')">View</button>
            <a class="btn-ghost" href="/api/export/balance-sheet?format=csv&as_of=${today}" target="_blank">CSV</a>
          </div>
        </div>
        <div class="report-card" onclick="openReport('trial-balance')">
          <div class="rc-icon">📃</div>
          <div class="rc-title">Trial Balance</div>
          <div class="rc-desc">All accounts with their debit and credit totals — confirms double-entry integrity.</div>
          <div class="rc-actions">
            <button class="btn" onclick="event.stopPropagation();openReport('trial-balance')">View</button>
            <a class="btn-ghost" href="/api/export/trial-balance?format=csv" target="_blank">CSV</a>
          </div>
        </div>
        <div class="report-card" onclick="openReport('cash-flow')">
          <div class="rc-icon">💰</div>
          <div class="rc-title">Cash Flow Statement</div>
          <div class="rc-desc">Operating, investing, and financing cash flows for any period.</div>
          <div class="rc-actions">
            <button class="btn" onclick="event.stopPropagation();openReport('cash-flow')">View</button>
            <a class="btn-ghost" href="/api/export/cash-flow?format=csv&from=${fy_start}&to=${today}" target="_blank">CSV</a>
          </div>
        </div>
        <div class="report-card" onclick="openReport('ar-aging')">
          <div class="rc-icon">🯦</div>
          <div class="rc-title">AR Aging</div>
          <div class="rc-desc">Outstanding invoices by age bucket: current, 30, 60, 90+ days.</div>
          <div class="rc-actions">
            <button class="btn" onclick="event.stopPropagation();openReport('ar-aging')">View</button>
            <a class="btn-ghost" href="/api/export/ar-aging?format=csv" target="_blank">CSV</a>
          </div>
        </div>
        <div class="report-card" onclick="openReport('ap-aging')">
          <div class="rc-icon">🯧</div>
          <div class="rc-title">AP Aging</div>
          <div class="rc-desc">Outstanding bills by age bucket — what you owe and when it\'s due.</div>
          <div class="rc-actions">
            <button class="btn" onclick="event.stopPropagation();openReport('ap-aging')">View</button>
            <a class="btn-ghost" href="/api/export/ap-aging?format=csv" target="_blank">CSV</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Report viewer -->
    <div id="report-view">
      <div class="report-header">
        <div>
          <div class="report-title" id="rv-title"></div>
          <div class="report-meta" id="rv-meta"></div>
        </div>
        <div style="display:flex;gap:.6rem">
          <button class="btn-ghost" id="rv-csv-btn">Download CSV</button>
          <button class="btn-ghost" onclick="closeReport()">← Back</button>
        </div>
      </div>
      <div class="filters" id="rv-filters"></div>
      <div class="card"><div class="card-body" id="rv-body"><div class="spinner">Loading…</div></div></div>
    </div>
  </main>

  <script>
    const fmt = v => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v ?? 0);
    const today = '${today}';
    const fyStart = '${fy_start}';
    let currentReport = null;

    function openReport(type) {
      currentReport = type;
      document.getElementById('report-picker').style.display = 'none';
      document.getElementById('report-view').style.display  = 'block';
      buildFilters(type);
      loadReport(type);
    }

    function closeReport() {
      document.getElementById('report-picker').style.display = 'block';
      document.getElementById('report-view').style.display  = 'none';
      currentReport = null;
    }

    function buildFilters(type) {
      const f = document.getElementById('rv-filters');
      if (['profit-loss','cash-flow'].includes(type)) {
        f.innerHTML = '<label>From <input type="date" id="f-from" value="'+fyStart+'"></label>' +
                      '<label>To <input type="date" id="f-to" value="'+today+'"></label>' +
                      '<button class="btn" onclick="loadReport(currentReport)">Run</button>';
      } else if (type === 'balance-sheet') {
        f.innerHTML = '<label>As of <input type="date" id="f-asof" value="'+today+'"></label>' +
                      '<button class="btn" onclick="loadReport(currentReport)">Run</button>';
      } else {
        f.innerHTML = '';
      }
      // CSV button wires dynamically after filters set
      document.getElementById('rv-csv-btn').onclick = () => {
        const params = buildParams(type);
        window.open('/api/export/'+type+'?format=csv&'+params);
      };
    }

    function buildParams(type) {
      const from  = document.getElementById('f-from')?.value  ?? fyStart;
      const to    = document.getElementById('f-to')?.value    ?? today;
      const asof  = document.getElementById('f-asof')?.value  ?? today;
      if (['profit-loss','cash-flow'].includes(type)) return 'from='+from+'&to='+to;
      if (type === 'balance-sheet') return 'as_of='+asof;
      return '';
    }

    const TITLES = {
      'profit-loss':'Profit & Loss','balance-sheet':'Balance Sheet',
      'trial-balance':'Trial Balance','cash-flow':'Cash Flow Statement',
      'ar-aging':'AR Aging','ap-aging':'AP Aging',
    };

    async function loadReport(type) {
      document.getElementById('rv-title').textContent = TITLES[type] ?? type;
      document.getElementById('rv-body').innerHTML = '<div class="spinner">Loading…</div>';
      const params = buildParams(type);
      const res = await fetch('/api/reports/'+type+(params?'?'+params:''), {credentials:'include'});
      const d = await res.json();
      document.getElementById('rv-meta').textContent = d.period ?? d.as_of ?? '';
      document.getElementById('rv-body').innerHTML = renderReport(type, d);
    }

    function renderReport(type, d) {
      if (type === 'trial-balance') return renderTrialBalance(d);
      if (type === 'profit-loss')   return renderPnl(d);
      if (type === 'balance-sheet') return renderBalanceSheet(d);
      if (type === 'cash-flow')     return renderCashFlow(d);
      if (type === 'ar-aging' || type === 'ap-aging') return renderAging(d);
      return '<pre>'+JSON.stringify(d, null, 2)+'</pre>';
    }

    function renderTrialBalance(d) {
      const rows = (d.items ?? []).map(r =>
        '<tr><td>'+r.code+'</td><td>'+r.name+'</td><td>'+r.type+'</td>' +
        '<td class="amount">'+fmt(r.total_debit)+'</td><td class="amount">'+fmt(r.total_credit)+'</td></tr>'
      ).join('');
      const td = (d.totals?.debit ?? 0), tc = (d.totals?.credit ?? 0);
      const balClass = Math.abs(td - tc) < 0.01 ? 'amount-pos' : 'amount-neg';
      return '<table><thead><tr><th>Code</th><th>Account</th><th>Type</th><th class="amount">Debits</th><th class="amount">Credits</th></tr></thead><tbody>'+rows+
        '<tr class="total"><td colspan="3">Total</td><td class="amount '+balClass+'">'+fmt(td)+'</td><td class="amount '+balClass+'">'+fmt(tc)+'</td></tr>'+
        '</tbody></table>';
    }

    function renderPnl(d) {
      let html = '<table><thead><tr><th>Account</th><th class="amount">Amount</th></tr></thead><tbody>';
      html += '<tr class="section-header"><td colspan="2">Revenue</td></tr>';
      (d.revenue ?? []).forEach(r => html += '<tr><td style="padding-left:2rem">'+r.name+'</td><td class="amount">'+fmt(r.amount)+'</td></tr>');
      html += '<tr class="subtotal"><td>Total Revenue</td><td class="amount amount-pos">'+fmt(d.total_revenue)+'</td></tr>';
      html += '<tr class="section-header"><td colspan="2">Expenses</td></tr>';
      (d.expenses ?? []).forEach(r => html += '<tr><td style="padding-left:2rem">'+r.name+'</td><td class="amount">'+fmt(r.amount)+'</td></tr>');
      html += '<tr class="subtotal"><td>Total Expenses</td><td class="amount amount-neg">'+fmt(d.total_expenses)+'</td></tr>';
      const netClass = d.net_income >= 0 ? 'amount-pos' : 'amount-neg';
      html += '<tr class="total"><td>Net Income</td><td class="amount '+netClass+'">'+fmt(d.net_income)+'</td></tr>';
      return html + '</tbody></table>';
    }

    function renderBalanceSheet(d) {
      let html = '<table><thead><tr><th>Account</th><th class="amount">Balance</th></tr></thead><tbody>';
      ['assets','liabilities','equity'].forEach(section => {
        html += '<tr class="section-header"><td colspan="2">'+section.charAt(0).toUpperCase()+section.slice(1)+'</td></tr>';
        (d[section] ?? []).forEach(r => html += '<tr><td style="padding-left:2rem">'+r.name+'</td><td class="amount">'+fmt(r.balance)+'</td></tr>');
        html += '<tr class="subtotal"><td>Total '+section.charAt(0).toUpperCase()+section.slice(1)+'</td><td class="amount">'+fmt(d['total_'+section])+'</td></tr>';
      });
      return html + '</tbody></table>';
    }

    function renderCashFlow(d) {
      let html = '<table><thead><tr><th>Category</th><th class="amount">Amount</th></tr></thead><tbody>';
      ['operating','investing','financing'].forEach(s => {
        html += '<tr class="section-header"><td colspan="2">'+s.charAt(0).toUpperCase()+s.slice(1)+' Activities</td></tr>';
        (d[s] ?? []).forEach(r => html += '<tr><td style="padding-left:2rem">'+r.label+'</td><td class="amount">'+fmt(r.amount)+'</td></tr>');
        html += '<tr class="subtotal"><td>Net '+s.charAt(0).toUpperCase()+s.slice(1)+'</td><td class="amount">'+fmt(d['net_'+s])+'</td></tr>';
      });
      const netClass = d.net_change >= 0 ? 'amount-pos' : 'amount-neg';
      html += '<tr class="total"><td>Net Change in Cash</td><td class="amount '+netClass+'">'+fmt(d.net_change)+'</td></tr>';
      return html + '</tbody></table>';
    }

    function renderAging(d) {
      const rows = (d.items ?? []).map(r =>
        '<tr><td>'+r.name+'</td><td class="amount">'+fmt(r.current)+'</td><td class="amount">'+fmt(r.days_30)+'</td>' +
        '<td class="amount">'+fmt(r.days_60)+'</td><td class="amount amount-neg">'+fmt(r.days_90_plus)+'</td><td class="amount">'+fmt(r.total)+'</td></tr>'
      ).join('');
      return '<table><thead><tr><th>Name</th><th class="amount">Current</th><th class="amount">1-30 days</th><th class="amount">31-60 days</th><th class="amount">90+ days</th><th class="amount">Total</th></tr></thead><tbody>'+rows+'</tbody></table>';
    }
  </script>
</body>
</html>`;

  return c.html(html);
});

export default app;
