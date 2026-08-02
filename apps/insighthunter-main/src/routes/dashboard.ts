// routes/dashboard.ts
// GET /api/dashboard  — full dashboard payload (user, org, health score, apps, notifications)
// GET /api/dashboard/apps — app list only (used by app-switcher widget)

import { Hono } from 'hono';
import type { Env } from '../index.js';
import { requireSession } from '../authz/session.js';

type AppDef = {
  slug: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  tier: 'core' | 'addon';
  plans: string[];
};

const ALL_APPS: AppDef[] = [
  { slug: 'insights',      name: 'Insights',      description: 'Financial KPIs, forecasting & AI analysis',  url: 'https://insights.insighthunter.app',      icon: '📊', tier: 'core',  plans: ['starter','growth','pro','enterprise'] },
  { slug: 'bookkeeping',   name: 'Bookkeeping',   description: 'Bank feeds, transactions & reconciliation',   url: 'https://bookkeeping.insighthunter.app',   icon: '📒', tier: 'core',  plans: ['growth','pro','enterprise'] },
  { slug: 'advisor',       name: 'Advisor',       description: 'AI-driven CFO advisory using your real data', url: 'https://advisor.insighthunter.app',       icon: '🤖', tier: 'core',  plans: ['growth','pro','enterprise'] },
  { slug: 'reports',       name: 'Reports',       description: 'Automated financial reports & exports',       url: 'https://reports.insighthunter.app',       icon: '📄', tier: 'core',  plans: ['growth','pro','enterprise'] },
  { slug: 'payroll',       name: 'Payroll',       description: 'Employee & contractor payroll processing',    url: 'https://payroll.insighthunter.app',       icon: '💰', tier: 'addon', plans: ['pro','enterprise'] },
  { slug: 'scout',         name: 'Scout',         description: 'Business intelligence & market signals',      url: 'https://scout.insighthunter.app',         icon: '🔍', tier: 'addon', plans: ['pro','enterprise'] },
  { slug: 'bizforma',      name: 'BizForma',      description: 'Business formation & compliance tracking',    url: 'https://bizforma.insighthunter.app',      icon: '🏛️', tier: 'addon', plans: ['growth','pro','enterprise'] },
  { slug: 'pbx',           name: 'PBX',           description: 'AI-powered business phone & call analytics',  url: 'https://pbx.insighthunter.app',           icon: '📞', tier: 'addon', plans: ['pro','enterprise'] },
  { slug: 'finops',        name: 'FinOps',        description: 'Cloud cost optimization & tracking',          url: 'https://finops.insighthunter.app',        icon: '⚙️', tier: 'addon', plans: ['pro','enterprise'] },
  { slug: 'dispatch',      name: 'Dispatch',      description: 'Operations & task dispatch',                  url: 'https://dispatch.insighthunter.app',      icon: '🚚', tier: 'core',  plans: ['starter','growth','pro','enterprise'] },
  { slug: 'notifications', name: 'Notifications', description: 'Alerts & team notifications',                 url: 'https://notifications.insighthunter.app', icon: '🔔', tier: 'core',  plans: ['starter','growth','pro','enterprise'] },
];

const PLAN_RANK: Record<string, number> = { starter: 0, growth: 1, pro: 2, enterprise: 3 };

export const dashboardRoutes = new Hono<{ Bindings: Env }>();

// GET /api/dashboard
dashboardRoutes.get('/', async (c) => {
  const session = requireSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const { userId, orgId, role, email, name, orgName, orgSlug, orgPlan } = session;
  const userRank = PLAN_RANK[orgPlan] ?? 0;
  const apps = ALL_APPS.filter(a => a.plans.some(p => (PLAN_RANK[p] ?? 0) <= userRank));

  // Health score from D1
  const healthScore = await computeHealthScore(c.env.DB, orgId);

  // Recent notifications (last 5)
  const notifResult = await c.env.DB
    .prepare(`SELECT id, title, body, type, read, created_at
              FROM notifications
              WHERE org_id = ?1 AND user_id = ?2
              ORDER BY created_at DESC LIMIT 5`)
    .bind(orgId, userId).all<{ id: string; title: string; body: string; type: string; read: number; created_at: string }>();

  // Recent audit activity (last 5)
  const auditResult = await c.env.DB
    .prepare(`SELECT action, resource_type, created_at
              FROM audit_logs
              WHERE org_id = ?1
              ORDER BY created_at DESC LIMIT 5`)
    .bind(orgId).all<{ action: string; resource_type: string; created_at: string }>();

  return c.json({
    user: { userId, email, name, role },
    org:  { name: orgName, slug: orgSlug, plan: orgPlan },
    healthScore,
    apps,
    notifications:  notifResult.results  ?? [],
    recentActivity: auditResult.results  ?? [],
  });
});

// GET /api/dashboard/apps
dashboardRoutes.get('/apps', async (c) => {
  const session = requireSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);
  const userRank = PLAN_RANK[session.orgPlan] ?? 0;
  return c.json({ apps: ALL_APPS.filter(a => a.plans.some(p => (PLAN_RANK[p] ?? 0) <= userRank)) });
});

async function computeHealthScore(
  db: D1Database,
  orgId: string,
): Promise<{ score: number; label: string; breakdown: Record<string, number> }> {
  const result = await db
    .prepare(`SELECT metric_key, metric_value
              FROM org_health_metrics
              WHERE org_id = ?1
              ORDER BY recorded_at DESC LIMIT 20`)
    .bind(orgId)
    .all<{ metric_key: string; metric_value: number }>();

  const metrics: Record<string, number> = {};
  for (const row of result.results ?? []) {
    if (!(row.metric_key in metrics)) metrics[row.metric_key] = row.metric_value;
  }

  const weights: Record<string, number> = {
    cash_position: 25, revenue_growth: 20, debt_risk: 20,
    payroll_burden: 15, customer_concentration: 10, compliance_status: 10,
  };

  let weighted = 0, totalWeight = 0;
  for (const [key, w] of Object.entries(weights)) {
    if (metrics[key] !== undefined) { weighted += metrics[key] * w; totalWeight += w; }
  }

  const score = totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
  const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Attention';
  return { score: score || 0, label, breakdown: metrics };
}
