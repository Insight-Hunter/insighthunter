import { Hono } from "hono";
import { getSession } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { recordAuditEvent } from "../services/audit.js";
import type { Env } from "../types.js";
import { readJsonObject } from "../utils/http.js";

export const departments = new Hono<{ Bindings: Env }>();

departments.get("/", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);

  const result = await c.env.DB.prepare(
    `SELECT id, name, created_at AS createdAt
     FROM departments WHERE org_id = ?1 ORDER BY name`,
  )
    .bind(session.orgId)
    .all();
  return c.json({ items: result.results ?? [] });
});

departments.post("/", requireRole("owner", "admin"), async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);

  const body = await readJsonObject(c.req.raw);
  if (!body) return c.json({ error: "invalid_request" }, 400);
  const { name: rawName } = body as { name?: unknown };
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (name.length === 0 || name.length > 80) {
    return c.json({ error: "invalid_name", maxLength: 80 }, 400);
  }

  const createdAt = new Date().toISOString();
  const inserted = await c.env.DB.prepare(
    `INSERT INTO departments (org_id, name, created_at) VALUES (?1, ?2, ?3)
     ON CONFLICT(org_id, name) DO NOTHING`,
  )
    .bind(session.orgId, name, createdAt)
    .run();
  if (inserted.meta.changes === 0) return c.json({ error: "department_exists" }, 409);

  await recordAuditEvent(c.env.DB, {
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "department.create",
    resourceType: "department",
    resourceId: String(inserted.meta.last_row_id),
  });
  return c.json({ item: { id: inserted.meta.last_row_id, name, createdAt } }, 201);
});

departments.delete("/:id", requireRole("owner", "admin"), async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "invalid_id" }, 400);

  const inUse = await c.env.DB.prepare(
    "SELECT 1 AS used FROM extensions WHERE org_id = ?1 AND department_id = ?2 LIMIT 1",
  )
    .bind(session.orgId, id)
    .first();
  if (inUse) return c.json({ error: "department_in_use" }, 409);

  const deleted = await c.env.DB.prepare("DELETE FROM departments WHERE org_id = ?1 AND id = ?2")
    .bind(session.orgId, id)
    .run();
  if (deleted.meta.changes === 0) return c.json({ error: "not_found" }, 404);

  await recordAuditEvent(c.env.DB, {
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "department.delete",
    resourceType: "department",
    resourceId: String(id),
  });
  return c.body(null, 204);
});
