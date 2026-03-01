import type { APIRoute } from 'astro';
// TODO: QuickBooks OAuth connect
export const GET: APIRoute = async ({ request }) => {
  return new Response(JSON.stringify({ stub: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
