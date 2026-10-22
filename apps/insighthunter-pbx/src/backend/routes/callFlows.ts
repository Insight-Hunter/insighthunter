// Call-flow designer API (docs/insight-pbx-master-prompt.md §4.3): draft/publish,
// validation, version history, rollback, audit. Runtime evaluation is separate.
import { Hono } from "hono";
import { getSession } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { recordAuditEvent } from "../services/audit.js";
import { validateCallFlow } from "../services/callFlowValidation.js";
import type { Env } from "../types.js";
import { readJsonObject } from "../utils/http.js";

export const callFlows = new Hono<{ Bindings: Env }>();

const MAX_DEFINITION_BYTES = 64 * 1024;

interface VersionRow {
  id: number;
  version: number;
  status: string;
  definition: string;
}

async function tenantExtensions(db: D1Database, orgId: string): Promise<Set<string>> {
  const rows = await db
    .prepare("SELECT extension FROM extensions WHERE org_id = ?1")
    .bind(orgId)
    .all<{
      extension: string;
    }>();
  return new Set((rows.results ?? []).map((r) => r.extension));
}

async function findFlow(db: D1Database, orgId: string, id: number) {
  return db
    .prepare(
      "SELECT id, name, published_version AS publishedVersion FROM call_flows WHERE org_id = ?1 AND id = ?2",
    )
    .bind(orgId, id)
    .first<{ id: number; name: string; publishedVersion: number | null }>();
}

function parseId(raw: string | undefined): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

callFlows.get("/", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const result = await c.env.DB.prepare(
    `SELECT id, name, published_version AS publishedVersion, created_at AS createdAt
     FROM call_flows WHERE org_id = ?1 ORDER BY name`,
  )
    .bind(session.orgId)
    .all();
  return c.json({ items: result.results ?? [] });
});

callFlows.post("/", requireRole("owner", "admin"), async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const body = await readJsonObject(c.req.raw);
  if (!body) return c.json({ error: "invalid_request" }, 400);

  const name = typeof body["name"] === "string" ? body["name"].trim() : "";
  if (name.length === 0 || name.length > 80) {
    return c.json({ error: "invalid_name", maxLength: 80 }, 400);
  }
  const definition = body["definition"] ?? {
    start: "end",
    nodes: { end: { type: "voicemail" } },
  };
  const serialized = JSON.stringify(definition);
  if (serialized.length > MAX_DEFINITION_BYTES)
    return c.json({ error: "definition_too_large" }, 413);

  const now = new Date().toISOString();
  const flow = await c.env.DB.prepare(
    `INSERT INTO call_flows (org_id, name, created_at) VALUES (?1, ?2, ?3)
     ON CONFLICT(org_id, name) DO NOTHING`,
  )
    .bind(session.orgId, name, now)
    .run();
  if (flow.meta.changes === 0) return c.json({ error: "flow_exists" }, 409);

  const flowId = flow.meta.last_row_id;
  await c.env.DB.prepare(
    `INSERT INTO call_flow_versions (org_id, flow_id, version, status, definition, created_by, created_at)
     VALUES (?1, ?2, 1, 'draft', ?3, ?4, ?5)`,
  )
    .bind(session.orgId, flowId, serialized, session.userId, now)
    .run();

  await recordAuditEvent(c.env.DB, {
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "call_flow.create",
    resourceType: "call_flow",
    resourceId: String(flowId),
  });
  return c.json({ item: { id: flowId, name, draftVersion: 1 } }, 201);
});

callFlows.get("/:id", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const id = parseId(c.req.param("id"));
  if (id === null) return c.json({ error: "invalid_id" }, 400);

  const flow = await findFlow(c.env.DB, session.orgId, id);
  if (!flow) return c.json({ error: "not_found" }, 404);

  const versions = await c.env.DB.prepare(
    `SELECT version, status, definition, created_by AS createdBy, created_at AS createdAt,
            published_at AS publishedAt
     FROM call_flow_versions WHERE org_id = ?1 AND flow_id = ?2 ORDER BY version DESC`,
  )
    .bind(session.orgId, id)
    .all<{ definition: string }>();

  return c.json({
    item: {
      ...flow,
      versions: (versions.results ?? []).map((v) => ({
        ...v,
        definition: JSON.parse(v.definition),
      })),
    },
  });
});

