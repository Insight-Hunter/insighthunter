import type { MiddlewareHandler } from "hono";

export const errorBoundary: MiddlewareHandler = async (c, next) => {
  try {
    await next();
  } catch (error) {
    console.error("unhandled_error", error);
    return c.json({ error: "Internal server error" }, 500);
  }
};
