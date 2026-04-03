import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiBase } from "../../hooks/useApi";

interface Props {
  onClose: () => void;
}

interface Account {
  id: string;
  name: string;
  code: string;
}

const JournalEntryForm: React.FC<Props> = ({ onClose }) => {
  const { apiFetch } = useApiBase();
  const qc = useQueryClient();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<
    Array<{
      accountId: string;
      debit: string;
      credit: string;
      description: string;
    }>
  >([{ accountId: "", debit: "", credit: "", description: "" }]);

  const accountsQuery = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: () => apiFetch("/accounts"),
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/journal-entries", {
        method: "POST",
        body: JSON.stringify({
          date,
          memo,
          reference: reference || undefined,
          lines: lines.map((l) => ({
            accountId: l.accountId,
            debit: parseFloat(l.debit || "0"),
            credit: parseFloat(l.credit || "0"),
            description: l.description || undefined,
          })),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal-entries"] });
      onClose();
    },
  });

  const addLine = () =>
    setLines((ls) => [
      ...ls,
      { accountId: "", debit: "", credit: "", description: "" },
    ]);

  const updateLine = (idx: number, field: string, value: string) => {
    setLines((ls) =>
      ls.map((l, i) => (i === idx ? { ...l, [field]: value } : l))
    );
  };

  const totalDebit = lines.reduce(
    (s, l) => s + (parseFloat(l.debit || "0") || 0),
    0
  );
  const totalCredit = lines.reduce(
    (s, l) => s + (parseFloat(l.credit || "0") || 0),
    0
  );

  return (
    <div className="bk-modal-backdrop">
      <div className="bk-modal bk-modal--lg">
        <header className="bk-modal-header">
          <h2>New Journal Entry</h2>
        </header>
        <div className="bk-modal-body">
          <div className="bk-field-grid">
            <div className="bk-field">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="bk-field">
              <label>Reference</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>
          <div className="bk-field">
            <label>Memo</label>
            <input value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>

          <div className="bk-je-lines">
            <table className="bk-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th className="bk-num">Debit</th>
                  <th className="bk-num">Credit</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        value={line.accountId}
                        onChange={(e) =>
                          updateLine(idx, "accountId", e.target.value)
                        }
                      >
                        <option value="">Select account…</option>
                        {(accountsQuery.data ?? []).map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} — {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="bk-num">
                      <input
                        value={line.debit}
                        onChange={(e) =>
                          updateLine(idx, "debit", e.target.value)
                        }
                      />
                    </td>
                    <td className="bk-num">
                      <input
                        value={line.credit}
                        onChange={(e) =>
                          updateLine(idx, "credit", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        value={line.description}
                        onChange={(e) =>
                          updateLine(idx, "description", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="bk-btn bk-btn--ghost" onClick={addLine}>
              + Add line
            </button>
          </div>

          <div className="bk-je-totals">
            <span>
              Debit:{" "}
              {totalDebit.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
              })}
            </span>
            <span>
              Credit:{" "}
              {totalCredit.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
              })}
            </span>
            <span
              className={
                Math.abs(totalDebit - totalCredit) < 0.01
                  ? "bk-pill bk-pill--ok"
                  : "bk-pill bk-pill--warn"
              }
            >
              Diff: {(totalDebit - totalCredit).toFixed(2)}
            </span>
          </div>

          {mutation.isError && (
            <div className="bk-alert bk-alert--error">
              {(mutation.error as Error).message}
            </div>
          )}
        </div>
        <footer className="bk-modal-footer">
          <button
            className="bk-btn"
            onClick={onClose}
            disabled={mutation.isLoading}
          >
            Cancel
          </button>
          <button
            className="bk-btn bk-btn--primary"
            onClick={() => mutation.mutate()}
            disabled={mutation.isLoading || !memo || lines.length === 0}
          >
            {mutation.isLoading ? "Saving…" : "Post entry"}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default JournalEntryForm;
