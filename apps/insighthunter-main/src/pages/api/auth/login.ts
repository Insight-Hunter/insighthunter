// apps/insighthunter-main/src/pages/api/auth/login.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const authService = locals.runtime.env.AUTH_WORKER as Fetcher;

  const newRequest = new Request('https://auth/api/login', {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  const res = await authService.fetch(newRequest);

  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
