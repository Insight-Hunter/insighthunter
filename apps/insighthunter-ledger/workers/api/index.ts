// apps/insighthunter-ledger/workers/api/index.ts
// ih-ledger-api — Accounting Automation Engine API.
// Routes: transactions, GL accounts, categorization rules, close cycles, statement import.

import { Hono } from "https://esm.sh/hono@4";
import { cors } from "https://esm.sh/hono@4/cors";
import { validateSession, unauthorizedJson } from "../../../../shared/middleware/session-validator.ts";

export interface Env {
  DB: D1Database;
  RULES_QUEUE: Queue;          // ih-ledger-rules — async categorization
  SYNC_QUEUE: Queue;           // ih-ledger-sync — QBO/Xero sync jobs
  CLOSE_WORKFLOW: Workflow;    // ih-ledger-close — month-end workflow
  DOCS: R2Bucket;              // ih-documents — statement storage
  NOTIFICATIONS: Queue;
  AUTH_SECRET: string;
  AUTH_ORIGIN: string;
  ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({
  origin: ["https://insighthunter.app", "https://ledger.insighthunter.app"],
  allowHeaders: ["Authorization", "Content-Type"],
  allowMethods: ["GET","POST","PUT","DELETE","OPTIONS"],
  credentials: true,
}));

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

app.get("/health", (c) => c.json({ ok: true, service: "ih-ledger-api" }));

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

// GET /transactions — paginated list with filters
app.get("/transactions", async (c) => {
  const user = c.get("user" as never) as { orgId: string };
  const { page = "1", pageSize = "50", category, uncategorized, startDate, endDate, q } =
    c.req.query();

  const ps = Math.min(parseInt(pageSize), 200);
  const offset = (parseInt(page) - 1) * ps;
  const params: (string | number)[] = [user.orgId];
  let where = "WHERE org_id = ?";

  if (uncategorized === "true") { where += " AND category IS NULL"; }
  if (category)   { where += " AND category = ?";          params.push(category); }
  if (startDate)  { where += " AND date >= ?";             params.push(startDate); }
  if (endDate)    { where += " AND date <= ?";             params.push(endDate); }
  if (q)          { where += " AND description LIKE ?";    params.push(`%${q}%`); }

  params.push(ps, offset);

  const rows = await c.env.DB.prepare(
    `SELECT * FROM transactions ${where} ORDER BY date DESC LIMIT ? OFFSET ?`
  ).bind(...params).all();

  return c.json({ ok: true, data: rows.results });
});

// POST /transactions/import — bulk import from CSV/JSON payload, enqueue for categorization
app.post("/transactions/import", async (c) => {
  const user = c.get("user" as never) as { orgId: string; userId: string };
  const body = await c.req.json<{
    source: "manual" | "csv" | "qbo" | "xero";
    transactions: Array<{
      externalId?: string;
      date: string;
      amount: number;
      description: string;
      type: "debit" | "credit";
      accountId?: string;
    }>;
  }>();

  const importBatchId = crypto.randomUUID();
  const stmts: D1PreparedStatement[] = [];

  for (const txn of body.transactions) {
    stmts.push(
      c.env.DB.prepare(
        `INSERT OR IGNORE INTO transactions
           (id, org_id, external_id, import_batch_id, source, date, amount, description, type, account_id, category, gl_code, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'pending', datetime('now'))`
      ).bind(
        crypto.randomUUID(), user.orgId, txn.externalId ?? null,
        importBatchId, body.source, txn.date, txn.amount,
        txn.description, txn.type, txn.accountId ?? null
      )
    );
  }

  // D1 batch insert (max 100/batch)
  for (let i = 0; i < stmts.length; i += 100) {
    await c.env.DB.batch(stmts.slice(i, i + 100));
  }

  // Enqueue for auto-categorization
  await c.env.RULES_QUEUE.send({ orgId: user.orgId, importBatchId, count: body.transactions.length });

  return c.json({ ok: true, data: { importBatchId, queued: body.transactions.length } }, 202);
});

// PUT /transactions/:txnId — manually set category / GL code
app.put("/transactions/:txnId", async (c) => {
  const user = c.get("user" as never) as { orgId: string; userId: string };
  const { txnId } = c.req.param();
  const body = await c.req.json<{ category?: string; glCode?: string; notes?: string }>();

  await c.env.DB.prepare(
    `UPDATE transactions
     SET category = COALESCE(?, category),
         gl_code  = COALESCE(?, gl_code),
         notes    = COALESCE(?, notes),
         status   = 'reviewed',
         reviewed_by = ?,
         reviewed_at = datetime('now')
     WHERE id = ? AND org_id = ?`
  ).bind(body.category ?? null, body.glCode ?? null, body.notes ?? null,
         user.userId, txnId, user.orgId).run();

  return c.json({ ok: true });
});

