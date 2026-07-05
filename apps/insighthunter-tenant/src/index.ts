import { Hono } from "hono";
import type { D1Database } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ service: "tenant", ok: true }));
app.get("/settings", async (c) => {
  const orgId = c.req.header("x-organization-id");
  if (!orgId) return c.json({ error: "x-organization-id header required" }, 400);
  const row = await c.env.DB.prepare(
    "SELECT id, name, owner_email, status FROM tenants WHERE id = ?",
  ).bind(orgId).first();
  if (!row) return c.json({ error: "Tenant not found" }, 404);
  return c.json(row);
});

export default app;
