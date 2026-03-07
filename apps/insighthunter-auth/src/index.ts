import { Hono } from "hono";
import type { Env } from "@/types";
import type { AccessTokenPayload, MainEnv, ProfitLoss } from "@insighthunter/types";
import type { AuthEnv } from "@insighthunter/types/env";

// Middleware
import { corsMiddleware }    from "@/middleware/cors";
import { rateLimitMiddleware } from "@/middleware/rateLimit";

// Routes
import register from "@/routes/register";
import login    from "@/routes/login";
import logout   from "@/routes/logout";
import refresh  from "@/routes/refresh";
import verify   from "@/routes/verify";
import roles    from "@/routes/roles";

import { logger } from "@/lib/logger";

const app = new Hono<{ Bindings: Env }>();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use("*", corsMiddleware);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (c) =>
  c.json({ ok: true, service: "insighthunter-auth", ts: new Date().toISOString() })
);

// ── Auth routes ───────────────────────────────────────────────────────────────
app.route("/auth/register", register);
app.route("/auth/login",    login);
app.route("/auth/logout",   logout);
app.route("/auth/refresh",  refresh);
app.route("/auth/verify",   verify);
app.route("/auth/roles",    roles);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.notFound((c) =>
  c.json({ error: "Not Found", message: `${c.req.method} ${c.req.path} not found.` }, 404)
);

// ── Error handler ─────────────────────────────────────────────────────────────
app.onError((err, c) => {
  logger.error("Unhandled error", { message: err.message, stack: err.stack });
  return c.json({ error: "Internal Server Error", message: "An unexpected error occurred." }, 500);
});

export default app;
