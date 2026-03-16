import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types';

interface AuthResponse {
  authenticated: boolean;
  userId?: string;
}

export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: { userId?: string } }> =
  async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!token) {
      throw new HTTPException(401, { message: 'Missing Authorization token' });
    }

    const url = new URL('/auth/validate', c.env.AUTH_WORKER_URL);
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new HTTPException(res.status, { message: 'Auth worker rejected token' });
    }

    const body = (await res.json()) as AuthResponse;
    if (!body.authenticated || !body.userId) {
      throw new HTTPException(401, { message: 'Unauthenticated' });
    }

    c.set('userId', body.userId);
    await next();
  };
