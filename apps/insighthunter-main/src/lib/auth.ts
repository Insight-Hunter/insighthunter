
import { writable } from 'svelte/store';

const AUTH_TOKEN_KEY = 'ih_session';

// Create a writable store for the auth token
export const authToken = writable<string | null>(
  (typeof window !== 'undefined' && localStorage.getItem(AUTH_TOKEN_KEY)) || null
);

// Function to set the token in localStorage and update the store
export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    authToken.set(token);
  }
}

// Function to get the token from localStorage
export function getToken(): string | null {
  return (typeof window !== 'undefined' && localStorage.getItem(AUTH_TOKEN_KEY)) || null;
}

// Function to clear the token from localStorage and the store
export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    authToken.set(null);
    window.location.href = '/auth/login';
  }
}

// Function to get user data from the token
export function getUser(): { email: string; orgId: string; tier: string; userId: string } | null {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      email: payload.email,
      orgId: payload.orgId,
      tier: payload.tier,
      userId: payload.userId,
    };
  } catch (e) {
    console.error('Failed to decode token:', e);
    return null;
  }
}
