import type { MiddlewareHandler } from 'hono';
import type { Env }               from '../types';

export const loggerMiddleware: MiddlewareHandler<{ Bindings: Env }> =
  async (c, next) => {
    const start = Date.now();
    await next();
    console.log(`[${c.req.method}] ${c.req.url} → ${c.res.status} (${Date.now() - start}ms)`);
  };
