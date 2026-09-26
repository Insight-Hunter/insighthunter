// apps/insighthunter-scout/src/routes/deals.ts
import { Hono } from "hono";
import type { Env } from "../index.js";
import { getSession } from "../middleware/auth.js";

export const deals = new Hono<{ Bindings: Env }>();

deals.get("/", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const result = await c.env.DB.prepare(
    "SELECT * FROM deals WHERE org_id = ?1 ORDER BY created_at DESC LIMIT 100",
  )
    .bind(session.orgId)
    .all();
  return c.json({ items: result.results ?? [] });
});

deals.post("/", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const body = await c.req.json<{ leadId: string; amount: number; stage?: string }>();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO deals (id, org_id, lead_id, amount, stage, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
  )
    .bind(
      id,
      session.orgId,
      body.leadId,
      body.amount,
      body.stage ?? "prospecting",
      new Date().toISOString(),
    )
    .run();
  return c.json({ id }, 201);
});
