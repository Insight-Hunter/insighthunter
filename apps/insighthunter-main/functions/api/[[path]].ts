export const onRequest = async (context: any) => {
  const request = context.request as Request;
  const env = context.env;
  const url = new URL(request.url);
  const proxied = new URL(`/api/${context.params.path ?? ""}${url.search}`, env.DISPATCH_URL);

  const headers = new Headers(request.headers);
  headers.set("X-Forwarded-Host", url.host);
  headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));

  return env.DISPATCH_WORKER.fetch(
    new Request(proxied.toString(), {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual"
    })
  );
};
