// Proxy all /api/* requests to the DISPATCH_WORKER service binding
interface Env {
  DISPATCH_WORKER: Fetcher;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  // Forward unchanged — dispatch worker handles all auth + routing
  return context.env.DISPATCH_WORKER.fetch(context.request);
};
