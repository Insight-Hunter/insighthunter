// src/lib/auth.ts
import type { AuthUser, Session } from '../types';

const SESSION_COOKIE = 'ih_session';
const SESSION_KEY = 'ih_session_data';

// ─── SSR-safe token retrieval ─────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof document === 'undefined') return null; // SSR guard
  // Check cookie first (httpOnly-safe pattern via document.cookie for non-httpOnly)
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (match) return decodeURIComponent(match[1]);
  // Fallback to sessionStorage (not localStorage — avoids XSS persistence)
  return sessionStorage.getItem(SESSION_KEY);
}

export function setToken(token: string, rememberMe = false): void {
  if (typeof document === 'undefined') return;
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 8; // 30d or 8h
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(token)};path=/;max-age=${maxAge};SameSite=Strict`;
  sessionStorage.setItem(SESSION_KEY, token);
}

export function clearToken(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${SESSION_COOKIE}=;path=/;max-age=0`;
  sessionStorage.removeItem(SESSION_KEY);
}

// ─── Session verification (called from middleware with env) ───────────────

export async function verifySession(
  token: string,
  env?: { AUTH_WORKER: Fetcher }
): Promise<Session | null> {
  try {
    // If called from middleware (edge), use service binding
    if (env?.AUTH_WORKER) {
      const res = await env.AUTH_WORKER.fetch('https://internal/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) return null;
      return res.json<Session>();
    }

    // Client-side fallback via API proxy
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json<Session>();
  } catch {
    return null;
  }
}

// ─── Client-side helpers ──────────────────────────────────────────────────

export async function login(email: string, password: string, rememberMe = false) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json<{ error: string }>();
    throw new Error(err.error ?? 'Login failed');
  }
  const data = await res.json<{ token: string; user: AuthUser }>();
  setToken(data.token, rememberMe);
  return data;
}

export async function logout() {
  const token = getToken();
  if (token) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  clearToken();
  window.location.href = '/auth/login';
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
