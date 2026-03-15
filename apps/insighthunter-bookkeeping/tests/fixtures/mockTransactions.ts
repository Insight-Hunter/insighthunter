import type { Transaction } from '../../src/types/accounting';
import { TransactionStatus } from '../../src/types/accounting';

export const mockTransactions: Transaction[] = [
  {
    id: 'tx-1', orgId: 'org-1', date: '2025-01-15',
    description: 'Stripe payout', amount: 500000, currency: 'USD',
    status: TransactionStatus.POSTED, categoryId: 'cat-revenue',
    accountId: 'acc-cash', externalId: 'stripe-001', source: 'import',
    metadata: null, createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'tx-2', orgId: 'org-1', date: '2025-01-20',
    description: 'AWS bill', amount: 8750, currency: 'USD',
    status: TransactionStatus.POSTED, categoryId: 'cat-expense',
    accountId: 'acc-cash', externalId: 'aws-jan', source: 'import',
    metadata: null, createdAt: '2025-01-20T10:00:00Z', updatedAt: '2025-01-20T10:00:00Z',
  },
];
