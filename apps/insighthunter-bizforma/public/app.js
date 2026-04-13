const routes = {
  '#/app': renderDashboard,
  '#/wizard': renderWizard,
  '#/documents': renderDocuments,
  '#/compliance': renderCompliance,
  '#/advisor': renderAdvisor
};

async function api(path, options = {}) {
  const res = await fetch(path, { credentials: 'include', headers: { 'content-type': 'application/json' }, ...options });
  if (res.status === 401) {
    document.getElementById('app').innerHTML = unauthenticated();
    bindAuthButtons();
    throw new Error('Unauthorized');
  }
  return res.json();
}

function shell(content, active = '#/app') {
  const nav = [
    ['#/app', 'Overview'],
    ['#/wizard', 'Formation Wizard'],
    ['#/documents', 'Documents'],
    ['#/compliance', 'Compliance'],
    ['#/advisor', 'AI Advisor']
  ].map(([href, label]) => `<a href="${href}" class="${active === href ? 'active' : ''}">${label}</a>`).join('');
  return `<div class="shell"><aside class="sidebar"><div class="brand">BizForma</div><div class="nav">${nav}</div><div style="margin-top:24px"><button class="button secondary" id="logoutBtn">Log out</button></div></aside><main class="content">${content}</main></div>`;
}

function unauthenticated() {
  return `<div class="content"><div class="hero"><h1>BizForma</h1><p class="muted">Business formation, compliance, tax setup, and document workflows on Cloudflare.</p><div style="display:flex;gap:12px;margin-top:16px"><button class="button" id="loginBtn">Sign in</button><button class="button secondary" id="signupBtn">Create account</button></div></div></div>`;
}

function bindAuthButtons() {
  document.getElementById('loginBtn')?.addEventListener('click', () => location.href = '/auth/login');
  document.getElementById('signupBtn')?.addEventListener('click', () => location.href = '/auth/signup');
}

async function renderDashboard() {
  const me = await api('/api/session/me');
  const businesses = await api('/api/business');
  return shell(`<div class="hero"><h1>Welcome${me.user?.email ? `, ${me.user.email}` : ''}</h1><p class="muted">Tenant ${me.user?.tenantId || 'unknown'}</p></div><div class="grid"><div class="card"><h3>Businesses</h3><div class="pre">${JSON.stringify(businesses.businesses || [], null, 2)}</div></div><div class="card"><h3>Quick actions</h3><div style="display:flex;gap:12px;flex-wrap:wrap"><a class="button" href="#/wizard">Start formation</a><a class="button secondary" href="#/documents">Generate documents</a></div></div></div>`, '#/app');
}

async function renderWizard() {
  return shell(`<div class="hero"><h1>Formation Wizard</h1><p class="muted">Capture business basics and create a formation case.</p></div><div class="card"><div class="row"><input id="bizName" placeholder="Business name" /><input id="stateCode" placeholder="State code" value="GA" /><select id="entityType"><option>LLC</option><option>S-Corp</option><option>C-Corp</option></select></div><div style="margin-top:12px"><button class="button" id="createBizBtn">Create business + case</button></div><div id="wizardOutput" class="pre" style="margin-top:12px"></div></div>`, '#/wizard');
}

async function bindWizard() {
  document.getElementById('createBizBtn')?.addEventListener('click', async () => {
    const name = document.getElementById('bizName').value;
    const stateCode = document.getElementById('stateCode').value;
    const entityType = document.getElementById('entityType').value;
    const business = await api('/api/business', { method: 'POST', body: JSON.stringify({ name, stateCode, entityType }) });
    const formationCase = await api('/api/formation', { method: 'POST', body: JSON.stringify({ businessId: business.business.id, intakeJson: JSON.stringify({ name, stateCode, entityType }) }) });
    document.getElementById('wizardOutput').textContent = JSON.stringify({ business, formationCase }, null, 2);
  });
}

async function renderDocuments() {
  return shell(`<div class="hero"><h1>Documents</h1><p class="muted">Generate an operating agreement placeholder and fetch it through a signed path.</p></div><div class="card"><div class="row"><input id="docCaseId" placeholder="Formation case ID" /><input id="docCompany" placeholder="Company name" /><input id="docState" placeholder="State" value="Georgia" /></div><div style="margin-top:12px"><button class="button" id="generateDocBtn">Generate document</button></div><div id="docOutput" class="pre" style="margin-top:12px"></div></div>`, '#/documents');
}

async function bindDocuments() {
  document.getElementById('generateDocBtn')?.addEventListener('click', async () => {
    const formationCaseId = document.getElementById('docCaseId').value;
    const companyName = document.getElementById('docCompany').value;
    const state = document.getElementById('docState').value;
    const result = await api('/api/documents/operating-agreement', { method: 'POST', body: JSON.stringify({ formationCaseId, companyName, state }) });
    document.getElementById('docOutput').innerHTML = `${JSON.stringify(result, null, 2)}\n\nOpen: ${location.origin}${result.downloadPath}`;
  });
}

async function renderCompliance() {
  const result = await api('/api/compliance');
  return shell(`<div class="hero"><h1>Compliance</h1><p class="muted">Seed and review deadlines.</p></div><div class="card"><button class="button" id="seedComplianceBtn">Seed sample deadlines</button><div class="pre" id="complianceOutput" style="margin-top:12px">${JSON.stringify(result.events || [], null, 2)}</div></div>`, '#/compliance');
}

async function bindCompliance() {
  document.getElementById('seedComplianceBtn')?.addEventListener('click', async () => {
    const cases = await api('/api/formation');
    const first = cases.cases?.[0];
    if (!first) return alert('Create a formation case first');
    await api('/api/compliance/seed', { method: 'POST', body: JSON.stringify({ formationCaseId: first.id }) });
    const result = await api('/api/compliance');
    document.getElementById('complianceOutput').textContent = JSON.stringify(result.events || [], null, 2);
  });
}

async function renderAdvisor() {
  return shell(`<div class="hero"><h1>AI Advisor</h1><p class="muted">Ask BizForma for a concise recommendation.</p></div><div class="card"><textarea id="advisorPrompt" rows="5" placeholder="Should I form an LLC or S-Corp in Georgia?"></textarea><div style="margin-top:12px"><button class="button" id="askAdvisorBtn">Ask</button></div><div id="advisorOutput" class="pre" style="margin-top:12px"></div></div>`, '#/advisor');
}

async function bindAdvisor() {
  document.getElementById('askAdvisorBtn')?.addEventListener('click', async () => {
    const message = document.getElementById('advisorPrompt').value;
    const result = await api('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message }) });
    document.getElementById('advisorOutput').textContent = JSON.stringify(result, null, 2);
  });
}

async function render() {
  try {
    const me = await fetch('/api/session/me', { credentials: 'include' }).then(r => r.json());
    if (!me.authenticated) {
      document.getElementById('app').innerHTML = unauthenticated();
      bindAuthButtons();
      return;
    }
    const route = location.hash || '#/app';
    const renderer = routes[route] || renderDashboard;
    document.getElementById('app').innerHTML = await renderer();
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      await api('/api/session/logout', { method: 'POST', body: JSON.stringify({}) });
      location.hash = '#/app';
      location.reload();
    });
    if (route === '#/wizard') await bindWizard();
    if (route === '#/documents') await bindDocuments();
    if (route === '#/compliance') await bindCompliance();
    if (route === '#/advisor') await bindAdvisor();
  } catch (err) {
    console.error(err);
  }
}
window.addEventListener('hashchange', render);
render();
