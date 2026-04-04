import { describe, it, expect } from 'vitest';
import type { CategoryRule, Transaction } from '../../src/types/accounting';
import { TransactionStatus } from '../../src/types/accounting';

function applyRule(rule: CategoryRule, tx: Transaction): boolean {
  const value = rule.field === 'description' ? tx.description : String(tx.amount);
  return new RegExp(rule.pattern, 'i').test(value);
}

describe('Category rules', () => {
  const tx: Transaction = {
    id: 'tx-test', orgId: 'org-1', date: '2025-01-01',
    description: 'Stripe payout Q1', amount: 100000, currency: 'USD',
    status: TransactionStatus.POSTED, categoryId: null, accountId: 'acc-cash',
    externalId: null, source: 'import', metadata: null,
    createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
  };

  it('matches description pattern case-insensitively', () => {
    const rule: CategoryRule = {
      id: 'r1', orgId: 'org-1', categoryId: 'cat-revenue',
      pattern: 'stripe', field: 'description', priority: 10, isActive: true,
      createdAt: '2025-01-01T00:00:00Z',
    };
    expect(applyRule(rule, tx)).toBe(true);
  });

  it('does not match unrelated pattern', () => {
    const rule: CategoryRule = {
      id: 'r2', orgId: 'org-1', categoryId: 'cat-expense',
      pattern: 'aws', field: 'description', priority: 5, isActive: true,
      createdAt: '2025-01-01T00:00:00Z',
    };
    expect(applyRule(rule, tx)).toBe(false);
  });
});
