// apps/insighthunter-bills/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { billRoutes } from './routes/bills.js';
import { vendorRoutes } from './routes/vendors.js';
import { paymentRoutes } from './routes/payments.js';
import { attachmentRoutes } from './routes/attachments.js';

export interface Env {
  DB: D1Database;
  AUTH_URL: string;
  DASHBOARD_URL: string;
  ENVIRONMENT: string;
}

export interface Session {
  userId: string;
  orgId: string;
  email: string;
  name: string;
  role: string;
  orgName: string;
  orgPlan: string;
}

export function getSession(req: Request): Session | null {
  const userId = req.headers.get('X-User-Id');
  const orgId = req.headers.get('X-Org-Id');
  const role = req.headers.get('X-User-Role');
  const email = req.headers.get('X-User-Email');
  if (!userId || !orgId || !role || !email) return null;
  return {
    userId,
    orgId,
    role,
    email,
    name: req.headers.get('X-User-Name') ?? email,
    orgName: req.headers.get('X-Org-Name') ?? 'My Org',
    orgPlan: req.headers.get('X-Org-Plan') ?? 'starter',
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
  c.json({ ok: true, service: 'insighthunter-bills', ts: Date.now(), env: c.env.ENVIRONMENT }),
);

app.route('/api/vendors', vendorRoutes);
app.route('/api/bills', billRoutes);
app.route('/api/payments', paymentRoutes);
app.route('/api/attachments', attachmentRoutes);

app.get('/', async (c) => {
  const session = getSession(c.req.raw)!;

  const summary = await c.env.DB.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status IN ('received','approved','scheduled') THEN balance_due ELSE 0 END), 0) AS open_ap,
      COALESCE(SUM(CASE WHEN status = 'paid' AND date(created_at) = date('now') THEN total_amount ELSE 0 END), 0) AS paid_today,
      COALESCE(COUNT(*) FILTER (WHERE status IN ('received','approved','scheduled')), 0) AS open_bills,
      COALESCE(COUNT(*) FILTER (WHERE status = 'overdue'), 0) AS overdue_bills
    FROM bills
    WHERE org_id = ?1
  `).bind(session.orgId).first<{
    open_ap: number;
    paid_today: number;
    open_bills: number;
    overdue_bills: number;
  }>();

  const recentBills = await c.env.DB.prepare(`
    SELECT b.id, b.bill_number, b.vendor_name, b.due_date, b.status, b.total_amount, b.balance_due
    FROM bills b
    WHERE b.org_id = ?1
    ORDER BY b.created_at DESC
    LIMIT 8
  `).bind(session.orgId).all<{
    id: string;
    bill_number: string;
    vendor_name: string;
    due_date: string;
    status: string;
    total_amount: number;
    balance_due: number;
  }>();

  const fmt = (v: number | null) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v ?? 0);
  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: 'badge-gray',
      received: 'badge-blue',
      approved: 'badge-yellow',
      scheduled: 'badge-indigo',
      paid: 'badge-green',
      overdue: 'badge-red',
      void: 'badge-red',
    };
    return `<span class="badge ${map[s] ?? 'badge-gray'}">${s}</span>`;
  };

  const rows = (recentBills.results ?? []).map((b) => `
    <tr>
      <td>${b.bill_number}</td>
      <td>${b.vendor_name}</td>
      <td>${b.due_date}</td>
      <td>${statusBadge(b.status)}</td>
      <td class="amount">${fmt(b.total_amount)}</td>
      <td class="amount">${fmt(b.balance_due)}</td>
    </tr>
  `).join('');

  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bills — InsightHunter</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--brand:#0ea5e9;--dark:#0f172a;--nav:#080f1e;--card:#1a2540;--text:#e2e8f0;--muted:#64748b;--border:#1e3a5f;--green:#22c55e;--red:#ef4444;--yellow:#f59e0b;--indigo:#818cf8}
    body{font-family:system-ui,sans-serif;background:var(--dark);color:var(--text);min-height:100vh}
    nav{background:var(--nav);border-bottom:1px solid var(--border);padding:.9rem 2rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
    .logo{font-weight:900;font-size:1.1rem;color:var(--brand)}
    .nav-right{display:flex;align-items:center;gap:1rem;font-size:.83rem;color:var(--muted)}
    .back-link{color:var(--brand);text-decoration:none;font-weight:600}
    main{max-width:1280px;margin:0 auto;padding:2rem}
    .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:2rem}
    .kpi{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem}
    .kpi-label{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:.35rem}
    .kpi-value{font-size:1.6rem;font-weight:800}
    .card{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:1.5rem}
    .card-header{padding:1rem 1.5rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
    .card-title{font-size:.9rem;font-weight:700}
    .btn{background:var(--brand);color:#fff;border:none;border-radius:8px;padding:.55rem 1.1rem;font-size:.875rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}
    .btn:hover{opacity:.85}
    .btn-ghost{background:none;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:.45rem .9rem;font-size:.78rem;cursor:pointer;text-decoration:none}
    .btn-ghost:hover{border-color:var(--brand);color:var(--brand)}
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
    .badge-yellow{background:#f59e0b20;color:var(--yellow)}
    .badge-indigo{background:#818cf820;color:var(--indigo)}
    .empty{color:var(--muted);font-style:italic;padding:2rem;text-align:center}
    .tabs{display:flex;gap:.5rem;margin-bottom:1rem}
    .tab{background:none;border:1px solid var(--border);color:var(--muted);font-size:.82rem;font-weight:600;padding:.45rem .8rem;cursor:pointer;border-radius:8px}
    .tab.active{color:var(--brand);border-color:var(--brand)}
    .panel{display:none}.panel.active{display:block}
  </style>
</head>
<body>
  <nav>
    <div class="logo">📥 Bills / AP</div>
    <div class="nav-right">
      <span>${session.orgName}</span>
      <a class="back-link" href="${c.env.DASHBOARD_URL}">← Dashboard</a>
    </div>
  </nav>
  <main>
    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Open AP</div><div class="kpi-value">${fmt(summary?.open_ap ?? 0)}</div></div>
      <div class="kpi"><div class="kpi-label">Open Bills</div><div class="kpi-value">${summary?.open_bills ?? 0}</div></div>
      <div class="kpi"><div class="kpi-label">Overdue</div><div class="kpi-value">${summary?.overdue_bills ?? 0}</div></div>
      <div class="kpi"><div class="kpi-label">Paid Today</div><div class="kpi-value">${fmt(summary?.paid_today ?? 0)}</div></div>
    </div>

    <div class="tabs">
      <button class="tab active" onclick="showTab('bills',this)">Bills</button>
      <button class="tab" onclick="showTab('vendors',this)">Vendors</button>
      <button class="tab" onclick="showTab('payments',this)">Payments</button>
    </div>

    <div id="tab-bills" class="panel active">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Recent Bills</span>
          <button class="btn" onclick="createBill()">+ New Bill</button>
        </div>
        <table>
          <thead><tr><th>Bill #</th><th>Vendor</th><th>Due</th><th>Status</th><th class="amount">Total</th><th class="amount">Balance</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" class="empty">No bills yet.</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <div id="tab-vendors" class="panel">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Vendors</span>
          <button class="btn" onclick="createVendor()">+ New Vendor</button>
        </div>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Payment Terms</th><th>Status</th></tr></thead>
          <tbody id="vendor-body"><tr><td colspan="4" class="empty">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>

    <div id="tab-payments" class="panel">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Payments</span>
          <button class="btn" onclick="recordPayment()">+ Record Payment</button>
        </div>
        <table>
          <thead><tr><th>Bill</th><th>Method</th><th>Paid</th><th>Date</th></tr></thead>
          <tbody id="payment-body"><tr><td colspan="4" class="empty">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>
  </main>

  <script>
    function showTab(name, el) {
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-' + name).classList.add('active');
      if (el) el.classList.add('active');
      if (name === 'vendors') loadVendors();
      if (name === 'payments') loadPayments();
    }

    async function loadVendors() {
      const res = await fetch('/api/vendors', {credentials:'include'});
      const d = await res.json();
      const tb = document.getElementById('vendor-body');
      const rows = d.vendors ?? [];
      tb.innerHTML = rows.length ? rows.map(v => '<tr><td>'+v.name+'</td><td>'+(v.email ?? '—')+'</td><td>'+(v.payment_terms ?? 'Net 30')+'</td><td>'+v.status+'</td></tr>').join('') : '<tr><td colspan="4" class="empty">No vendors yet.</td></tr>';
    }

    async function loadPayments() {
      const res = await fetch('/api/payments', {credentials:'include'});
      const d = await res.json();
      const tb = document.getElementById('payment-body');
      const rows = d.payments ?? [];
      tb.innerHTML = rows.length ? rows.map(p => '<tr><td>'+p.bill_number+'</td><td>'+p.method+'</td><td>'+fmt(p.amount)+'</td><td>'+p.paid_at.slice(0,10)+'</td></tr>').join('') : '<tr><td colspan="4" class="empty">No payments yet.</td></tr>';
    }

    async function createVendor() {
      const name = prompt('Vendor name:'); if (!name) return;
      const email = prompt('Vendor email (optional):') || null;
      const payment_terms = prompt('Payment terms (e.g. Net 30):', 'Net 30') || 'Net 30';
      await fetch('/api/vendors', {method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,payment_terms})});
      loadVendors();
    }

    async function createBill() {
      const vendor_id = prompt('Vendor ID:'); if (!vendor_id) return;
      const bill_number = prompt('Bill number (optional):') || '';
      const issue_date = prompt('Issue date (YYYY-MM-DD):', new Date().toISOString().slice(0,10));
      const due_date = prompt('Due date (YYYY-MM-DD):', new Date().toISOString().slice(0,10));
      const memo = prompt('Memo / description:', '') || '';
      const total_amount = parseFloat(prompt('Total amount:') || '0');
      const response = await fetch('/api/bills', {method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({vendor_id,bill_number,issue_date,due_date,memo,total_amount})});
      const data = await response.json();
      if (data.id) location.reload();
      else alert(data.error ?? 'Unable to create bill');
    }

    async function recordPayment() {
      const bill_id = prompt('Bill ID:'); if (!bill_id) return;
      const amount = parseFloat(prompt('Payment amount:') || '0');
      const method = prompt('Method (ACH/check/card):', 'ACH') || 'ACH';
      const paid_at = prompt('Paid at (YYYY-MM-DD):', new Date().toISOString().slice(0,10));
      const response = await fetch('/api/payments', {method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({bill_id,amount,method,paid_at})});
      const data = await response.json();
      if (data.ok) location.reload();
      else alert(data.error ?? 'Unable to record payment');
    }
  </script>
</body>
</html>`);
});

export default app;
