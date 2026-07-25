// apps/insighthunter-main/src/index.ts
import { Hono } from 'hono';

const app = new Hono();

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    service: 'insighthunter-main',
    timestamp: new Date().toISOString(),
  }),
);

app.get('/', (c) => {
  return c.text('Insight Hunter main worker is running.');
});

export default app;
