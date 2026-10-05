import type { MiddlewareHandler } from "hono";
import { newId } from "../utils/ids.js";

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const requestId = newId("req");
  c.set("requestId", requestId);
  const started = Date.now();
  await next();
  c.header("x-request-id", requestId);
  console.log(JSON.stringify({
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration_ms: Date.now() - started
  }));
};
