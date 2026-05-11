import { Hono } from "hono";
import type { Env } from "../types.js";
import { authMiddleware } from "../middleware/auth.js";
import { txVolumeCheck, incrementTxCount } from "../middleware/tier.js";
import { trackEvent } from "../utils/analytics.js";

const transactions = new Hono<{ Bindings: Env }>();
transactions.use("*", authMiddleware);

// GET /api/transactions — paginated list with status filter
transactions.get("/", async (c) => {
  const user = c.get("user");
  const status = c.req.query("status") ?? null;
  const page = parseInt(c.req.query("page") ?? "1", 10);
  const limit = 50;
  const offset = (page - 1) * limit;

  const query = status
    ? "SELECT * FROM transactions WHERE org_id=? AND status=? ORDER BY date DESC LIMIT ? OFFSET ?"
    : "SELECT * FROM transactions WHERE org_id=? ORDER BY date DESC LIMIT ? OFFSET ?";

  const args = status
    ? [user.orgId, status, limit, offset]
    : [user.orgId, limit, offset];

  const { results } = await c.env.DB.prepare(query)
    .bind(...args)
    .all();
  return c.json(results);
});

// POST /api/transactions — ingest one transaction, queue for AI classification
transactions.post("/", txVolumeCheck, async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    date: string;
    description: string;
    amount: number;
    source?: string;
    bank_account_ref?: string;
    metadata?: Record<string, unknown>;
  }>();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO transactions
       (id,org_id,date,description,amount,source,status,bank_account_ref,metadata,created_at,updated_at)
     VALUES (?,?,?,?,?,?,  'pending_classification',?,?,?,?)`
  )
    .bind(
      id,
      user.orgId,
      body.date,
      body.description,
      body.amount,
      body.source ?? "manual",
      body.bank_account_ref ?? null,
      body.metadata ? JSON.stringify(body.metadata) : null,
      now,
      now
    )
    .run();

  await incrementTxCount(user.orgId, c.env);

  // Queue AI classification job
  await c.env.CLASSIFICATION_QUEUE.send({
    transactionId: id,
    orgId: user.orgId,
    userId: user.userId,
  });

  trackEvent(c.env.ANALYTICS, "transaction_created", user.orgId, user.tier, {
    source: body.source ?? "manual",
  });

  return c.json({ id, status: "pending_classification" }, 201);
});

// POST /api/transactions/bulk — CSV batch import
transactions.post("/bulk", txVolumeCheck, async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    transactions: Array<{
      date: string;
      description: string;
      amount: number;
      bank_account_ref?: string;
    }>;
  }>();

  const now = new Date().toISOString();
  const ids: string[] = [];
  const stmts = body.transactions.map((tx) => {
    const id = crypto.randomUUID();
    ids.push(id);
    return c.env.DB.prepare(
      `INSERT INTO transactions (id,org_id,date,description,amount,source,status,bank_account_ref,created_at,updated_at)
       VALUES (?,?,?,?,?,'csv_import','pending_classification',?,?,?)`
    ).bind(
      id,
      user.orgId,
      tx.date,
      tx.description,
      tx.amount,
      tx.bank_account_ref ?? null,
      now,
      now
    );
  });

  await c.env.DB.batch(stmts);
  await incrementTxCount(user.orgId, c.env, body.transactions.length);

  // Queue classification for all
  await Promise.all(
    ids.map((transactionId) =>
      c.env.CLASSIFICATION_QUEUE.send({
        transactionId,
        orgId: user.orgId,
        userId: user.userId,
      })
    )
  );

  trackEvent(c.env.ANALYTICS, "bulk_import", user.orgId, user.tier, {
    count: body.transactions.length,
  });

  return c.json({ imported: ids.length, ids }, 201);
});

// PATCH /api/transactions/:id/exclude
transactions.patch("/:id/exclude", async (c) => {
  const user = c.get("user");
  await c.env.DB.prepare(
    "UPDATE transactions SET status='excluded', updated_at=? WHERE id=? AND org_id=?"
  )
    .bind(new Date().toISOString(), c.req.param("id"), user.orgId)
    .run();
  return c.json({ ok: true });
});

export default transactions;
