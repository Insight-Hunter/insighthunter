import { Hono } from "hono";
import type { Env } from "../types.js";
import { authMiddleware } from "../middleware/auth.js";

const reconciliation = new Hono<{ Bindings: Env }>();
reconciliation.use("*", authMiddleware);

// GET /api/reconciliation — list sessions
reconciliation.get("/", async (c) => {
  const user = c.get("user");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM reconciliation_sessions WHERE org_id=? ORDER BY created_at DESC"
  )
    .bind(user.orgId)
    .all();
  return c.json(results);
});

// POST /api/reconciliation — start session
reconciliation.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    accountId: string;
    statementDate: string;
    statementBalance: number;
  }>();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Get the starting balance from account
  const acct = await c.env.DB.prepare(
    "SELECT balance FROM accounts WHERE id=? AND org_id=?"
  )
    .bind(body.accountId, user.orgId)
    .first<{ balance: number }>();

  await c.env.DB.prepare(
    `INSERT INTO reconciliation_sessions
       (id,org_id,account_id,statement_date,statement_balance,starting_balance,status,created_by,created_at)
     VALUES (?,?,?,?,?,?,'open',?,?)`
  )
    .bind(
      id,
      user.orgId,
      body.accountId,
      body.statementDate,
      body.statementBalance,
      acct?.balance ?? 0,
      user.userId,
      now
    )
    .run();

  // Get uncleared transactions for this account and create matches
  const txs = await c.env.DB.prepare(
    `SELECT id FROM transactions
     WHERE org_id=? AND bank_account_ref=? AND status='posted'
     AND journal_entry_id IS NOT NULL`
  )
    .bind(user.orgId, body.accountId)
    .all();

  if (txs.results.length > 0) {
    const matchStmts = txs.results.map((tx) =>
      c.env.DB.prepare(
        "INSERT INTO reconciliation_matches (id,session_id,transaction_id,is_cleared,created_at) VALUES (?,?,?,0,?)"
      ).bind(crypto.randomUUID(), id, (tx as { id: string }).id, now)
    );
    await c.env.DB.batch(matchStmts);
  }

  // Initialize the Reconciliation Durable Object for this session
  const doId = c.env.RECONCILIATION_AGENT.idFromName(`${user.orgId}:${id}`);
  const stub = c.env.RECONCILIATION_AGENT.get(doId);
  await stub.fetch("https://internal/init", {
    method: "POST",
    body: JSON.stringify({ sessionId: id, orgId: user.orgId }),
  });

  return c.json({ id }, 201);
});

// GET /api/reconciliation/:id — session with transactions
reconciliation.get("/:id", async (c) => {
  const user = c.get("user");
  const session = await c.env.DB.prepare(
    "SELECT * FROM reconciliation_sessions WHERE id=? AND org_id=?"
  )
    .bind(c.req.param("id"), user.orgId)
    .first();
  if (!session) return c.json({ error: "Not found" }, 404);

  const matches = await c.env.DB.prepare(
    `SELECT rm.*, t.date, t.description, t.amount, t.status
     FROM reconciliation_matches rm
     JOIN transactions t ON rm.transaction_id = t.id
     WHERE rm.session_id=?
     ORDER BY t.date ASC`
  )
    .bind(c.req.param("id"))
    .all();

  return c.json({ ...session, matches: matches.results });
});

// WebSocket upgrade — proxied to ReconciliationAgent DO
reconciliation.get("/:id/ws", async (c) => {
  const user = c.get("user");
  if (c.req.header("Upgrade") !== "websocket") {
    return c.json({ error: "Expected WebSocket upgrade" }, 426);
  }
  const doId = c.env.RECONCILIATION_AGENT.idFromName(
    `${user.orgId}:${c.req.param("id")}`
  );
  const stub = c.env.RECONCILIATION_AGENT.get(doId);
  return stub.fetch(c.req.raw);
});

export default reconciliation;
