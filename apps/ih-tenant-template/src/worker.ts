import { Hono } from 'hono';
const app = new Hono();
app.get('/health', (c) => c.json({ status: 'ok', worker: 'tenant-template' }));
app.get('/api/data/profile', (c) => c.json({ orgScoped: true }));
export default app;
