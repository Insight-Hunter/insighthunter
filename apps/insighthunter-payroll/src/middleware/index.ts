import { defineMiddleware } from 'astro:middleware';
import { resolveAuth, isProtectedRoute } from '@insighthunter/auth-middleware';

export const onRequest = defineMiddleware(async ({ locals, request, url, redirect }, next) => {
  const env = locals.runtime?.env;

  const auth = await resolveAuth(
    request.headers.get('cookie'),
    env?.JWT_SECRET ?? ''
  );

  locals.userId           = auth.userId;
  locals.userEmail        = auth.userEmail;
  locals.subscriptionTier = auth.subscriptionTier;

  if (isProtectedRoute(url.pathname)) {
    if (!auth.userId) {
      return redirect(
        `https://insighthunter.app/auth/login?redirect=${encodeURIComponent(url.href)}`
      );
    }
  }

  return next();
});
