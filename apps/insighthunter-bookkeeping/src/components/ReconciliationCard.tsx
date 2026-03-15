// src/components/ReconciliationWizard.tsx
import { useState } from 'react';
import './ReconciliationWizard.css';

interface ReconciliationWizardProps {
  companyId: string;
}

export default function ReconciliationWizard({ companyId }: ReconciliationWizardProps) {
  const [step, setStep] = useState(1);
  const [accountId, setAccountId] = useState('cash');
  const [statementDate, setStatementDate] = useState('');
  const [endingBalance, setEndingBalance] = useState('');
  const [result, setResult] = useState<any>(null);

  const API_URL = 'http://localhost:8787';

  async function reconcile() {
    try {
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/reconcile`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            statement: {
              date: statementDate,
              endingBalance: parseFloat(endingBalance),
            },
          }),
        }
      );
      const data = await response.json();
      setResult(data);
      setStep(3);
    } catch (error) {
      console.error('Reconciliation failed:', error);
    }
  }

  return (
    <div className="reconciliation-wizard">
      <div className="wizard-steps">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Select Account</div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Enter Statement</div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Review</div>
      </div>

      {step === 1 && (
        <div className="wizard-content">
          <h3>Select Account to Reconcile</h3>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="account-select"
          >
            <option value="cash">Cash - Checking Account</option>
            <option value="savings">Cash - Savings Account</option>
            <option value="credit-card">Credit Card</option>
          </select>
          <button onClick={() => setStep(2)} className="btn-primary">
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-content">
          <h3>Enter Bank Statement Details</h3>
          <div className="form-group">
            <label>Statement Date</label>
            <input
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Ending Balance</label>
            <input
              type="number"
              step="0.01"
              value={endingBalance}
              onChange={(e) => setEndingBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="button-group">
            <button onClick={() => setStep(1)} className="btn-secondary">
              Back
            </button>
            <button onClick={reconcile} className="btn-primary">
              Reconcile
            </button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="wizard-content">
          <h3>Reconciliation Results</h3>
          <div className="reconciliation-results">
            <div className="result-row">
              <span>Book Balance:</span>
              <span>${result.bookBalance.toFixed(2)}</span>
            </div>
            <div className="result-row">
              <span>Statement Balance:</span>
              <span>${result.statementBalance.toFixed(2)}</span>
            </div>
            <div className="result-row">
              <span>Difference:</span>
              <span className={result.difference === 0 ? 'balanced' : 'unbalanced'}>
                ${Math.abs(result.difference).toFixed(2)}
              </span>
            </div>
            <div className="reconciliation-status">
              {result.reconciled ? (
                <div className="status-success">✓ Account Reconciled</div>
              ) : (
                <div className="status-warning">
                  ⚠ Difference found - please review transactions
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              setStep(1);
              setResult(null);
            }}
            className="btn-primary"
          >
            Start New Reconciliation
          </button>
        </div>
      )}
    </div>
  );
}
