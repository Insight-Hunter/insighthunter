// routes/clients.ts
// Client / customer management — CRUD with contact info.

import { Hono } from "hono";
import type { Env } from "../index.js";
import { getSession } from "../index.js";

export const clientRoutes = new Hono<{ Bindings: Env }>();

type ClientRow = {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
};

// GET /api/clients
clientRoutes.get("/", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const result = await c.env.DB.prepare(`SELECT * FROM clients WHERE org_id = ?1 ORDER BY name ASC`)
    .bind(session.orgId)
    .all<ClientRow>();
  return c.json({ clients: result.results ?? [] });
});

// GET /api/clients/:id
clientRoutes.get("/:id", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const row = await c.env.DB.prepare(`SELECT * FROM clients WHERE id = ?1 AND org_id = ?2`)
    .bind(c.req.param("id"), session.orgId)
    .first<ClientRow>();
  if (!row) return c.json({ error: "Not found" }, 404);

  // Invoice summary for this client
  const summary = await c.env.DB.prepare(`
    SELECT COUNT(*) AS total_invoices,
           SUM(total_amount) AS lifetime_billed,
           SUM(amount_paid) AS lifetime_paid
    FROM invoices WHERE org_id = ?1 AND client_id = ?2
  `)
    .bind(session.orgId, c.req.param("id"))
    .first<{ total_invoices: number; lifetime_billed: number; lifetime_paid: number }>();

  return c.json({ client: row, summary });
});

// POST /api/clients
clientRoutes.post("/", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const body = await c.req.json<{
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }>();
  if (!body.name?.trim()) return c.json({ error: "name required" }, 400);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO clients (id, org_id, name, email, phone, address, notes, created_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,datetime('now'))
  `)
    .bind(
      id,
      session.orgId,
      body.name.trim(),
      body.email ?? null,
      body.phone ?? null,
      body.address ?? null,
      body.notes ?? null,
    )
    .run();

  return c.json({ id, name: body.name.trim() }, 201);
});

// PATCH /api/clients/:id
clientRoutes.patch("/:id", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const body = await c.req.json<{
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }>();

  const sets: string[] = [`updated_at = datetime('now')`];
  const binds: (string | null)[] = [];
  let p = 1;
  if (body.name !== undefined) {
    sets.push(`name = ?${p++}`);
    binds.push(body.name);
  }
  if (body.email !== undefined) {
    sets.push(`email = ?${p++}`);
    binds.push(body.email ?? null);
  }
  if (body.phone !== undefined) {
    sets.push(`phone = ?${p++}`);
    binds.push(body.phone ?? null);
  }
  if (body.address !== undefined) {
    sets.push(`address = ?${p++}`);
    binds.push(body.address ?? null);
  }
  if (body.notes !== undefined) {
    sets.push(`notes = ?${p++}`);
    binds.push(body.notes ?? null);
  }
  if (sets.length === 1) return c.json({ error: "Nothing to update" }, 400);

  binds.push(c.req.param("id"), session.orgId);
  await c.env.DB.prepare(
    `UPDATE clients SET ${sets.join(", ")} WHERE id = ?${p++} AND org_id = ?${p++}`,
  )
    .bind(...binds)
    .run();
  return c.json({ ok: true });
});

// DELETE /api/clients/:id
clientRoutes.delete("/:id", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  // Soft guard: don't delete if open invoices exist
  const open = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM invoices WHERE client_id = ?1 AND org_id = ?2 AND status IN ('draft','sent','overdue')`,
  )
    .bind(c.req.param("id"), session.orgId)
    .first<{ n: number }>();
  if ((open?.n ?? 0) > 0)
    return c.json({ error: "Client has open invoices — void or collect them first" }, 409);

  await c.env.DB.prepare(`DELETE FROM clients WHERE id = ?1 AND org_id = ?2`)
    .bind(c.req.param("id"), session.orgId)
    .run();
  return c.json({ ok: true });
});
