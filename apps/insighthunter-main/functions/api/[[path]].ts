export const onRequest: PagesFunction<{
  AUTH_WORKER: Fetcher;
  BOOKKEEPING_WORKER: Fetcher;
  BIZFORMA_WORKER: Fetcher;
  INSIGHTS_WORKER: Fetcher;
}> = async ({ request, env, params }) => {
  const url = new URL(request.url);
  const path = (params.path as string[]).join('/');

  // Route to specific workers based on the first path segment
  if (path.startsWith('auth/')) {
    return env.AUTH_WORKER.fetch(request);
  }
  if (path.startsWith('bookkeeping/')) {
    return env.BOOKKEEPING_WORKER.fetch(request);
  }
  if (path.startsWith('bizforma/')) {
    return env.BIZFORMA_WORKER.fetch(request);
  }
  if (path.startsWith('insights/')) {
    return env.INSIGHTS_WORKER.fetch(request);
  }

  return new Response('Not Found', { status: 404 });
};
