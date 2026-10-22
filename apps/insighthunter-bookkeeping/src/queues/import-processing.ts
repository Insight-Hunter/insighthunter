import type { Env } from "../index.js";
import { normalizeBankRow } from "../services/bank-statement-normalizer.js";
import { parseCsv } from "../services/csv-parser.js";

export interface ImportMessage {
  importId: string;
  objectKey: string;
  orgId: string;
}

export async function handleImportQueue(
  batch: MessageBatch<ImportMessage>,
  env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      await processImport(message.body, env);
      message.ack();
    } catch (error) {
      console.error("Bookkeeping import processing failed", errorName(error));
      message.retry();
    }
  }
}

async function processImport(message: ImportMessage, env: Env): Promise<void> {
  const importRow = await env.DB.prepare(
    `SELECT i.id, i.client_id, i.status FROM bookkeeping_imports i
     JOIN bookkeeping_clients c ON c.id = i.client_id
     WHERE i.id = ?1 AND c.organization_id = ?2`,
  )
    .bind(message.importId, message.orgId)
    .first<{ id: string; client_id: string; status: string }>();
  if (!importRow) throw new Error("import_not_found");
  if (["completed", "review_required"].includes(importRow.status)) return;

  const object = await env.IMPORTS.get(message.objectKey);
  if (!object) {
    await env.DB.prepare(
      `UPDATE bookkeeping_imports SET status = 'failed', error_message = 'source_file_missing',
       updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND client_id = ?2`,
    )
      .bind(message.importId, importRow.client_id)
      .run();
    await writeStatus(env, importRow.client_id, message.importId, { status: "failed" });
    return;
  }

  await env.DB.prepare(
    `UPDATE bookkeeping_imports SET status = 'processing', updated_at = CURRENT_TIMESTAMP
     WHERE id = ?1 AND client_id = ?2`,
  )
    .bind(message.importId, importRow.client_id)
    .run();

  let parsed;
  try {
    parsed = await parseCsv(await object.text());
  } catch {
    await env.DB.prepare(
      `UPDATE bookkeeping_imports SET status = 'failed', error_message = 'csv_parse_failed',
       updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND client_id = ?2`,
    )
      .bind(message.importId, importRow.client_id)
      .run();
    await writeStatus(env, importRow.client_id, message.importId, { status: "failed" });
    return;
  }
  if (parsed.length > 10_000) {
    await env.DB.prepare(
      `UPDATE bookkeeping_imports SET status = 'failed', error_message = 'row_limit_exceeded',
       updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND client_id = ?2`,
    )
      .bind(message.importId, importRow.client_id)
      .run();
    await writeStatus(env, importRow.client_id, message.importId, { status: "failed" });
    return;
  }

  const batchId = message.importId;
  await env.DB.prepare(
    `INSERT OR IGNORE INTO bookkeeping_import_batches
     (id, client_id, import_id, status) VALUES (?1, ?2, ?1, 'staged')`,
  )
    .bind(batchId, importRow.client_id)
    .run();

  const statements: D1PreparedStatement[] = [];
  let warnings = 0;
  for (const sourceRow of parsed) {
    const row = normalizeBankRow(sourceRow);
    const date = validDate(row.normalizedDate);
    const description = row.normalizedDescription?.slice(0, 500);
    const amount = row.normalizedAmount;
    if (!date || !description || !description.trim() || !Number.isFinite(amount)) {
      warnings++;
      continue;
    }
    const amountMinor = Math.round((amount ?? 0) * 100);
    if (!Number.isSafeInteger(amountMinor) || amountMinor === 0) {
      warnings++;
      continue;
    }
    const fingerprint = await sha256(
      `${date}|${amountMinor}|${description.toLowerCase()}`,
    );
    statements.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO bookkeeping_staged_transactions
         (id, batch_id, client_id, transaction_date, description, normalized_description,
          amount_minor, currency, direction, hash_fingerprint, category_hint, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'USD', ?8, ?9, ?10, 'staged')`,
      ).bind(
        crypto.randomUUID(),
        batchId,
        importRow.client_id,
        date,
        row.sourceDescription?.slice(0, 500) || description,
        description,
        amountMinor,
        amountMinor > 0 ? "credit" : "debit",
        fingerprint,
        row.category,
      ),
    );
  }

  let inserted = 0;
  let duplicates = 0;
  for (let index = 0; index < statements.length; index += 100) {
    const result = await env.DB.batch(statements.slice(index, index + 100));
    for (const item of result) {
      if (item.meta.changes) inserted += item.meta.changes;
      else duplicates++;
    }
  }

  const totalRows = inserted + duplicates;
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE bookkeeping_import_batches SET status = 'review_required',
       row_count = ?1, duplicate_count = ?2, warning_count = ?3,
       updated_at = CURRENT_TIMESTAMP WHERE id = ?4 AND client_id = ?5`,
    ).bind(totalRows, duplicates, warnings, batchId, importRow.client_id),
    env.DB.prepare(
      `UPDATE bookkeeping_imports SET status = 'review_required',
       imported_transaction_count = ?1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?2 AND client_id = ?3`,
    ).bind(totalRows, message.importId, importRow.client_id),
  ]);
  await writeStatus(env, importRow.client_id, message.importId, {
    status: "review_required",
    rowCount: totalRows,
    duplicates,
    warnings,
  });
}

function validDate(value: string | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function writeStatus(
  env: Env,
  clientId: string,
  importId: string,
  status: Record<string, string | number>,
): Promise<void> {
  await env.KV_IMPORT_STATUS.put(
    `import:${clientId}:${importId}`,
    JSON.stringify(status),
    { expirationTtl: 3600 },
  );
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}
