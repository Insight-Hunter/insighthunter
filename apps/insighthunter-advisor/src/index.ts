/**
 * InsightHunter Advisor Worker — Phase I (complete)
 * advisor.insighthunter.app
 *
 * Routes:
 *   Firms         GET /api/firms, POST, GET :id, PATCH :id
 *   Members       GET, POST invite, PATCH :uid, DELETE :uid
 *   Clients       GET, POST, PATCH :id, DELETE :id
 *   Alerts        GET, PATCH :id/resolve
 *   Notes         GET, POST, PATCH :id, DELETE :id
 *   Overview      GET /api/firms/:fid/clients/:id/overview
 */

import { Hono } from "hono";
import { cors } from "hono/cors";

// ── Env & variable types ──────────────────────────────────────────────────────

type Env = {
  DB: D1Database;
  ADVISOR_KV: KVNamespace;
  EMAIL_QUEUE: Queue;
  ANALYTICS: AnalyticsEngineDataset;
  AUTH_SERVICE_URL: string;
  ENVIRONMENT: string;
};

type AuthUser = { userId: string; email?: string };
type Variables = { auth: AuthUser };

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── CORS ──────────────────────────────────────────────────────────────────────

app.use(
  "*",
  cors({
    origin: ["https://insighthunter.app", "https://advisor.insighthunter.app"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// ── Auth middleware ───────────────────────────────────────────────────────────

app.use("/api/*", async (c, next) => {
  const user = await resolveAuth(c.req.raw);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  c.set("auth", user);
  await next();
});

// ── Health ────────────────────────────────────────────────────────────────────

app.get("/health", (c) =>
  c.json({ ok: true, service: "insighthunter-advisor", env: c.env.ENVIRONMENT })
);

// ═══════════════════════════════════════════════════════════════════════════════
// FIRMS
// ═══════════════════════════════════════════════════════════════════════════════

/** List all firms the authenticated user belongs to */
app.get("/api/firms", async (c) => {
  const { userId } = c.get("auth");
  const { results } = await c.env.DB.prepare(`
    SELECT f.id, f.name, f.owner_user_id, f.plan, f.created_at, f.updated_at
    FROM firms f
    INNER JOIN firm_members fm ON fm.firm_id = f.id
    WHERE fm.user_id = ?
    ORDER BY f.created_at DESC
  `)
    .bind(userId)
    .all();
  return c.json({ firms: results });
});

/** Create a new firm and auto-assign the creator as owner */
app.post("/api/firms", async (c) => {
  const { userId } = c.get("auth");
  const body = await c.req.json<{ name?: string; plan?: string }>();
  if (!body.name?.trim()) return c.json({ error: "name is required" }, 400);

  const firmId = uuid();
  const memberId = uuid();
  const now = epoch();
  const plan = normalizePlan(body.plan);

  await c.env.DB.batch([
    c.env.DB.prepare(`
      INSERT INTO firms (id, name, owner_user_id, plan, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(firmId, body.name.trim(), userId, plan, now, now),
    c.env.DB.prepare(`
      INSERT INTO firm_members (id, firm_id, user_id, role, accepted_at, created_at)
      VALUES (?, ?, ?, 'owner', ?, ?)
    `).bind(memberId, firmId, userId, now, now),
  ]);

  track(c.env, "advisor_firm_created", userId, firmId, { plan });
  return c.json({ id: firmId, name: body.name.trim(), owner_user_id: userId, plan, created_at: now }, 201);
});

/** Get a single firm (membership required) */
app.get("/api/firms/:firmId", async (c) => {
  const { userId } = c.get("auth");
  const firmId = c.req.param("firmId");
  const membership = await firmAccess(c.env.DB, firmId, userId);
  if (!membership) return c.json({ error: "forbidden" }, 403);

  const firm = await c.env.DB.prepare(`
    SELECT id, name, owner_user_id, plan, created_at, updated_at FROM firms WHERE id = ?
  `)
    .bind(firmId)
    .first();

  if (!firm) return c.json({ error: "not_found" }, 404);
  return c.json({ firm, membership });
});

/** Update firm name or plan (owner/admin only) */
app.patch("/api/firms/:firmId", async (c) => {
  const { userId } = c.get("auth");
  const firmId = c.req.param("firmId");
  if (!(await firmRole(c.env.DB, firmId, userId, ["owner", "admin"])))
    return c.json({ error: "forbidden" }, 403);

  const body = await c.req.json<{ name?: string; plan?: string }>();
  const sets: string[] = [];
  const vals: unknown[] = [];

  if (body.name?.trim()) { sets.push("name = ?"); vals.push(body.name.trim()); }
  if (body.plan)          { sets.push("plan = ?"); vals.push(normalizePlan(body.plan)); }
  sets.push("updated_at = ?");
  vals.push(epoch(), firmId);

  await c.env.DB.prepare(`UPDATE firms SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run();
  track(c.env, "advisor_firm_updated", userId, firmId, {});
  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MEMBERS
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/firms/:firmId/members", async (c) => {
  const { userId } = c.get("auth");
  const firmId = c.req.param("firmId");
  if (!(await firmAccess(c.env.DB, firmId, userId))) return c.json({ error: "forbidden" }, 403);

  const { results } = await c.env.DB.prepare(`
    SELECT id, firm_id, user_id, role, invited_by, accepted_at, created_at
    FROM firm_members WHERE firm_id = ? ORDER BY created_at ASC
  `)
    .bind(firmId)
    .all();
  return c.json({ members: results });
});

app.post("/api/firms/:firmId/members/invite", async (c) => {
  const { userId } = c.get("auth");
  const firmId = c.req.param("firmId");
  if (!(await firmRole(c.env.DB, firmId, userId, ["owner", "admin"])))
    return c.json({ error: "forbidden" }, 403);

  const body = await c.req.json<{ user_id?: string; email?: string; role?: string }>();
  if (!body.user_id && !body.email) return c.json({ error: "user_id or email required" }, 400);

  const role        = normalizeRole(body.role);
  const memberId    = uuid();
  const invitedId   = body.user_id ?? `pending:${body.email}`;
  const now         = epoch();

  await c.env.DB.prepare(`
    INSERT INTO firm_members (id, firm_id, user_id, role, invited_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(firm_id, user_id) DO UPDATE SET role = excluded.role, invited_by = excluded.invited_by
  `)
    .bind(memberId, firmId, invitedId, role, userId, now)
    .run();

  await c.env.EMAIL_QUEUE.send({
    type: "advisor_member_invite",
    firmId,
    invitedBy: userId,
    userId: body.user_id ?? null,
    email: body.email ?? null,
    role,
  });

  track(c.env, "advisor_member_invited", userId, firmId, { role });
  return c.json({ ok: true, invited_user_id: invitedId, role }, 201);
});

app.patch("/api/firms/:firmId/members/:memberId", async (c) => {
  const { userId } = c.get("auth");
  const firmId   = c.req.param("firmId");
  const targetId = c.req.param("memberId");
  if (!(await firmRole(c.env.DB, firmId, userId, ["owner", "admin"])))
    return c.json({ error: "forbidden" }, 403);

  const body = await c.req.json<{ role?: string; accepted?: boolean }>();
  await c.env.DB.prepare(`
    UPDATE firm_members
    SET role       = COALESCE(?, role),
        accepted_at = COALESCE(?, accepted_at)
    WHERE firm_id = ? AND user_id = ?
  `)
    .bind(body.role ? normalizeRole(body.role) : null, body.accepted ? epoch() : null, firmId, targetId)
    .run();

  track(c.env, "advisor_member_updated", userId, firmId, { target: targetId });
  return c.json({ ok: true });
});

app.delete("/api/firms/:firmId/members/:memberId", async (c) => {
  const { userId } = c.get("auth");
  const firmId   = c.req.param("firmId");
  const targetId = c.req.param("memberId");
  if (!(await firmRole(c.env.DB, firmId, userId, ["owner", "admin"])))
    return c.json({ error: "forbidden" }, 403);

  await c.env.DB.prepare(`DELETE FROM firm_members WHERE firm_id = ? AND user_id = ?`)
    .bind(firmId, targetId)
    .run();

  track(c.env, "advisor_member_removed", userId, firmId, { target: targetId });
  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/firms/:firmId/clients", async (c) => {
  const { userId } = c.get("auth");
  const firmId = c.req.param("firmId");
  if (!(await firmAccess(c.env.DB, firmId, userId))) return c.json({ error: "forbidden" }, 403);

  const { results } = await c.env.DB.prepare(`
    SELECT fc.id, fc.firm_id, fc.business_id, fc.assigned_staff_user_id, fc.status, fc.created_at,
           (SELECT COUNT(*) FROM advisor_alerts aa
            WHERE aa.firm_id = fc.firm_id
              AND aa.business_id = fc.business_id
              AND aa.resolved_at IS NULL) AS open_alert_count
    FROM firm_clients fc
    WHERE fc.firm_id = ?
    ORDER BY fc.created_at DESC
  `)
    .bind(firmId)
    .all();
  return c.json({ clients: results });
});

app.post("/api/firms/:firmId/clients", async (c) => {
  const { userId } = c.get("auth");
  const firmId = c.req.param("firmId");
  if (!(await firmRole(c.env.DB, firmId, userId, ["owner", "admin", "staff"])))
    return c.json({ error: "forbidden" }, 403);

  const body = await c.req.json<{ business_id?: string; assigned_staff_user_id?: string; status?: string }>();
  if (!body.business_id?.trim()) return c.json({ error: "business_id is required" }, 400);

  const id     = uuid();
  const status = normalizeClientStatus(body.status);
  const now    = epoch();

  await c.env.DB.prepare(`
    INSERT INTO firm_clients (id, firm_id, business_id, assigned_staff_user_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
    .bind(id, firmId, body.business_id.trim(), body.assigned_staff_user_id ?? null, status, now)
    .run();

  track(c.env, "advisor_client_attached", userId, firmId, { business_id: body.business_id, status });
  return c.json({ id, firm_id: firmId, business_id: body.business_id.trim(), status, created_at: now }, 201);
});

app.patch("/api/firms/:firmId/clients/:clientId", async (c) => {
  const { userId } = c.get("auth");
  const firmId   = c.req.param("firmId");
  const clientId = c.req.param("clientId");
  if (!(await firmRole(c.env.DB, firmId, userId, ["owner", "admin", "staff"])))
    return c.json({ error: "forbidden" }, 403);

  const body = await c.req.json<{ assigned_staff_user_id?: string | null; status?: string }>();
  await c.env.DB.prepare(`
    UPDATE firm_clients
    SET assigned_staff_user_id = ?,
        status = COALESCE(?, status)
    WHERE firm_id = ? AND id = ?
  `)
    .bind(
      body.assigned_staff_user_id ?? null,
      body.status ? normalizeClientStatus(body.status) : null,
      firmId,
      clientId,
    )
    .run();

  track(c.env, "advisor_client_updated", userId, firmId, { client_id: clientId });
  return c.json({ ok: true });
});

app.delete("/api/firms/:firmId/clients/:clientId", async (c) => {
  const { userId } = c.get("auth");
  const firmId   = c.req.param("firmId");
  const clientId = c.req.param("clientId");
  if (!(await firmRole(c.env.DB, firmId, userId, ["owner", "admin"])))
    return c.json({ error: "forbidden" }, 403);

  await c.env.DB.prepare(`
    UPDATE firm_clients SET status = 'offboarded' WHERE firm_id = ? AND id = ?
  `)
    .bind(firmId, clientId)
    .run();

  track(c.env, "advisor_client_offboarded", userId, firmId, { client_id: clientId });
  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/firms/:firmId/alerts", async (c) => {
  const { userId } = c.get("auth");
  const firmId = c.req.param("firmId");
  if (!(await firmAccess(c.env.DB, firmId, userId))) return c.json({ error: "forbidden" }, 403);

  const limit  = clamp(c.req.query("limit"),  25, 1, 100);
  const offset = clamp(c.req.query("offset"),  0, 0, 100_000);
  const severity = c.req.query("severity");  // optional filter

  const havingSeverity = severity ? `AND severity = '${severity.replace(/[^a-z]/g, "")}'` : "";

  const { results } = await c.env.DB.prepare(`
    SELECT id, firm_id, business_id, alert_type, severity, title, body, resolved_at, created_at
    FROM advisor_alerts
    WHERE firm_id = ? AND resolved_at IS NULL ${havingSeverity}
    ORDER BY
      CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
      created_at DESC
    LIMIT ? OFFSET ?
  `)
    .bind(firmId, limit, offset)
    .all();

  return c.json({ alerts: results, pagination: { limit, offset } });
});

app.post("/api/firms/:firmId/alerts", async (c) => {
  const { userId } = c.get("auth");
  const firmId = c.req.param("firmId");
  if (!(await firmRole(c.env.DB, firmId, userId, ["owner", "admin"])))
    return c.json({ error: "forbidden" }, 403);

  const body = await c.req.json<{
    business_id?: string;
    alert_type: string;
    severity?: string;
    title: string;
    body?: string;
  }>();
  if (!body.alert_type || !body.title) return c.json({ error: "alert_type and title required" }, 400);

  const id  = uuid();
  const now = epoch();
  await c.env.DB.prepare(`
    INSERT INTO advisor_alerts (id, firm_id, business_id, alert_type, severity, title, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(id, firmId, body.business_id ?? null, body.alert_type,
          normalizeSeverity(body.severity), body.title, body.body ?? null, now)
    .run();

  return c.json({ id, alert_type: body.alert_type, title: body.title, created_at: now }, 201);
});

app.patch("/api/firms/:firmId/alerts/:alertId/resolve", async (c) => {
  const { userId } = c.get("auth");
  const firmId  = c.req.param("firmId");
  const alertId = c.req.param("alertId");
  if (!(await firmAccess(c.env.DB, firmId, userId))) return c.json({ error: "forbidden" }, 403);

  const resolvedAt = epoch();
  await c.env.DB.prepare(`
    UPDATE advisor_alerts SET resolved_at = ? WHERE firm_id = ? AND id = ?
  `)
    .bind(resolvedAt, firmId, alertId)
    .run();

  track(c.env, "alert_resolved", userId, firmId, { alert_id: alertId });
  return c.json({ ok: true, resolved_at: resolvedAt });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NOTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/firms/:firmId/clients/:clientId/notes", async (c) => {
  const { userId } = c.get("auth");
  const firmId   = c.req.param("firmId");
  const clientId = c.req.param("clientId");
  if (!(await firmAccess(c.env.DB, firmId, userId))) return c.json({ error: "forbidden" }, 403);

  const client = await c.env.DB.prepare(`
    SELECT business_id FROM firm_clients WHERE firm_id = ? AND id = ?
  `)
    .bind(firmId, clientId)
    .first<{ business_id: string }>();
  if (!client) return c.json({ error: "not_found" }, 404);

  const { results } = await c.env.DB.prepare(`
    SELECT id, firm_id, business_id, author_user_id, body, pinned, created_at
    FROM advisor_notes
    WHERE firm_id = ? AND business_id = ?
    ORDER BY pinned DESC, created_at DESC
  `)
    .bind(firmId, client.business_id)
    .all();
  return c.json({ notes: results });
});

app.post("/api/firms/:firmId/clients/:clientId/notes", async (c) => {
  const { userId } = c.get("auth");
  const firmId   = c.req.param("firmId");
  const clientId = c.req.param("clientId");
  if (!(await firmRole(c.env.DB, firmId, userId, ["owner", "admin", "staff"])))
    return c.json({ error: "forbidden" }, 403);

  const client = await c.env.DB.prepare(`
    SELECT business_id FROM firm_clients WHERE firm_id = ? AND id = ?
  `)
    .bind(firmId, clientId)
    .first<{ business_id: string }>();
  if (!client) return c.json({ error: "not_found" }, 404);

  const body = await c.req.json<{ body?: string; pinned?: boolean }>();
  if (!body.body?.trim()) return c.json({ error: "body is required" }, 400);

  const id  = uuid();
  const now = epoch();
  await c.env.DB.prepare(`
    INSERT INTO advisor_notes (id, firm_id, business_id, author_user_id, body, pinned, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(id, firmId, client.business_id, userId, body.body.trim(), body.pinned ? 1 : 0, now)
    .run();

  return c.json({ id, body: body.body.trim(), pinned: body.pinned ?? false, created_at: now }, 201);
});

app.patch("/api/firms/:firmId/clients/:clientId/notes/:noteId", async (c) => {
  const { userId } = c.get("auth");
  const firmId = c.req.param("firmId");
  if (!(await firmRole(c.env.DB, firmId, userId, ["owner", "admin", "staff"])))
    return c.json({ error: "forbidden" }, 403);

  const noteId = c.req.param("noteId");
  const body = await c.req.json<{ body?: string; pinned?: boolean }>();
  await c.env.DB.prepare(`
    UPDATE advisor_notes
    SET body   = COALESCE(?, body),
        pinned = COALESCE(?, pinned)
    WHERE id = ? AND firm_id = ? AND author_user_id = ?
  `)
    .bind(body.body?.trim() ?? null, body.pinned !== undefined ? (body.pinned ? 1 : 0) : null,
          noteId, firmId, userId)
    .run();

  return c.json({ ok: true });
});

app.delete("/api/firms/:firmId/clients/:clientId/notes/:noteId", async (c) => {
  const { userId } = c.get("auth");
  const firmId = c.req.param("firmId");
  if (!(await firmRole(c.env.DB, firmId, userId, ["owner", "admin", "staff"])))
    return c.json({ error: "forbidden" }, 403);

  await c.env.DB.prepare(`DELETE FROM advisor_notes WHERE id = ? AND firm_id = ? AND author_user_id = ?`)
    .bind(c.req.param("noteId"), firmId, userId)
    .run();

  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT OVERVIEW  (stitches local data + health stub for downstream workers)
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/firms/:firmId/clients/:clientId/overview", async (c) => {
  const { userId } = c.get("auth");
  const firmId   = c.req.param("firmId");
  const clientId = c.req.param("clientId");
  if (!(await firmAccess(c.env.DB, firmId, userId))) return c.json({ error: "forbidden" }, 403);

  const client = await c.env.DB.prepare(`
    SELECT id, firm_id, business_id, assigned_staff_user_id, status, created_at
    FROM firm_clients WHERE firm_id = ? AND id = ?
  `)
    .bind(firmId, clientId)
    .first();
  if (!client) return c.json({ error: "not_found" }, 404);

  const bizId = String(client.business_id);

  const [alertsRes, notesRes] = await Promise.all([
    c.env.DB.prepare(`
      SELECT id, alert_type, severity, title, body, created_at
      FROM advisor_alerts
      WHERE firm_id = ? AND business_id = ? AND resolved_at IS NULL
      ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, created_at DESC
      LIMIT 20
    `).bind(firmId, bizId).all(),
    c.env.DB.prepare(`
      SELECT id, author_user_id, body, pinned, created_at
      FROM advisor_notes
      WHERE firm_id = ? AND business_id = ?
      ORDER BY pinned DESC, created_at DESC LIMIT 10
    `).bind(firmId, bizId).all(),
  ]);

  // Health fields are stubs here; Phase 4 will replace with live downstream calls
  // to bizforma.insighthunter.app, compliance worker, and payroll worker.
  const health = {
    formation_status: "unknown",
    compliance_health: "unknown",
    payroll_status:    "unknown",
    ai_alert_count:    alertsRes.results.length,
  };

  track(c.env, "client_switch", userId, firmId, { business_id: bizId });
  return c.json({ client, health, alerts: alertsRes.results, notes: notesRes.results });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function resolveAuth(request: Request): Promise<AuthUser | null> {
  // Development convenience: x-demo-user-id header bypasses JWT
  const demoId = request.headers.get("x-demo-user-id");
  if (demoId) return { userId: demoId, email: request.headers.get("x-demo-email") ?? undefined };

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token  = header.slice(7).trim();
  const parts  = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = JSON.parse(decodeB64Url(parts[1]));
    if (!payload?.sub) return null;
    return { userId: String(payload.sub), email: payload.email ? String(payload.email) : undefined };
  } catch {
    return null;
  }
}

function decodeB64Url(s: string): string {
  const norm = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad  = norm.length % 4 === 0 ? "" : "=".repeat(4 - (norm.length % 4));
  return atob(norm + pad);
}

async function firmAccess(db: D1Database, firmId: string, userId: string) {
  return db
    .prepare(`SELECT firm_id, user_id, role FROM firm_members WHERE firm_id = ? AND user_id = ?`)
    .bind(firmId, userId)
    .first();
}

async function firmRole(db: D1Database, firmId: string, userId: string, roles: string[]) {
  const m = await firmAccess(db, firmId, userId);
  return m && roles.includes(String(m.role)) ? m : null;
}

function normalizePlan(v?: string | null) {
  const s = (v ?? "starter").toLowerCase();
  return (["starter", "pro", "enterprise"] as const).includes(s as "starter") ? s : "starter";
}
function normalizeRole(v?: string | null) {
  const s = (v ?? "staff").toLowerCase();
  return (["owner", "admin", "staff", "viewer"] as const).includes(s as "owner") ? s : "staff";
}
function normalizeClientStatus(v?: string | null) {
  const s = (v ?? "active").toLowerCase();
  return (["active", "inactive", "offboarded"] as const).includes(s as "active") ? s : "active";
}
function normalizeSeverity(v?: string | null) {
  const s = (v ?? "info").toLowerCase();
  return (["info", "warning", "critical"] as const).includes(s as "info") ? s : "info";
}

function clamp(val: string | undefined, fallback: number, min: number, max: number) {
  const n = parseInt(val ?? "", 10);
  return isNaN(n) ? fallback : Math.max(min, Math.min(max, n));
}

function epoch() { return Math.floor(Date.now() / 1000); }
function uuid()  { return crypto.randomUUID(); }

function track(env: Env, event: string, userId: string, firmId: string, meta: Record<string, unknown>) {
  env.ANALYTICS.writeDataPoint({
    blobs:   [event, userId, firmId, JSON.stringify(meta)],
    doubles: [Date.now()],
    indexes: [event],
  });
}

export default app;
