// src/lib/api.ts
import { getToken } from './auth';
import type { APIResponse } from '../types';

const BASE = ''; // Relative — works on both local + Cloudflare Pages

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${BASE}${path}`;
  const init: RequestInit = {
    method,
    headers: authHeaders(),
  };
  // Only attach body for non-GET/HEAD methods
  if (body !== undefined && !['GET', 'HEAD'].includes(method)) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);

  if (res.status === 401) {
    // Token expired — redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}&reason=expired`;
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await res.json<{ error?: string; message?: string }>();
      message = err.error ?? err.message ?? message;
    } catch {}
    throw new Error(message);
  }

  // Handle empty responses (204 No Content)
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return {} as T;
  }

  return res.json<T>();
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
