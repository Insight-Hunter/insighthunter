// ─── API client — prepends /api and injects Authorization Bearer ──────────────

let _token: string | null = null;

export function setToken(token: string) { _token = token; }
export function clearToken() { _token = null; }

export function getToken(): string | null {
  if (_token) return _token;
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('ih_access_token');
  }
  return null;
}

interface FetchOptions extends RequestInit {
  json?: unknown;
}

export async function api<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (token) headers.set('Authorization', `Bearer ${token}`);

  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.json);
  }

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (res.status === 401) {
    // Clear token and redirect
    clearToken();
    if (typeof localStorage !== 'undefined') localStorage.removeItem('ih_access_token');
    window.location.href = '/auth/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }

  const contentType = res.headers.get('Content-Type') ?? '';
  if (contentType.includes('text/event-stream')) {
    return res as unknown as T;
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  return api<T>(path, { method: 'GET' });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return api<T>(path, { method: 'POST', json: body });
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return api<T>(path, { method: 'PATCH', json: body });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return api<T>(path, { method: 'DELETE' });
}
