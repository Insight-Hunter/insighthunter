import { createMiddleware } from 'hono/factory';
import { verifyJWT } from './jwt';
import type { AuthContext } from './session';

export function createAuthMiddleware(getSecret: (env: any) => string) {
  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const cookie = c.req.header('Cookie') || '';
    const cookieMatch = cookie.match(/ih_session=([^;]+)/);
    const token = authHeader?.replace('Bearer ', '') || cookieMatch?.[1];

    if (!token) {
      const appUrl = new URL(c.req.url);
      return c.redirect(
        `https://auth.insighthunter.app/login?redirect_uri=${encodeURIComponent(appUrl.href)}`
      );
    }

    const secret = getSecret(c.env);
    const payload = await verifyJWT(token, secret);

    if (!payload) {
      return c.json({ error: 'Unauthorized', code: 'INVALID_TOKEN' }, 401);
    }

    const ctx: AuthContext = {
      userId: payload.userId,
      orgId: payload.orgId,
      tier: payload.tier,
      email: payload.email,
    };

    c.set('auth' as never, ctx);
    await next();
  });
}
