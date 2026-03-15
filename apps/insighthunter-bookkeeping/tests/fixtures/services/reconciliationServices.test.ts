import { describe, it, expect } from 'vitest';
import { mockTransactions } from '../fixtures/mockTransactions';

describe('Reconciliation matching', () => {
  it('matches a transaction by external id', () => {
    const line = { date: '2025-01-15', description: 'Stripe payout', amount: -500000, externalId: 'stripe-001' };
    const match = mockTransactions.find(t => t.externalId === line.externalId);
    expect(match).toBeDefined();
    expect(match?.amount).toBe(500000);
  });

  it('detects unmatched statement line', () => {
    const line = { date: '2025-01-30', description: 'Unknown charge', amount: -9999, externalId: 'unknown-999' };
    const match = mockTransactions.find(t => t.externalId === line.externalId);
    expect(match).toBeUndefined();
  });
});
