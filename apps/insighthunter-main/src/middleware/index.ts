import type { MiddlewareHandler } from 'astro';
import { verifyJWT } from '@ih/auth-client';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { pathname, search } = context.url;

  // Only protect /dashboard routes
  if (!pathname.startsWith('/dashboard')) return next();

  const cookies = context.request.headers.get('cookie') || '';
  const match = cookies.match(/ih_session=([^;]+)/);
  const token = match?.[1];

  if (!token) {
    const redirectTo = `/auth/login?next=${encodeURIComponent(pathname + search)}`;
    return context.redirect(redirectTo);
  }

  const secret = (context.locals as any).runtime?.env?.JWT_SECRET || '';
  const payload = token ? await verifyJWT(token, secret) : null;

  if (!payload) {
    const redirectTo = `/auth/login?next=${encodeURIComponent(pathname + search)}`;
    return context.redirect(redirectTo);
  }

  (context.locals as any).session = {
    userId: payload.userId,
    orgId: payload.orgId,
    email: payload.email,
    tier: payload.tier,
  };

  return next();
};
