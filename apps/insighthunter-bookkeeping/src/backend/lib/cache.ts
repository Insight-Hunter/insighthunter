import type { KVNamespace } from '@cloudflare/workers-types';

export function accountsCacheKey(orgId: string): string {
  return `accounts_${orgId}`;
}

export async function cacheGet<T>(kv: KVNamespace, key: string): Promise<T | null> {
  try {
    const value = await kv.get(key, 'json');
    return value as T | null;
  } catch (e) {
    console.error(`Failed to get cache for key ${key}:`, e);
    return null;
  }
}

export async function cacheSet(kv: KVNamespace, key: string, value: unknown, expirationTtl: number): Promise<void> {
  try {
    await kv.put(key, JSON.stringify(value), { expirationTtl });
  } catch (e) {
    console.error(`Failed to set cache for key ${key}:`, e);
  }
}

export async function cacheDelete(kv: KVNamespace, key: string): Promise<void> {
  try {
    await kv.delete(key);
  } catch (e) {
    console.error(`Failed to delete cache for key ${key}:`, e);
  }
}
