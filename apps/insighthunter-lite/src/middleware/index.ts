// apps/insighthunter-lite/src/middleware/index.ts
import { defineMiddleware } from 'astro:middleware';

const PUBLIC_PATHS = ['/', '/api/health'];
const AUTH_PATHS  = ['/auth/login', '/auth/signup'];

export const onRequest = defineMiddleware(async ({ locals, cookies, url, redirect }, next) => {
  const env = locals.runtime?.env;
  const token = cookies.get('ih_session')?.value;

  locals.userId = null;
  locals.sessionToken = token ?? null;

  if (token && env?.SESSIONS) {
    const userId = await env.SESSIONS.get(`session:${token}`);
    locals.userId = userId;
  }

  const isProtected = url.pathname.startsWith('/dashboard') ||
                      url.pathname.startsWith('/upload') ||
                      url.pathname.startsWith('/api/upload') ||
                      url.pathname.startsWith('/api/reports');

  if (isProtected && !locals.userId) {
    return redirect('/auth/login?redirect=' + encodeURIComponent(url.pathname));
  }

  return next();
});
