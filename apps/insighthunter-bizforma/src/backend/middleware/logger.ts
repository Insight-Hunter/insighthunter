import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types';

export const requestLogger: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  try {
    await c.env.ANALYTICS.writeDataPoint({
      blobs: ['bizforma_request', c.req.method, c.req.path],
      doubles: [duration],
      indexes: [c.req.header('cf-connecting-ip') ?? 'unknown'],
    });
  } catch (e) {
    console.error('Analytics write failed', e);
  }
};
