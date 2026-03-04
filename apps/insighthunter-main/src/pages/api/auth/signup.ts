import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  // Cast the binding to Fetcher so we can use the service binding API
  const authService = locals.runtime.env.AUTH_WORKER as Fetcher;

  const url = new URL(request.url);
  // The auth worker handles signup at /api/signup
  url.hostname = 'auth';
  url.pathname = '/api/signup';

  // Forward the original request to the auth service worker,
  // preserving method, headers, and body
  const newRequest = new Request(url.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  const res = await authService.fetch(newRequest);

  return new Response(await res.text(), {
    status: res.status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
