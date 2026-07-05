import { isBalanced } from "@insighthunter/accounting";
import type { JournalEntry } from "@insighthunter/accounting";
import { Hono } from "hono";
import type { Env } from "./index.js";

export const journalRoutes = new Hono<{ Bindings: Env }>();

journalRoutes.post("/journals/validate", async (c) => {
  const entry = await c.req.json<JournalEntry>();
  return c.json({ balanced: isBalanced(entry) });
});

journalRoutes.post("/journals/post", async (c) => {
  const orgId = c.req.header("x-organization-id");
  if (!orgId) return c.json({ error: "x-organization-id header required" }, 400);

  const entry = await c.req.json<JournalEntry>();

  if (!isBalanced(entry)) {
    return c.json({ posted: false, error: "Journal entry is not balanced." }, 400);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await c.env.DB.prepare(
    "INSERT INTO journal_entries (id, organization_id, memo, posted_at, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(id, orgId, entry.lines[0]?.memo ?? null, createdAt, createdAt)
    .run();

  const stmt = c.env.DB.prepare(
    "INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, memo) VALUES (?, ?, ?, ?, ?, ?)",
  );

  for (const line of entry.lines) {
    await stmt
      .bind(crypto.randomUUID(), id, line.accountId, line.debit, line.credit, line.memo ?? null)
      .run();
  }

  return c.json({ posted: true, id });
});

journalRoutes.get("/journals", async (c) => {
  const orgId = c.req.header("x-organization-id");
  if (!orgId) return c.json({ error: "x-organization-id header required" }, 400);

  const { results } = await c.env.DB.prepare(
    "SELECT id, memo, posted_at, created_at FROM journal_entries WHERE organization_id = ? ORDER BY created_at DESC LIMIT 50",
  )
    .bind(orgId)
    .all();

  return c.json({ items: results });
});
