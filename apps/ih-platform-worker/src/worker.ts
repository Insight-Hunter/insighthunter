import { Hono } from 'hono';

const app = new Hono();
app.post('/api/provision', async (c) => c.json({ success: true, message: 'Tenant provision endpoint scaffolded' }));
app.all('/tenant/*', async (c) => c.json({ success: true, message: 'Dispatch namespace router scaffolded' }));
app.get('/health', (c) => c.json({ status: 'ok', worker: 'ih-platform-worker' }));
export default app;
