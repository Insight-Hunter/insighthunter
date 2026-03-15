import type { KVNamespace } from '@cloudflare/workers-types';

interface RateLimitConfig {
  requests: number;
  windowSeconds: number;
}

const DEFAULTS: Record<string,
 RateLimitConfig> = {
  free:        { requests: 60,  windowSeconds: 60 },
  pro:         { requests: 300, windowSeconds: 60 },
  white_label: { requests: 600, windowSeconds: 60 },
};

export async function rateLimit(
  kv: KVNamespace,
  identifier: string, // e.g. orgId or userId
  plan: string,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = DEFAULTS[plan] ?? DEFAULTS.free;
  const key    = `rl:${identifier}:${Math.floor(Date.now() / (config.windowSeconds * 1000))}`;
  const resetAt = (Math.floor(Date.now() / (config.windowSeconds * 1000)) + 1) * config.windowSeconds * 1000;

  const current = parseInt((await kv.get(key)) ?? '0', 10);
  if (current >= config.requests) {
    return { allowed: false, remaining: 0, resetAt };
  }

  await kv.put(key, String(current + 1), { expirationTtl: config.windowSeconds * 2 });
  return { allowed: true, remaining: config.requests - current - 1, resetAt };
}

export function rateLimitHeaders(remaining: number, resetAt: number): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset':     String(Math.floor(resetAt / 1000)),
  };
}
