import React from "react";
import { Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import Shell from "./components/layout/Shell";
import ChartOfAccounts from "./components/accounts/ChartOfAccounts";
import TransactionLedger from "./components/transactions/TransactionLedger";
import JournalEntryList from "./components/journal/JournalEntryList";
import ReconciliationBoard from "./components/reconciliation/ReconciliationBoard";
import ClassificationQueue from "./components/ai/ClassificationQueue";
import QBSettings from "./components/quickbooks/QBSettings";

function App() {
  const location = useLocation();

  return (
    <Shell>
      <Routes location={location}>
        <Route path="/" element={<Navigate to="/transactions" replace />} />
        <Route path="/accounts" element={<ChartOfAccounts />} />
        <Route path="/transactions" element={<TransactionLedger />} />
        <Route path="/journal-entries" element={<JournalEntryList />} />
        <Route path="/reconciliation" element={<ReconciliationBoard />} />
        <Route path="/ai" element={<ClassificationQueue />} />
        <Route path="/settings/quickbooks" element={<QBSettings />} />
        <Route
          path="*"
          element={
            <div className="bk-empty">
              <h2>Page not found</h2>
              <p>
                Go back to{" "}
                <Link to="/transactions" className="bk-link">
                  Transactions
                </Link>
                .
              </p>
            </div>
          }
        />
      </Routes>
    </Shell>
  );
}

export default App;
