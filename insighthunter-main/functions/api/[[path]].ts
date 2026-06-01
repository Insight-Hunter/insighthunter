interface Env {
  DISPATCH_WORKER: Fetcher;
}

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!env.DISPATCH_WORKER) {
    return Response.json({ error: 'Dispatch worker not configured' }, { status: 503 });
  }
  const path = (params.path as string[] | undefined)?.join('/') ?? '';
  console.log(`[Pages API Proxy] ${request.method} /api/${path}`);
  try {
    return await env.DISPATCH_WORKER.fetch(request);
  } catch (err) {
    console.error('[Pages API Proxy] Dispatch error:', err);
    return Response.json({ error: 'Service temporarily unavailable' }, { status: 502 });
  }
};
