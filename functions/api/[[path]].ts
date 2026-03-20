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
// After user successfully authenticates, fire provisioning
async function triggerProvision(userId: string, email: string, plan: string, internalToken: string) {
  await fetch('https://insight-provisioning.workers.dev/provision', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': internalToken,
    },
    body: JSON.stringify({ userId, email, plan }),
  });
}
