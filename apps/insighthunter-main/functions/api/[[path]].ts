interface Env {
  DISPATCH_WORKER: Fetcher;
  DISPATCH_URL?: string;
}

type PagesFunction = (context: {
  request: Request;
  env: Env;
  params: { path?: string };
}) => Promise<Response>;

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
]);

function buildProxyUrl(requestUrl: URL, pathParam?: string, fallbackOrigin?: string) {
  const cleanPath = pathParam ? `/${pathParam.replace(/^\/+/, '')}` : '';
  const target = new URL(`/api${cleanPath}${requestUrl.search}`, fallbackOrigin ?? requestUrl.origin);
  return target;
}

function cloneHeaders(source: Headers, requestUrl: URL) {
  const headers = new Headers();

  source.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  headers.set('x-forwarded-host', requestUrl.host);
  headers.set('x-forwarded-proto', requestUrl.protocol.replace(':', ''));
  headers.set('x-forwarded-path', requestUrl.pathname);

  const existingFor = source.get('x-forwarded-for');
  if (!existingFor) {
    headers.set('x-forwarded-for', '0.0.0.0');
  }

  return headers;
}

export const onRequest: PagesFunction = async (context) => {
  const requestUrl = new URL(context.request.url);
  const proxyUrl = buildProxyUrl(requestUrl, context.params.path, context.env.DISPATCH_URL);

  const method = context.request.method.toUpperCase();
  const headers = cloneHeaders(context.request.headers, requestUrl);

  const init: RequestInit = {
    method,
    headers,
    redirect: 'manual',
  };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = context.request.body;
  }

  const proxiedRequest = new Request(proxyUrl.toString(), init);

  try {
    return await context.env.DISPATCH_WORKER.fetch(proxiedRequest);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown dispatch proxy failure';

    return Response.json(
      {
        error: 'Upstream service unavailable',
        code: 'DISPATCH_PROXY_ERROR',
        detail: message,
      },
      { status: 502 },
    );
  }
};
