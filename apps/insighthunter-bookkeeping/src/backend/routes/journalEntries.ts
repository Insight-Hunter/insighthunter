import { Hono } from "hono";
import type { Env } from "../types.js";
import { authMiddleware } from "../middleware/auth.js";
import { createJournalEntry } from "../services/journalEntryService.js";

const journalEntries = new Hono<{ Bindings: Env }>();
journalEntries.use("*", authMiddleware);

// GET /api/journal-entries
journalEntries.get("/", async (c) => {
  const user = c.get("user");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM journal_entries WHERE org_id=? ORDER BY date DESC LIMIT 100"
  )
    .bind(user.orgId)
    .all();
  return c.json(results);
});

// GET /api/journal-entries/:id — with lines
journalEntries.get("/:id", async (c) => {
  const user = c.get("user");
  const je = await c.env.DB.prepare(
    "SELECT * FROM journal_entries WHERE id=? AND org_id=?"
  )
    .bind(c.req.param("id"), user.orgId)
    .first();
  if (!je) return c.json({ error: "Not found" }, 404);

  const lines = await c.env.DB.prepare(
    `SELECT jel.*, a.name AS account_name, a.code AS account_code
     FROM journal_entry_lines jel
     JOIN accounts a ON jel.account_id = a.id
     WHERE jel.journal_entry_id = ?`
  )
    .bind(c.req.param("id"))
    .all();

  return c.json({ ...je, lines: lines.results });
});

// POST /api/journal-entries — manual JE creation
journalEntries.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    date: string;
    memo: string;
    reference?: string;
    type?: string;
    lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description?: string;
    }>;
  }>();

  try {
    const je = await createJournalEntry(
      user.orgId,
      { ...body, type: body.type ?? "general", createdBy: user.userId },
      c.env.DB
    );
    return c.json(je, 201);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

// POST /api/journal-entries/:id/void
journalEntries.post("/:id/void", async (c) => {
  const user = c.get("user");
  const now = new Date().toISOString();

  const je = await c.env.DB.prepare(
    "SELECT * FROM journal_entries WHERE id=? AND org_id=? AND status='posted'"
  )
    .bind(c.req.param("id"), user.orgId)
    .first<{ id: string; org_id: string }>();

  if (!je)
    return c.json({ error: "Journal entry not found or already voided" }, 404);

  await c.env.DB.prepare(
    "UPDATE journal_entries SET status='voided', updated_at=? WHERE id=?"
  )
    .bind(now, je.id)
    .run();

  return c.json({ ok: true });
});

export default journalEntries;
