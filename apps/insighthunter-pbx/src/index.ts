// apps/insighthunter-pbx/src/index.ts
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { Env } from './types/index.js';
import { api } from './routes/api.js';
import { webhookRoutes } from './routes/webhooks.js';
import { admin } from './routes/admin.js';
import { handleScheduled } from './workers/scheduled.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', secureHeaders({ xFrameOptions: 'DENY', xContentTypeOptions: 'nosniff' }));

app.route('/', api);
app.route('/', webhookRoutes);
app.route('/', admin);

// Static assets (React SPA)
app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  async fetch(request: Request, env: Env & { ASSETS: Fetcher }, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(event, env));
  },
} satisfies ExportedHandler<Env & { ASSETS: Fetcher }>;
