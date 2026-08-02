// apps/insighthunter-invoicing — Invoice management, client billing, revenue recognition
// Deployed at invoicing.insighthunter.app
// Auth: reads X-* identity headers injected by apps/gateway.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { invoiceRoutes } from './routes/invoices.js';
import { clientRoutes } from './routes/clients.js';
import { paymentRoutes } from './routes/payments.js';

export type Env = {
  DB: D1Database;
  INVOICE_PDFS: R2Bucket;
  BROWSER: Fetcher;           // Cloudflare Browser Rendering binding
  AUTH_URL: string;
  DASHBOARD_URL: string;
  APP_URL: string;
  ENVIRONMENT: string;
};

export type Session = {
  userId:  string;
  orgId:   string;
  email:   string;
  name:    string;
  role:    string;
  orgName: string;
  orgPlan: string;
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

// Security headers
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

// Auth guard
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
  c.json({ ok: true, service: 'insighthunter-invoicing', ts: Date.now(), env: c.env.ENVIRONMENT }),
);

// PDF download — streams PDF from R2
app.get('/invoices/:id/pdf', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const invoiceId = c.req.param('id');
  const key = `pdfs/${session.orgId}/${invoiceId}.pdf`;
  const obj = await c.env.INVOICE_PDFS.get(key);
  if (!obj) return c.json({ error: 'PDF not found — generate it first via POST /api/invoices/:id/pdf' }, 404);

  return new Response(obj.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoiceId}.pdf"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
});

// API routes
app.route('/api/invoices', invoiceRoutes);
app.route('/api/clients',  clientRoutes);
app.route('/api/payments', paymentRoutes);

// SSR Dashboard
app.get('/', async (c) => {
  const session = getSession(c.req.raw)!;

  // Summary stats
  const stats = await c.env.DB.prepare(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'draft')   AS drafts,
      COUNT(*) FILTER (WHERE status = 'sent')    AS sent,
      COUNT(*) FILTER (WHERE status = 'overdue') AS overdue,
      SUM(total_amount) FILTER (WHERE status IN ('sent','overdue')) AS ar_balance,
      SUM(total_amount) FILTER (WHERE status = 'paid')
        FILTER (WHERE strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')) AS paid_mtd
    FROM invoices WHERE org_id = ?1
  `).bind(session.orgId).first<{
    drafts: number; sent: number; overdue: number;
    ar_balance: number; paid_mtd: number;
  }>();

  const recent = await c.env.DB.prepare(`
    SELECT i.id, i.number, i.status, i.issue_date, i.due_date,
           i.total_amount, i.amount_paid, c.name AS client_name
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.org_id = ?1 ORDER BY i.created_at DESC LIMIT 10
  `).bind(session.orgId).all<{
    id: string; number: string; status: string; issue_date: string;
    due_date: string; total_amount: number; amount_paid: number; client_name: string;
  }>();

  const fmt = (v: number | null) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v ?? 0);
  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: 'badge-gray', sent: 'badge-blue', paid: 'badge-green',
      overdue: 'badge-red', void: 'badge-gray',
    };
    return `<span class="badge ${map[s] ?? 'badge-gray'}">${s}</span>`;
  };

  const rows = (recent.results ?? []).map(inv => `
    <tr>
      <td><a href="/invoices/${inv.id}" style="color:var(--brand);text-decoration:none">${inv.number}</a></td>
      <td>${inv.client_name ?? '—'}</td>
      <td>${inv.issue_date ?? '—'}</td>
      <td>${inv.due_date ?? '—'}</td>
      <td>${fmt(inv.total_amount)}</td>
      <td>${fmt(inv.amount_paid)}</td>
      <td>${statusBadge(inv.status)}</td>
      <td>
        <a href="/invoices/${inv.id}/pdf" style="color:var(--brand);font-size:.75rem">PDF</a>
      </td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Invoicing — InsightHunter</title>
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
    .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:2rem}
    .kpi{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem}
    .kpi-label{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:.35rem}
    .kpi-value{font-size:1.6rem;font-weight:800}
    .kpi-value.green{color:var(--green)} .kpi-value.red{color:var(--red)}
    .card{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:1.5rem}
    .card-header{padding:1rem 1.5rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
    .card-title{font-size:.9rem;font-weight:700}
    .btn{background:var(--brand);color:#fff;border:none;border-radius:8px;padding:.55rem 1.1rem;font-size:.875rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}
    .btn:hover{opacity:.85}
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
  </style>
</head>
<body>
  <nav>
    <div class="logo">🧾 Invoicing</div>
    <div class="nav-links">
      <a href="/" class="active">Invoices</a>
      <a href="/clients">Clients</a>
    </div>
    <div class="nav-right">
      <span>${session.orgName}</span>
      <a class="back-link" href="${c.env.DASHBOARD_URL}">← Dashboard</a>
    </div>
  </nav>
  <main>
    <div class="kpis">
      <div class="kpi"><div class="kpi-label">AR Balance</div><div class="kpi-value">${fmt(stats?.ar_balance ?? 0)}</div></div>
      <div class="kpi"><div class="kpi-label">Paid This Month</div><div class="kpi-value green">${fmt(stats?.paid_mtd ?? 0)}</div></div>
      <div class="kpi"><div class="kpi-label">Sent</div><div class="kpi-value">${stats?.sent ?? 0}</div></div>
      <div class="kpi"><div class="kpi-label">Overdue</div><div class="kpi-value red">${stats?.overdue ?? 0}</div></div>
      <div class="kpi"><div class="kpi-label">Drafts</div><div class="kpi-value">${stats?.drafts ?? 0}</div></div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Recent Invoices</span>
        <a class="btn" href="/invoices/new">+ New Invoice</a>
      </div>
      <table>
        <thead><tr><th>#</th><th>Client</th><th>Issued</th><th>Due</th><th>Total</th><th>Paid</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8" class="empty">No invoices yet. Create your first invoice to get started.</td></tr>'}</tbody>
      </table>
    </div>
  </main>
</body>
</html>`;

  return c.html(html);
});

export default app;
