// apps/insighthunter-main/src/routes/dashboard.ts
// Returns everything the dashboard page needs in one call:
// user context, health score, accessible apps, notifications

import { Hono } from 'hono';
import type { Env } from '../index';
import { requireSession } from '../authz/session';

type AppDef = {
  slug: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  tier: 'tier1' | 'tier2';
  color: string;
};

const ALL_APPS: AppDef[] = [
  {
    slug: 'insights',
    name: 'Insights',
    description: 'Financial KPIs, forecasting & AI analysis',
    url: 'https://insights.insighthunter.app',
    icon: '📊',
    tier: 'tier1',
    color: '#4F46E5',
  },
  {
    slug: 'bookkeeping',
    name: 'Bookkeeping',
    description: 'Bank feeds, transactions & reconciliation',
    url: 'https://bookkeeping.insighthunter.app',
    icon: '📒',
    tier: 'tier1',
    color: '#059669',
  },
  {
    slug: 'advisor',
    name: 'Advisor',
    description: 'AI-driven CFO advisory using your real data',
    url: 'https://advisor.insighthunter.app',
    icon: '🤖',
    tier: 'tier1',
    color: '#7C3AED',
  },
  {
    slug: 'payroll',
    name: 'Payroll',
    description: 'Employee & contractor payroll processing',
    url: 'https://payroll.insighthunter.app',
    icon: '💰',
    tier: 'tier2',
    color: '#D97706',
  },
  {
    slug: 'bizforma',
    name: 'BizForma',
    description: 'Business formation & compliance tracking',
    url: 'https://bizforma.insighthunter.app',
    icon: '🏢',
    tier: 'tier2',
    color: '#0891B2',
  },
  {
    slug: 'pbx',
    name: 'PBX',
    description: 'AI-powered business phone & call analytics',
    url: 'https://pbx.insighthunter.app',
    icon: '📞',
    tier: 'tier2',
    color: '#DB2777',
  },
];

// RBAC app access matrix
const ROLE_ACCESS: Record<string, string[]> = {
  owner:           ['insights', 'bookkeeping', 'advisor', 'payroll', 'bizforma', 'pbx'],
  admin:           ['insights', 'bookkeeping', 'advisor', 'payroll', 'bizforma', 'pbx'],
  accountant:      ['insights', 'bookkeeping', 'advisor'],
  payroll_manager: ['insights', 'payroll'],
  advisor:         ['insights', 'advisor'],
  read_only:       ['insights'],
};

export const dashboardRoutes = new Hono<{ Bindings: Env }>();

// GET /api/dashboard
// Returns full dashboard payload for the authenticated user
dashboardRoutes.get('/', async (c) => {
  const session = await requireSession(c);
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { userId, orgId, role, email, name } = session;

  // Accessible apps based on role
  const allowedSlugs = ROLE_ACCESS[role] ?? ['insights'];
  const apps = ALL_APPS.filter((a) => allowedSlugs.includes(a.slug));

  // Org info
  const org = await c.env.DB.prepare(
    `SELECT name, slug, plan FROM organizations WHERE id = ?1`
  ).bind(orgId).first<{ name: string; slug: string; plan: string }>();

  // Health score
  const healthScore = await computeHealthScore(c.env.DB, orgId);

  // Recent notifications (last 5)
  const notifResult = await c.env.DB.prepare(
    `SELECT id, title, body, type, read, created_at
     FROM notifications
     WHERE org_id = ?1 AND user_id = ?2
     ORDER BY created_at DESC LIMIT 5`
  ).bind(orgId, userId).all();

  // Recent audit activity (last 5 meaningful actions)
  const auditResult = await c.env.DB.prepare(
    `SELECT action, resource_type, created_at
     FROM audit_logs
     WHERE org_id = ?1
     ORDER BY created_at DESC LIMIT 5`
  ).bind(orgId).all();

  return c.json({
    user: { userId, email, name, role },
    org: org ?? { name: 'My Organization', slug: '', plan: 'starter' },
    healthScore,
    apps,
    notifications: notifResult.results ?? [],
    recentActivity: auditResult.results ?? [],
  });
});

// GET /api/dashboard/apps
// Just the app list — used by app switcher widget
dashboardRoutes.get('/apps', async (c) => {
  const session = await requireSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const allowed = ROLE_ACCESS[session.role] ?? ['insights'];
  return c.json({ apps: ALL_APPS.filter((a) => allowed.includes(a.slug)) });
});

async function computeHealthScore(
  db: D1Database,
  orgId: string
): Promise<{ score: number; label: string; breakdown: Record<string, number> }> {
  const result = await db.prepare(
    `SELECT metric_key, metric_value
     FROM org_health_metrics
     WHERE org_id = ?1
     ORDER BY recorded_at DESC LIMIT 20`
  ).bind(orgId).all<{ metric_key: string; metric_value: number }>();

  const metrics: Record<string, number> = {};
  for (const row of result.results ?? []) {
    if (!(row.metric_key in metrics)) {
      metrics[row.metric_key] = row.metric_value;
    }
  }

  const weights: Record<string, number> = {
    cash_position:         25,
    revenue_growth:        20,
    debt_risk:             20,
    payroll_burden:        15,
    customer_concentration: 10,
    compliance_status:     10,
  };

  let weighted = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (metrics[key] !== undefined) {
      weighted += metrics[key] * weight;
      totalWeight += weight;
    }
  }

  const score = totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
  const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Attention';

  return { score: score || 75, label, breakdown: metrics };
}
