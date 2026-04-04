import type { MiddlewareHandler } from "hono";
import type { Env } from "@/types";

/**
 * KV-based sliding window rate limiter.
 * Auth routes use tighter limits than the global Worker defaults.
 */
export function rateLimitMiddleware(
  maxOverride?: number
): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const ip      = c.req.header("CF-Connecting-IP") ?? "unknown";
    const path    = new URL(c.req.url).pathname.replace(/\//g, "_");
    const window  = parseInt(c.env.RATE_LIMIT_WINDOW ?? "60");
    const max     = maxOverride ?? parseInt(c.env.RATE_LIMIT_MAX ?? "20");
    const bucket  = Math.floor(Date.now() / 1000 / window);
    const key     = `rl:${ip}:${path}:${bucket}`;

    const raw   = await c.env.SESSIONS.get(key);
    const count = raw ? parseInt(raw) : 0;

    if (count >= max) {
      return c.json(
        { error: "Too Many Requests", message: "Rate limit exceeded. Try again shortly.", retryAfter: window },
        429,
        { "Retry-After": String(window) }
      );
    }

    await c.env.SESSIONS.put(key, String(count + 1), { expirationTtl: window * 2 });
    c.res.headers.set("X-RateLimit-Limit",     String(max));
    c.res.headers.set("X-RateLimit-Remaining", String(Math.max(0, max - count - 1)));
    await next();
  };
}
