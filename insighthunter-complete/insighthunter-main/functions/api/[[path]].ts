/**
 * functions/api/[[path]].ts
 *
 * Cloudflare Pages Function that catches ALL /api/* requests and proxies them
 * to the insighthunter-dispatch Worker via a Service Binding.
 *
 * The dispatch worker handles:
 *   - /api/auth/*      → authentication (login, register, refresh, logout)
 *   - /api/users/*     → user management
 *   - /api/orgs/*      → org/tenant management
 *   - /api/billing/*   → Stripe billing
 *   - /api/bookkeeping/* → bookkeeping worker
 *   - /api/payroll/*   → payroll worker
 *   - /api/scout/*     → CRM worker
 *   - /api/pbx/*       → PBX worker
 *   - /api/bizforma/*  → BizForma worker
 */

interface Env {
  DISPATCH_WORKER: Fetcher;
}

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  // Validate binding exists
  if (!env.DISPATCH_WORKER) {
    return Response.json(
      { error: 'Dispatch worker not configured' },
      { status: 503 }
    );
  }

  // Reconstruct the URL preserving path, query string, and method
  const url = new URL(request.url);
  const path = (params.path as string[] | undefined)?.join('/') ?? '';

  // Log incoming API request (non-blocking)
  console.log(`[Pages API Proxy] ${request.method} /api/${path}`);

  // Forward the request to the dispatch worker as-is.
  // The dispatch worker trusts this boundary — it checks auth itself.
  try {
    const response = await env.DISPATCH_WORKER.fetch(request);
    return response;
  } catch (err) {
    console.error('[Pages API Proxy] Dispatch error:', err);
    return Response.json(
      { error: 'Service temporarily unavailable', path: `/api/${path}` },
      { status: 502 }
    );
  }
};
