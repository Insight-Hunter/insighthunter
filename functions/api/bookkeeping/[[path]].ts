interface Env {
  BOOKKEEPING_WORKER: Fetcher; // Service binding to insighthunter-bookkeeping
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  // Strip /api/bookkeeping prefix, forward the rest
  const workerPath = url.pathname.replace('/api/bookkeeping', '') || '/';
  const workerUrl = new URL(workerPath + url.search, 'https://insighthunter-bookkeeping.internal');

  return ctx.env.BOOKKEEPING_WORKER.fetch(
    new Request(workerUrl.toString(), ctx.request)
  );
};
