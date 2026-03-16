import type { KVNamespace } from '@cloudflare/workers-types';

export async function cacheGet<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const val = await kv.get(key, 'json');
  return (val as T) ?? null;
}

export async function cacheSet<T>(
  kv: KVNamespace, key: string, value: T, ttlSeconds = 300
): Promise<void> {
  await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
}

export async function cacheDelete(kv: KVNamespace, key: string): Promise<void> {
  await kv.delete(key);
}

/** Invalidate all cache keys matching a prefix (requires KV list, use sparingly). */
export async function cacheInvalidatePrefix(kv: KVNamespace, prefix: string): Promise<void> {
  const list = await kv.list({ prefix });
  await Promise.all(list.keys.map(k => kv.delete(k.name)));
}

export function statementCacheKey(orgId: string, type: string, from: string, to: string): string {
  return `stmt:${orgId}:${type}:${from}:${to}`;
}

export function accountsCacheKey(orgId: string): string {
  return `accounts:${orgId}`;
}
