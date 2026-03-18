// public/js/api.js
// Shared fetch client — all HTML pages include this via <script src="/js/api.js">
// Uses RELATIVE paths — no hardcoded domain needed (Worker serves both API + static)

window.api = {
  // ── Auth ───────────────────────────────────────────────
  login: (email, password) =>
    _post('/api/auth/login', { email, password }),
  register: (email, password, name) =>
    _post('/api/auth/register', { email, password, name }),
  me: () =>
    _get('/api/auth/me'),
  logout: () =>
    _post('/api/auth/logout', {}),

  // ── Bookkeeping ────────────────────────────────────────
  summary: (from, to) =>
    _get(`/api/bookkeeping/summary?from=${from}&to=${to}`),
  transactions: (params = {}) =>
    _get('/api/bookkeeping/transactions?' + new URLSearchParams(params)),
  createTransaction: (body) =>
    _post('/api/bookkeeping/transactions', body),
  trend: () =>
    _get('/api/bookkeeping/trend'),

  // ── Reports ────────────────────────────────────────────
  pnl: (from, to) =>
    _get(`/api/reports/pnl?from=${from}&to=${to}`),
  balanceSheet: () =>
    _get('/api/reports/balance-sheet'),
  cashFlow: (from, to) =>
    _get(`/api/reports/cash-flow?from=${from}&to=${to}`),

  // ── AI ─────────────────────────────────────────────────
  chat: (question, context) =>
    _post('/api/ai/chat', { question, context }),
  quickInsight: () =>
    _get('/api/ai/insights/quick'),
  insights: (type = 'full') =>
    _post('/api/ai/insights', { type }),
  forecast: (months = 3) =>
    _post('/api/ai/forecast', { months }),

  // ── Payroll ────────────────────────────────────────────
  employees: () =>
    _get('/api/payroll/employees'),
  payrollRuns: () =>
    _get('/api/payroll/runs'),
  createRun: (body) =>
    _post('/api/payroll/runs', body),

  // ── BizForma ───────────────────────────────────────────
  formations: () =>
    _get('/api/bizforma/formations'),
  createFormation: (body) =>
    _post('/api/bizforma/formations', body),

  // ── PBX ────────────────────────────────────────────────
  numbers: () =>
    _get('/api/pbx/numbers'),
  calls: () =>
    _get('/api/pbx/calls'),
  sms: (contact) =>
    _get('/api/pbx/sms' + (contact ? '?contact=' + contact : '')),
  sendSms: (to, message) =>
    _post('/api/pbx/sms', { to, message }),
  voicemails: () =>
    _get('/api/pbx/voicemails'),
};

// ── Internals ───────────────────────────────────────────────
async function _get(path) {
  const res = await fetch(path, { credentials: 'include' });
  if (res.status === 401) {
    window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function _post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}
