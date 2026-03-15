import type { D1Database } from '@cloudflare/workers-types';
import type { ReconciliationRecord, Transaction } from '../types/accounting';
import { ReconciliationStatus, TransactionStatus } from '../types/accounting';
import * as q from '../db/queries';
import { logger } from '../lib/logger';

export interface StatementLine {
  date: string;
  description: string;
  amount: number; // cents; negative = debit
  externalId?: string;
}

export interface ReconciliationMatch {
  statementLine: StatementLine;
  transaction: Transaction | null;
  matched: boolean;
  difference: number;
}

export async function startReconciliation(
  db: D1Database,
  orgId: string,
  accountId: string,
  statementDate: string,
  statementBalanceCents: number,
  userId: string,
): Promise<ReconciliationRecord> {
  const record: ReconciliationRecord = {
    id:               crypto.randomUUID(),
    orgId,
    accountId,
    statementDate,
    statementBalance: statementBalanceCents,
    clearedBalance:   0,
    difference:       statementBalanceCents,
    status:           ReconciliationStatus.UNRECONCILED,
    reconciledAt:     null,
    reconciledBy:     null,
    createdAt:        new Date().toISOString(),
  };
  await q.upsertReconciliationRecord(db, record);
  return record;
}

export async function matchTransactions(
  db: D1Database,
  orgId: string,
  accountId: string,
  statementLines: StatementLine[],
  tolerance = 0, // cents
): Promise<ReconciliationMatch[]> {
  const transactions = await q.getTransactions(db, {
    orgId, accountId, status: TransactionStatus.POSTED,
  });

  return statementLines.map(line => {
    // Prefer exact external_id match, then amount+date proximity
    const byExternalId = line.externalId
      ? transactions.find(t => t.externalId === line.externalId)
      : undefined;

    const byAmount = transactions.find(
      t => t.date === line.date && Math.abs(t.amount - Math.abs(line.amount)) <= tolerance
    );

    const match = byExternalId ?? byAmount ?? null;
    return {
      statementLine: line,
      transaction: match,
      matched: match !== null,
      difference: match ? Math.abs(match.amount - Math.abs(line.amount)) : Math.abs(line.amount),
    };
  });
}

export async function completeReconciliation(
  db: D1Database,
  reconciliationId: string,
  orgId: string,
  userId: string,
  clearedBalanceCents: number,
  statementBalanceCents: number,
): Promise<ReconciliationRecord> {
  const difference = statementBalanceCents - clearedBalanceCents;
  const status = difference === 0
    ? ReconciliationStatus.MATCHED
    : ReconciliationStatus.UNMATCHED;

  const record: ReconciliationRecord = {
    id:               reconciliationId,
    orgId,
    accountId:        '', // will be updated via upsert
    statementDate:    '',
    statementBalance: statementBalanceCents,
    clearedBalance:   clearedBalanceCents,
    difference,
    status,
    reconciledAt:     new Date().toISOString(),
    reconciledBy:     userId,
    createdAt:        new Date().toISOString(),
  };

  await q.upsertReconciliationRecord(db, record);
  logger.info('reconciliation_completed', { orgId, reconciliationId, difference, status });
  return record;
}
