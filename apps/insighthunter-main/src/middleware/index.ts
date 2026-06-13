import { defineMiddleware } from 'astro/middleware';

export const onRequest = defineMiddleware(async ({ request, redirect }) => {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/dashboard')) {
    const cookie = request.headers.get('cookie') || '';

    if (!cookie.includes('token=')) {
      return redirect('/auth/login');
    }
  }
});