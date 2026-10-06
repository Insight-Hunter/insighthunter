import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200): Response {
  return c.json(data, status);
}

export function badRequest(c: Context, error: string, details?: unknown): Response {
  return c.json({ error, details }, 400);
}

export function unauthorized(c: Context, error = "Unauthorized"): Response {
  return c.json({ error }, 401);
}

export function forbidden(c: Context, error = "Forbidden"): Response {
  return c.json({ error }, 403);
}

export function notFound(c: Context, error = "Not found"): Response {
  return c.json({ error }, 404);
}

export function conflict(c: Context, error: string): Response {
  return c.json({ error }, 409);
}
