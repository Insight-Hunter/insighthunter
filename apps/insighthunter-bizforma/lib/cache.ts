export async function cacheGet<T>(namespace: KVNamespace, key: string): Promise<T | null> {
  return namespace.get(key, 'json');
}

export async function cacheSet(namespace: KVNamespace, key: string, value: unknown, ttl = 300) {
  await namespace.put(key, JSON.stringify(value), { expirationTtl: ttl });
}
