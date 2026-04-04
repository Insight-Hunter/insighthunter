import type { D1Database } from '@cloudflare/workers-types';
import type { Transaction, CategoryRule } from '../types/accounting';
import * as q from '../db/queries';
import { logger } from '../lib/logger';

export interface CategorizationResult {
  transactionId: string;
  categoryId: string | null;
  confidence: number;
  method: 'rule' | 'ai' | 'none';
}

/** Rule-based categorization using regex patterns stored in DB. */
export async function categorizeByRules(
  db: D1Database, tx: Transaction
): Promise<CategorizationResult> {
  const rules = await q.getCategoryRules(db, tx.orgId);

  for (const rule of rules) { // already ordered by priority DESC
    if (!rule.isActive) continue;
    try {
      const value = rule.field === 'description' ? tx.description
                  : rule.field === 'amount'      ? String(tx.amount)
                  : tx.description;
      if (new RegExp(rule.pattern, 'i').test(value)) {
        await q.updateTransactionCategory(db, tx.id, tx.orgId, rule.categoryId);
        logger.info('categorized_by_rule', { txId: tx.id, ruleId: rule.id });
        return { transactionId: tx.id, categoryId: rule.categoryId, confidence: 1, method: 'rule' };
      }
    } catch {
      // invalid regex in rule; skip
    }
  }

  return { transactionId: tx.id, categoryId: null, confidence: 0, method: 'none' };
}

export async function applyCategoryToTransaction(
  db: D1Database, transactionId: string, orgId: string, categoryId: string
): Promise<void> {
  await q.updateTransactionCategory(db, transactionId, orgId, categoryId);
}

/** Bulk rule-based categorization for a batch of uncategorized transactions. */
export async function bulkCategorize(
  db: D1Database, orgId: string
): Promise<{ categorized: number; skipped: number }> {
  const txs = await q.getTransactions(db, { orgId, limit: 500 });
  const uncategorized = txs.filter(t => !t.categoryId);
  let categorized = 0;

  for (const tx of uncategorized) {
    const result = await categorizeByRules(db, tx);
    if (result.categoryId) categorized++;
  }

  return { categorized, skipped: uncategorized.length - categorized };
}
