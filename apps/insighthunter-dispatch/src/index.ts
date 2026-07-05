import { Hono } from "hono";
import type { D1Database } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ service: "dispatch", ok: true }));

/**
 * List all provisioned tenants (organizations).
 */
app.get("/tenants", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, owner_email, status, created_at FROM tenants ORDER BY created_at DESC",
  ).all();

  return c.json({ items: results });
});

/**
 * Provision a new tenant. Creates the organization record and marks it as
 * active. In a full Workers for Platforms deployment this would also upload
 * an isolated per-tenant Worker script.
 */
app.post("/tenants", async (c) => {
  const body = await c.req.json<{
    name: string;
    ownerEmail: string;
  }>();

  if (!body.name || !body.ownerEmail) {
    return c.json({ error: "name and ownerEmail are required" }, 400);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await c.env.DB.prepare(
    "INSERT INTO tenants (id, name, owner_email, status, created_at) VALUES (?, ?, ?, 'active', ?)",
  )
    .bind(id, body.name, body.ownerEmail, createdAt)
    .run();

  return c.json({ provisioned: true, tenantId: id }, 201);
});

/**
 * Suspend a tenant.
 */
app.patch("/tenants/:id/suspend", async (c) => {
  const { id } = c.req.param();
  await c.env.DB.prepare(
    "UPDATE tenants SET status = 'suspended' WHERE id = ?",
  )
    .bind(id)
    .run();

  return c.json({ suspended: true, id });
});

export default app;
