import type { APIRoute } from 'astro';

export const prerender = false;

export const ALL: APIRoute = async ({ request, params, locals }) => {
  const path = params['...path'] || '';
  
  // Get the Cloudflare environment
  const env = (locals as any).runtime?.env;
  
  if (!env || !env.DISPATCH_WORKER) {
    return new Response(
      JSON.stringify({ error: 'Dispatch worker not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Create a new request with the path
    const url = new URL(`https://api.example.com/api/${path}`);
    url.search = new URL(request.url).search;
    
    const newRequest = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body ? await request.clone().arrayBuffer() : undefined,
    });
    
    console.log(`[API Route] ${request.method} /api/${path}`);
    
    // Forward to dispatch worker
    const response = await env.DISPATCH_WORKER.fetch(newRequest);
    
    // Return the response
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error('[API Route] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Service temporarily unavailable' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
