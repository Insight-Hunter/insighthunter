// functions/api/[[path]].ts
// Cloudflare Pages Function — proxies all /api/* requests to the auth worker

export interface Env {
    AUTH_WORKER: Fetcher   // Service binding — set in Pages dashboard
  }
  
  export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
    const url = new URL(request.url)
    // Forward to auth worker, stripping the /api prefix
    const workerUrl = new URL(url.pathname.replace(/^\/api/, ''), 'https://insighthunter-auth.workers.dev')
    workerUrl.search = url.search
  
    return env.AUTH_WORKER.fetch(new Request(workerUrl.toString(), {
      method:  request.method,
      headers: request.headers,
      body:    ['GET','HEAD'].includes(request.method) ? undefined : request.body,
    }))
  }