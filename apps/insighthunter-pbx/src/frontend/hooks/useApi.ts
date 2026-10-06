export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiRequestOptions = {
  path: string;
  method?: ApiMethod;
  body?: unknown;
  headers?: Record<string, string>;
};

const devHeaders: Record<string, string> = {
  "X-User-Id": "dev-user-001",
  "X-Org-Id": "dev-org-001",
  "X-User-Role": "owner",
  "X-User-Email": "owner@acme.test",
  "X-Org-Plan": "growth",
};


export async function useApi<T>({
  path,
  method = "GET",
  body,
  headers = {},
}: ApiRequestOptions): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...devHeaders,
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PBX API request failed: ${response.status} ${response.statusText} :: ${text}`);
  }

  return (await response.json()) as T;
}
