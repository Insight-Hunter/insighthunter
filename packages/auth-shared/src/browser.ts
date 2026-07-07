export function isProbablyBrowserRequest(request: Request): boolean {
  const secFetchDest = request.headers.get("sec-fetch-dest");
  const secFetchMode = request.headers.get("sec-fetch-mode");
  const accept = request.headers.get("accept") ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";

  if (secFetchDest === "document") return true;
  if (secFetchMode === "navigate") return true;
  if (accept.includes("text/html")) return true;

  return userAgent.length > 0;
}
