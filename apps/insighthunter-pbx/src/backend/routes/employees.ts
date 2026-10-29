// Extensions (docs/insight-pbx-master-prompt.md §4.2). Mounted at /api/employees.
import { Hono } from "hono";
import { getSession } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { recordAuditEvent } from "../services/audit.js";
import type { Env } from "../types.js";
import { readJsonObject } from "../utils/http.js";

export const employees = new Hono<{ Bindings: Env }>();

const KINDS = ["user", "department", "queue", "voicemail"] as const;
type Kind = (typeof KINDS)[number];

employees.get("/", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);

  const result = await c.env.DB.prepare(
    `SELECT id, extension, kind, display_name AS displayName, user_id AS userId,
            department_id AS departmentId, created_at AS createdAt
     FROM extensions WHERE org_id = ?1 ORDER BY extension`,
  )
    .bind(session.orgId)
    .all();
  return c.json({ items: result.results ?? [] });
});

employees.post("/", requireRole("owner", "admin"), async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);

  const body = await readJsonObject(c.req.raw);
  if (!body) return c.json({ error: "invalid_request" }, 400);
  const input = body as {
    extension?: unknown;
    kind?: unknown;
    displayName?: unknown;
    userId?: unknown;
    departmentId?: unknown;
  };

  if (typeof input.extension !== "string" || !/^[0-9]{2,6}$/.test(input.extension)) {
    return c.json({ error: "invalid_extension", expected: "2-6 digits" }, 400);
  }
  if (typeof input.kind !== "string" || !KINDS.includes(input.kind as Kind)) {
    return c.json({ error: "invalid_kind", allowed: KINDS }, 400);
  }
  const kind = input.kind as Kind;
  const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
  if (displayName.length === 0 || displayName.length > 80) {
    return c.json({ error: "invalid_display_name", maxLength: 80 }, 400);
  }
  const userId = input.userId ?? null;
  if (userId !== null && (typeof userId !== "string" || userId.length === 0)) {
    return c.json({ error: "invalid_user_id" }, 400);
  }
  if (kind === "user" && userId === null) {
    return c.json({ error: "user_id_required" }, 400);
  }
  const departmentId = input.departmentId ?? null;
  if (departmentId !== null && !Number.isInteger(departmentId)) {
    return c.json({ error: "invalid_department_id" }, 400);
  }
  if (kind === "department" && departmentId === null) {
    return c.json({ error: "department_id_required" }, 400);
  }

  if (departmentId !== null) {
    const owned = await c.env.DB.prepare(
      "SELECT 1 AS found FROM departments WHERE org_id = ?1 AND id = ?2",
    )
      .bind(session.orgId, departmentId)
      .first();
    if (!owned) return c.json({ error: "department_not_found" }, 404);
  }

  const createdAt = new Date().toISOString();
  const inserted = await c.env.DB.prepare(
    `INSERT INTO extensions (org_id, extension, kind, display_name, user_id, department_id, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
     ON CONFLICT(org_id, extension) DO NOTHING`,
  )
    .bind(session.orgId, input.extension, kind, displayName, userId, departmentId, createdAt)
    .run();
  if (inserted.meta.changes === 0) return c.json({ error: "extension_exists" }, 409);

  await recordAuditEvent(c.env.DB, {
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "extension.create",
    resourceType: "extension",
    resourceId: input.extension,
    metadata: { kind },
  });
  return c.json(
    {
      item: {
        id: inserted.meta.last_row_id,
        extension: input.extension,
        kind,
        displayName,
        userId,
        departmentId,
        createdAt,
      },
    },
    201,
  );
});

employees.delete("/:id", requireRole("owner", "admin"), async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "invalid_id" }, 400);

  const deleted = await c.env.DB.prepare("DELETE FROM extensions WHERE org_id = ?1 AND id = ?2")
    .bind(session.orgId, id)
    .run();
  if (deleted.meta.changes === 0) return c.json({ error: "not_found" }, 404);

  await recordAuditEvent(c.env.DB, {
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "extension.delete",
    resourceType: "extension",
    resourceId: String(id),
  });
  return c.body(null, 204);
});
