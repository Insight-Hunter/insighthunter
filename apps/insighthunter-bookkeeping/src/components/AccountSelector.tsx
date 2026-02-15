// src/components/AccountSelector.tsx
import { useState, useEffect } from 'react';
import './AccountSelector.css';

interface Account {
  id: string;
  name: string;
  type: string;
  balance?: number;
}

interface AccountSelectorProps {
  value: string;
  onChange: (accountId: string, accountName: string) => void;
  filter?: string[];
  companyId: string;
}

export default function AccountSelector({
  value,
  onChange,
  filter,
  companyId,
}: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      // Load predefined chart of accounts
      const defaultAccounts: Account[] = [
        { id: 'cash', name: 'Cash', type: 'asset' },
        { id: 'accounts-receivable', name: 'Accounts Receivable', type: 'asset' },
        { id: 'inventory', name: 'Inventory', type: 'asset' },
        { id: 'equipment', name: 'Equipment', type: 'asset' },
        { id: 'accounts-payable', name: 'Accounts Payable', type: 'liability' },
        { id: 'credit-card', name: 'Credit Card', type: 'liability' },
        { id: 'loan-payable', name: 'Loan Payable', type: 'liability' },
        { id: 'owners-equity', name: "Owner's Equity", type: 'equity' },
        { id: 'retained-earnings', name: 'Retained Earnings', type: 'equity' },
        { id: 'sales-revenue', name: 'Sales Revenue', type: 'revenue' },
        { id: 'service-revenue', name: 'Service Revenue', type: 'revenue' },
        { id: 'cost-of-goods-sold', name: 'Cost of Goods Sold', type: 'cost-of-goods-sold' },
        { id: 'rent-expense', name: 'Rent Expense', type: 'expense' },
        { id: 'utilities-expense', name: 'Utilities Expense', type: 'expense' },
        { id: 'salary-expense', name: 'Salary Expense', type: 'expense' },
        { id: 'office-supplies', name: 'Office Supplies', type: 'expense' },
        { id: 'insurance-expense', name: 'Insurance Expense', type: 'expense' },
        { id: 'marketing-expense', name: 'Marketing Expense', type: 'expense' },
      ];

      let filtered = defaultAccounts;
      
      if (filter && filter.length > 0) {
        filtered = defaultAccounts.filter((acc) => filter.includes(acc.type));
      }

      setAccounts(filtered);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <select disabled><option>Loading accounts...</option></select>;
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        const account = accounts.find((a) => a.id === e.target.value);
        if (account) {
          onChange(account.id, account.name);
        }
      }}
      className="account-selector"
    >
      <option value="">Select Account</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name} ({account.type})
        </option>
      ))}
    </select>
  );
}
