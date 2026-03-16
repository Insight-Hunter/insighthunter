import type { MiddlewareHandler } from "hono";
import type { Env } from "@/types";

export const corsMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const allowed = c.env.CORS_ORIGIN ?? "*";
  const reqOrigin = c.req.header("Origin") ?? "";
  const isAllowed = allowed === "*"
    || reqOrigin === allowed
    || reqOrigin.endsWith(".insighthunter.com");

  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin":  isAllowed ? reqOrigin : allowed,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age":       "86400",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }

  await next();
  c.res.headers.set("Access-Control-Allow-Origin", isAllowed ? reqOrigin : allowed);
  c.res.headers.set("Access-Control-Allow-Credentials", "true");
  c.res.headers.set("Vary", "Origin");
};
