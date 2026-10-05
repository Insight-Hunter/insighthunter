// apps/insighthunter-pbx/src/backend/routes/voicemail.ts
import { Hono } from "hono";
import { getSession } from "../middleware/auth.js";
import { recordAuditEvent } from "../services/audit.js";
import type { Env } from "../types.js";

export const voicemail = new Hono<{ Bindings: Env }>();

voicemail.get("/", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const result = await c.env.DB.prepare(
    "SELECT * FROM voicemails WHERE org_id = ?1 ORDER BY created_at DESC LIMIT 50",
  )
    .bind(session.orgId)
    .all();
  await recordAuditEvent(c.env.DB, {
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "voicemail.list",
    resourceType: "voicemail",
  });
  return c.json({ items: result.results ?? [] });
});

voicemail.post("/:id/mark-read", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  await c.env.DB.prepare(`UPDATE voicemails SET status = 'read' WHERE id = ?1 AND org_id = ?2`)
    .bind(c.req.param("id"), session.orgId)
    .run();
  await recordAuditEvent(c.env.DB, {
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "voicemail.mark_read",
    resourceType: "voicemail",
    resourceId: c.req.param("id"),
  });
  return c.json({ ok: true });
});
