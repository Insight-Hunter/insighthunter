// apps/insighthunter-bookkeeping — Bank feed ingestion, transaction management & reconciliation
// Deployed at bookkeeping.insighthunter.app
// Auth: reads X-* identity headers from apps/gateway.

import { Hono } from "hono";
import { cors } from "hono/cors";
import { handleImportJob } from "./queues/import-jobs.js";
import { accountRoutes } from "./routes/accounts.js";
import { importRoutes } from "./routes/imports.js";
import { reconciliationRoutes } from "./routes/reconciliation.js";
import { transactionRoutes } from "./routes/transactions.js";

export type Env = {
  DB: D1Database;
  IMPORTS: R2Bucket;
  IMPORT_QUEUE: Queue;
  KV_IMPORT_STATUS: KVNamespace;
  AUTH_URL: string;
  DASHBOARD_URL: string;
  ENVIRONMENT: string;
};

export type Session = {
  userId: string;
  orgId: string;
  email: string;
  name: string;
  role: string;
  orgName: string;
  orgPlan: string;
};

export function getSession(req: Request): Session | null {
  const userId = req.headers.get("X-User-Id");
  const orgId = req.headers.get("X-Org-Id");
  const role = req.headers.get("X-User-Role");
  const email = req.headers.get("X-User-Email");
  if (!userId || !orgId || !role || !email) return null;
  return {
    userId,
    orgId,
    role,
    email,
    name: req.headers.get("X-User-Name") ?? email,
    orgName: req.headers.get("X-Org-Name") ?? "My Org",
    orgPlan: req.headers.get("X-Org-Plan") ?? "starter",
  };
}

const app = new Hono<{ Bindings: Env }>();

// Security headers
app.use("*", async (c, next) => {
  await next();
  c.header("X-Frame-Options", "DENY");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
});

// CORS for API calls from *.insighthunter.app
app.use(
  "/api/*",
  cors({
    origin: (o) => (o?.endsWith(".insighthunter.app") ? o : null),
    credentials: true,
  }),
);

// Auth guard — all routes except /health require gateway headers
app.use("/*", async (c, next) => {
  if (c.req.path === "/health") return next();
  const session = getSession(c.req.raw);
  if (!session) {
    const isHtml = (c.req.header("Accept") ?? "").includes("text/html");
    if (isHtml)
      return c.redirect(`${c.env.AUTH_URL}/login?redirect=${encodeURIComponent(c.req.url)}`, 302);
    return c.json({ error: "unauthorized" }, 401);
  }
  return next();
});

// Public
app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "insighthunter-bookkeeping",
    ts: Date.now(),
    env: c.env.ENVIRONMENT,
  }),
);

// API routes
app.route("/api/imports", importRoutes);
app.route("/api/transactions", transactionRoutes);
app.route("/api/accounts", accountRoutes);
app.route("/api/reconciliation", reconciliationRoutes);

