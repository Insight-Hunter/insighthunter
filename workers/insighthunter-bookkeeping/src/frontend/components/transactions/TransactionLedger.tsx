import React, { useMemo, useState } from "react";
import {
  useTransactions,
  useCreateTransaction,
} from "../../hooks/useTransactions";
import ImportBankCSV from "./ImportBankCSV";

const TransactionLedger: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data, isLoading, error } = useTransactions(statusFilter);
  const createTx = useCreateTransaction();

  const [newDesc, setNewDesc] = useState("");
  const [newAmt, setNewAmt] = useState("");
  const [newDate, setNewDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const totals = useMemo(() => {
    const rows = data ?? [];
    const approved = rows.filter(
      (t) => t.status === "approved" || t.status === "posted"
    );
    const pending = rows.filter(
      (t) => t.status !== "approved" && t.status !== "posted"
    );
    const sum = (xs: typeof rows) => xs.reduce((s, t) => s + t.amount, 0);
    return {
      total: sum(rows),
      approved: sum(approved),
      pending: sum(pending),
    };
  }, [data]);

  const handleQuickAdd = () => {
    const amount = parseFloat(newAmt);
    if (!newDesc || !Number.isFinite(amount)) return;
    createTx.mutate({
      date: newDate,
      description: newDesc,
      amount,
      source: "manual",
    });
    setNewDesc("");
    setNewAmt("");
  };

  return (
    <div className="bk-page">
      <header className="bk-page-header">
        <div>
          <h1>Transactions</h1>
          <p>
            All bank and manual activity, auto-classified by AI with human
            approvals.
          </p>
        </div>
        <div className="bk-page-actions">
          <ImportBankCSV />
        </div>
      </header>

      <section className="bk-panel bk-panel--summary">
        <div className="bk-summary-item">
          <span className="bk-summary-label">Total</span>
          <span className="bk-summary-value">
            {totals.total.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
            })}
          </span>
        </div>
        <div className="bk-summary-item">
          <span className="bk-summary-label">Approved</span>
          <span className="bk-summary-value">
            {totals.approved.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
            })}
          </span>
        </div>
        <div className="bk-summary-item">
          <span className="bk-summary-label">Pending</span>
          <span className="bk-summary-value">
            {totals.pending.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
            })}
          </span>
        </div>
      </section>

      <section className="bk-panel">
        <header className="bk-panel-header bk-panel-header--split">
          <div className="bk-filter-group">
            <select
              value={statusFilter ?? ""}
              onChange={(e) => setStatusFilter(e.target.value || undefined)}
            >
              <option value="">All statuses</option>
              <option value="pending_classification">
                Pending classification
              </option>
              <option value="pending_approval">Pending approval</option>
              <option value="approved">Approved</option>
              <option value="posted">Posted</option>
              <option value="excluded">Excluded</option>
            </select>
          </div>
          <div className="bk-inline-form">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <input
              placeholder="Quick add description"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <input
              placeholder="Amount"
              value={newAmt}
              onChange={(e) => setNewAmt(e.target.value)}
            />
            <button
              className="bk-btn bk-btn--secondary"
              onClick={handleQuickAdd}
            >
              Add
            </button>
          </div>
        </header>

        {isLoading && <div>Loading transactions…</div>}
        {error && (
          <div className="bk-alert bk-alert--error">
            {(error as Error).message}
          </div>
        )}

        {!isLoading && !error && (
          <table className="bk-table bk-table--hover">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Status</th>
                <th>Account</th>
                <th className="bk-num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.date}</td>
                  <td>
                    <div className="bk-cell-primary">{tx.description}</div>
                    {tx.ai_reasoning && (
                      <div className="bk-cell-secondary">
                        AI: {tx.ai_reasoning}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`bk-status bk-status--${tx.status}`}>
                      {tx.status.replace("_", " ")}
                    </span>
                  </td>
                  <td>{tx.account_id ?? "Unclassified"}</td>
                  <td className="bk-num">
                    {tx.amount.toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default TransactionLedger;
