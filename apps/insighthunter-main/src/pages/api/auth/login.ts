import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const authService = locals.runtime.env.AUTH;

  const url = new URL(request.url);
  // The auth worker has the route at /api/login
  url.pathname = '/api/login';

  // A new request is created to be forwarded to the auth service.
  // The original request's body, headers, and method are preserved.
  const newRequest = new Request(url.toString(), request);

  // Fetch from the auth service.
  const response = await authService.fetch(newRequest);

  return response;
};
