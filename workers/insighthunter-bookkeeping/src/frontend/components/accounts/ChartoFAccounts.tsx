import React, { useMemo, useState } from "react";
import { useAccounts } from "../../hooks/useAccounts";
import AccountForm from "./AccountForm";

const ChartOfAccounts: React.FC = () => {
  const { data, isLoading, error } = useAccounts();
  const [showNew, setShowNew] = useState(false);

  const grouped = useMemo(() => {
    const out: Record<string, typeof data> = {};
    (data ?? []).forEach((acct) => {
      if (!out[acct.type]) out[acct.type] = [];
      out[acct.type]!.push(acct);
    });
    return out;
  }, [data]);

  if (isLoading) {
    return <div className="bk-panel">Loading accounts…</div>;
  }
  if (error) {
    return (
      <div className="bk-panel bk-panel--error">
        Failed to load accounts: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="bk-page">
      <header className="bk-page-header">
        <div>
          <h1>Chart of Accounts</h1>
          <p>
            Standard double-entry ledger seeded from BizForma; customize as
            needed.
          </p>
        </div>
        <button
          className="bk-btn bk-btn--primary"
          onClick={() => setShowNew(true)}
        >
          New account
        </button>
      </header>

      <div className="bk-grid bk-grid--2">
        {Object.entries(grouped).map(([type, accounts]) => (
          <section key={type} className="bk-panel">
            <header className="bk-panel-header">
              <h2>{type.replace(/_/g, " ").toUpperCase()}</h2>
            </header>
            <table className="bk-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th className="bk-num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {accounts!.map((acct) => (
                  <tr key={acct.id}>
                    <td>{acct.code}</td>
                    <td>{acct.name}</td>
                    <td className="bk-num">
                      {acct.balance.toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      {showNew && <AccountForm onClose={() => setShowNew(false)} />}
    </div>
  );
};

export default ChartOfAccounts;
