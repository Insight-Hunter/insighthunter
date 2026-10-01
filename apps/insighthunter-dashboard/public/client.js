// Insight Hunter — Dashboard (client)
//
// Talks to /api/* on this Worker, which proxies each tab to the real module
// Worker that owns that data (insighthunter-invoicing, -bills, -payroll,
// -ledger, -insights) via Cloudflare service bindings. No local fake data.

let session = null;
let tab = "overview";
const cache = {}; // per-tab fetched data, refetched on tab switch / Refresh

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function usd(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function toast(message, kind = "ok") {
  const el = $("#toast");
  el.textContent = message;
  el.className = `toast show ${kind}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.className = "toast"), 2600);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method ?? "GET",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

async function loadTab(name) {
  try {
    if (name === "overview") cache.overview = await api("/api/overview");
    if (name === "invoices") cache.invoices = await api("/api/invoices");
    if (name === "bills") cache.bills = await api("/api/bills");
    if (name === "payroll") cache.payroll = await api("/api/payroll/employees");
    if (name === "journal") cache.journal = await api("/api/journal");
  } catch (err) {
    toast(String(err?.message || err), "error");
  }
}

async function switchTab(name) {
  tab = name;
  render();
  if (!cache[name]) await loadTab(name);
  render();
}

async function refreshTab() {
  await loadTab(tab);
  render();
  toast("Refreshed");
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ── Render shell ─────────────────────────────────────────────────────────────
function render() {
  const root = $("#app");
  const body =
    tab === "invoices"
      ? invoicesHtml()
      : tab === "bills"
        ? billsHtml()
        : tab === "payroll"
          ? payrollHtml()
          : tab === "journal"
            ? journalHtml()
            : tab === "apps"
              ? appsHtml()
              : overviewHtml();

  const planLabel = session.org.tier.charAt(0).toUpperCase() + session.org.tier.slice(1);

  root.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">◈</span>
        <div>
          <div class="brand-name">Insight Hunter</div>
          <div class="brand-sub">Dashboard</div>
        </div>
      </div>
      <div class="orgbox">
        <div class="org-name">${esc(session.org.name)}</div>
        <div class="org-sub">${esc(session.user.name)} · <span class="chip ghost">${esc(planLabel)}</span></div>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" data-act="refresh">Refresh</button>
        <a class="btn btn-ghost" href="https://auth.insighthunter.app/logout">Sign out</a>
      </div>
    </header>

    <nav class="tabs" aria-label="Modules">
      <button class="tab ${tab === "overview" ? "active" : ""}" data-tab="overview">Overview</button>
      <button class="tab ${tab === "invoices" ? "active" : ""}" data-tab="invoices">Invoices</button>
      <button class="tab ${tab === "bills" ? "active" : ""}" data-tab="bills">Bills</button>
      <button class="tab ${tab === "payroll" ? "active" : ""}" data-tab="payroll">Payroll</button>
      <button class="tab ${tab === "journal" ? "active" : ""}" data-tab="journal">Journal</button>
      <button class="tab ${tab === "apps" ? "active" : ""}" data-tab="apps">Apps</button>
    </nav>

    ${body}

    <footer class="footer">
      Every tab reads and writes real data in insighthunter-invoicing, insighthunter-bills,
      insighthunter-payroll, insighthunter-ledger and insighthunter-insights — not local demo data.
    </footer>
  `;

  bind();
}

// ── Overview — insighthunter-insights ───────────────────────────────────────
function overviewHtml() {
  const data = cache.overview;
  if (!data) return `<p class="empty">Loading overview…</p>`;
  if (data.error) return `<p class="empty">Insights service unavailable: ${esc(data.error)}</p>`;

  const trendCls = (t) => (t === "up" ? "pos" : t === "down" ? "neg" : "");
  const kpis = data.kpis ?? [];
  const health = data.health ?? { score: 0, label: "—", breakdown: {} };

  return `
    <section class="kpis" aria-label="Key numbers">
      ${kpis
        .map(
          (k) => `
        <article class="kpi">
          <span class="kpi-label">${esc(k.label)}</span>
          <span class="kpi-value ${trendCls(k.trend)}">${k.unit === "currency" ? usd(k.value) : k.unit === "days" ? `${k.value} d` : k.value}</span>
          <span class="kpi-sub">${k.trend === "up" ? "↑" : k.trend === "down" ? "↓" : "→"} vs last period</span>
        </article>`,
        )
        .join("")}
    </section>

    <section class="charts" aria-label="Financial charts">
      <article class="card flow-card">
        <div class="card-head"><h2>Cash flow</h2><span class="chip ghost">trailing 12 mo</span></div>
        ${cashFlowChart(data.cashflow ?? [])}
      </article>
      <article class="card">
        <div class="card-head"><h2>Business health</h2></div>
        <div class="hs-score">${health.score}<span class="hs-label">${esc(health.label)}</span></div>
        <ul class="h-list">
          ${Object.entries(health.breakdown ?? {})
            .map(([k, v]) => `<li class="h-row"><div class="h-label"><span class="name">${esc(k.replace(/_/g, " "))}</span><span class="val">${v}</span></div><div class="h-track"><div class="h-fill cyan" style="width:${Math.max(2, v)}%"></div></div></li>`)
            .join("")}
        </ul>
      </article>
    </section>`;
}

function cashFlowChart(months) {
  if (!months.length) return '<p class="empty">No cash flow data yet.</p>';
  const W = 720, H = 220, P = 12;
  const values = months.map((m) => m.net);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const xs = months.map((_, i) => P + (i / Math.max(1, months.length - 1)) * (W - P * 2));
  const ys = values.map((v) => H - P - ((v - min) / span) * (H - P * 2));
  const linePts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const areaPts = `${P},${H - P} ${linePts} ${W - P},${H - P}`;
  const zeroY = H - P - ((0 - min) / span) * (H - P * 2);
  return `
    <svg class="flow-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgba(34, 211, 238, 0.32)"></stop>
          <stop offset="1" stop-color="rgba(34, 211, 238, 0)"></stop>
        </linearGradient>
      </defs>
      <line class="axis" x1="${P}" y1="${zeroY.toFixed(1)}" x2="${W - P}" y2="${zeroY.toFixed(1)}"></line>
      <polygon class="flow-area" points="${areaPts}" fill="url(#flowGrad)"></polygon>
      <polyline class="flow-line" points="${linePts}" vector-effect="non-scaling-stroke"></polyline>
    </svg>
    <div class="flow-months">${months.map((m) => `<span>${esc(m.month)}</span>`).join("")}</div>`;
}

// ── Invoices — insighthunter-invoicing ──────────────────────────────────────
function invoicesHtml() {
  const data = cache.invoices;
  const rows = data?.invoices ?? [];
  return `
    <section class="card">
      <div class="card-head"><h2>New invoice</h2></div>
      <form class="form-grid" data-form="invoice">
        <input name="client" placeholder="Client name" required maxlength="120" />
        <input name="issue" type="date" value="${today()}" required />
        <input name="due" type="date" value="${today()}" required />
        <input name="memo" placeholder="Memo (optional)" maxlength="200" />
        ${lineItemsHtml()}
        <button class="btn" type="submit">Create &amp; send invoice</button>
      </form>
    </section>
    <section class="card">
      <div class="card-head"><h2>Receivables</h2><span class="count">${rows.length}</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Client</th><th>Issued</th><th>Due</th><th class="num">Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows.map(invoiceRow).join("") || '<tr><td colspan="7" class="empty">No invoices yet.</td></tr>'}</tbody>
        </table>
      </div>
    </section>`;
}

function invoiceRow(inv) {
  return `
    <tr>
      <td class="mono">${esc(inv.number)}</td>
      <td>${esc(inv.client_name || "—")}</td>
      <td class="mono">${esc(inv.issue_date)}</td>
      <td class="mono">${esc(inv.due_date || "")}</td>
      <td class="num pos">${usd(inv.total_amount)}</td>
      <td><span class="chip ${inv.status === "paid" ? "" : "auto"}">${esc(inv.status)}</span></td>
      <td class="row-actions">
        ${inv.status === "sent" || inv.status === "overdue" ? `<button class="btn btn-ghost" data-pay-inv="${esc(inv.id)}">Mark paid</button>` : ""}
        ${!["paid", "void"].includes(inv.status) ? `<button class="icon-btn" data-void-inv="${esc(inv.id)}" aria-label="Void invoice">✕</button>` : ""}
      </td>
    </tr>`;
}

// ── Bills — insighthunter-bills ─────────────────────────────────────────────
function billsHtml() {
  const data = cache.bills;
  const rows = data?.bills ?? [];
  return `
    <section class="card">
      <div class="card-head"><h2>New bill</h2></div>
      <form class="form-grid" data-form="bill">
        <input name="vendor" placeholder="Vendor name" required maxlength="120" />
        <input name="issue" type="date" value="${today()}" required />
        <input name="due" type="date" value="${today()}" required />
        <input name="memo" placeholder="Memo (optional)" maxlength="200" />
        ${lineItemsHtml()}
        <button class="btn" type="submit">Add bill</button>
      </form>
    </section>
    <section class="card">
      <div class="card-head"><h2>Payables</h2><span class="count">${rows.length}</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Vendor</th><th>Issued</th><th>Due</th><th class="num">Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows.map(billRow).join("") || '<tr><td colspan="7" class="empty">No bills yet.</td></tr>'}</tbody>
        </table>
      </div>
    </section>`;
}

function billRow(bill) {
  return `
    <tr>
      <td class="mono">${esc(bill.bill_number)}</td>
      <td>${esc(bill.vendor_name)}</td>
      <td class="mono">${esc(bill.issue_date)}</td>
      <td class="mono">${esc(bill.due_date)}</td>
      <td class="num neg">${usd(bill.total_amount)}</td>
      <td><span class="chip ${bill.status === "paid" ? "" : "auto"}">${esc(bill.status)}</span></td>
      <td class="row-actions">
        ${!["paid", "void"].includes(bill.status) ? `<button class="btn btn-ghost" data-pay-bill="${esc(bill.id)}">Pay</button>` : ""}
        ${!["paid", "void"].includes(bill.status) ? `<button class="icon-btn" data-void-bill="${esc(bill.id)}" aria-label="Void bill">✕</button>` : ""}
      </td>
    </tr>`;
}

// ── Payroll — insighthunter-payroll ─────────────────────────────────────────
function payrollHtml() {
  const employees = cache.payroll?.employees ?? [];
  return `
    <section class="card">
      <div class="card-head"><h2>Employees</h2><span class="count">${employees.length}</span></div>
      <ul class="accounts">
        ${employees
          .map(
            (e) => `
            <li>
              <div><span class="acct-name">${esc(e.name)}</span><span class="acct-type">${esc(e.pay_type)}</span></div>
              <span class="acct-bal pos">${usd(e.pay_rate)}${e.pay_type === "hourly" ? "/hr" : "/yr"}</span>
            </li>`,
          )
          .join("") || '<li class="empty">No employees yet.</li>'}
      </ul>
      <form class="add-panel" data-form="employee">
        <input name="name" placeholder="Employee name" required maxlength="80" />
        <input name="salary" type="number" step="0.01" min="0.01" placeholder="Annual salary" required />
        <button class="btn" type="submit">Add employee</button>
      </form>
      <p class="hint">Payroll run approval requires tax-provider onboarding in the Payroll app itself — <a class="btn-ghost btn" href="https://payroll.insighthunter.app">open Payroll →</a></p>
    </section>`;
}

// ── Journal — insighthunter-ledger ──────────────────────────────────────────
function journalHtml() {
  const data = cache.journal;
  const accounts = data?.accounts ?? [];
  const entries = data?.entries ?? [];
  return `
    <main class="grid">
      <section class="card">
        <div class="card-head"><h2>Chart of accounts</h2><span class="count">${accounts.length}</span></div>
        <ul class="accounts">
          ${accounts.map((a) => `<li><div><span class="acct-name">${esc(a.code)} · ${esc(a.name)}</span><span class="acct-type">${esc(a.type)}</span></div></li>`).join("") || '<li class="empty">No accounts yet.</li>'}
        </ul>
        <form class="add-panel" data-form="account">
          <input name="code" placeholder="Code (e.g. 1000)" required maxlength="10" />
          <input name="name" placeholder="Account name" required maxlength="60" />
          <select name="type">
            <option value="ASSET">Asset</option>
            <option value="LIABILITY">Liability</option>
            <option value="EQUITY">Equity</option>
            <option value="REVENUE">Revenue</option>
            <option value="EXPENSE">Expense</option>
          </select>
          <button class="btn" type="submit">Add account</button>
        </form>
      </section>
      <section class="card">
        <div class="card-head"><h2>Manual entry</h2></div>
        <form class="add-panel" data-form="journal">
          <input name="memo" placeholder="Memo" maxlength="200" required />
          <select name="debit">${coaOptions(accounts)}</select>
          <select name="credit">${coaOptions(accounts)}</select>
          <input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount" required />
          <button class="btn" type="submit">Post journal</button>
        </form>
        <p class="hint">Two-line entry: Dr first account / Cr second account. Debits must equal credits.</p>
        <div class="card-head"><h2>General ledger</h2><span class="count">${entries.length}</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Memo</th></tr></thead>
            <tbody>${entries.map((e) => `<tr><td class="mono">${esc((e.posted_at || e.created_at || "").slice(0, 10))}</td><td>${esc(e.memo || "")}</td></tr>`).join("") || '<tr><td colspan="2" class="empty">No journal entries yet.</td></tr>'}</tbody>
          </table>
        </div>
      </section>
    </main>`;
}

function coaOptions(accounts) {
  return accounts.map((a) => `<option value="${esc(a.id)}">${esc(a.code)} · ${esc(a.name)}</option>`).join("");
}

// ── Apps launcher ────────────────────────────────────────────────────────────
function appsHtml() {
  return `
    <section class="card">
      <div class="card-head"><h2>Your apps</h2></div>
      <div class="app-grid">
        ${session.apps
          .map(
            (a) => `
          <a class="tile" href="${esc(a.url)}">
            <div class="tile-icon">${a.icon}</div>
            <div class="tile-label">${esc(a.name)}</div>
            <div class="tile-desc">${esc(a.desc)}</div>
          </a>`,
          )
          .join("")}
      </div>
    </section>`;
}

// ── Shared form helpers ──────────────────────────────────────────────────────
function lineItemsHtml() {
  return `<div class="lines" data-lines>
    <div class="line-row">
      <input class="line-desc" placeholder="Description" maxlength="200" />
      <input class="line-amt" type="number" step="0.01" min="0.01" placeholder="Amount" />
      <button type="button" class="icon-btn line-del" aria-label="Remove line">✕</button>
    </div>
    <button type="button" class="btn btn-ghost add-line" data-add-line>+ Line item</button>
  </div>`;
}

function bindLines(root) {
  const box = root.querySelector("[data-lines]");
  if (!box) return;
  const add = box.querySelector("[data-add-line]");
  add?.addEventListener("click", () => {
    const row = document.createElement("div");
    row.className = "line-row";
    row.innerHTML = `<input class="line-desc" placeholder="Description" maxlength="200" /><input class="line-amt" type="number" step="0.01" min="0.01" placeholder="Amount" /><button type="button" class="icon-btn line-del" aria-label="Remove line">✕</button>`;
    row.querySelector(".line-del").addEventListener("click", () => row.remove());
    box.insertBefore(row, add);
  });
  box.querySelectorAll(".line-del").forEach((b) => b.addEventListener("click", () => b.closest(".line-row").remove()));
}

function readLines(root) {
  const box = root.querySelector("[data-lines]");
  if (!box) return [];
  return [...box.querySelectorAll(".line-row")]
    .map((row) => {
      const description = row.querySelector(".line-desc").value.trim() || "Item";
      const amountCents = Math.round((parseFloat(row.querySelector(".line-amt").value) || 0) * 100);
      return { description, amountCents };
    })
    .filter((l) => l.amountCents > 0);
}

// ── Events ───────────────────────────────────────────────────────────────────
function bind() {
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  $('[data-act="refresh"]')?.addEventListener("click", refreshTab);

  const formInvoice = $('[data-form="invoice"]');
  if (formInvoice) {
    bindLines(formInvoice);
    formInvoice.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      const lineItems = readLines(f);
      if (!lineItems.length) return toast("Add at least one line item", "error");
      try {
        await api("/api/invoices", {
          method: "POST",
          body: {
            client: f.elements.client.value,
            issueDate: f.elements.issue.value,
            dueDate: f.elements.due.value,
            memo: f.elements.memo.value,
            lineItems,
          },
        });
        toast("Invoice created");
        await loadTab("invoices");
        render();
      } catch (err) {
        toast(String(err.message || err), "error");
      }
    });
  }

  const formBill = $('[data-form="bill"]');
  if (formBill) {
    bindLines(formBill);
    formBill.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      const lineItems = readLines(f);
      if (!lineItems.length) return toast("Add at least one line item", "error");
      try {
        await api("/api/bills", {
          method: "POST",
          body: {
            vendor: f.elements.vendor.value,
            issueDate: f.elements.issue.value,
            dueDate: f.elements.due.value,
            memo: f.elements.memo.value,
            lineItems,
          },
        });
        toast("Bill added");
        await loadTab("bills");
        render();
      } catch (err) {
        toast(String(err.message || err), "error");
      }
    });
  }

  const formEmployee = $('[data-form="employee"]');
  formEmployee?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const raw = parseFloat(f.elements.salary.value);
    try {
      await api("/api/payroll/employees", {
        method: "POST",
        body: { name: f.elements.name.value, salaryCents: Math.round((Number.isFinite(raw) ? raw : 0) * 100) },
      });
      toast("Employee added");
      await loadTab("payroll");
      render();
    } catch (err) {
      toast(String(err.message || err), "error");
    }
  });

  const formAccount = $('[data-form="account"]');
  formAccount?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    try {
      await api("/api/journal/accounts", {
        method: "POST",
        body: { code: f.elements.code.value, name: f.elements.name.value, type: f.elements.type.value },
      });
      toast("Account added");
      await loadTab("journal");
      render();
    } catch (err) {
      toast(String(err.message || err), "error");
    }
  });

  const formJournal = $('[data-form="journal"]');
  formJournal?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const amount = parseFloat(f.elements.amount.value) || 0;
    const debitId = f.elements.debit.value;
    const creditId = f.elements.credit.value;
    if (!debitId || !creditId || debitId === creditId) return toast("Pick two different accounts", "error");
    try {
      await api("/api/journal", {
        method: "POST",
        body: {
          memo: f.elements.memo.value,
          lines: [
            { accountId: debitId, debit: amount, credit: 0 },
            { accountId: creditId, debit: 0, credit: amount },
          ],
        },
      });
      toast("Journal posted");
      await loadTab("journal");
      render();
    } catch (err) {
      toast(String(err.message || err), "error");
    }
  });

  document.querySelectorAll("[data-pay-inv]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api(`/api/invoices/${btn.dataset.payInv}/pay`, { method: "POST" });
        toast("Invoice marked paid");
        await loadTab("invoices");
        render();
      } catch (err) {
        toast(String(err.message || err), "error");
      }
    });
  });
  document.querySelectorAll("[data-void-inv]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api(`/api/invoices/${btn.dataset.voidInv}/void`, { method: "POST" });
        toast("Invoice voided");
        await loadTab("invoices");
        render();
      } catch (err) {
        toast(String(err.message || err), "error");
      }
    });
  });
  document.querySelectorAll("[data-pay-bill]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api(`/api/bills/${btn.dataset.payBill}/pay`, { method: "POST" });
        toast("Bill paid");
        await loadTab("bills");
        render();
      } catch (err) {
        toast(String(err.message || err), "error");
      }
    });
  });
  document.querySelectorAll("[data-void-bill]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api(`/api/bills/${btn.dataset.voidBill}/void`, { method: "POST" });
        toast("Bill voided");
        await loadTab("bills");
        render();
      } catch (err) {
        toast(String(err.message || err), "error");
      }
    });
  });
}

