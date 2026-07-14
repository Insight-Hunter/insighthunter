import type { D1Database } from "@cloudflare/workers-types";
import { Hono } from "hono";
import type { Env } from "./index.js";

export const accountsRoutes = new Hono<{ Bindings: Env }>();

accountsRoutes.get("/accounts", async (c) => {
  const orgId = c.req.header("x-organization-id");
  if (!orgId) return c.json({ error: "x-organization-id header required" }, 400);

  const { results } = await c.env.DB.prepare(
    "SELECT id, code, name, type, archived FROM accounts WHERE organization_id = ? ORDER BY code",
  )
    .bind(orgId)
    .all<{ id: string; code: string; name: string; type: string; archived: number }>();

  return c.json({ items: results });
});

accountsRoutes.post("/accounts", async (c) => {
  const orgId = c.req.header("x-organization-id");
  if (!orgId) return c.json({ error: "x-organization-id header required" }, 400);

  const body = await c.req.json<{
    code: string;
    name: string;
    type: string;
  }>();

  if (!body.code || !body.name || !body.type) {
    return c.json({ error: "code, name, and type are required" }, 400);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await c.env.DB.prepare(
    "INSERT INTO accounts (id, organization_id, code, name, type, archived, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
  )
    .bind(id, orgId, body.code, body.name, body.type, createdAt)
    .run();

  return c.json({ created: true, id }, 201);
});

accountsRoutes.patch("/accounts/:id", async (c) => {
  const orgId = c.req.header("x-organization-id");
  if (!orgId) return c.json({ error: "x-organization-id header required" }, 400);

  const { id } = c.req.param();
  const body = await c.req.json<Partial<{ name: string; archived: boolean }>>();

  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) {
    fields.push("name = ?");
    values.push(body.name);
  }
  if (body.archived !== undefined) {
    fields.push("archived = ?");
    values.push(body.archived ? 1 : 0);
  }

  if (fields.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  values.push(id, orgId);
  await c.env.DB.prepare(
    `UPDATE accounts SET ${fields.join(", ")} WHERE id = ? AND organization_id = ?`,
  )
    .bind(...values)
    .run();

  return c.json({ updated: true, id });
});