// SSR UI
app.get("/", async (c) => {
  const session = getSession(c.req.raw)!;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bookkeeping — InsightHunter</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--brand:#0ea5e9;--dark:#0f172a;--nav:#080f1e;--card:#1a2540;--text:#e2e8f0;--muted:#64748b;--border:#1e3a5f;--green:#22c55e;--red:#ef4444}
    body{font-family:system-ui,sans-serif;background:var(--dark);color:var(--text);min-height:100vh}
    nav{background:var(--nav);border-bottom:1px solid var(--border);padding:.9rem 2rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
    .logo{font-weight:900;font-size:1.1rem;color:var(--brand)}
    .nav-links{display:flex;gap:1.5rem;font-size:.85rem}
    .nav-links a{color:var(--muted);text-decoration:none;padding:.35rem .6rem;border-radius:6px;transition:color .15s}
    .nav-links a:hover,.nav-links a.active{color:var(--brand)}
    .nav-right{display:flex;align-items:center;gap:1rem;font-size:.83rem;color:var(--muted)}
    .back-link{color:var(--brand);text-decoration:none;font-weight:600}
    main{max-width:1280px;margin:0 auto;padding:2rem}
    /* Tabs */
    .tabs{display:flex;gap:.5rem;margin-bottom:2rem;border-bottom:1px solid var(--border);padding-bottom:0}
    .tab{background:none;border:none;color:var(--muted);font-size:.9rem;font-weight:600;padding:.6rem 1rem;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .15s,border-color .15s}
    .tab.active{color:var(--brand);border-bottom-color:var(--brand)}
    .panel{display:none}.panel.active{display:block}
    /* Upload */
    .upload-zone{border:2px dashed var(--border);border-radius:12px;padding:3rem;text-align:center;color:var(--muted);cursor:pointer;transition:border-color .15s}
    .upload-zone:hover{border-color:var(--brand)}
    .upload-zone input{display:none}
    .btn{background:var(--brand);color:#fff;border:none;border-radius:8px;padding:.6rem 1.2rem;font-size:.875rem;font-weight:600;cursor:pointer;transition:opacity .15s}
    .btn:hover{opacity:.85}
    .btn-ghost{background:none;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:.5rem 1rem;font-size:.83rem;cursor:pointer}
    /* Tables */
    .card{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:1.5rem}
    .card-header{padding:1rem 1.5rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
    .card-title{font-size:.9rem;font-weight:700}
    table{width:100%;border-collapse:collapse;font-size:.83rem}
    th{text-align:left;color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;padding:.6rem 1rem;border-bottom:1px solid var(--border)}
    td{padding:.6rem 1rem;border-bottom:1px solid #182030;color:var(--text)}
    tr:last-child td{border-bottom:none}
    tr:hover td{background:#1e2d45}
    .badge{display:inline-block;border-radius:6px;padding:.15rem .5rem;font-size:.7rem;font-weight:600}
    .badge-green{background:#22c55e20;color:var(--green)}
    .badge-red{background:#ef444420;color:var(--red)}
    .badge-blue{background:#0ea5e920;color:var(--brand)}
    .badge-gray{background:#33415520;color:var(--muted)}
    .amount-pos{color:var(--green)} .amount-neg{color:var(--red)}
    .empty{color:var(--muted);font-style:italic;padding:2rem;text-align:center}
    /* Import progress */
    .progress-wrap{margin:1rem 0}
    .progress-bar{height:6px;background:var(--border);border-radius:3px;overflow:hidden}
    .progress-fill{height:100%;background:var(--brand);border-radius:3px;transition:width .3s}
    .status-msg{font-size:.8rem;color:var(--muted);margin-top:.4rem}
    /* Filters */
    .filters{display:flex;gap:.75rem;margin-bottom:1rem;flex-wrap:wrap}
    .filters input,.filters select{background:var(--card);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:.4rem .75rem;font-size:.83rem}
  </style>
</head>
<body>
  <nav>
    <div class="logo">📒 Bookkeeping</div>
    <div class="nav-links">
      <a href="#" class="active" onclick="showTab('transactions',this)">Transactions</a>
      <a href="#" onclick="showTab('import',this)">Import</a>
      <a href="#" onclick="showTab('accounts',this)">Chart of Accounts</a>
      <a href="#" onclick="showTab('reconciliation',this)">Reconciliation</a>
    </div>
    <div class="nav-right">
      <span>${session.orgName}</span>
      <a class="back-link" href="${c.env.DASHBOARD_URL}">← Dashboard</a>
    </div>
  </nav>
  <main>
    <!-- Transactions tab -->
    <div id="tab-transactions" class="panel active">
      <div class="filters">
        <input type="text" id="txn-search" placeholder="Search transactions…" oninput="filterTxns()">
        <select id="txn-cat" onchange="filterTxns()">
          <option value="">All categories</option>
          <option>Payroll</option><option>Office Supplies</option><option>Transportation</option>
          <option>Bank Fees</option><option>Revenue</option><option>Uncategorized</option>
        </select>
        <select id="txn-status" onchange="filterTxns()">
          <option value="">All statuses</option>
          <option value="posted">Posted</option>
          <option value="pending">Pending</option>
        </select>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Transactions</span>
          <button class="btn" onclick="showTab('import',document.querySelector('.nav-links a:nth-child(2)'))">+ Import Bank Statement</button>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody id="txn-body"><tr><td colspan="6" class="empty">Loading transactions…</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- Import tab -->
    <div id="tab-import" class="panel">
      <div class="card">
        <div class="card-header"><span class="card-title">Import Bank Statement</span></div>
        <div style="padding:1.5rem">
          <div class="upload-zone" id="drop-zone" onclick="document.getElementById('file-input').click()" ondragover="event.preventDefault()" ondrop="handleDrop(event)">
            <input type="file" id="file-input" accept=".csv,.ofx" onchange="handleFile(this.files[0])">
            <div style="font-size:2rem;margin-bottom:.5rem">📂</div>
            <div style="font-weight:600">Drop CSV or OFX file here, or click to browse</div>
            <div style="font-size:.8rem;margin-top:.3rem">Supports: Chase, Bank of America, Wells Fargo, Stripe, QuickBooks CSV</div>
          </div>
          <div id="import-progress" style="display:none" class="progress-wrap">
            <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
            <div class="status-msg" id="status-msg">Uploading…</div>
          </div>
          <div id="import-review" style="display:none">
            <h3 style="margin:1.5rem 0 .75rem;font-size:.9rem;font-weight:700">Review Imported Rows</h3>
            <table>
              <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Category</th><th>Confidence</th></tr></thead>
              <tbody id="review-body"></tbody>
            </table>
            <div style="margin-top:1rem;display:flex;gap:.75rem">
              <button class="btn" id="commit-btn" onclick="commitImport()">Commit to Ledger</button>
              <button class="btn-ghost" onclick="cancelImport()">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Chart of Accounts tab -->
    <div id="tab-accounts" class="panel">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Chart of Accounts</span>
          <button class="btn" onclick="showAddAccount()">+ Add Account</button>
        </div>
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Status</th><th></th></tr></thead>
          <tbody id="accounts-body"><tr><td colspan="5" class="empty">Loading accounts…</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- Reconciliation tab -->
    <div id="tab-reconciliation" class="panel">
      <div class="card">
        <div class="card-header"><span class="card-title">Open Reconciliation Items</span></div>
        <table>
          <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Account</th><th>Action</th></tr></thead>
          <tbody id="recon-body"><tr><td colspan="5" class="empty">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>
  </main>

  <script>
    let currentImportId = null;
    let allTxns = [];

    function showTab(name, el) {
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
      document.getElementById('tab-' + name).classList.add('active');
      if (el) el.classList.add('active');
      if (name === 'transactions') loadTxns();
      if (name === 'accounts') loadAccounts();
      if (name === 'reconciliation') loadRecon();
    }

    const fmt = v => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v);
    const date = s => s ? new Date(s).toLocaleDateString() : '—';

    // Transactions
    async function loadTxns() {
      const res = await fetch('/api/transactions?limit=100', {credentials:'include'});
      const d = await res.json();
      allTxns = d.transactions ?? [];
      renderTxns(allTxns);
    }

    function renderTxns(rows) {
      const tb = document.getElementById('txn-body');
      if (!rows.length) { tb.innerHTML = '<tr><td colspan="6" class="empty">No transactions yet. Import a bank statement to get started.</td></tr>'; return; }
      tb.innerHTML = rows.map(t => {
        const cls = t.amount >= 0 ? 'amount-pos' : 'amount-neg';
        const badge = t.status === 'posted' ? 'badge-green' : 'badge-gray';
        return '<tr><td>'+date(t.date)+'</td><td>'+t.description+'</td><td><span class="badge badge-blue">'+t.category+'</span></td><td class="'+cls+'">'+fmt(t.amount)+'</td><td><span class="badge '+badge+'">'+t.status+'</span></td><td><button class="btn-ghost" onclick="editTxn(\''+t.id+'\',\''+t.category+'\')" style="padding:.25rem .6rem;font-size:.75rem">Edit</button></td></tr>';
      }).join('');
    }

    function filterTxns() {
      const q = document.getElementById('txn-search').value.toLowerCase();
      const cat = document.getElementById('txn-cat').value;
      const status = document.getElementById('txn-status').value;
      renderTxns(allTxns.filter(t =>
        (!q || t.description.toLowerCase().includes(q)) &&
        (!cat || t.category === cat) &&
        (!status || t.status === status)
      ));
    }

    async function editTxn(id, currentCat) {
      const cat = prompt('Category:', currentCat);
      if (!cat) return;
      await fetch('/api/transactions/'+id, {method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({category:cat})});
      loadTxns();
    }

    // Import
    function handleDrop(e) { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }
    function handleFile(file) {
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      document.getElementById('import-progress').style.display = 'block';
      setProgress(20, 'Uploading file…');
      fetch('/api/imports/upload', {method:'POST',credentials:'include',body:fd})
        .then(r => r.json())
        .then(d => { currentImportId = d.importId; pollImport(); })
        .catch(() => setProgress(0, 'Upload failed'));
    }

    function setProgress(pct, msg) {
      document.getElementById('progress-fill').style.width = pct + '%';
      document.getElementById('status-msg').textContent = msg;
    }

    async function pollImport() {
      setProgress(50, 'Processing rows…');
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 1500));
        const res = await fetch('/api/imports/' + currentImportId, {credentials:'include'});
        const d = await res.json();
        if (d.status === 'parsed' || d.status === 'ready') {
          setProgress(90, d.rowCount + ' rows parsed. Review below.');
          showReview(d.rows ?? []);
          return;
        }
        if (d.status === 'error') { setProgress(0, 'Parse error: ' + (d.error ?? 'unknown')); return; }
      }
      setProgress(0, 'Timed out waiting for parse.');
    }

    function showReview(rows) {
      document.getElementById('import-review').style.display = 'block';
      document.getElementById('review-body').innerHTML = rows.map(r =>
        '<tr><td>'+date(r.normalizedDate)+'</td><td>'+r.normalizedDescription+'</td><td>'+fmt(r.normalizedAmount ?? 0)+'</td><td>'
        +'<input value="'+(r.category??'')+'" data-id="'+r.id+'" style="background:transparent;border:1px solid var(--border);color:var(--text);border-radius:4px;padding:.2rem .4rem;width:140px">'
        +'</td><td>'+(Math.round((r.confidence??0)*100))+'%</td></tr>'
      ).join('');
    }

    async function commitImport() {
      document.getElementById('commit-btn').textContent = 'Committing…';
      const overrides = [...document.querySelectorAll('#review-body input')].map(el => ({id:el.dataset.id, category:el.value}));
      await fetch('/api/imports/'+currentImportId+'/commit', {method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({overrides})
      });
      document.getElementById('import-review').style.display = 'none';
      document.getElementById('import-progress').style.display = 'none';
      currentImportId = null;
      showTab('transactions', document.querySelector('.nav-links a'));
    }

    function cancelImport() {
      document.getElementById('import-review').style.display = 'none';
      document.getElementById('import-progress').style.display = 'none';
      currentImportId = null;
    }

    // Chart of Accounts
    async function loadAccounts() {
      const res = await fetch('/api/accounts', {credentials:'include'});
      const d = await res.json();
      const tb = document.getElementById('accounts-body');
      const rows = d.accounts ?? [];
      if (!rows.length) { tb.innerHTML = '<tr><td colspan="5" class="empty">No accounts yet.</td></tr>'; return; }
      tb.innerHTML = rows.map(a => {
        const badge = a.archived ? 'badge-gray' : 'badge-green';
        const label = a.archived ? 'Archived' : 'Active';
        return '<tr><td>'+a.code+'</td><td>'+a.name+'</td><td><span class="badge badge-blue">'+a.type+'</span></td><td><span class="badge '+badge+'">'+label+'</span></td><td><button class="btn-ghost" onclick="archiveAccount(\''+a.id+'\')" style="padding:.25rem .6rem;font-size:.75rem">'+(a.archived?'Restore':'Archive')+'</button></td></tr>';
      }).join('');
    }

    async function showAddAccount() {
      const code = prompt('Account code (e.g. 1010):'); if (!code) return;
      const name = prompt('Account name:'); if (!name) return;
      const type = prompt('Type (ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE):'); if (!type) return;
      await fetch('/api/accounts', {method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,name,type:type.toUpperCase()})});
      loadAccounts();
    }

    async function archiveAccount(id) {
      await fetch('/api/accounts/'+id, {method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({archived:true})});
      loadAccounts();
    }

    // Reconciliation
    async function loadRecon() {
      const res = await fetch('/api/reconciliation', {credentials:'include'});
      const d = await res.json();
      const tb = document.getElementById('recon-body');
      const rows = d.items ?? [];
      if (!rows.length) { tb.innerHTML = '<tr><td colspan="5" class="empty">✅ All items reconciled.</td></tr>'; return; }
      tb.innerHTML = rows.map(r =>
        '<tr><td>'+date(r.txn_date)+'</td><td>'+r.description+'</td><td class="'+(r.amount>=0?'amount-pos':'amount-neg')+'">'+fmt(r.amount)+'</td><td>'+r.account_name+'</td><td><button class="btn-ghost" onclick="clearItem(\''+r.id+'\')" style="padding:.25rem .6rem;font-size:.75rem">Clear</button></td></tr>'
      ).join('');
    }

    async function clearItem(id) {
      await fetch('/api/reconciliation/clear', {method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
      loadRecon();
    }

    // Init
    loadTxns();
  </script>
</body>
</html>`;
  return c.html(html);
});

// Queue handler — processes CSV import jobs asynchronously
export default {
  fetch: app.fetch,
  async queue(
    batch: MessageBatch<{ importId: string; objectKey: string; orgId: string }>,
    env: Env,
  ): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await handleImportJob(msg.body, env);
        msg.ack();
      } catch (err) {
        console.error("[bookkeeping] queue job failed", err);
        msg.retry();
      }
    }
  },
};
