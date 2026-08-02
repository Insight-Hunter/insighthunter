// routes/imports.ts
// CSV/OFX import flow: upload → R2 → Queue → parse → review → commit to journal

import { Hono } from 'hono';
import type { Env } from '../index.js';
import { getSession } from '../index.js';

export const importRoutes = new Hono<{ Bindings: Env }>();

// POST /api/imports/upload
// Accepts multipart/form-data with a 'file' field (CSV or OFX).
// Stores file in R2, enqueues parse job, returns importId.
importRoutes.post('/upload', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return c.json({ error: 'Missing file' }, 400);
  if (file.size > 10 * 1024 * 1024) return c.json({ error: 'File too large (max 10 MB)' }, 413);

  const importId  = crypto.randomUUID();
  const objectKey = `imports/${session.orgId}/${importId}/${file.name}`;

  // Store raw file in R2
  await c.env.IMPORTS.put(objectKey, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'text/csv' },
    customMetadata: { importId, orgId: session.orgId, originalName: file.name },
  });

  // Write import session record to D1
  await c.env.DB.prepare(
    `INSERT INTO import_sessions (id, org_id, user_id, file_name, object_key, status, row_count, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 'queued', 0, datetime('now'))`
  ).bind(importId, session.orgId, session.userId, file.name, objectKey).run();

  // Set KV status for fast polling
  await c.env.KV_IMPORT_STATUS.put(`import:${importId}`, JSON.stringify({ status: 'queued', rowCount: 0 }), { expirationTtl: 3600 });

  // Enqueue parse job
  await c.env.IMPORT_QUEUE.send({ importId, objectKey, orgId: session.orgId });

  return c.json({ importId, status: 'queued' }, 202);
});

// GET /api/imports/:id
// Fast status poll via KV, falls back to D1.
importRoutes.get('/:id', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const importId = c.req.param('id');

  // Fast path: KV
  const kv = await c.env.KV_IMPORT_STATUS.get(`import:${importId}`, 'json') as { status: string; rowCount: number; error?: string } | null;
  if (kv) {
    if (kv.status === 'parsed' || kv.status === 'ready') {
      // Fetch rows for review
      const rows = await c.env.DB.prepare(
        `SELECT id, normalized_date, normalized_description, normalized_amount, category, confidence
         FROM import_rows WHERE import_id = ?1 AND org_id = ?2 ORDER BY row_index ASC LIMIT 500`
      ).bind(importId, session.orgId).all();
      return c.json({ ...kv, importId, rows: rows.results ?? [] });
    }
    return c.json({ ...kv, importId });
  }

  // Fallback: D1
  const rec = await c.env.DB.prepare(
    `SELECT status, row_count FROM import_sessions WHERE id = ?1 AND org_id = ?2`
  ).bind(importId, session.orgId).first<{ status: string; row_count: number }>();

  if (!rec) return c.json({ error: 'Not found' }, 404);
  return c.json({ importId, status: rec.status, rowCount: rec.row_count });
});

// POST /api/imports/:id/commit
// Applies category overrides from review, then converts import_rows → transactions + journal entries.
importRoutes.post('/:id/commit', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const importId = c.req.param('id');
  const body = await c.req.json<{ overrides?: { id: string; category: string }[] }>();

  // Apply overrides
  if (body.overrides?.length) {
    const stmts = body.overrides.map(o =>
      c.env.DB.prepare(`UPDATE import_rows SET category = ?1 WHERE id = ?2 AND import_id = ?3 AND org_id = ?4`)
        .bind(o.category, o.id, importId, session.orgId)
    );
    await c.env.DB.batch(stmts);
  }

  // Fetch final rows
  const rows = await c.env.DB.prepare(
    `SELECT * FROM import_rows WHERE import_id = ?1 AND org_id = ?2 AND review_status != 'skipped'`
  ).bind(importId, session.orgId).all<{
    id: string; normalized_date: string; normalized_description: string;
    normalized_amount: number; category: string;
  }>();

  // Default accounts for categorization (looks up by type)
  const cashAccount = await c.env.DB.prepare(
    `SELECT id FROM accounts WHERE organization_id = ?1 AND type = 'ASSET' AND code LIKE '1%' AND archived = 0 LIMIT 1`
  ).bind(session.orgId).first<{ id: string }>();

  const expenseAccount = await c.env.DB.prepare(
    `SELECT id FROM accounts WHERE organization_id = ?1 AND type = 'EXPENSE' AND archived = 0 LIMIT 1`
  ).bind(session.orgId).first<{ id: string }>();

  const revenueAccount = await c.env.DB.prepare(
    `SELECT id FROM accounts WHERE organization_id = ?1 AND type = 'REVENUE' AND archived = 0 LIMIT 1`
  ).bind(session.orgId).first<{ id: string }>();

  const stmts: ReturnType<D1Database['prepare']>[] = [];
  let committed = 0;

  for (const row of rows.results ?? []) {
    const isIncome = (row.normalized_amount ?? 0) > 0 && row.category === 'Revenue';
    const debitAccId  = isIncome ? cashAccount?.id    : expenseAccount?.id;
    const creditAccId = isIncome ? revenueAccount?.id : cashAccount?.id;

    // Insert transaction record
    const txnId = crypto.randomUUID();
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO transactions (id, org_id, import_id, date, description, amount, category, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'posted', datetime('now'))`
      ).bind(txnId, session.orgId, importId, row.normalized_date, row.normalized_description, row.normalized_amount, row.category)
    );

    // Create journal entry + lines if accounts available
    if (debitAccId && creditAccId) {
      const jeId = crypto.randomUUID();
      const amount = Math.abs(row.normalized_amount ?? 0);
      stmts.push(
        c.env.DB.prepare(
          `INSERT INTO journal_entries (id, organization_id, memo, posted_at, created_at)
           VALUES (?1, ?2, ?3, ?4, datetime('now'))`
        ).bind(jeId, session.orgId, row.normalized_description, row.normalized_date),
        c.env.DB.prepare(
          `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
           VALUES (?1, ?2, ?3, ?4, 0)`
        ).bind(crypto.randomUUID(), jeId, debitAccId, amount),
        c.env.DB.prepare(
          `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
           VALUES (?1, ?2, ?3, 0, ?4)`
        ).bind(crypto.randomUUID(), jeId, creditAccId, amount)
      );
    }

    // Mark row committed
    stmts.push(
      c.env.DB.prepare(`UPDATE import_rows SET review_status = 'committed' WHERE id = ?1`).bind(row.id)
    );
    committed++;
  }

  // Mark import session complete
  stmts.push(
    c.env.DB.prepare(`UPDATE import_sessions SET status = 'committed', updated_at = datetime('now') WHERE id = ?1`).bind(importId)
  );

  await c.env.DB.batch(stmts);
  await c.env.KV_IMPORT_STATUS.delete(`import:${importId}`);

  return c.json({ ok: true, committed });
});
