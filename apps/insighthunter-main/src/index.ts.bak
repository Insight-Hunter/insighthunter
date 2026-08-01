// apps/insighthunter-main — Unified dashboard launcher (app.insighthunter.app)
import { Hono } from 'hono';
import { html } from 'hono/html';
import { authGuard, getSession } from '@insighthunter/auth-shared';
import type { IHSession } from '@insighthunter/auth-shared';

type Bindings = { KV_SESSIONS: KVNamespace };

const app = new Hono<{ Bindings: Bindings }>();

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});

// All routes require auth
app.use('/*', authGuard());

const APP_TILES = [
  { id: 'insights',     label: 'Insights',     icon: '📊', url: 'https://insights.insighthunter.app',     desc: 'Financial KPIs & forecasting' },
  { id: 'bookkeeping',  label: 'Bookkeeping',  icon: '📒', url: 'https://bookkeeping.insighthunter.app',  desc: 'Transactions & reconciliation' },
  { id: 'payroll',      label: 'Payroll',      icon: '💰', url: 'https://payroll.insighthunter.app',      desc: 'Payroll & tax estimates' },
  { id: 'advisor',      label: 'Advisor',      icon: '🤖', url: 'https://advisor.insighthunter.app',      desc: 'AI-powered CFO assistant' },
  { id: 'bizforma',     label: 'BizForma',     icon: '🏛️', url: 'https://bizforma.insighthunter.app',     desc: 'Entity & compliance management' },
  { id: 'pbx',          label: 'PBX',          icon: '📞', url: 'https://pbx.insighthunter.app',          desc: 'Business phone & call analytics' },
  { id: 'reports',      label: 'Reports',      icon: '📄', url: 'https://reports.insighthunter.app',      desc: 'Automated financial reports' },
  { id: 'ledger',       label: 'Ledger',       icon: '🗒️', url: 'https://ledger.insighthunter.app',       desc: 'General ledger & chart of accounts' },
  { id: 'finops',       label: 'FinOps',       icon: '⚙️', url: 'https://finops.insighthunter.app',       desc: 'Cost optimization & tracking' },
  { id: 'scout',        label: 'Scout',        icon: '🔍', url: 'https://scout.insighthunter.app',        desc: 'Business intelligence & signals' },
  { id: 'dispatch',     label: 'Dispatch',     icon: '🚚', url: 'https://dispatch.insighthunter.app',     desc: 'Operations & task dispatch' },
  { id: 'notifications',label: 'Notifications',icon: '🔔', url: 'https://notifications.insighthunter.app',desc: 'Alerts & team notifications' },
] as const;

const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--brand:#0ea5e9;--dark:#0f172a;--nav:#0a1120;--card:#1e293b;--text:#e2e8f0;--muted:#94a3b8;--border:#334155}
  body{font-family:system-ui,sans-serif;background:var(--dark);color:var(--text);min-height:100vh}
  nav{background:var(--nav);border-bottom:1px solid var(--border);padding:.85rem 1.5rem;display:flex;align-items:center;justify-content:space-between}
  .logo{font-size:1.2rem;font-weight:900;color:var(--brand)}
  .nav-right{display:flex;align-items:center;gap:1rem;font-size:.85rem;color:var(--muted)}
  .nav-right a{color:var(--brand);text-decoration:none;font-weight:600}
  main{max-width:1200px;margin:0 auto;padding:2rem 1.5rem}
  .welcome{margin-bottom:2rem}
  .welcome h1{font-size:1.75rem;font-weight:800;margin-bottom:.25rem}
  .welcome p{color:var(--muted)}
  .health{display:inline-flex;align-items:center;gap:.5rem;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:.5rem 1rem;font-size:.85rem;margin-top:1rem}
  .health .score{font-size:1.25rem;font-weight:900;color:#22c55e}
  .section-title{font-size:1rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:1rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem;margin-bottom:2.5rem}
  .tile{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem;text-decoration:none;color:var(--text);transition:border-color .15s,transform .15s;display:block}
  .tile:hover{border-color:var(--brand);transform:translateY(-2px)}
  .tile-icon{font-size:2rem;margin-bottom:.75rem}
  .tile-label{font-weight:700;font-size:1rem;margin-bottom:.25rem}
  .tile-desc{font-size:.8rem;color:var(--muted);line-height:1.4}
  .badge{display:inline-block;background:#0ea5e920;color:var(--brand);border:1px solid #0ea5e940;border-radius:6px;padding:.15rem .5rem;font-size:.7rem;font-weight:700;margin-bottom:.5rem;text-transform:uppercase}
`;

app.get('/', async (c) => {
  const session: IHSession = getSession(c);
  const planLabel = session.plan === 'enterprise' ? 'Enterprise' : session.plan === 'growth' ? 'Growth' : 'Starter';
  const tilesHtml = APP_TILES.map(tile =>
    `<a class="tile" href="${tile.url}">
      <div class="tile-icon">${tile.icon}</div>
      <div class="tile-label">${tile.label}</div>
      <div class="tile-desc">${tile.desc}</div>
    </a>`
  ).join('');

  return c.html(html`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>InsightHunter — Dashboard</title><style>${CSS}</style></head>
<body>
  <nav>
    <div class="logo">⚡ InsightHunter</div>
    <div class="nav-right">
      <span>${session.orgName}</span>
      <span class="badge">${planLabel}</span>
      <span>${session.name}</span>
      <a href="https://auth.insighthunter.app/logout">Sign out</a>
    </div>
  </nav>
  <main>
    <div class="welcome">
      <h1>Welcome back, ${session.name.split(' ')[0]} 👋</h1>
      <p>${session.orgName} · ${session.role.replace('_', ' ')}</p>
      <div class="health"><span>Business Health Score</span><span class="score">—</span></div>
    </div>
    <div class="section-title">Applications</div>
    <div class="grid">${tilesHtml}</div>
  </main>
</body></html>`);
});

app.get('/health', (c) => c.json({ ok: true, service: 'insighthunter-main', ts: Date.now() }));

export default app;
