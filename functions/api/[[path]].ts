// functions/api/[[path]].ts
interface Env {
  AUTH_WORKER: Fetcher;
  PBX_WORKER: Fetcher;
  BIZFORMA_WORKER: Fetcher;
  BOOKKEEPING_WORKER: Fetcher;
  PAYROLL_WORKER: Fetcher;
  SCOUT_WORKER: Fetcher;
}

const WORKER_MAP: Record<string, keyof Env> = {
  '/api/auth': 'AUTH_WORKER',
  '/api/pbx': 'PBX_WORKER',
  '/api/bizforma': 'BIZFORMA_WORKER',
  '/api/bookkeeping': 'BOOKKEEPING_WORKER',
  '/api/payroll': 'PAYROLL_WORKER',
  '/api/scout': 'SCOUT_WORKER',
};

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const pathname = url.pathname;

  // Find matching worker
  const workerKey = Object.keys(WORKER_MAP).find(prefix =>
    pathname.startsWith(prefix)
  ) as keyof typeof WORKER_MAP | undefined;

  if (!workerKey) {
    return new Response(JSON.stringify({ error: 'Unknown API route' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const binding = WORKER_MAP[workerKey] as keyof Env;
  const worker = ctx.env[binding] as Fetcher | undefined;

  if (!worker) {
    return new Response(JSON.stringify({ error: `Worker binding ${binding} not configured` }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Strip the prefix for sub-workers that expect /api/* paths
  // e.g. /api/pbx/extensions → /api/extensions
  const subPath = pathname.replace(workerKey, '/api');
  const targetUrl = `https://internal${subPath}${url.search}`;

  // Forward all headers; do NOT pass body on GET/HEAD
  const isBodyless = ['GET', 'HEAD'].includes(ctx.request.method);
  const forwardReq = new Request(targetUrl, {
    method: ctx.request.method,
    headers: ctx.request.headers,
    body: isBodyless ? null : ctx.request.body,
    // Required to stream body properly
    duplex: isBodyless ? undefined : 'half',
  } as RequestInit);

  try {
    return await worker.fetch(forwardReq);
  } catch (err) {
    console.error(`Worker proxy error [${binding}]:`, err);
    return new Response(JSON.stringify({ error: 'Upstream worker error' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
