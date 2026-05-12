// apps/insighthunter-advisor/workers/api/index.ts
// ih-advisor-api — Hono API for the Advisor Portal.
// Routes: firms, firm members, firm clients, advisor alerts, client switcher.

import { Hono } from "https://esm.sh/hono@4";
import { cors } from "https://esm.sh/hono@4/cors";
import { validateSession, unauthorizedJson } from "../../../../shared/middleware/session-validator.ts";
import type { BaseEnv } from "../../../../shared/types/index.ts";

export interface Env extends BaseEnv {
  DB: D1Database;                  // ih-advisor D1
  NOTIFICATIONS: Queue;            // ih-notifications queue
}

const app = new Hono<{ Bindings: Env }>();

// CORS — allow insighthunter.app and advisor.insighthunter.app
app.use(
  "*",
  cors({
    origin: ["https://insighthunter.app", "https://advisor.insighthunter.app"],
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
    credentials: true,
  })
);

// Auth middleware — inject user into context
app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") return next();
  try {
    const user = await validateSession(c.req.raw, c.env);
    c.set("user" as never, user);
    return next();
  } catch {
    return c.json({ ok: false, error: "Unauthorized" }, 401);
  }
});

app.get("/health", (c) => c.json({ ok: true, service: "ih-advisor-api" }));

// ─── FIRMS ────────────────────────────────────────────────────────────────────

// GET /firms — list firms the user belongs to
app.get("/firms", async (c) => {
  const user = c.get("user" as never) as { userId: string };
  const rows = await c.env.DB.prepare(
    `SELECT f.* FROM firms f
     JOIN firm_members fm ON fm.firm_id = f.id
     WHERE fm.user_id = ? AND f.active = 1
     ORDER BY f.name`
  )
    .bind(user.userId)
    .all();
  return c.json({ ok: true, data: rows.results });
});

// POST /firms — create a new accounting firm
app.post("/firms", async (c) => {
  const user = c.get("user" as never) as { orgId: string; userId: string };
  const body = await c.req.json<{ name: string; ein?: string; email?: string; phone?: string }>();
  if (!body.name) return c.json({ ok: false, error: "name is required" }, 400);

  const firmId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO firms (id, owner_org_id, name, ein, email, phone, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))`
  )
    .bind(firmId, user.orgId, body.name, body.ein ?? null, body.email ?? null, body.phone ?? null)
    .run();

  // Auto-add creator as firm owner
  await c.env.DB.prepare(
    `INSERT INTO firm_members (id, firm_id, user_id, role, created_at)
     VALUES (?, ?, ?, 'owner', datetime('now'))`
  )
    .bind(crypto.randomUUID(), firmId, user.userId)
    .run();

  return c.json({ ok: true, data: { firmId } }, 201);
});

// ─── FIRM MEMBERS ─────────────────────────────────────────────────────────────

// GET /firms/:firmId/members
app.get("/firms/:firmId/members", async (c) => {
  const { firmId } = c.req.param();
  const rows = await c.env.DB.prepare(
    `SELECT fm.*, u.email, u.name AS user_name FROM firm_members fm
     JOIN users u ON u.id = fm.user_id
     WHERE fm.firm_id = ?`
  )
    .bind(firmId)
    .all();
  return c.json({ ok: true, data: rows.results });
});

// POST /firms/:firmId/members — invite staff member
app.post("/firms/:firmId/members", async (c) => {
  const { firmId } = c.req.param();
  const body = await c.req.json<{ email: string; role: "admin" | "staff" }>();
  if (!body.email || !body.role) return c.json({ ok: false, error: "email and role required" }, 400);

  // Lookup user by email
  const user = await c.env.DB.prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
    .bind(body.email)
    .first<{ id: string }>();

  if (!user) return c.json({ ok: false, error: "User not found — they must sign up first" }, 404);

  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO firm_members (id, firm_id, user_id, role, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`
  )
    .bind(crypto.randomUUID(), firmId, user.id, body.role)
    .run();

  return c.json({ ok: true, data: { added: body.email } }, 201);
});

// ─── FIRM CLIENTS ─────────────────────────────────────────────────────────────

// GET /firms/:firmId/clients — all clients this firm manages
app.get("/firms/:firmId/clients", async (c) => {
  const { firmId } = c.req.param();
  const rows = await c.env.DB.prepare(
    `SELECT fc.*, o.name AS org_name, o.plan FROM firm_clients fc
     JOIN organizations o ON o.id = fc.org_id
     WHERE fc.firm_id = ? AND fc.active = 1
     ORDER BY o.name`
  )
    .bind(firmId)
    .all();
  return c.json({ ok: true, data: rows.results });
});

