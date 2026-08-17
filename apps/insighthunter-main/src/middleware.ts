// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

const PROTECTED_PREFIXES = ['/dashboard'];

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const needsAuth = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (!needsAuth) {
    return next();
  }

  const sessionCookie = context.cookies.get('ih_session')?.value;
  if (!sessionCookie) {
    return context.redirect('https://auth.insighthunter.app/login');
  }

  try {
    const res = await fetch('https://auth.insighthunter.app/session', {
      headers: { Authorization: `Bearer ${sessionCookie}` },
    });
    if (!res.ok) {
      return context.redirect('https://auth.insighthunter.app/login');
    }
  } catch {
    return context.redirect('https://auth.insighthunter.app/login');
  }

  return next();
});