callFlows.put("/:id/draft", requireRole("owner", "admin"), async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const id = parseId(c.req.param("id"));
  if (id === null) return c.json({ error: "invalid_id" }, 400);
  const body = await readJsonObject(c.req.raw);
  if (!body || body["definition"] === undefined) return c.json({ error: "invalid_request" }, 400);

  const serialized = JSON.stringify(body["definition"]);
  if (serialized.length > MAX_DEFINITION_BYTES)
    return c.json({ error: "definition_too_large" }, 413);
  if (!(await findFlow(c.env.DB, session.orgId, id))) return c.json({ error: "not_found" }, 404);

  const now = new Date().toISOString();
  const updated = await c.env.DB.prepare(
    `UPDATE call_flow_versions SET definition = ?1, created_by = ?2, created_at = ?3
     WHERE org_id = ?4 AND flow_id = ?5 AND status = 'draft'`,
  )
    .bind(serialized, session.userId, now, session.orgId, id)
    .run();

  let version: number | null = null;
  if (updated.meta.changes === 0) {
    // No open draft: start the next version from the latest number.
    const inserted = await c.env.DB.prepare(
      `INSERT INTO call_flow_versions (org_id, flow_id, version, status, definition, created_by, created_at)
       VALUES (?1, ?2, (SELECT COALESCE(MAX(version), 0) + 1 FROM call_flow_versions WHERE flow_id = ?2),
               'draft', ?3, ?4, ?5)`,
    )
      .bind(session.orgId, id, serialized, session.userId, now)
      .run();
    if (inserted.meta.changes === 0) return c.json({ error: "draft_conflict" }, 409);
  }
  const draft = await c.env.DB.prepare(
    "SELECT version FROM call_flow_versions WHERE org_id = ?1 AND flow_id = ?2 AND status = 'draft'",
  )
    .bind(session.orgId, id)
    .first<{ version: number }>();
  version = draft?.version ?? null;

  await recordAuditEvent(c.env.DB, {
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "call_flow.draft_save",
    resourceType: "call_flow",
    resourceId: String(id),
    metadata: { version },
  });
  return c.json({ item: { id, draftVersion: version } });
});

async function loadDraft(db: D1Database, orgId: string, flowId: number) {
  return db
    .prepare(
      `SELECT id, version, status, definition FROM call_flow_versions
       WHERE org_id = ?1 AND flow_id = ?2 AND status = 'draft'`,
    )
    .bind(orgId, flowId)
    .first<VersionRow>();
}

callFlows.post("/:id/validate", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const id = parseId(c.req.param("id"));
  if (id === null) return c.json({ error: "invalid_id" }, 400);
  if (!(await findFlow(c.env.DB, session.orgId, id))) return c.json({ error: "not_found" }, 404);

  const draft = await loadDraft(c.env.DB, session.orgId, id);
  if (!draft) return c.json({ error: "no_draft" }, 409);
  const issues = validateCallFlow(
    JSON.parse(draft.definition),
    await tenantExtensions(c.env.DB, session.orgId),
  );
  return c.json({ valid: issues.length === 0, issues });
});

callFlows.post("/:id/publish", requireRole("owner", "admin"), async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const id = parseId(c.req.param("id"));
  if (id === null) return c.json({ error: "invalid_id" }, 400);
  if (!(await findFlow(c.env.DB, session.orgId, id))) return c.json({ error: "not_found" }, 404);

  const draft = await loadDraft(c.env.DB, session.orgId, id);
  if (!draft) return c.json({ error: "no_draft" }, 409);
  const issues = validateCallFlow(
    JSON.parse(draft.definition),
    await tenantExtensions(c.env.DB, session.orgId),
  );
  if (issues.length > 0) return c.json({ error: "validation_failed", issues }, 422);

  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE call_flow_versions SET status = 'published', published_at = ?1
       WHERE org_id = ?2 AND id = ?3 AND status = 'draft'`,
    ).bind(now, session.orgId, draft.id),
    c.env.DB.prepare(
      "UPDATE call_flows SET published_version = ?1 WHERE org_id = ?2 AND id = ?3",
    ).bind(draft.version, session.orgId, id),
  ]);

  await recordAuditEvent(c.env.DB, {
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "call_flow.publish",
    resourceType: "call_flow",
    resourceId: String(id),
    metadata: { version: draft.version },
  });
  return c.json({ item: { id, publishedVersion: draft.version } });
});

callFlows.post("/:id/rollback", requireRole("owner", "admin"), async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const id = parseId(c.req.param("id"));
  if (id === null) return c.json({ error: "invalid_id" }, 400);
  const body = await readJsonObject(c.req.raw);
  const version = body?.["version"];
  if (typeof version !== "number" || !Number.isInteger(version)) {
    return c.json({ error: "invalid_version" }, 400);
  }
  const flow = await findFlow(c.env.DB, session.orgId, id);
  if (!flow) return c.json({ error: "not_found" }, 404);

  const target = await c.env.DB.prepare(
    `SELECT version FROM call_flow_versions
     WHERE org_id = ?1 AND flow_id = ?2 AND version = ?3 AND status = 'published'`,
  )
    .bind(session.orgId, id, version)
    .first();
  if (!target) return c.json({ error: "version_not_published" }, 404);

  await c.env.DB.prepare(
    "UPDATE call_flows SET published_version = ?1 WHERE org_id = ?2 AND id = ?3",
  )
    .bind(version, session.orgId, id)
    .run();

  await recordAuditEvent(c.env.DB, {
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "call_flow.rollback",
    resourceType: "call_flow",
    resourceId: String(id),
    metadata: { from: flow.publishedVersion, to: version },
  });
  return c.json({ item: { id, publishedVersion: version } });
});
