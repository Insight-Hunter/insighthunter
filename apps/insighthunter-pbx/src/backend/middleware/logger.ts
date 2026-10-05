// apps/insighthunter-pbx/src/backend/middleware/logger.ts
//
// Minimal structured request logger. Not mounted in index.ts by default yet
// (Workers' own invocation logs plus services/audit.ts cover compliance-
// relevant events today); this exists as the designated place to add
// request/response timing + correlation IDs once observability needs grow
// beyond audit-log coverage.
// TODO(logger): wire a request-id header and forward to a log sink if/when
// one is provisioned for this app.
import type { Context, Next } from "hono";

export async function requestLogger(c: Context, next: Next): Promise<void> {
  const start = Date.now();
  await next();
  const durationMs = Date.now() - start;
  console.log(
    JSON.stringify({
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs,
    }),
  );
}
