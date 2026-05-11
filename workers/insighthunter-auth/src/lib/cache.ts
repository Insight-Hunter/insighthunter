export async function kvGet<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const raw = await kv.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function kvSet<T>(
  kv: KVNamespace,
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
}

export async function kvDel(kv: KVNamespace, key: string): Promise<void> {
  await kv.delete(key);
}

// ── Namespaced helpers ────────────────────────────────────────────────────────
export async function storeResetToken(
  kv: KVNamespace,
  token: string,
  userId: string
): Promise<void> {
  await kvSet(kv, `reset:${token}`, { userId }, 3600); // 1 hour
}

export async function consumeResetToken(
  kv: KVNamespace,
  token: string
): Promise<string | null> {
  const data = await kvGet<{ userId: string }>(kv, `reset:${token}`);
  if (!data) return null;
  await kvDel(kv, `reset:${token}`);
  return data.userId;
}

export async function storeVerifyToken(
  kv: KVNamespace,
  token: string,
  userId: string
): Promise<void> {
  await kvSet(kv, `verify:${token}`, { userId }, 86400); // 24 hours
}

export async function consumeVerifyToken(
  kv: KVNamespace,
  token: string
): Promise<string | null> {
  const data = await kvGet<{ userId: string }>(kv, `verify:${token}`);
  if (!data) return null;
  await kvDel(kv, `verify:${token}`);
  return data.userId;
}

export async function storeRefreshJTI(
  kv: KVNamespace,
  jti: string,
  userId: string,
  ttlSeconds: number
): Promise<void> {
  await kvSet(kv, `jti:${jti}`, { userId, valid: true }, ttlSeconds);
}

export async function revokeJTI(kv: KVNamespace, jti: string): Promise<void> {
  await kvDel(kv, `jti:${jti}`);
}

export async function isJTIValid(kv: KVNamespace, jti: string): Promise<boolean> {
  const data = await kvGet<{ valid: boolean }>(kv, `jti:${jti}`);
  return data?.valid === true;
}
