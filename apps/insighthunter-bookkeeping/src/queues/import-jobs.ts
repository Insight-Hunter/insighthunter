// queues/import-jobs.ts
// Async queue consumer: reads CSV/OFX from R2, parses rows, writes to import_rows D1 table.
// Triggered by IMPORT_QUEUE after a file upload.

import type { Env } from "../index.js";
import { normalizeBankRow } from "../services/bank-statement-normalizer.js";
import { parseCsv } from "../services/csv-parser.js";

export async function handleImportJob(
  body: { importId: string; objectKey: string; orgId: string },
  env: Env,
): Promise<void> {
  const { importId, objectKey, orgId } = body;

  // Update status to processing
  await env.KV_IMPORT_STATUS.put(
    `import:${importId}`,
    JSON.stringify({ status: "processing", rowCount: 0 }),
    { expirationTtl: 3600 },
  );

  const object = await env.IMPORTS.get(objectKey);
  if (!object) {
    await env.KV_IMPORT_STATUS.put(
      `import:${importId}`,
      JSON.stringify({ status: "error", error: "File not found in R2" }),
      { expirationTtl: 3600 },
    );
    return;
  }

  const text = await object.text();
  let parsedRows;

  try {
    parsedRows = await parseCsv(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Parse error";
    await env.KV_IMPORT_STATUS.put(
      `import:${importId}`,
      JSON.stringify({ status: "error", error: msg }),
      { expirationTtl: 3600 },
    );
    await env.DB.prepare(
      `UPDATE import_sessions SET status = 'error', updated_at = datetime('now') WHERE id = ?1`,
    )
      .bind(importId)
      .run();
    return;
  }

  // Batch insert parsed rows into D1
  const stmts = parsedRows.map((row, i) => {
    const norm = normalizeBankRow(row);
    return env.DB.prepare(
      `INSERT INTO import_rows (
        id, import_id, org_id, row_index,
        source_date, source_description, source_amount,
        normalized_date, normalized_description, normalized_amount,
        category, confidence, review_status, created_at
      ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,'pending',datetime('now'))`,
    ).bind(
      crypto.randomUUID(),
      importId,
      orgId,
      i + 1,
      norm.sourceDate ?? null,
      norm.sourceDescription ?? null,
      norm.sourceAmount ?? null,
      norm.normalizedDate ?? null,
      norm.normalizedDescription ?? null,
      norm.normalizedAmount ?? null,
      norm.category ?? "Uncategorized",
      norm.confidence,
    );
  });

  // D1 batch limit is 100; chunk it
  for (let i = 0; i < stmts.length; i += 100) {
    await env.DB.batch(stmts.slice(i, i + 100));
  }

  // Update import session
  await env.DB.prepare(
    `UPDATE import_sessions SET status = 'parsed', row_count = ?1, updated_at = datetime('now') WHERE id = ?2`,
  )
    .bind(parsedRows.length, importId)
    .run();

  // Update KV status for poll endpoint
  await env.KV_IMPORT_STATUS.put(
    `import:${importId}`,
    JSON.stringify({ status: "parsed", rowCount: parsedRows.length }),
    { expirationTtl: 3600 },
  );
}
