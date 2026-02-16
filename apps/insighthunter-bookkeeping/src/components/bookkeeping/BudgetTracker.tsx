// src/components/BudgetTracker.tsx
import { useState, useEffect } from 'react';
import { FiPlus } from 'react-icons/fi';
import './BudgetTracker.css';

interface BudgetTrackerProps {
  companyId: string;
}

export default function BudgetTracker({ companyId }: BudgetTrackerProps) {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const API_URL = 'http://localhost:8787';

  useEffect(() => {
    loadBudgets();
  }, []);

  async function loadBudgets() {
    try {
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/budget?period=current-month`
      );
      const data = await response.json();
      setBudgets(data.analysis || []);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    }
  }

  async function createBudget(budget: any) {
    try {
      await fetch(`${API_URL}/api/ledger/${companyId}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budget),
      });

      setShowForm(false);
      loadBudgets();
    } catch (error) {
      console.error('Failed to create budget:', error);
    }
  }

  return (
    <div className="budget-tracker">
      <div className="budget-header">
        <h2>Budget Tracking</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <FiPlus /> Add Budget
        </button>
      </div>

      <div className="budget-list">
        {budgets.map((budget, index) => (
          <div key={index} className="budget-item">
            <div className="budget-info">
              <h3>{budget.category}</h3>
              <div className="budget-amounts">
                <span className="budgeted">
                  Budget: ${budget.budgetedAmount.toLocaleString()}
                </span>
                <span className="actual">
                  Actual: ${budget.actualAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="budget-progress">
              <div
                className="progress-bar"
                style={{
                  width: `${Math.min(budget.percentUsed, 100)}%`,
                  backgroundColor:
                    budget.percentUsed > 100
                      ? '#ef4444'
                      : budget.percentUsed > 80
                      ? '#f59e0b'
                      : '#10b981',
                }}
              />
            </div>

            <div className="budget-variance">
              <span className={budget.variance < 0 ? 'under' : 'over'}>
                {budget.variance < 0 ? '▼' : '▲'} $
                {Math.abs(budget.variance).toLocaleString()}
              </span>
              <span className="percent">{budget.percentUsed.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <BudgetForm
          onSubmit={createBudget}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function BudgetForm({ onSubmit, onCancel }: any) {
  const [formData, setFormData] = useState({
    category: '',
    budgetedAmount: 0,
    period: 'monthly',
  });

  return (
    <dialog open className="budget-form-dialog">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(formData);
        }}
      >
        <h3>Create Budget</h3>
        <input
          type="text"
          placeholder="Category"
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
          required
        />
        <input
          type="number"
          placeholder="Budget Amount"
          value={formData.budgetedAmount}
          onChange={(e) =>
            setFormData({ ...formData, budgetedAmount: Number(e.target.value) })
          }
          required
        />
        <select
          value={formData.period}
          onChange={(e) => setFormData({ ...formData, period: e.target.value })}
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Create Budget
          </button>
        </div>
      </form>
    </dialog>
  );
}