// ── Shell + style ────────────────────────────────────────────────────────────
function buildShell() {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  document.body.innerHTML = `
    <div class="page"><div id="app"></div></div>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>`;
}

const css = `
  :root {
    --bg: #070b12;
    --panel-hi: #141d2c;
    --panel-lo: #0a111c;
    --panel-2: #0d1522;
    --line: #1e2c40;
    --line-strong: #2b3d55;
    --ink: #dbe7f3;
    --ink-soft: #8ba0b6;
    --ink-faint: #5f7690;
    --cyan: #22d3ee;
    --cyan-bright: #7ee7ff;
    --cyan-dim: rgba(34, 211, 238, 0.14);
    --orange: #ff8a00;
    --orange-bright: #ffb25e;
    --orange-dim: rgba(255, 138, 0, 0.14);
  }

  * { box-sizing: border-box; border-radius: 0 !important; }
  html { color-scheme: dark; }
  html, body { margin: 0; }
  body {
    background:
      radial-gradient(1100px 700px at 85% -10%, rgba(34, 211, 238, 0.10), transparent 60%),
      radial-gradient(900px 700px at -10% 110%, rgba(255, 138, 0, 0.08), transparent 55%),
      var(--bg);
    color: var(--ink);
    font: 15px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .page { width: min(1240px, 100% - 2rem); margin: 0 auto; padding: 1.25rem 0 3rem; }
  h1, h2, h3 { margin: 0; }
  h2 { font-size: 1rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink); }

  .topbar, .card, .kpi {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0) 34%), linear-gradient(180deg, var(--panel-hi), var(--panel-lo));
    border: 1px solid var(--line);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 10px 30px rgba(0, 0, 0, 0.45);
  }
  .topbar {
    display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; padding: 1rem 1.25rem; margin-bottom: 1.25rem;
    border-bottom: 2px solid rgba(34, 211, 238, 0.35);
  }
  .brand { display: flex; align-items: center; gap: 0.6rem; }
  .brand-mark { font-size: 1.6rem; color: var(--cyan); text-shadow: 0 0 14px rgba(34, 211, 238, 0.55); }
  .brand-name { font-weight: 800; font-size: 1.05rem; letter-spacing: 0.02em; }
  .brand-sub { font-size: 0.72rem; color: var(--cyan-bright); letter-spacing: 0.22em; text-transform: uppercase; }
  .orgbox { flex: 1 1 260px; min-width: 220px; }
  .org-name { font-weight: 700; }
  .org-sub { font-size: 0.8rem; color: var(--ink-soft); }
  .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

  input, select, button { font: inherit; color: inherit; }
  input, select {
    padding: 0.55rem 0.65rem; border: 1px solid var(--line-strong); background: rgba(4, 9, 16, 0.6); color: var(--ink); min-width: 0;
  }
  input::placeholder { color: var(--ink-faint); }
  input:focus, select:focus { border-color: var(--cyan); outline: none; box-shadow: 0 0 0 1px var(--cyan), 0 0 14px rgba(34, 211, 238, 0.2); }

  .btn {
    border: 1px solid var(--cyan); background: linear-gradient(180deg, #3ae2f7, #0ea5c4); color: #04131a;
    padding: 0.55rem 0.95rem; font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; cursor: pointer;
    box-shadow: 0 0 16px rgba(34, 211, 238, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.35);
    transition: filter 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }
  .btn:hover { background: linear-gradient(180deg, #7ee7ff, #22d3ee); }
  .btn-ghost { background: rgba(34, 211, 238, 0.04); color: var(--cyan-bright); border-color: rgba(34, 211, 238, 0.5); box-shadow: none; }
  .btn-ghost:hover { background: rgba(34, 211, 238, 0.12); }

  .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
  .tab {
    padding: 0.55rem 1rem; background: rgba(34, 211, 238, 0.04); border: 1px solid var(--line-strong); color: var(--ink-soft);
    cursor: pointer; font: inherit; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;
  }
  .tab.active { background: linear-gradient(180deg, #3ae2f7, #0ea5c4); color: #04131a; border-color: var(--cyan); box-shadow: 0 0 16px rgba(34, 211, 238, 0.2); }

  .kpis { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.9rem; margin-bottom: 1.25rem; }
  .kpi { padding: 1rem; display: flex; flex-direction: column; gap: 0.2rem; border-top: 2px solid rgba(34, 211, 238, 0.55); }
  .kpi-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--ink-faint); }
  .kpi-value { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 1.45rem; font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .kpi-sub { font-size: 0.76rem; color: var(--ink-soft); }
  .pos { color: var(--cyan-bright); }
  .neg { color: var(--orange-bright); }
  .kpi-value.pos { text-shadow: 0 0 12px rgba(34, 211, 238, 0.35); }
  .kpi-value.neg { text-shadow: 0 0 12px rgba(255, 138, 0, 0.35); }

  .card { padding: 1.1rem 1.25rem; margin-bottom: 1.25rem; }
  .card-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.9rem; }
  .card-head h2::before { content: ""; display: inline-block; width: 8px; height: 8px; margin-right: 0.55rem; background: var(--cyan); box-shadow: 0 0 10px rgba(34, 211, 238, 0.7); }
  .grid { display: grid; grid-template-columns: 340px 1fr; gap: 1.25rem; align-items: start; }

  .charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; margin-bottom: 1.25rem; }
  .charts .card { margin-bottom: 0; }
  .flow-card { grid-column: 1 / -1; }

  .flow-svg { display: block; width: 100%; height: auto; }
  .flow-line { fill: none; stroke: var(--cyan); stroke-width: 2.5; filter: drop-shadow(0 0 6px rgba(34, 211, 238, 0.65)); }
  .flow-area { fill: url(#flowGrad); }
  .axis { stroke: var(--line-strong); stroke-width: 1; stroke-dasharray: 3 5; }
  .flow-months { display: flex; justify-content: space-between; gap: 0.5rem; margin-top: 0.5rem; color: var(--ink-faint); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.72rem; flex-wrap: wrap; }

  .hs-score { font-size: 2.6rem; font-weight: 900; color: var(--cyan-bright); display: flex; align-items: baseline; gap: 0.6rem; margin-bottom: 0.75rem; }
  .hs-label { font-size: 0.85rem; color: var(--ink-soft); font-weight: 600; text-transform: none; letter-spacing: 0; }

  .h-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; }
  .h-label { display: flex; justify-content: space-between; gap: 0.75rem; font-size: 0.85rem; }
  .h-label .name { color: var(--ink); text-transform: capitalize; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .h-label .val { color: var(--ink-soft); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .h-track { height: 8px; background: rgba(255, 255, 255, 0.06); border: 1px solid var(--line); }
  .h-fill { height: 100%; }
  .h-fill.cyan { background: linear-gradient(90deg, #0891b2, #7ee7ff); box-shadow: 0 0 10px rgba(34, 211, 238, 0.35); }

  .accounts { list-style: none; margin: 0 0 1rem; padding: 0; }
  .accounts li { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; padding: 0.65rem 0; border-bottom: 1px solid var(--line); }
  .acct-name { font-weight: 600; display: block; }
  .acct-type { font-size: 0.72rem; color: var(--ink-faint); text-transform: capitalize; letter-spacing: 0.06em; }
  .acct-bal { font-weight: 700; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }
  .add-panel { display: grid; gap: 0.5rem; }
  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; margin-bottom: 0; }
  .lines { display: grid; gap: 0.5rem; grid-column: 1 / -1; }
  .line-row { display: grid; grid-template-columns: 1fr 140px 32px; gap: 0.5rem; }
  .add-line { justify-self: start; }
  .hint { color: var(--ink-faint); font-size: 0.82rem; margin: 0.75rem 0 0; }
  .hint a { color: var(--cyan-bright); }

  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th, td { text-align: left; padding: 0.6rem 0.55rem; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--ink-faint); border-bottom: 1px solid var(--line-strong); }
  tbody tr:hover { background: rgba(34, 211, 238, 0.04); }
  td.num, th.num { text-align: right; }
  .mono, td.num { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }
  .chip { display: inline-block; font-size: 0.7rem; padding: 0.12rem 0.5rem; background: rgba(34, 211, 238, 0.08); color: var(--cyan-bright); border: 1px solid rgba(34, 211, 238, 0.22); white-space: nowrap; }
  .chip.auto { background: rgba(255, 138, 0, 0.1); color: var(--orange-bright); border-color: rgba(255, 138, 0, 0.3); }
  .chip.ghost { background: transparent; border-color: var(--line-strong); color: var(--ink-soft); }
  .icon-btn { border: 0; background: transparent; color: var(--ink-faint); cursor: pointer; font-size: 0.9rem; padding: 0.2rem 0.35rem; }
  .icon-btn:hover { color: var(--orange-bright); background: rgba(255, 138, 0, 0.1); }
  .row-actions { display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap; }
  .count { font-size: 0.8rem; color: var(--ink-soft); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  .empty { color: var(--ink-soft); text-align: center; padding: 1.5rem 0; }

  .app-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
  .tile { padding: 1.1rem; text-decoration: none; color: var(--ink); display: block; border: 1px solid var(--line-strong); background: rgba(34, 211, 238, 0.03); transition: border-color .15s; }
  .tile:hover { border-color: var(--cyan); }
  .tile-icon { font-size: 1.6rem; margin-bottom: 0.5rem; }
  .tile-label { font-weight: 700; margin-bottom: 0.2rem; }
  .tile-desc { font-size: 0.8rem; color: var(--ink-soft); }

  .footer { margin-top: 1rem; color: var(--ink-faint); font-size: 0.82rem; line-height: 1.6; text-align: center; }

  .toast {
    position: fixed; left: 50%; bottom: 1.25rem; transform: translateX(-50%) translateY(1rem);
    background: var(--panel-2); color: var(--ink); padding: 0.6rem 1rem; border: 1px solid rgba(34, 211, 238, 0.4);
    box-shadow: 0 0 20px rgba(34, 211, 238, 0.18); opacity: 0; pointer-events: none; transition: opacity 0.2s ease, transform 0.2s ease; font-size: 0.9rem;
  }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  .toast.error { border-color: rgba(255, 138, 0, 0.6); box-shadow: 0 0 20px rgba(255, 138, 0, 0.2); }

  @media (max-width: 1080px) { .kpis { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 980px) { .grid { grid-template-columns: 1fr; } }
  @media (max-width: 560px) { .kpis { grid-template-columns: repeat(2, 1fr); } .topbar { align-items: stretch; flex-direction: column; } .charts { grid-template-columns: 1fr; } }
`;

// ── Boot ─────────────────────────────────────────────────────────────────────
try {
  session = await api("/api/session");
  buildShell();
  await loadTab("overview");
  render();
} catch (err) {
  document.body.innerHTML = `<p style="color:#ffb25e;font:15px system-ui;padding:2rem">Failed to load dashboard: ${esc(err?.message || err)}</p>`;
}

