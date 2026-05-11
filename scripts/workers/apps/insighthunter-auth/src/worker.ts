import { Hono } from 'hono';
import { cors } from 'hono/cors';
<<<<<<< HEAD
=======
import loginRoute from './routes/login';
import registerRoute from './routes/register';
import refreshRoute from './routes/refresh';
import logoutRoute from './routes/logout';
import callbackRoute from './routes/callback';
>>>>>>> 67612b7d33a6889fca29e77e31214f4791cbb16f
import type { Env } from './types/env';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
<<<<<<< HEAD
  origin: ['https://insighthunter.app'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.get('/health', (c) => c.json({ status: 'ok' }));
app.get('/', (c) => c.json({ app: 'ready' }));
=======
  origin: [
    'https://insighthunter.app',
    'https://auth.insighthunter.app',
    'https://dashboard.insighthunter.app',
    'https://bizforma.insighthunter.app',
    'https://payroll.insighthunter.app',
    'https://bookkeeping.insighthunter.app',
    'https://report.insighthunter.app',
    'https://scout.insighthunter.app',
    'https://pbx.insighthunter.app',
    'https://whitelabel.insighthunter.app',
  ],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));

app.route('/login', loginRoute);
app.route('/register', registerRoute);
app.route('/refresh', refreshRoute);
app.route('/logout', logoutRoute);
app.route('/auth/callback', callbackRoute);

app.get('/health', (c) => c.json({ status: 'ok', service: 'ih-auth' }));

app.notFound((c) => c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, 500);
});
>>>>>>> 67612b7d33a6889fca29e77e31214f4791cbb16f

export default app;
