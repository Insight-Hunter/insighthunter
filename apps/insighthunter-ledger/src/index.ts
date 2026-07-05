import { Hono } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import { accountsRoutes } from "./routes-accounts.js";
import { journalRoutes } from "./routes-journals.js";

export interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ service: "ledger", ok: true }));
app.route("/api", accountsRoutes);
app.route("/api", journalRoutes);

export default app;
