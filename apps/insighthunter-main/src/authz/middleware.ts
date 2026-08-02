// authz/middleware.ts
// Hono middleware that short-circuits requests missing gateway identity headers.
// Mount with: app.use('/*', headerGuard())
// Unauthenticated browsers are redirected to auth; API clients get 401 JSON.

import type { MiddlewareHandler } from 'hono';
import type { Env } from '../index.js';
import { fromGatewayHeaders } from './session.js';

export function headerGuard(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const session = fromGatewayHeaders(c.req.raw);

    if (!session) {
      const accept = c.req.header('Accept') ?? '';
      if (accept.includes('text/html')) {
        const returnTo = encodeURIComponent(c.req.url);
        return c.redirect(`${c.env.AUTH_URL}/login?redirect=${returnTo}`, 302);
      }
      return c.json(
        { error: 'unauthorized', message: 'Valid session required.' },
        401,
      );
    }

    await next();
  };
}
