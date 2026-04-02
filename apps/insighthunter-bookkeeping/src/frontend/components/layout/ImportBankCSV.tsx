import React, { useState } from "react";
import Papa from "papaparse";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiBase } from "../../hooks/useApi";

const ImportBankCSV: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<
    Array<{ date: string; description: string; amount: number }>
  >([]);
  const { apiFetch } = useApiBase();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/transactions/bulk", {
        method: "POST",
        body: JSON.stringify({ transactions: rows }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setOpen(false);
      setRows([]);
    },
  });

  const onFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      complete: (result) => {
        const parsed: Array<{
          date?: string;
          description?: string;
          amount?: string;
        }> = result.data as any;
        const mapped = parsed
          .filter((r) => r.date && r.description && r.amount)
          .map((r) => ({
            date: r.date!,
            description: r.description!,
            amount: parseFloat(r.amount!),
          }))
          .filter((r) => Number.isFinite(r.amount));
        setRows(mapped);
      },
    });
  };

  return (
    <>
      <button
        className="bk-btn bk-btn--secondary"
        onClick={() => setOpen(true)}
      >
        Import CSV
      </button>

      {open && (
        <div className="bk-modal-backdrop">
          <div className="bk-modal">
            <header className="bk-modal-header">
              <h2>Import Bank CSV</h2>
            </header>
            <div className="bk-modal-body">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) =>
                  e.target.files && e.target.files[0]
                    ? onFile(e.target.files[0])
                    : null
                }
              />
              {rows.length > 0 && (
                <div className="bk-import-preview">
                  <p>
                    Previewing <strong>{rows.length}</strong> rows. First 5:
                  </p>
                  <table className="bk-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th className="bk-num">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((r, i) => (
                        <tr key={i}>
                          <td>{r.date}</td>
                          <td>{r.description}</td>
                          <td className="bk-num">
                            {r.amount.toLocaleString(undefined, {
                              style: "currency",
                              currency: "USD",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {mutation.isError && (
                <div className="bk-alert bk-alert--error">
                  {(mutation.error as Error).message}
                </div>
              )}
            </div>
            <footer className="bk-modal-footer">
              <button
                className="bk-btn"
                onClick={() => setOpen(false)}
                disabled={mutation.isLoading}
              >
                Cancel
              </button>
              <button
                className="bk-btn bk-btn--primary"
                onClick={() => mutation.mutate()}
                disabled={rows.length === 0 || mutation.isLoading}
              >
                {mutation.isLoading
                  ? "Importing…"
                  : `Import ${rows.length} transactions`}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};

export default ImportBankCSV;