// ─── GL ACCOUNTS ──────────────────────────────────────────────────────────────

// GET /gl/accounts
app.get("/gl/accounts", async (c) => {
  const user = c.get("user" as never) as { orgId: string };
  const rows = await c.env.DB.prepare(
    "SELECT * FROM gl_accounts WHERE org_id = ? ORDER BY code"
  ).bind(user.orgId).all();
  return c.json({ ok: true, data: rows.results });
});

// POST /gl/accounts — add a GL account
app.post("/gl/accounts", async (c) => {
  const user = c.get("user" as never) as { orgId: string };
  const body = await c.req.json<{
    code: string; name: string;
    type: "asset"|"liability"|"equity"|"revenue"|"expense";
  }>();
  if (!body.code || !body.name || !body.type) {
    return c.json({ ok: false, error: "code, name, type required" }, 400);
  }
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO gl_accounts (id, org_id, code, name, type, active, created_at) VALUES (?, ?, ?, ?, ?, 1, datetime('now'))"
  ).bind(id, user.orgId, body.code, body.name, body.type).run();
  return c.json({ ok: true, data: { id } }, 201);
});

// ─── CATEGORIZATION RULES ─────────────────────────────────────────────────────

// GET /rules
app.get("/rules", async (c) => {
  const user = c.get("user" as never) as { orgId: string };
  const rows = await c.env.DB.prepare(
    "SELECT * FROM categorization_rules WHERE org_id = ? ORDER BY priority DESC"
  ).bind(user.orgId).all();
  return c.json({ ok: true, data: rows.results });
});

// POST /rules — create a new mapping rule
app.post("/rules", async (c) => {
  const user = c.get("user" as never) as { orgId: string; userId: string };
  const body = await c.req.json<{
    matchType: "contains"|"starts_with"|"exact"|"regex";
    matchValue: string;
    category: string;
    glCode: string;
    priority?: number;
  }>();
  if (!body.matchType || !body.matchValue || !body.category || !body.glCode) {
    return c.json({ ok: false, error: "matchType, matchValue, category, glCode required" }, 400);
  }
  const ruleId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO categorization_rules (id, org_id, created_by, match_type, match_value, category, gl_code, priority, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`
  ).bind(ruleId, user.orgId, user.userId, body.matchType, body.matchValue,
         body.category, body.glCode, body.priority ?? 0).run();
  return c.json({ ok: true, data: { ruleId } }, 201);
});

// DELETE /rules/:ruleId
app.delete("/rules/:ruleId", async (c) => {
  const user = c.get("user" as never) as { orgId: string };
  await c.env.DB.prepare(
    "UPDATE categorization_rules SET active = 0 WHERE id = ? AND org_id = ?"
  ).bind(c.req.param("ruleId"), user.orgId).run();
  return c.json({ ok: true });
});

// ─── CLOSE CYCLES ─────────────────────────────────────────────────────────────

// GET /close — list close cycles
app.get("/close", async (c) => {
  const user = c.get("user" as never) as { orgId: string };
  const rows = await c.env.DB.prepare(
    "SELECT * FROM close_cycles WHERE org_id = ? ORDER BY period_end DESC LIMIT 24"
  ).bind(user.orgId).all();
  return c.json({ ok: true, data: rows.results });
});

// POST /close/start — kick off a month-end close workflow
app.post("/close/start", async (c) => {
  const user = c.get("user" as never) as { orgId: string; userId: string };
  const body = await c.req.json<{ periodStart: string; periodEnd: string }>();
  if (!body.periodStart || !body.periodEnd) {
    return c.json({ ok: false, error: "periodStart and periodEnd required" }, 400);
  }

  const cycleId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO close_cycles (id, org_id, initiated_by, period_start, period_end, status, steps, created_at)
     VALUES (?, ?, ?, ?, ?, 'in_progress', '[]', datetime('now'))`
  ).bind(cycleId, user.orgId, user.userId, body.periodStart, body.periodEnd).run();

  // Launch Durable Workflow
  const instance = await c.env.CLOSE_WORKFLOW.create({
    id: `close-${cycleId}`,
    params: { cycleId, orgId: user.orgId, periodStart: body.periodStart, periodEnd: body.periodEnd },
  });

  return c.json({ ok: true, data: { cycleId, workflowId: instance.id } }, 202);
});

export default app;
