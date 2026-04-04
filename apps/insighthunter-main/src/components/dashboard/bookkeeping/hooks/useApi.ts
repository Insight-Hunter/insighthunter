import { useAuthToken } from "./useAuthToken";

export function useApiBase() {
  const token = useAuthToken();
  const base = "";

  async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`/api${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    return res.json() as Promise<T>;
  }

  return { apiFetch, base };
}
