// apps/insighthunter-scout/src/routes/leads.ts
import { Hono } from "hono";
import type { Env } from "../index.js";
import { getSession } from "../middleware/auth.js";

export const leads = new Hono<{ Bindings: Env }>();

leads.get("/", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const result = await c.env.DB.prepare(
    "SELECT * FROM leads WHERE org_id = ?1 ORDER BY created_at DESC LIMIT 100",
  )
    .bind(session.orgId)
    .all();
  return c.json({ items: result.results ?? [] });
});

leads.post("/", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const body = await c.req.json<{
    name: string;
    email?: string;
    phone?: string;
    source?: string;
  }>();
  if (!body.name) return c.json({ error: "name required" }, 400);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO leads (id, org_id, name, email, phone, source, status, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'new', ?7)`,
  )
    .bind(
      id,
      session.orgId,
      body.name,
      body.email ?? null,
      body.phone ?? null,
      body.source ?? "manual",
      new Date().toISOString(),
    )
    .run();

  return c.json({ id }, 201);
});

leads.patch("/:id", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const { status } = await c.req.json<{ status: string }>();
  await c.env.DB.prepare("UPDATE leads SET status = ?1 WHERE id = ?2 AND org_id = ?3")
    .bind(status, c.req.param("id"), session.orgId)
    .run();
  return c.json({ ok: true });
});
