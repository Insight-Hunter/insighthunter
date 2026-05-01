// apps/insighthunter-bizforma/utils/api.ts

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface RequestOptions extends RequestInit {
  token?: string;
}

const DEFAULT_HEADERS: HeadersInit = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function parseJsonSafe(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, headers, body, ...rest } = options;

  const finalHeaders = new Headers(DEFAULT_HEADERS);
  if (headers) {
    new Headers(headers).forEach((value, key) => finalHeaders.set(key, value));
  }

  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...rest,
    headers: finalHeaders,
    credentials: "include",
    body,
  });

  const payload = (await parseJsonSafe(response)) as ApiResponse<T> | null;

  if (!response.ok) {
    const message =
      payload && !payload.ok
        ? payload.error?.message || "Request failed"
        : `Request failed with status ${response.status}`;

    throw new ApiClientError(
      message,
      response.status,
      payload && !payload.ok ? payload.error?.code : undefined,
      payload && !payload.ok ? payload.error?.details : undefined,
    );
  }

  if (payload && "ok" in payload) {
    if (payload.ok) return payload.data;

    throw new ApiClientError(
      payload.error?.message || "Unexpected API error",
      response.status,
      payload.error?.code,
      payload.error?.details,
    );
  }

  return (payload as T) ?? (undefined as T);
}

export function getLoginUrl(returnTo?: string) {
  const redirect = encodeURIComponent(
    returnTo ?? `${window.location.origin}/auth/callback`,
  );

  return `https://auth.insighthunter.app/login?redirect_uri=${redirect}&audience=bizforma`;
}

export function getSignupUrl(returnTo?: string) {
  const redirect = encodeURIComponent(
    returnTo ?? `${window.location.origin}/auth/callback`,
  );

  return `https://auth.insighthunter.app/register?redirect_uri=${redirect}&audience=bizforma`;
}

export async function getSession<T>() {
  return apiRequest<T>("/api/session", {
    method: "GET",
  });
}

export async function createSession<T>(payload: unknown) {
  return apiRequest<T>("/api/session", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSession<T>(payload: unknown) {
  return apiRequest<T>("/api/session", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getBusiness<T>(businessId: string) {
  return apiRequest<T>(`/api/business/${encodeURIComponent(businessId)}`, {
    method: "GET",
  });
}

export async function createBusiness<T>(payload: unknown) {
  return apiRequest<T>("/api/business", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
