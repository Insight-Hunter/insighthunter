export const onRequest: PagesFunction<{
  DISPATCH_URL?: string;
}> = async (context) => {
  const { request, env, params } = context
  const base = env.DISPATCH_URL || 'https://workers.insighthunter.app'

  const wildcard = Array.isArray(params.path)
    ? params.path.join('/')
    : (params.path || '').toString()

  const incoming = new URL(request.url)
  const target = new URL(`${base.replace(/\/$/, '')}/api/${wildcard}`)

  target.search = incoming.search

  const headers = new Headers(request.headers)
  headers.set('x-forwarded-host', incoming.host)
  headers.set('x-forwarded-proto', incoming.protocol.replace(':', ''))
  headers.delete('host')
  headers.delete('cf-connecting-ip')
  headers.delete('content-length')

  const method = request.method.toUpperCase()
  const body = method === 'GET' || method === 'HEAD' ? undefined : request.body

  try {
    const upstream = await fetch(target.toString(), {
      method,
      headers,
      body,
      redirect: 'manual',
    })

    const responseHeaders = new Headers(upstream.headers)
    responseHeaders.set('x-proxied-by', 'insighthunter-main')
    responseHeaders.delete('content-length')

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Upstream dispatch request failed',
        detail: error instanceof Error ? error.message : 'Unknown proxy error',
      }),
      {
        status: 502,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        },
      }
    )
  }
}
