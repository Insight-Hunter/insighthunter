// apps/insighthunter-pbx/src/backend/routes/health.ts
import { Hono } from "hono";
import type { Env } from "../types.js";

export const health = new Hono<{ Bindings: Env }>();

health.get("/", (c) => c.json({ service: "pbx", ok: true }));
