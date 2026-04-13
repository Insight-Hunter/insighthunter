import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import type { AuthContext, Env } from '../types/env';
import { sessionApi } from '../api/session';
import { businessApi } from '../api/business';
import { formationApi } from '../api/formation';
import { complianceApi } from '../api/compliance';
import { documentsApi } from '../api/documents';
import { chatApi } from '../api/ai/chat';
import { buildLoginUrl, buildSignupUrl } from '../utils/auth';
import { getSession } from '../services/sessionService';

const app = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

app.get('/health', (c) => c.json({ ok: true, service: 'bizforma-v2' }));
app.get('/auth/config', (c) => c.json({ authOrigin: c.env.AUTH_ORIGIN, audience: c.env.AUTH_AUDIENCE }));
app.get('/auth/login', (c) => c.redirect(buildLoginUrl(c.env, `${c.env.APP_ORIGIN}/api/session/callback?redirect_to=/app`)));
app.get('/auth/signup', (c) => c.redirect(buildSignupUrl(c.env, `${c.env.APP_ORIGIN}/api/session/callback?redirect_to=/app`)));
app.route('/api/session', sessionApi);

app.use('/api/*', async (c, next) => {
  if (c.req.path.startsWith('/api/session')) return next();
  const sessionId = getCookie(c, 'bizforma_session');
  if (!sessionId) return c.json({ error: 'Unauthorized' }, 401);
  const session = await getSession(c.env, sessionId);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);
  c.set('auth', session.user);
  await next();
});

app.route('/api/business', businessApi);
app.route('/api/formation', formationApi);
app.route('/api/compliance', complianceApi);
app.route('/api/documents', documentsApi);
app.route('/api/ai/chat', chatApi);

export { FormationAgent } from '../agents/FormationAgent';
export { ComplianceAgent } from '../agents/ComplianceAgent';
export default app;
