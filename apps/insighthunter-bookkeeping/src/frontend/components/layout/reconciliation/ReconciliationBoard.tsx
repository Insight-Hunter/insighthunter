import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApiBase } from "../../hooks/useApi";

interface Session {
  id: string;
  account_id: string;
  statement_date: string;
  statement_balance: number;
  starting_balance: number;
  status: string;
  cleared_balance: number | null;
  difference: number | null;
}

interface Match {
  id: string;
  transaction_id: string;
  is_cleared: number;
  amount: number;
  date: string;
  description: string;
}

const ReconciliationBoard: React.FC = () => {
  const { apiFetch } = useApiBase();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [statementBalance, setStatementBalance] = useState("");
  const [wsState, setWsState] = useState<{
    clearedTotal: number;
    clearedCount: number;
  }>({ clearedTotal: 0, clearedCount: 0 });

  const sessionsQuery = useQuery<Session[]>({
    queryKey: ["reconciliation-sessions"],
    queryFn: () => apiFetch("/reconciliation"),
  });

  const detailsQuery = useQuery<{ matches: Match[] }>({
    queryKey: ["reconciliation-session", activeId],
    enabled: !!activeId,
    queryFn: () => apiFetch(`/reconciliation/${activeId}`),
  });

  // WebSocket to ReconciliationAgent DO for live totals
  useEffect(() => {
    if (!activeId) return;
    const url = new URL(
      `/api/reconciliation/${activeId}/ws`,
      window.location.origin
    );
    const ws = new WebSocket(url.toString().replace("http", "ws"));
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as {
          type: string;
          clearedTotal?: number;
          clearedCount?: number;
        };
        if (msg.type === "state_update") {
          setWsState({
            clearedTotal: msg.clearedTotal ?? 0,
            clearedCount: msg.clearedCount ?? 0,
          });
        }
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }, [activeId]);

  const handleNewSession = async () => {
    const date = prompt(
      "Statement date (YYYY-MM-DD)",
      new Date().toISOString().slice(0, 10)
    );
    if (!date) return;
    const balanceStr = prompt("Statement ending balance (e.g. 1234.56)", "0");
    if (!balanceStr) return;
    const accountId = prompt("Account ID to reconcile (bank account id)");
    if (!accountId) return;

    await apiFetch("/reconciliation", {
      method: "POST",
      body: JSON.stringify({
        accountId,
        statementDate: date,
        statementBalance: parseFloat(balanceStr),
      }),
    });
    sessionsQuery.refetch();
  };

  const activeSession = useMemo(
    () => sessionsQuery.data?.find((s) => s.id === activeId) ?? null,
    [sessionsQuery.data, activeId]
  );

  return (
    <div className="bk-page">
      <header className="bk-page-header">
        <div>
          <h1>Reconciliation</h1>
          <p>
            Clear transactions against your bank statement to detect
            discrepancies.
          </p>
        </div>
        <button className="bk-btn bk-btn--primary" onClick={handleNewSession}>
          New reconciliation
        </button>
      </header>

      <div className="bk-grid bk-grid--2">
        <section className="bk-panel">
          <header className="bk-panel-header">
            <h2>Sessions</h2>
          </header>
          {sessionsQuery.isLoading && <div>Loading…</div>}
          {sessionsQuery.error && (
            <div className="bk-alert bk-alert--error">
              {(sessionsQuery.error as Error).message}
            </div>
          )}
          <ul className="bk-list">
            {(sessionsQuery.data ?? []).map((s) => (
              <li
                key={s.id}
                className={
                  "bk-list-item " +
                  (s.id === activeId ? "bk-list-item--active" : "")
                }
                onClick={() => {
                  setActiveId(s.id);
                  setStatementBalance(String(s.statement_balance));
                }}
              >
                <div>
                  <div className="bk-list-title">
                    {s.statement_date} · {s.account_id}
                  </div>
                  <div className="bk-list-sub">
                    Status: {s.status} · Ending:{" "}
                    {s.statement_balance.toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="bk-panel">
          {!activeSession && <div>Select a session to begin.</div>}
          {activeSession && (
            <>
              <header className="bk-panel-header">
                <div>
                  <h2>Session {activeSession.id.slice(0, 8)}</h2>
                  <p>
                    Starting balance{" "}
                    {activeSession.starting_balance.toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                    })}{" "}
                    · Statement date {activeSession.statement_date}
                  </p>
                </div>
                <div className="bk-field-inline">
                  <label>Statement balance</label>
                  <input
                    value={statementBalance}
                    onChange={(e) => setStatementBalance(e.target.value)}
                  />
                </div>
              </header>
              <div className="bk-rec-summary">
                <div>
                  Cleared total:{" "}
                  {wsState.clearedTotal.toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                  })}
                </div>
                <div>Cleared items: {wsState.clearedCount}</div>
              </div>

              {detailsQuery.isLoading && <div>Loading transactions…</div>}
              {detailsQuery.error && (
                <div className="bk-alert bk-alert--error">
                  {(detailsQuery.error as Error).message}
                </div>
              )}

              {!detailsQuery.isLoading && !detailsQuery.error && (
                <table className="bk-table bk-table--hover">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th className="bk-num">Amount</th>
                      <th>Cleared</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailsQuery.data?.matches ?? []).map((m) => (
                      <tr key={m.id}>
                        <td>{m.date}</td>
                        <td>{m.description}</td>
                        <td className="bk-num">
                          {m.amount.toLocaleString(undefined, {
                            style: "currency",
                            currency: "USD",
                          })}
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            defaultChecked={m.is_cleared === 1}
                            onChange={async (e) => {
                              const body = {
                                txId: m.transaction_id,
                                amount: m.amount,
                              };
                              await apiFetch(
                                `/reconciliation/${activeSession.id}/${
                                  e.target.checked ? "clear" : "unclear"
                                }`,
                                {
                                  method: "POST",
                                  body: JSON.stringify(body),
                                }
                              );
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default ReconciliationBoard;
