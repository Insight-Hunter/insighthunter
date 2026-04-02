import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Only protect /dashboard/* routes
  if (!pathname.startsWith('/dashboard')) {
    return next();
  }

  const env = context.locals.runtime?.env as {
    AUTH_WORKER: Fetcher;
    JWT_SECRET: string;
  } | undefined;

  // Read token from cookie or Authorization header
  const cookie = context.cookies.get('ih_session');
  const authHeader = context.request.headers.get('Authorization');
  const token = cookie?.value ?? authHeader?.replace('Bearer ', '') ?? null;

  if (!token) {
    const next_ = encodeURIComponent(pathname);
    return context.redirect(`/auth/login?next=${next_}`);
  }

  try {
    const verifyRes = await env?.AUTH_WORKER.fetch(new Request('https://internal/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': env.JWT_SECRET,
      },
      body: JSON.stringify({ token }),
    }));

    if (!verifyRes || !verifyRes.ok) {
      context.cookies.delete('ih_session', { path: '/' });
      const next_ = encodeURIComponent(pathname);
      return context.redirect(`/auth/login?next=${next_}`);
    }

    const user = await verifyRes.json();
    context.locals.user = user;
    return next();
  } catch {
    context.cookies.delete('ih_session', { path: '/' });
    return context.redirect('/auth/login');
  }
});
