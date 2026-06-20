/**
 * Astro Middleware — runs on every SSR request.
 * Reads /api/me and redirects unauthenticated or un-onboarded users.
 */

import { defineMiddleware } from 'astro:middleware';

const PUBLIC_PATHS = ['/', '/pricing', '/about', '/blog', '/api/stripe/webhook'];
const AUTH_PATHS = ['/onboarding'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Always allow public paths and static assets
  if (
    PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/_') ||
    pathname.startsWith('/assets') ||
    pathname.match(/\.(ico|png|jpg|svg|css|js|woff2?)$/)
  ) {
    return next();
  }

  // Fetch user identity
  let user: { email?: string; onboarding_complete?: boolean } | null = null;
  try {
    const res = await fetch(new URL('/api/me', context.url), {
      headers: context.request.headers,
    });
    if (res.ok) user = await res.json();
  } catch {
    // If /api/me fails, Access will handle the redirect
  }

  // No user = no Access session (shouldn't happen if Access policy is set)
  if (!user?.email) {
    return context.redirect('/');
  }

  // Redirect to onboarding if not complete (except when already on onboarding)
  if (!user.onboarding_complete && !AUTH_PATHS.includes(pathname)) {
    return context.redirect('/onboarding');
  }

  // Already onboarded → skip onboarding page
  if (user.onboarding_complete && pathname === '/onboarding') {
    return context.redirect('/dashboard');
  }

  return next();
});
