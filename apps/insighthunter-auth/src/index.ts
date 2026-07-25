import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'insighthunter-auth' }));
app.get('/session/:token', (c) => c.json({
  ok: true,
  session: {
    token: c.req.param('token'),
    user: { subject: 'demo-user', email: 'demo@insighthunter.app' },
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  }
}));

export default app;
