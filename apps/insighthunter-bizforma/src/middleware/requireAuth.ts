import { authMiddleware, AuthError } from '@insighthunter/auth-middleware';
import type { AuthContext } from '@insighthunter/auth-middleware';
import type { Context, Next } from 'hono';

export function requireAuth(c: Context<{ Bindings: { AUTH_WORKER: Fetcher } }>, next: Next) {
  return authMiddleware(c.req.raw, c.env.AUTH_WORKER)
    .then(ctx => { c.set('auth', ctx); return next(); })
    .catch(err => {
      if (err instanceof AuthError) return c.json({ error: err.code }, err.status);
      throw err;
    });
}