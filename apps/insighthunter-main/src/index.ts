// apps/insighthunter-main — Dashboard shell (app.insighthunter.app)
// Auth is handled upstream by apps/gateway which injects X-* identity headers.
// This Worker trusts those headers; no KV session lookup needed here.

import { Hono } from 'hono';
import { headerGuard } from './authz/middleware.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { entitlementsRoutes } from './routes/entitlements.js';
import { onboardingRoutes } from './routes/onboarding.js';
import { webhooksRoutes } from './routes/webhooks.js';

export type Env = {
  DB: D1Database;
  KV_SESSIONS: KVNamespace;
  AUTH_URL: string;       // https://auth.insighthunter.app
  DASHBOARD_URL: string;  // https://app.insighthunter.app
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Env }>();

// ── Security headers ──────────────────────────────────────────────────────────
app.use('*', async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

// ── Public ────────────────────────────────────────────────────────────────────
app.get('/health', (c) =>
  c.json({ ok: true, service: 'insighthunter-main', ts: Date.now(), env: c.env.ENVIRONMENT }),
);

// ── Auth guard — all routes below require gateway headers ─────────────────────
app.use('/*', headerGuard());

// ── Dashboard UI (SSR HTML) ───────────────────────────────────────────────────
app.get('/', async (c) => {
  const name    = c.req.header('X-User-Name')  ?? 'there';
  const email   = c.req.header('X-User-Email') ?? '';
  const role    = c.req.header('X-User-Role')  ?? 'member';
  const orgName = c.req.header('X-Org-Name')   ?? 'My Org';
  const plan    = c.req.header('X-Org-Plan')   ?? 'starter';

  const firstName = name.split(' ')[0] ?? name;
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  const APP_TILES = [
    { slug: 'insights',      name: 'Insights',       icon: '📊', url: 'https://insights.insighthunter.app',      desc: 'Financial KPIs & AI forecasting',       plans: ['starter','growth','pro','enterprise'] },
    { slug: 'bookkeeping',   name: 'Bookkeeping',    icon: '📒', url: 'https://bookkeeping.insighthunter.app',   desc: 'Bank feeds, transactions & reconciliation', plans: ['growth','pro','enterprise'] },
    { slug: 'advisor',       name: 'Advisor',        icon: '🤖', url: 'https://advisor.insighthunter.app',       desc: 'AI-driven CFO advisory',                plans: ['growth','pro','enterprise'] },
    { slug: 'reports',       name: 'Reports',        icon: '📄', url: 'https://reports.insighthunter.app',       desc: 'Automated financial reports',           plans: ['growth','pro','enterprise'] },
    { slug: 'payroll',       name: 'Payroll',        icon: '💰', url: 'https://payroll.insighthunter.app',       desc: 'Payroll & contractor payments',         plans: ['pro','enterprise'] },
    { slug: 'scout',         name: 'Scout',          icon: '🔍', url: 'https://scout.insighthunter.app',         desc: 'Business intelligence & signals',       plans: ['pro','enterprise'] },
    { slug: 'bizforma',      name: 'BizForma',       icon: '🏛️', url: 'https://bizforma.insighthunter.app',      desc: 'Entity formation & compliance',         plans: ['growth','pro','enterprise'] },
    { slug: 'pbx',           name: 'PBX',            icon: '📞', url: 'https://pbx.insighthunter.app',           desc: 'Business phone & call analytics',       plans: ['pro','enterprise'] },
    { slug: 'finops',        name: 'FinOps',         icon: '⚙️', url: 'https://finops.insighthunter.app',        desc: 'Cost optimization & tracking',         plans: ['pro','enterprise'] },
    { slug: 'dispatch',      name: 'Dispatch',       icon: '🚚', url: 'https://dispatch.insighthunter.app',      desc: 'Operations & task dispatch',           plans: ['starter','growth','pro','enterprise'] },
    { slug: 'notifications', name: 'Notifications',  icon: '🔔', url: 'https://notifications.insighthunter.app', desc: 'Alerts & team notifications',          plans: ['starter','growth','pro','enterprise'] },
    { slug: 'platform',      name: 'Settings',       icon: '⚙️', url: 'https://platform.insighthunter.app',      desc: 'Org settings, members & billing',      plans: ['starter','growth','pro','enterprise'] },
  ];

  const PLAN_RANK: Record<string, number> = { starter: 0, growth: 1, pro: 2, enterprise: 3 };
  const userRank = PLAN_RANK[plan] ?? 0;
  const accessible = APP_TILES.filter(t => t.plans.some(p => (PLAN_RANK[p] ?? 0) <= userRank));
  const locked = APP_TILES.filter(t => !accessible.includes(t));

  const tileHtml = (t: typeof APP_TILES[0], isLocked: boolean) =>
    `<a class="tile${isLocked ? ' tile-locked' : ''}" href="${isLocked ? 'https://platform.insighthunter.app/billing' : t.url}">
      <div class="tile-icon">${t.icon}</div>
      <div class="tile-name">${t.name}${isLocked ? ' <span class="lock">🔒</span>' : ''}</div>
      <div class="tile-desc">${t.desc}</div>
    </a>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>InsightHunter — Dashboard</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--brand:#0ea5e9;--dark:#0f172a;--nav:#080f1e;--card:#1a2540;--text:#e2e8f0;--muted:#64748b;--border:#1e3a5f}
    body{font-family:system-ui,sans-serif;background:var(--dark);color:var(--text);min-height:100vh}
    nav{background:var(--nav);border-bottom:1px solid var(--border);padding:.9rem 2rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
    .logo{font-weight:900;font-size:1.15rem;color:var(--brand);letter-spacing:-.02em}
    .nav-right{display:flex;align-items:center;gap:.75rem;font-size:.83rem;color:var(--muted)}
    .plan-badge{background:#0ea5e915;color:var(--brand);border:1px solid #0ea5e930;border-radius:6px;padding:.15rem .55rem;font-size:.7rem;font-weight:700;text-transform:uppercase}
    .signout{color:var(--muted);text-decoration:none;border:1px solid var(--border);border-radius:6px;padding:.25rem .65rem;transition:color .15s}
    .signout:hover{color:var(--text)}
    main{max-width:1280px;margin:0 auto;padding:2.5rem 2rem}
    .welcome{margin-bottom:2.5rem}
    .welcome h1{font-size:1.8rem;font-weight:800;margin-bottom:.3rem}
    .welcome p{color:var(--muted);font-size:.9rem}
    .health-bar{display:inline-flex;align-items:center;gap:.75rem;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:.6rem 1.2rem;margin-top:1rem;font-size:.85rem}
    .h-score{font-size:1.5rem;font-weight:900;color:#22c55e}
    .h-loading{color:var(--muted);font-size:.8rem}
    .section-label{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:.85rem}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.85rem;margin-bottom:2.5rem}
    .tile{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem;text-decoration:none;color:var(--text);transition:border-color .15s,transform .12s;display:block}
    .tile:hover{border-color:var(--brand);transform:translateY(-2px)}
    .tile-locked{opacity:.45;cursor:pointer}
    .tile-locked:hover{border-color:#f59e0b;transform:none}
    .tile-icon{font-size:1.75rem;margin-bottom:.6rem}
    .tile-name{font-weight:700;font-size:.95rem;margin-bottom:.3rem}
    .lock{font-size:.8rem}
    .tile-desc{font-size:.78rem;color:var(--muted);line-height:1.45}
    .dash-panels{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:.5rem}
    @media(max-width:640px){.dash-panels{grid-template-columns:1fr}.grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}}
    .panel{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem}
    .panel h3{font-size:.82rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.85rem}
    .panel ul{list-style:none;display:flex;flex-direction:column;gap:.4rem}
    .panel li{font-size:.83rem;color:#94a3b8;padding:.35rem 0;border-bottom:1px solid #1e2d45}
    .panel li:last-child{border-bottom:none}
    .empty{color:var(--muted)!important;font-style:italic}
  </style>
</head>
<body>
  <nav>
    <div class="logo">⚡ InsightHunter</div>
    <div class="nav-right">
      <span>${orgName}</span>
      <span class="plan-badge">${planLabel}</span>
      <span>${name}</span>
      <a class="signout" href="${c.env.AUTH_URL}/logout">Sign out</a>
    </div>
  </nav>
  <main>
    <div class="welcome">
      <h1>Welcome back, ${firstName} 👋</h1>
      <p>${orgName} &nbsp;·&nbsp; ${role}</p>
      <div class="health-bar">
        <span>Business Health Score</span>
        <span class="h-score" id="hs">—</span>
        <span class="h-loading" id="hl">loading…</span>
      </div>
    </div>

    <div class="section-label">Your Applications</div>
    <div class="grid">
      ${accessible.map(t => tileHtml(t, false)).join('')}
      ${locked.map(t => tileHtml(t, true)).join('')}
    </div>

    <div class="dash-panels">
      <div class="panel">
        <h3>Notifications</h3>
        <ul id="notif-list"><li class="empty">Loading…</li></ul>
      </div>
      <div class="panel">
        <h3>Recent Activity</h3>
        <ul id="activity-list"><li class="empty">Loading…</li></ul>
      </div>
    </div>
  </main>

  <script>
    // Async-fetch dashboard data after SSR shell renders
    (async () => {
      try {
        const res = await fetch('/api/dashboard', { credentials: 'include' });
        if (!res.ok) return;
        const d = await res.json();

        // Health score
        if (d.healthScore) {
          document.getElementById('hs').textContent = d.healthScore.score;
          document.getElementById('hl').textContent = d.healthScore.label;
        }

        // Notifications
        const nList = document.getElementById('notif-list');
        if (d.notifications?.length) {
          nList.innerHTML = d.notifications.map(n =>
            '<li>' + (n.title ?? n.body) + '</li>'
          ).join('');
        } else {
          nList.innerHTML = '<li class="empty">No new notifications</li>';
        }

        // Activity
        const aList = document.getElementById('activity-list');
        if (d.recentActivity?.length) {
          aList.innerHTML = d.recentActivity.map(a =>
            '<li>' + a.action + ' &mdash; ' + new Date(a.created_at).toLocaleDateString() + '</li>'
          ).join('');
        } else {
          aList.innerHTML = '<li class="empty">No recent activity</li>';
        }
      } catch {}
    })();
  </script>
</body>
</html>`;

  return c.html(html);
});

// ── Upgrade redirect ──────────────────────────────────────────────────────────
app.get('/upgrade', (c) => {
  const feature = c.req.query('feature') ?? '';
  return c.redirect(`https://platform.insighthunter.app/billing?upgrade=${feature}`, 302);
});

// ── API routes ────────────────────────────────────────────────────────────────
app.route('/api/dashboard',   dashboardRoutes);
app.route('/api/entitlements', entitlementsRoutes);
app.route('/api/onboarding',  onboardingRoutes);
app.route('/api/webhooks',    webhooksRoutes);

export default app;
