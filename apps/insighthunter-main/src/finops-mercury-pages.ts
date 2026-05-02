// apps/insighthunter-main/src/finops-mercury-pages.ts
type MercuryOverview = {
  metrics: {
    availableCash: number;
    currentCash: number;
    last30Inflows: number;
    last30Outflows: number;
    accountCount: number;
  };
  accounts: Array<{
    id: string;
    name: string;
    accountType: string;
    status: string;
    availableBalance: number;
    currentBalance: number;
  }>;
  alerts: Array<{
    id: string;
    severity: 'success' | 'warning' | 'danger';
    title: string;
    body: string;
  }>;
  sync: { status: string; at: string };
};

const FINOPS_API = 'https://finops.insighthunter.app/v1/mercury';

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
}

function pillClass(kind: string) {
  if (kind === 'success' || kind === 'active' || kind === 'credit') return 'pill pill-success';
  if (kind === 'warning') return 'pill pill-warning';
  if (kind === 'danger' || kind === 'debit') return 'pill pill-danger';
  return 'pill pill-muted';
}

async function api<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${FINOPS_API}${path}`, {
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export async function renderMercuryOverview(root: HTMLElement, token: string) {
  const data = await api<MercuryOverview>('/overview', token);
  root.innerHTML = `
    <section class="panel">
      <div class="panel-inner">
        <div class="label">Live available cash</div>
        <div class="hero-cash">${money(data.metrics.availableCash)}</div>
        <div class="muted">Current balance ${money(data.metrics.currentCash)} · ${data.metrics.accountCount} linked accounts</div>
      </div>
    </section>

    <section class="grid cards-4" style="margin-top:18px">
      <div class="metric"><div class="label">Available</div><div class="value">${money(data.metrics.availableCash)}</div></div>
      <div class="metric"><div class="label">Current</div><div class="value">${money(data.metrics.currentCash)}</div></div>
      <div class="metric"><div class="label">30d inflows</div><div class="value">${money(data.metrics.last30Inflows)}</div></div>
      <div class="metric"><div class="label">30d outflows</div><div class="value">${money(data.metrics.last30Outflows)}</div></div>
    </section>

    <section class="panel" style="margin-top:18px">
      <div class="panel-inner">
        <h3>Alerts</h3>
        <div class="list" style="margin-top:16px">
          ${data.alerts.map((a) => `
            <article class="alert">
              <div class="${pillClass(a.severity)}">${a.severity}</div>
              <h4 style="margin-top:10px">${a.title}</h4>
              <p>${a.body}</p>
            </article>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

export async function renderMercuryAccounts(root: HTMLElement, token: string) {
  const data = await api<{ items: MercuryOverview['accounts'] }>('/accounts', token);
  root.innerHTML = `
    <section class="panel">
      <div class="panel-inner">
        <h3>Accounts</h3>
        <div class="table-wrap" style="margin-top:16px">
          <table>
            <thead><tr><th>Account</th><th>Type</th><th>Status</th><th>Available</th><th>Current</th></tr></thead>
            <tbody>
              ${data.items.map((a) => `
                <tr>
                  <td>${a.name}</td>
                  <td>${a.accountType}</td>
                  <td><span class="${pillClass(a.status)}">${a.status}</span></td>
                  <td>${money(a.availableBalance)}</td>
                  <td>${money(a.currentBalance)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

export async function renderMercuryTransactions(root: HTMLElement, token: string) {
  const data = await api<{ items: Array<{ postedAt: string; description: string; direction: string; amount: number; status: string }> }>('/transactions', token);
  root.innerHTML = `
    <section class="panel">
      <div class="panel-inner">
        <h3>Transactions</h3>
        <div class="table-wrap" style="margin-top:16px">
          <table>
            <thead><tr><th>Date</th><th>Description</th><th>Direction</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              ${data.items.map((t) => `
                <tr>
                  <td>${t.postedAt}</td>
                  <td>${t.description}</td>
                  <td><span class="${pillClass(t.direction)}">${t.direction}</span></td>
                  <td>${money(t.amount)}</td>
                  <td><span class="pill pill-muted">${t.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

export async function renderMercuryAlerts(root: HTMLElement, token: string) {
  const data = await api<{ items: MercuryOverview['alerts'] }>('/alerts', token);
  root.innerHTML = `
    <section class="panel">
      <div class="panel-inner">
        <h3>Alerts</h3>
        <div class="list" style="margin-top:16px">
          ${data.items.map((a) => `
            <article class="alert">
              <div class="${pillClass(a.severity)}">${a.severity}</div>
              <h4 style="margin-top:10px">${a.title}</h4>
              <p>${a.body}</p>
            </article>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

export async function renderMercurySettings(root: HTMLElement, token: string) {
  const data = await api<{
    workspace: string;
    module: string;
    orgId: string;
    phase: string;
    authAuthority: string;
    deployment: string;
    syncMode: string;
  }>('/settings', token);

  root.innerHTML = `
    <section class="panel">
      <div class="panel-inner">
        <div class="setting-row"><div><strong>Workspace</strong><span>${data.workspace}</span></div></div>
        <div class="setting-row"><div><strong>Module</strong><span>${data.module}</span></div></div>
        <div class="setting-row"><div><strong>Org ID</strong><span>${data.orgId}</span></div></div>
        <div class="setting-row"><div><strong>Phase</strong><span>${data.phase}</span></div></div>
        <div class="setting-row"><div><strong>Auth authority</strong><span>${data.authAuthority}</span></div></div>
        <div class="setting-row"><div><strong>Deployment</strong><span>${data.deployment}</span></div></div>
        <div class="setting-row"><div><strong>Sync mode</strong><span>${data.syncMode}</span></div></div>
      </div>
    </section>
  `;
}
