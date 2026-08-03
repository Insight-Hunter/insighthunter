// apps/insighthunter-payroll — Employee management, payroll runs, gross-to-net calculation
// Deployed at payroll.insighthunter.app
// Auth: reads X-* identity headers injected by apps/gateway.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { employeeRoutes } from './routes/employees.js';
import { payrollRunRoutes } from './routes/payroll-runs.js';
import { deductionRoutes } from './routes/deductions.js';

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
  c.json({ ok: true, service: 'insighthunter-payroll', ts: Date.now(), env: c.env.ENVIRONMENT }),
);

app.route('/api/employees',    employeeRoutes);
app.route('/api/payroll-runs', payrollRunRoutes);
app.route('/api/deductions',   deductionRoutes);

// SSR Dashboard
app.get('/', async (c) => {
  const session = getSession(c.req.raw)!;

  // Summary stats
  const stats = await c.env.DB.prepare(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'active') AS active_employees,
      COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_employees
    FROM employees WHERE org_id = ?1
  `).bind(session.orgId).first<{ active_employees: number; inactive_employees: number }>();

  const recentRuns = await c.env.DB.prepare(`
    SELECT id, period_start, period_end, status, total_gross, total_net, employee_count, approved_at
    FROM payroll_runs WHERE org_id = ?1
    ORDER BY created_at DESC LIMIT 6
  `).bind(session.orgId).all<{
    id: string; period_start: string; period_end: string;
    status: string; total_gross: number; total_net: number;
    employee_count: number; approved_at: string | null;
  }>();

  const fmt = (v: number | null) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v ?? 0);
  const statusBadge = (s: string) => {
    const m: Record<string, string> = { draft: 'badge-gray', pending: 'badge-blue', approved: 'badge-green', void: 'badge-red' };
    return `<span class="badge ${m[s] ?? 'badge-gray'}">${s}</span>`;
  };

  const runRows = (recentRuns.results ?? []).map(r =>
    `<tr>
      <td>${r.period_start} – ${r.period_end}</td>
      <td>${r.employee_count}</td>
      <td>${fmt(r.total_gross)}</td>
      <td>${fmt(r.total_net)}</td>
      <td>${statusBadge(r.status)}</td>
      <td>${r.approved_at ? r.approved_at.slice(0,10) : '—'}</td>
      <td>
        ${r.status === 'draft' || r.status === 'pending'
          ? `<button class="btn-sm" onclick="approveRun('${r.id}')">Approve</button>`
          : ''}
      </td>
    </tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payroll — InsightHunter</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--brand:#0ea5e9;--dark:#0f172a;--nav:#080f1e;--card:#1a2540;--text:#e2e8f0;--muted:#64748b;--border:#1e3a5f;--green:#22c55e;--red:#ef4444}
    body{font-family:system-ui,sans-serif;background:var(--dark);color:var(--text);min-height:100vh}
    nav{background:var(--nav);border-bottom:1px solid var(--border);padding:.9rem 2rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
    .logo{font-weight:900;font-size:1.1rem;color:var(--brand)}
    .nav-links{display:flex;gap:1.5rem;font-size:.85rem}
    .nav-links a{color:var(--muted);text-decoration:none;padding:.35rem .6rem;border-radius:6px}
    .nav-links a:hover,.nav-links a.active{color:var(--brand)}
    .nav-right{display:flex;align-items:center;gap:1rem;font-size:.83rem;color:var(--muted)}
    .back-link{color:var(--brand);text-decoration:none;font-weight:600}
    main{max-width:1280px;margin:0 auto;padding:2rem}
    .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin-bottom:2rem}
    .kpi{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem}
    .kpi-label{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:.35rem}
    .kpi-value{font-size:1.6rem;font-weight:800}
    .card{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:1.5rem}
    .card-header{padding:1rem 1.5rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
    .card-title{font-size:.9rem;font-weight:700}
    .btn{background:var(--brand);color:#fff;border:none;border-radius:8px;padding:.55rem 1.1rem;font-size:.875rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}
    .btn:hover{opacity:.85}
    .btn-sm{background:var(--brand);color:#fff;border:none;border-radius:6px;padding:.3rem .7rem;font-size:.75rem;font-weight:600;cursor:pointer}
    .btn-ghost{background:none;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:.45rem .9rem;font-size:.78rem;cursor:pointer}
    table{width:100%;border-collapse:collapse;font-size:.83rem}
    th{text-align:left;color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;padding:.6rem 1rem;border-bottom:1px solid var(--border)}
    td{padding:.65rem 1rem;border-bottom:1px solid #182030}
    tr:last-child td{border-bottom:none}
    tr:hover td{background:#1e2d45}
    .badge{display:inline-block;border-radius:6px;padding:.15rem .5rem;font-size:.7rem;font-weight:600}
    .badge-green{background:#22c55e20;color:var(--green)}
    .badge-red{background:#ef444420;color:var(--red)}
    .badge-blue{background:#0ea5e920;color:var(--brand)}
    .badge-gray{background:#33415520;color:var(--muted)}
    .empty{color:var(--muted);font-style:italic;padding:2rem;text-align:center}
    .tabs{display:flex;gap:.5rem;margin-bottom:2rem;border-bottom:1px solid var(--border)}
    .tab{background:none;border:none;color:var(--muted);font-size:.9rem;font-weight:600;padding:.6rem 1rem;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
    .tab.active{color:var(--brand);border-bottom-color:var(--brand)}
    .panel{display:none}.panel.active{display:block}
  </style>
</head>
<body>
  <nav>
    <div class="logo">💸 Payroll</div>
    <div class="nav-links">
      <a href="#" class="active" onclick="showTab('runs',this)">Payroll Runs</a>
      <a href="#" onclick="showTab('employees',this)">Employees</a>
    </div>
    <div class="nav-right">
      <span>${session.orgName}</span>
      <a class="back-link" href="${c.env.DASHBOARD_URL}">← Dashboard</a>
    </div>
  </nav>
  <main>
    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Active Employees</div><div class="kpi-value">${stats?.active_employees ?? 0}</div></div>
      <div class="kpi"><div class="kpi-label">Inactive</div><div class="kpi-value">${stats?.inactive_employees ?? 0}</div></div>
    </div>

    <!-- Runs tab -->
    <div id="tab-runs" class="panel active">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Payroll Runs</span>
          <button class="btn" onclick="createRun()">+ New Run</button>
        </div>
        <table>
          <thead><tr><th>Period</th><th>Employees</th><th>Gross</th><th>Net</th><th>Status</th><th>Approved</th><th></th></tr></thead>
          <tbody>${runRows || '<tr><td colspan="7" class="empty">No payroll runs yet.</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <!-- Employees tab -->
    <div id="tab-employees" class="panel">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Employees</span>
          <button class="btn" onclick="addEmployee()">+ Add Employee</button>
        </div>
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Rate</th><th>Status</th><th></th></tr></thead>
          <tbody id="emp-body"><tr><td colspan="5" class="empty">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>
  </main>

  <script>
    const fmt = v => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v ?? 0);

    function showTab(name, el) {
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
      document.getElementById('tab-' + name).classList.add('active');
      if (el) el.classList.add('active');
      if (name === 'employees') loadEmployees();
    }

    async function loadEmployees() {
      const res = await fetch('/api/employees', {credentials:'include'});
      const d = await res.json();
      const tb = document.getElementById('emp-body');
      const rows = d.employees ?? [];
      if (!rows.length) { tb.innerHTML = '<tr><td colspan="5" class="empty">No employees yet.</td></tr>'; return; }
      tb.innerHTML = rows.map(e => {
        const rate = e.pay_type === 'salary' ? fmt(e.pay_rate) + '/yr' : fmt(e.pay_rate) + '/hr';
        const badge = e.status === 'active' ? 'badge-green' : 'badge-gray';
        return '<tr><td>'+e.name+'</td><td>'+e.pay_type+'</td><td>'+rate+'</td><td><span class="badge '+badge+'">'+e.status+'</span></td>' +
          '<td><button class="btn-ghost" onclick="editEmployee(\''+e.id+'\')" style="padding:.25rem .6rem;font-size:.75rem">Edit</button></td></tr>';
      }).join('');
    }

    async function addEmployee() {
      const name = prompt('Full name:'); if (!name) return;
      const pay_type = prompt('Pay type (salary/hourly):', 'salary'); if (!pay_type) return;
      const pay_rate = parseFloat(prompt(pay_type === 'salary' ? 'Annual salary:' : 'Hourly rate:') ?? '0');
      const state = prompt('State (2-letter, e.g. CA):', 'CA') ?? 'CA';
      await fetch('/api/employees', {method:'POST',credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name, pay_type, pay_rate, state})});
      loadEmployees();
    }

    async function editEmployee(id) {
      const status = prompt('Status (active/inactive):'); if (!status) return;
      await fetch('/api/employees/'+id, {method:'PATCH',credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({status})});
      loadEmployees();
    }

    async function createRun() {
      const period_start = prompt('Period start (YYYY-MM-DD):'); if (!period_start) return;
      const period_end   = prompt('Period end (YYYY-MM-DD):');   if (!period_end)   return;
      const res = await fetch('/api/payroll-runs', {method:'POST',credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({period_start, period_end})});
      const d = await res.json();
      if (d.id) { alert('Run '+d.id+' created. Approve it to process.'); location.reload(); }
    }

    async function approveRun(id) {
      if (!confirm('Approve this payroll run? This will post journal entries.')) return;
      const res = await fetch('/api/payroll-runs/'+id+'/approve', {method:'POST',credentials:'include'});
      const d = await res.json();
      if (d.ok) location.reload();
      else alert('Error: ' + (d.error ?? 'unknown'));
    }
  </script>
</body>
</html>`;

  return c.html(html);
});

export default app;
