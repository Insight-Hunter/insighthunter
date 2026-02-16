// src/components/QuickBooksConnect.tsx
import { useState, useEffect, useCallback } from "react";
import { FiCheck, FiRefreshCw, FiAlertTriangle, FiX } from "react-icons/fi";
import "./QuickBooksConnect.css";

interface QBConnection {
  connected: boolean;
  realmId: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface QuickBooksConnectProps {
  companyId: string;
}

export default function QuickBooksConnect({
  companyId,
}: QuickBooksConnectProps) {
  const [connection, setConnection] = useState<QBConnection | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

  // Load connection from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`qb-${companyId}`);
      if (saved) {
        const QBConnection = JSON.parse(saved);
        // Check if token expired
        if (data.connected && data.expiresAt > Date.now()) {
          setConnection(data);
        } else {
          // Clear expired token
          localStorage.removeItem(`qb-${companyId}`);
        }
      }
    } catch {
      localStorage.removeItem(`qb-${companyId}`);
    }
  }, [companyId]);

  const saveConnection = useCallback(
    (QBConnection) => {
      setConnection(data);
      localStorage.setItem(`qb-${companyId}`, JSON.stringify(data));
    },
    [companyId]
  );

  const clearConnection = useCallback(() => {
    setConnection(null);
    localStorage.removeItem(`qb-${companyId}`);
  }, [companyId]);

  const connectQuickBooks = async () => {
    setAuthenticating(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/quickbooks/auth`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Auth init failed: ${response.status}`);
      }

      const { authUrl, state } = await response.json();

      // Store state for CSRF protection
      sessionStorage.setItem(`qb-state-${companyId}`, state);

      const popup = window.open(
        authUrl,
        "QuickBooksOAuth",
        "width=600,height=700,noopener,noreferrer"
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups.");
      }

      const handleMessage = (event: MessageEvent) => {
        // Strict origin validation
        const validOrigins = [
          window.location.origin,
          "https://appcenter.intuit.com",
          "https://developer.api.intuit.com",
          "http://localhost:3000",
        ];

        if (!validOrigins.includes(event.origin)) return;

        const data = event.data as { type: string; payload?: any };

        if (data.type === "quickbooks:callback") {
          const storedState = sessionStorage.getItem(`qb-state-${companyId}`);
          if (data.payload?.state !== storedState) {
            setError("OAuth state mismatch - possible attack");
            return;
          }

          if (data.payload?.error) {
            setError(`QuickBooks error: ${data.payload.error_description}`);
          } else if (data.payload?.realmId && data.payload?.access_token) {
            const expiresAt = Date.now() + data.payload.expires_in * 1000;
            saveConnection({
              connected: true,
              realmId: data.payload.realmId,
              accessToken: data.payload.access_token,
              refreshToken: data.payload.refresh_token || "",
              expiresAt,
            });
          }

          sessionStorage.removeItem(`qb-state-${companyId}`);
          if (popup) popup.close();
        }
      };

      window.addEventListener("message", handleMessage);

      // Cleanup after 5 minutes or popup close
      const timeout = setTimeout(() => {
        window.removeEventListener("message", handleMessage);
        setAuthenticating(false);
      }, 300000);

      popup.onbeforeunload = () => {
        clearTimeout(timeout);
        window.removeEventListener("message", handleMessage);
        setAuthenticating(false);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      console.error("QB Connect error:", err);
    } finally {
      setAuthenticating(false);
    }
  };

  const syncQuickBooks = async () => {
    if (!connection?.realmId) {
      setError("No QuickBooks connection");
      return;
    }

    setSyncing(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/quickbooks/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            realmId: connection.realmId,
            fullSync: false, // Incremental by default
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Sync failed");
      }

      // Optionally get sync results
      const result = await response.json();
      console.log("Sync result:", result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync error");
      console.error("QB Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  const disconnectQuickBooks = async () => {
    try {
      await fetch(`${API_URL}/api/ledger/${companyId}/quickbooks/disconnect`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Disconnect error:", err);
    } finally {
      clearConnection();
      setError(null);
    }
  };

  const dismissError = () => setError(null);

  return (
    <div className="quickbooks-connect">
      <div className="qb-header">
        <img
          src="/quickbooks-logo.svg"
          alt="QuickBooks"
          className="qb-logo"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://upload.wikimedia.org/wikipedia/commons/1/1a/QuickBooks_Logo.png";
          }}
        />
        <div>
          <h3>QuickBooks Online</h3>
          <p className="qb-subtitle">
            Sync accounts, customers, invoices & transactions
          </p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <FiAlertTriangle />
          {error}
          <button
            onClick={dismissError}
            className="dismiss-btn"
            aria-label="Dismiss error"
          >
            <FiX />
          </button>
        </div>
      )}

      {!connection?.connected ? (
        <div className="qb-connect">
          <div className="connect-info">
            <p>Connect your QuickBooks company to automatically sync:</p>
            <ul className="sync-features">
              <li>✓ Chart of Accounts</li>
              <li>✓ Customers &amp; Vendors</li>
              <li>✓ Invoices &amp; Bills</li>
              <li>✓ Bank Transactions</li>
              <li>✓ Journal Entries</li>
            </ul>
          </div>
          <button
            onClick={connectQuickBooks}
            disabled={authenticating}
            className="btn-primary qb-connect-btn"
          >
            {authenticating ? (
              <>
                <FiRefreshCw className="spinning" />
                Authorizing...
              </>
            ) : (
              "Connect QuickBooks Online"
            )}
          </button>
        </div>
      ) : (
        <div className="qb-connected">
          <div className="status-section">
            <div className="status-badge success">
              <FiCheck />
              <span>Connected</span>
              <small>Realm ID: {connection.realmId?.slice(-8)}</small>
            </div>
            <div className="token-status">
              {Date.now() > connection.expiresAt * 0.9 ? (
                <span className="token-warning">Token expires soon</span>
              ) : (
                <span className="token-good">Token valid</span>
              )}
            </div>
          </div>

          <div className="action-buttons">
            <button
              onClick={syncQuickBooks}
              disabled={syncing}
              className="btn-primary qb-sync-btn"
            >
              {syncing ? (
                <>
                  <FiRefreshCw className="spinning" />
                  Syncing...
                </>
              ) : (
                <>
                  <FiRefreshCw />
                  Sync Now
                </>
              )}
            </button>
            <button
              onClick={disconnectQuickBooks}
              className="btn-secondary qb-disconnect"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
