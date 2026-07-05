import { Hono } from "hono";
import type { D1Database } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ service: "finops", ok: true }));

app.get("/payables", async (c) => {
  const orgId = c.req.header("x-organization-id");
  if (!orgId) return c.json({ error: "x-organization-id header required" }, 400);

  // Payables = journal lines on LIABILITY accounts with a credit balance
  const { results } = await c.env.DB.prepare(`
    SELECT jl.account_id, jl.credit, jl.debit, je.posted_at
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    JOIN accounts a ON a.id = jl.account_id
    WHERE je.organization_id = ?
      AND a.type = 'LIABILITY'
      AND jl.credit > 0
    ORDER BY je.posted_at DESC
  `)
    .bind(orgId)
    .all();

  return c.json({ items: results });
});

app.get("/receivables", async (c) => {
  const orgId = c.req.header("x-organization-id");
  if (!orgId) return c.json({ error: "x-organization-id header required" }, 400);

  // Receivables = journal lines on ASSET accounts with a debit balance
  const { results } = await c.env.DB.prepare(`
    SELECT jl.account_id, jl.debit, jl.credit, je.posted_at
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    JOIN accounts a ON a.id = jl.account_id
    WHERE je.organization_id = ?
      AND a.type = 'ASSET'
      AND jl.debit > 0
    ORDER BY je.posted_at DESC
  `)
    .bind(orgId)
    .all();

  return c.json({ items: results });
});

export default app;
