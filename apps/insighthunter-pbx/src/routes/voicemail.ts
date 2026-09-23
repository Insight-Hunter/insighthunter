// apps/insighthunter-pbx/src/routes/voicemail.ts
import { Hono } from "hono";
import type { Env } from "../index.js";
import { getSession } from "../middleware/auth.js";

export const voicemail = new Hono<{ Bindings: Env }>();

voicemail.get("/", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const result = await c.env.DB.prepare(
    `SELECT * FROM voicemails WHERE org_id = ?1 ORDER BY created_at DESC LIMIT 50`
  ).bind(session.orgId).all();
  return c.json({ items: result.results ?? [] });
});

voicemail.post("/:id/mark-read", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  await c.env.DB.prepare(
    `UPDATE voicemails SET status = 'read' WHERE id = ?1 AND org_id = ?2`
  ).bind(c.req.param("id"), session.orgId).run();
  return c.json({ ok: true });
});
