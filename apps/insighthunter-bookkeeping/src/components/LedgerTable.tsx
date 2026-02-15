// src/components/LedgerTable.tsx
import { useState, useEffect } from 'react';
import { FiPlus, FiFilter } from 'react-icons/fi';
import TransactionRow from './TransactionRow';
import './LedgerTable.css';

interface Transaction {
  id: string;
  date: string;
  description: string;
  entries: JournalEntry[];
  status: string;
}

interface JournalEntry {
  accountId: string;
  accountName: string;
  type: 'debit' | 'credit';
  amount: number;
}

interface LedgerTableProps {
  companyId: string;
}

export default function LedgerTable({ companyId }: LedgerTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showNewTransaction, setShowNewTransaction] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    entries: [
      { accountId: '', accountName: '', type: 'debit' as const, amount: 0 },
      { accountId: '', accountName: '', type: 'credit' as const, amount: 0 },
    ],
  });

  const API_URL = 'http://localhost:8787';

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    try {
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/transactions`
      );
      const data = await response.json();
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  }

  async function createTransaction() {
    try {
      await fetch(`${API_URL}/api/ledger/${companyId}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTransaction),
      });

      setShowNewTransaction(false);
      setNewTransaction({
        date: new Date().toISOString().split('T')[0],
        description: '',
        entries: [
          { accountId: '', accountName: '', type: 'debit', amount: 0 },
          { accountId: '', accountName: '', type: 'credit', amount: 0 },
        ],
      });
      loadTransactions();
    } catch (error) {
      console.error('Failed to create transaction:', error);
    }
  }

  function addEntry() {
    setNewTransaction({
      ...newTransaction,
      entries: [
        ...newTransaction.entries,
        { accountId: '', accountName: '', type: 'debit', amount: 0 },
      ],
    });
  }

  function updateEntry(index: number, field: string, value: any) {
    const entries = [...newTransaction.entries];
    entries[index] = { ...entries[index], [field]: value };
    setNewTransaction({ ...newTransaction, entries });
  }

  const debitTotal = newTransaction.entries
    .filter(e => e.type === 'debit')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const creditTotal = newTransaction.entries
    .filter(e => e.type === 'credit')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01;

  return (
    <div className="ledger-table">
      <div className="table-header">
        <h2>General Ledger</h2>
        <button
          className="btn-primary"
          onClick={() => setShowNewTransaction(true)}
        >
          <FiPlus /> New Transaction
        </button>
      </div>

      {showNewTransaction && (
        <div className="transaction-form">
          <h3>New Journal Entry</h3>
          <div className="form-row">
            <input
              type="date"
              value={newTransaction.date}
              onChange={(e) =>
                setNewTransaction({ ...newTransaction, date: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Description"
              value={newTransaction.description}
              onChange={(e) =>
                setNewTransaction({
                  ...newTransaction,
                  description: e.target.value,
                })
              }
            />
          </div>

          <table className="entry-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Debit</th>
                <th>Credit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {newTransaction.entries.map((entry, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      placeholder="Account name"
                      value={entry.accountName}
                      onChange={(e) =>
                        updateEntry(index, 'accountName', e.target.value)
                      }
                    />
                  </td>
                  <td>
                    {entry.type === 'debit' ? (
                      <input
                        type="number"
                        step="0.01"
                        value={entry.amount}
                        onChange={(e) =>
                          updateEntry(index, 'amount', e.target.value)
                        }
                      />
                    ) : (
                      <span className="empty-cell">-</span>
                    )}
                  </td>
                  <td>
                    {entry.type === 'credit' ? (
                      <input
                        type="number"
                        step="0.01"
                        value={entry.amount}
                        onChange={(e) =>
                          updateEntry(index, 'amount', e.target.value)
                        }
                      />
                    ) : (
                      <span className="empty-cell">-</span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() =>
                        updateEntry(
                          index,
                          'type',
                          entry.type === 'debit' ? 'credit' : 'debit'
                        )
                      }
                      className="btn-switch"
                    >
                      ↔
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Totals</strong></td>
                <td><strong>${debitTotal.toFixed(2)}</strong></td>
                <td><strong>${creditTotal.toFixed(2)}</strong></td>
                <td>
                  {isBalanced ? (
                    <span className="balanced">✓</span>
                  ) : (
                    <span className="unbalanced">✗</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="form-actions">
            <button onClick={addEntry} className="btn-secondary">
              + Add Line
            </button>
            <div>
              <button
                onClick={() => setShowNewTransaction(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={createTransaction}
                className="btn-primary"
                disabled={!isBalanced || !newTransaction.description}
              >
                Post Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="transactions-list">
        {transactions.map((tx) => (
          <TransactionRow key={tx.id} transaction={tx} />
        ))}
      </div>
    </div>
  );
}