// POST /firms/:firmId/clients — link an org as a client
app.post("/firms/:firmId/clients", async (c) => {
  const { firmId } = c.req.param();
  const body = await c.req.json<{ orgId: string; assignedStaffId?: string }>();
  if (!body.orgId) return c.json({ ok: false, error: "orgId required" }, 400);

  const linkId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO firm_clients (id, firm_id, org_id, assigned_staff_id, active, created_at)
     VALUES (?, ?, ?, ?, 1, datetime('now'))`
  )
    .bind(linkId, firmId, body.orgId, body.assignedStaffId ?? null)
    .run();

  return c.json({ ok: true, data: { linkId } }, 201);
});

// ─── CLIENT SWITCHER ──────────────────────────────────────────────────────────

// GET /clients/summary — quick-switch panel: all clients with badge counts
app.get("/clients/summary", async (c) => {
  const user = c.get("user" as never) as { userId: string };

  const rows = await c.env.DB.prepare(
    `SELECT
       o.id AS org_id, o.name, o.plan,
       (SELECT COUNT(*) FROM advisor_alerts a WHERE a.org_id = o.id AND a.read = 0) AS unread_alerts,
       (SELECT COUNT(*) FROM tasks t WHERE t.org_id = o.id AND t.status = 'open') AS open_tasks
     FROM firm_clients fc
     JOIN firms f ON f.id = fc.firm_id
     JOIN firm_members fm ON fm.firm_id = f.id AND fm.user_id = ?
     JOIN organizations o ON o.id = fc.org_id
     WHERE fc.active = 1
     ORDER BY o.name`
  )
    .bind(user.userId)
    .all();

  return c.json({ ok: true, data: rows.results });
});

// ─── ALERTS ───────────────────────────────────────────────────────────────────

// GET /alerts — fetch alerts for user's org (or firm-wide)
app.get("/alerts", async (c) => {
  const user = c.get("user" as never) as { orgId: string; userId: string };
  const unreadOnly = c.req.query("unread") === "true";
  const page = parseInt(c.req.query("page") ?? "1");
  const pageSize = Math.min(parseInt(c.req.query("pageSize") ?? "25"), 100);
  const offset = (page - 1) * pageSize;

  let q = `SELECT * FROM advisor_alerts WHERE org_id = ? ${unreadOnly ? "AND read = 0" : ""}
           ORDER BY created_at DESC LIMIT ? OFFSET ?`;

  const rows = await c.env.DB.prepare(q).bind(user.orgId, pageSize, offset).all();
  return c.json({ ok: true, data: rows.results });
});

// PUT /alerts/:alertId/read — mark single alert read
app.put("/alerts/:alertId/read", async (c) => {
  const user = c.get("user" as never) as { orgId: string };
  const { alertId } = c.req.param();
  await c.env.DB.prepare(
    "UPDATE advisor_alerts SET read = 1, read_at = datetime('now') WHERE id = ? AND org_id = ?"
  )
    .bind(alertId, user.orgId)
    .run();
  return c.json({ ok: true });
});

// PUT /alerts/read-all — mark all read
app.put("/alerts/read-all", async (c) => {
  const user = c.get("user" as never) as { orgId: string };
  await c.env.DB.prepare(
    "UPDATE advisor_alerts SET read = 1, read_at = datetime('now') WHERE org_id = ? AND read = 0"
  )
    .bind(user.orgId)
    .run();
  return c.json({ ok: true });
});

// ─── TASKS ────────────────────────────────────────────────────────────────────

// GET /tasks — advisor task list (cross-client if firmId present)
app.get("/tasks", async (c) => {
  const user = c.get("user" as never) as { orgId: string; firmId?: string };
  const status = c.req.query("status") ?? "open";

  let rows;
  if (user.firmId) {
    // All tasks across firm's clients
    rows = await c.env.DB.prepare(
      `SELECT t.*, o.name AS org_name FROM tasks t
       JOIN organizations o ON o.id = t.org_id
       JOIN firm_clients fc ON fc.org_id = t.org_id
       WHERE fc.firm_id = ? AND t.status = ?
       ORDER BY t.due_date ASC NULLS LAST`
    )
      .bind(user.firmId, status)
      .all();
  } else {
    rows = await c.env.DB.prepare(
      "SELECT * FROM tasks WHERE org_id = ? AND status = ? ORDER BY due_date ASC NULLS LAST"
    )
      .bind(user.orgId, status)
      .all();
  }

  return c.json({ ok: true, data: rows.results });
});

// POST /tasks — create a task
app.post("/tasks", async (c) => {
  const user = c.get("user" as never) as { orgId: string; userId: string };
  const body = await c.req.json<{
    title: string;
    description?: string;
    dueDate?: string;
    assigneeId?: string;
    type?: string;
    targetOrgId?: string;
  }>();
  if (!body.title) return c.json({ ok: false, error: "title required" }, 400);

  const taskId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO tasks (id, org_id, created_by, assignee_id, type, title, description, due_date, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', datetime('now'))`
  )
    .bind(
      taskId,
      body.targetOrgId ?? user.orgId,
      user.userId,
      body.assigneeId ?? null,
      body.type ?? "manual",
      body.title,
      body.description ?? null,
      body.dueDate ?? null
    )
    .run();

  return c.json({ ok: true, data: { taskId } }, 201);
});

export default app;
