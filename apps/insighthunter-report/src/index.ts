import { Hono } from "hono";
import type { D1Database } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ service: "report", ok: true }));

/** Trial balance report: sum debits and credits per account. */
app.get("/trial-balance", async (c) => {
  const orgId = c.req.header("x-organization-id");
  if (!orgId) return c.json({ error: "x-organization-id header required" }, 400);
  const { results } = await c.env.DB.prepare(`
    SELECT a.code, a.name, a.type,
      SUM(jl.debit) AS total_debit,
      SUM(jl.credit) AS total_credit
    FROM journal_lines jl
    JOIN accounts a ON a.id = jl.account_id
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    WHERE je.organization_id = ?
    GROUP BY a.id, a.code, a.name, a.type
    ORDER BY a.code
  `).bind(orgId).all();
  return c.json({ items: results });
});

export default app;
