import type { Env } from "../env.js";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 5;

/**
 * Simple fixed-window counter backed by KV, following the same
 * binding-per-concern pattern other Workers in this monorepo use for
 * lightweight caches/rate limits (see apps/insighthunter-bizforma's `CACHE`
 * KV). Keys are derived from a coarse client identifier — never the full
 * request (no PII, no raw IP is logged, only hashed into the key).
 *
 * This is a best-effort throttle, not a hard security boundary — acceptable
 * here since it only protects a public lead form, not authentication or
 * billing. Two limitations are accepted rather than fixed:
 * 1. KV is eventually consistent, so counts can lag across edge locations.
 * 2. The read-then-write here is not atomic: concurrent requests in the
 *    same window can both read the same `current` value and both proceed,
 *    which can under-throttle (allow slightly more than
 *    MAX_REQUESTS_PER_WINDOW) rather than over-throttle. In practice the
 *    over-count is bounded by how many concurrent POST /contact requests
 *    a single client can realistically fire within one KV round-trip
 *    (a handful, not an unbounded flood), and honeypot + validation still
 *    reject non-conforming/bot payloads regardless of this counter. A
 *    Durable Object counter would close the gap entirely but is not
 *    justified for a public lead-gen form; revisit if real abuse (as
 *    opposed to this theoretical race) is observed in practice.
 */
export async function isRateLimited(
  env: Pick<Env, "RATE_LIMIT">,
  clientKey: string,
): Promise<boolean> {
  const windowId = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
  const key = `contact:${await hash(clientKey)}:${windowId}`;
  const current = Number((await env.RATE_LIMIT.get(key)) ?? "0");
  if (current >= MAX_REQUESTS_PER_WINDOW) return true;
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: WINDOW_SECONDS * 2 });
  return false;
}

async function hash(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Coarse client identifier used only for rate limiting, never persisted
 * as-is. `CF-Connecting-IP` is always present on real Cloudflare traffic; it
 * is only absent in local dev / non-Cloudflare test environments, where
 * every request would otherwise share a single "unknown" bucket. The
 * `User-Agent` fallback keeps that dev-only scenario from becoming a
 * shared bucket across unrelated concurrent test clients, without changing
 * behavior in production (where the IP header is always set).
 */
export function clientKeyFrom(request: Request): string {
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) return ip;
  return `dev:${request.headers.get("User-Agent") ?? "unknown"}`;
}
