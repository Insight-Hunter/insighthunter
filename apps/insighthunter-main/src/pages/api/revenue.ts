import type { APIRoute } from 'astro';
// TODO: implement revenue endpoint
export const GET: APIRoute = async ({ locals }) => {
  // const db = locals.runtime.env.DB;
  return new Response(JSON.stringify({ stub: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
