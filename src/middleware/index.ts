// src/middleware/index.ts
import { defineMiddleware } from 'astro:middleware';
import { verifySession } from '../lib/auth';

const PUBLIC_PATHS = ['/', '/pricing', '/about', '/contact', '/features'];
const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/callback'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = new URL(context.request.url);

  // Always allow public marketing + auth pages + static assets
  if (
    AUTH_PATHS.some(p => pathname.startsWith(p)) ||
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/features') ||
    pathname.startsWith('/_astro') ||
    pathname.startsWith('/api/') ||
    pathname.match(/\.(ico|svg|png|webmanifest|js|css|woff2?)$/)
  ) {
    return next();
  }

  // Protect /dashboard/* routes
  if (pathname.startsWith('/dashboard')) {
    const token =
      context.cookies.get('ih_session')?.value ??
      context.request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return context.redirect(`/auth/login?redirect=${encodeURIComponent(pathname)}`, 302);
    }

    try {
      const session = await verifySession(token, context.locals.runtime?.env);
      if (!session) throw new Error('Invalid session');

      // Populate Astro locals for downstream use in layouts/pages
      context.locals.user = session.user;
      context.locals.orgId = session.org_id;
      context.locals.tier = session.tier;
      context.locals.features = session.features ?? [];
    } catch {
      context.cookies.delete('ih_session', { path: '/' });
      return context.redirect(`/auth/login?redirect=${encodeURIComponent(pathname)}&reason=expired`, 302);
    }
  }

  return next();
});
