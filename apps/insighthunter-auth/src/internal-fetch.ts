// internal-fetch.ts — call another Worker behind Access
export async function fetchWithServiceToken(
  url: string,
  env: { CF_SERVICE_TOKEN_ID: string; CF_SERVICE_TOKEN_SECRET: string },
  init: RequestInit = {},
): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...((init.headers as Record<string, string>) ?? {}),
      "CF-Access-Client-Id":     env.CF_SERVICE_TOKEN_ID,
      "CF-Access-Client-Secret": env.CF_SERVICE_TOKEN_SECRET,
      "Content-Type":            "application/json",
    },
  });
}
