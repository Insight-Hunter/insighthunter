import type { MiddlewareHandler } from 'hono';
import type { Env, AuthContext }  from '../types';

export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: { auth: AuthContext } }> =
  async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);

    const token = header.slice(7);
    const res   = await c.env.AUTH_WORKER.fetch(new Request('https://auth/verify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    }));

    if (!res.ok) return c.json({ error: 'Unauthorized' }, 401);
    const auth = await res.json<AuthContext>();
    c.set('auth', auth);
    await next();
  };
