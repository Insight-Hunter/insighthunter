// apps/insighthunter-scout/src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requireAuth } from "./middleware/auth.js";
import { leads } from "./routes/leads.js";
import { deals } from "./routes/deals.js";

export interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();
app.use("/api/*", cors({ origin: (o) => (o?.endsWith(".insighthunter.app") ? o : null), credentials: true }));
app.get("/health", (c) => c.json({ service: "scout", ok: true }));

app.use("/api/*", requireAuth);
app.route("/api/leads", leads);
app.route("/api/deals", deals);

export default app;
