// routes/reconciliation.ts
// Bank reconciliation — match transactions to journal lines, clear items.

import { Hono } from "hono";
import type { Env } from "../index.js";
import { getSession } from "../index.js";

export const reconciliationRoutes = new Hono<{ Bindings: Env }>();

// GET /api/reconciliation
// Returns open (unreconciled) items from reconciliation_items table.
reconciliationRoutes.get("/", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);

  const items = await c.env.DB.prepare(`
    SELECT r.id, r.txn_date, r.description, r.amount, r.account_id,
           a.name AS account_name, r.status
    FROM reconciliation_items r
    LEFT JOIN accounts a ON r.account_id = a.id
    WHERE r.org_id = ?1 AND r.status = 'open'
    ORDER BY r.txn_date DESC LIMIT 200
  `)
    .bind(session.orgId)
    .all<{
      id: string;
      txn_date: string;
      description: string;
      amount: number;
      account_id: string;
      account_name: string;
      status: string;
    }>();

  return c.json({ items: items.results ?? [] });
});

// POST /api/reconciliation/match
// Match a transaction to a journal line (marks both as reconciled).
reconciliationRoutes.post("/match", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);

  const body = await c.req.json<{ reconItemId: string; journalLineId: string }>();
  if (!body.reconItemId || !body.journalLineId)
    return c.json({ error: "reconItemId and journalLineId required" }, 400);

  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE reconciliation_items SET status = 'matched', journal_line_id = ?1, matched_at = datetime('now') WHERE id = ?2 AND org_id = ?3`,
    ).bind(body.journalLineId, body.reconItemId, session.orgId),
    c.env.DB.prepare(`UPDATE journal_lines SET reconciled = 1 WHERE id = ?1`).bind(
      body.journalLineId,
    ),
  ]);

  return c.json({ ok: true });
});

// POST /api/reconciliation/clear
// Clear a single reconciliation item (manual override).
reconciliationRoutes.post("/clear", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);

  const body = await c.req.json<{ id: string }>();
  if (!body.id) return c.json({ error: "id required" }, 400);

  await c.env.DB.prepare(
    `UPDATE reconciliation_items SET status = 'cleared', cleared_at = datetime('now') WHERE id = ?1 AND org_id = ?2`,
  )
    .bind(body.id, session.orgId)
    .run();

  return c.json({ ok: true });
});
