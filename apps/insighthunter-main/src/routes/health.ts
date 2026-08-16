// apps/insighthunter-main/src/routes/health.ts

import { Hono } from "hono";
import type { Env } from "../index";

export const healthRoutes = new Hono<{ Bindings: Env }>();

healthRoutes.get("/", async (c) => {
  // Ping D1 to confirm DB connectivity
  let dbOk = false;
  try {
    await c.env.DB.prepare("SELECT 1").first();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  return c.json({
    ok: true,
    service: "insighthunter-main",
    version: "2.0.0",
    db: dbOk ? "ok" : "error",
    ts: new Date().toISOString(),
  });
});
