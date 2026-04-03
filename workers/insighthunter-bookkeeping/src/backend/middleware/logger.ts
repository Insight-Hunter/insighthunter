import type { Context, Next } from "hono";
import type { Env } from "../types.js";

export async function analyticsLogger(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<void> {
  const start = Date.now();
  await next();
  const latency = Date.now() - start;
  const user = c.get("user");

  c.env.ANALYTICS.writeDataPoint({
    blobs: [
      c.req.method,
      new URL(c.req.url).pathname,
      c.res.status.toString(),
      user?.orgId ?? "anon",
      user?.tier ?? "unknown",
    ],
    doubles: [latency],
    indexes: [user?.orgId ?? "anon"],
  });
}
