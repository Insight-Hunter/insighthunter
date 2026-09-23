import type { MiddlewareHandler } from "hono";

/**
 * Baseline security headers for every response. The site is entirely static
 * marketing HTML plus one validated form POST, so the CSP can stay tight
 * (no third-party scripts, no inline event handlers).
 */
export function securityHeaders(): MiddlewareHandler {
  return async (c, next) => {
    await next();
    c.header("X-Frame-Options", "DENY");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    c.header(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; font-src 'self'; form-action 'self' https://auth.insighthunter.app; " +
        "base-uri 'none'; frame-ancestors 'none'; object-src 'none'",
    );
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  };
}

/**
 * Structured, privacy-safe access log: method/path/status/duration only —
 * never headers, query strings, bodies, or IPs, so form input can never leak
 * into logs.
 */
export function requestLog(): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now();
    await next();
    const entry = {
      level: "info",
      msg: "request",
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      durationMs: Date.now() - start,
    };
    console.log(JSON.stringify(entry));
  };
}
