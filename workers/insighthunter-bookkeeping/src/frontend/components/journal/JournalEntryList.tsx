import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApiBase } from "../../hooks/useApi";
import JournalEntryForm from "./JournalEntryForm";

interface JournalEntry {
  id: string;
  date: string;
  memo: string;
  reference: string | null;
  type: string;
  status: string;
}

const JournalEntryList: React.FC = () => {
  const { apiFetch } = useApiBase();
  const [showNew, setShowNew] = useState(false);
  const { data, isLoading, error } = useQuery<JournalEntry[]>({
    queryKey: ["journal-entries"],
    queryFn: () => apiFetch("/journal-entries"),
  });

  return (
    <div className="bk-page">
      <header className="bk-page-header">
        <div>
          <h1>Journal Entries</h1>
          <p>
            Double-entry postings created by AI, payroll, and manual
            adjustments.
          </p>
        </div>
        <button
          className="bk-btn bk-btn--primary"
          onClick={() => setShowNew(true)}
        >
          New journal entry
        </button>
      </header>

      <section className="bk-panel">
        {isLoading && <div>Loading journal entries…</div>}
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
                <th>Memo</th>
                <th>Ref</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((je) => (
                <tr key={je.id}>
                  <td>{je.date}</td>
                  <td>{je.memo}</td>
                  <td>{je.reference ?? "—"}</td>
                  <td>{je.type}</td>
                  <td>
                    <span className={`bk-status bk-status--${je.status}`}>
                      {je.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showNew && <JournalEntryForm onClose={() => setShowNew(false)} />}
    </div>
  );
};

export default JournalEntryList;
