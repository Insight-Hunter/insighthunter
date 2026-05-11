import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types/env';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: ['https://insighthunter.app'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.get('/health', (c) => c.json({ status: 'ok' }));
app.get('/', (c) => c.json({ app: 'ready' }));

export default app;
