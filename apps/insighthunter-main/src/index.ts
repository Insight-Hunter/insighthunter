// apps/insighthunter-main/src/index.ts
// Platform Worker — mounts all API routes under /api/*
// Astro handles all non-/api/* routes via static assets

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { entitlementsRoutes } from './routes/entitlements';
import { onboardingRoutes } from './routes/onboarding';
import { webhooksRoutes } from './routes/webhooks';
import { dashboardRoutes } from './routes/dashboard';
import { healthRoutes } from './routes/health';

export type Env = {
  DB: D1Database;
  AUTH_KV: KVNamespace;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  PUBLIC_SITE_URL: string;
  PUBLIC_AUTH_URL: string;
  PUBLIC_APP_NAME: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', cors({
  origin: [
    'https://insighthunter.app',
    'https://dashboard.insighthunter.app',
    'https://insights.insighthunter.app',
    'https://bookkeeping.insighthunter.app',
    'https://payroll.insighthunter.app',
    'https://advisor.insighthunter.app',
    'https://bizforma.insighthunter.app',
    'https://pbx.insighthunter.app',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.route('/api/health',       healthRoutes);
app.route('/api/dashboard',    dashboardRoutes);
app.route('/api/entitlements', entitlementsRoutes);
app.route('/api/onboarding',   onboardingRoutes);
app.route('/api/webhooks',     webhooksRoutes);

export default app;
