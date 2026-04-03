import type { D1Database } from '@cloudflare/workers-types';
import type { Transaction } from '../types/accounting';
import { TransactionStatus } from '../types/accounting';
import * as q from '../db/queries';
import { logger } from '../lib/logger';

export interface CreateTransactionInput {
  orgId: string;
  accountId: string;
  date: string;
  description: string;
  amountCents: number;
  currency?: string;
  categoryId?: string;
  externalId?: string;
  source?: Transaction['source'];
  metadata?: Record<string, unknown>;
}

export async function createTransaction(
  db: D1Database, input: CreateTransactionInput
): Promise<Transaction> {
  const tx: Transaction = {
    id:          crypto.randomUUID(),
    orgId:       input.orgId,
    date:        input.date,
    description: input.description,
    amount:      input.amountCents,
    currency:    input.currency ?? 'USD',
    status:      TransactionStatus.POSTED,
    categoryId:  input.categoryId ?? null,
    accountId:   input.accountId,
    externalId:  input.externalId ?? null,
    source:      input.source ?? 'manual',
    metadata:    input.metadata ?? null,
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  };

  await q.insertTransaction(db, tx);
  logger.info('transaction_created', { orgId: tx.orgId, id: tx.id, amount: tx.amount });
  return tx;
}

export async function voidTransaction(
  db: D1Database, id: string, orgId: string
): Promise<void> {
  await q.updateTransactionStatus(db, id, orgId, TransactionStatus.VOID);
}

export async function listTransactions(
  db: D1Database, filter: q.TransactionFilter
): Promise<Transaction[]> {
  return q.getTransactions(db, filter);
}

export async function getTransaction(
  db: D1Database, id: string, orgId: string
): Promise<Transaction | null> {
  return q.getTransactionById(db, id, orgId);
}

export async function batchInsertTransactions(
  db: D1Database, transactions: CreateTransactionInput[]
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0, skipped = 0;
  for (const input of transactions) {
    try {
      await createTransaction(db, input);
      inserted++;
    } catch (err: any) {
      // Unique constraint on external_id = duplicate from import; skip
      if (err?.message?.includes('UNIQUE')) { skipped++; }
      else throw err;
    }
  }
  return { inserted, skipped };
}
