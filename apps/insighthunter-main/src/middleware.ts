// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

// Safely load authGuard — falls back to passthrough if not resolved at edge
let guard: ((ctx: Parameters<ReturnType<typeof defineMiddleware>>[0], next: Parameters<ReturnType<typeof defineMiddleware>>[1]) => Promise<Response>) | null = null;
try {
  const mod = await import('@insighthunter/auth-shared');
  if (typeof mod.authGuard === 'function') {
    const instance = mod.authGuard();
    guard = instance;
  }
} catch {
  // auth-shared not available — passthrough (safe for public marketing pages)
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (guard) {
    return guard(context, next);
  }
  return next();
});
