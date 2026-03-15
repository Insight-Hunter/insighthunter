// src/components/TransactionRow.tsx
import { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import './TransactionRow.css';

interface Transaction {
  id: string;
  date: string;
  description: string;
  entries: JournalEntry[];
  status: string;
}

interface JournalEntry {
  accountName: string;
  type: 'debit' | 'credit';
  amount: number;
}

export default function TransactionRow({ transaction }: { transaction: Transaction }) {
  const [expanded, setExpanded] = useState(false);

  const total = transaction.entries
    .filter(e => e.type === 'debit')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="transaction-row">
      <div className="transaction-summary" onClick={() => setExpanded(!expanded)}>
        <div className="summary-left">
          <button className="expand-btn">
            {expanded ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          <div>
            <div className="transaction-date">{transaction.date}</div>
            <div className="transaction-description">{transaction.description}</div>
          </div>
        </div>
        <div className="transaction-amount">${total.toFixed(2)}</div>
      </div>

      {expanded && (
        <div className="transaction-details">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Debit</th>
                <th>Credit</th>
              </tr>
            </thead>
            <tbody>
              {transaction.entries.map((entry, index) => (
                <tr key={index}>
                  <td>{entry.accountName}</td>
                  <td>
                    {entry.type === 'debit' ? `$${entry.amount.toFixed(2)}` : '-'}
                  </td>
                  <td>
                    {entry.type === 'credit' ? `$${entry.amount.toFixed(2)}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
