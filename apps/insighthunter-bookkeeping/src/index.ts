import { Hono } from "hono";
import type { D1Database } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ service: "bookkeeping", ok: true }));

/** Chart of accounts — list all accounts for the organization. */
app.get("/chart-of-accounts", async (c) => {
  const orgId = c.req.header("x-organization-id");
  if (!orgId) return c.json({ error: "x-organization-id header required" }, 400);
  const { results } = await c.env.DB.prepare(
    "SELECT id, code, name, type, archived FROM accounts WHERE organization_id = ? ORDER BY code",
  ).bind(orgId).all();
  return c.json({ items: results });
});

export default app;
