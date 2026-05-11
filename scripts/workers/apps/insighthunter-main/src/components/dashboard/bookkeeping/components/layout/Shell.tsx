import React from "react";
import { NavLink } from "react-router-dom";

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="bk-shell">
      <aside className="bk-sidebar">
        <div className="bk-logo">
          <span className="bk-logo-mark">IH</span>
          <span className="bk-logo-text">Bookkeeping</span>
        </div>
        <nav className="bk-nav">
          <NavLink to="/transactions" className="bk-nav-link">
            Transactions
          </NavLink>
          <NavLink to="/accounts" className="bk-nav-link">
            Chart of Accounts
          </NavLink>
          <NavLink to="/journal-entries" className="bk-nav-link">
            Journal Entries
          </NavLink>
          <NavLink to="/reconciliation" className="bk-nav-link">
            Reconciliation
          </NavLink>
          <NavLink to="/ai" className="bk-nav-link">
            AI Queue
          </NavLink>
          <NavLink to="/settings/quickbooks" className="bk-nav-link">
            QuickBooks
          </NavLink>
        </nav>
        <div className="bk-sidebar-footer">
          <a
            href="https://insighthunter.app/dashboard"
            className="bk-nav-link bk-nav-link--muted"
          >
            Back to Insight Hunter
          </a>
        </div>
      </aside>
      <main className="bk-main">{children}</main>
    </div>
  );
};

export default Shell;
