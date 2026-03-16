import type { Account } from '../../src/types/accounting';
import { AccountType, AccountSubType } from '../../src/types/accounting';

export const mockAccounts: Account[] = [
  {
    id: 'acc-cash', orgId: 'org-1', code: '1000', name: 'Checking Account',
    type: AccountType.ASSET, subType: AccountSubType.CASH,
    parentId: null, currency: 'USD', isActive: true, description: null,
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'acc-ar', orgId: 'org-1', code: '1100', name: 'Accounts Receivable',
    type: AccountType.ASSET, subType: AccountSubType.ACCOUNTS_RECEIVABLE,
    parentId: null, currency: 'USD', isActive: true, description: null,
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'acc-revenue', orgId: 'org-1', code: '4000', name: 'Service Revenue',
    type: AccountType.REVENUE, subType: AccountSubType.OPERATING_REVENUE,
    parentId: null, currency: 'USD', isActive: true, description: null,
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'acc-expense', orgId: 'org-1', code: '6000', name: 'Operating Expenses',
    type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE,
    parentId: null, currency: 'USD', isActive: true, description: null,
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
  },
];
