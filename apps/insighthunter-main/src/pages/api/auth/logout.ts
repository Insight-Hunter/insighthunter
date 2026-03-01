import type { APIRoute } from 'astro';
// TODO: proxy to insighthunter-auth Worker
export const POST: APIRoute = async ({ request }) => {
  return new Response(JSON.stringify({ stub: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
