import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useApiBase } from "../../hooks/useApi";
import QBConnectButton from "./QBConnectButton";

interface QBStatus {
  connected: boolean;
  companyName?: string;
  lastSyncedAt?: string;
  connectedAt?: string;
}

const QBSettings: React.FC = () => {
  const { apiFetch } = useApiBase();

  const statusQuery = useQuery<QBStatus>({
    queryKey: ["qb-status"],
    queryFn: () => apiFetch("/quickbooks/status"),
  });

  const syncAccounts = useMutation({
    mutationFn: () => apiFetch("/quickbooks/sync/accounts", { method: "POST" }),
    onSuccess: () => statusQuery.refetch(),
  });

  const disconnect = useMutation({
    mutationFn: () => apiFetch("/quickbooks/disconnect", { method: "POST" }),
    onSuccess: () => statusQuery.refetch(),
  });

  return (
    <div className="bk-page">
      <header className="bk-page-header">
        <div>
          <h1>QuickBooks Integration</h1>
          <p>
            Optional sync with QuickBooks Online. Works fully without a
            QuickBooks subscription.
          </p>
        </div>
      </header>

      <section className="bk-panel">
        {statusQuery.isLoading && <div>Checking QuickBooks status…</div>}
        {statusQuery.error && (
          <div className="bk-alert bk-alert--error">
            {(statusQuery.error as Error).message}
          </div>
        )}
        {statusQuery.data && (
          <>
            {statusQuery.data.connected ? (
              <>
                <p>
                  Connected to <strong>{statusQuery.data.companyName}</strong>
                </p>
                <p className="bk-subtle">
                  Connected at {statusQuery.data.connectedAt ?? "unknown"} ·
                  Last synced {statusQuery.data.lastSyncedAt ?? "never"}
                </p>
                <div className="bk-actions">
                  <button
                    className="bk-btn bk-btn--secondary"
                    onClick={() => syncAccounts.mutate()}
                    disabled={syncAccounts.isLoading}
                  >
                    {syncAccounts.isLoading ? "Syncing…" : "Sync accounts"}
                  </button>
                  <button
                    className="bk-btn"
                    onClick={() => disconnect.mutate()}
                    disabled={disconnect.isLoading}
                  >
                    Disconnect
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>No QuickBooks connection detected.</p>
                <QBConnectButton />
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default QBSettings;
