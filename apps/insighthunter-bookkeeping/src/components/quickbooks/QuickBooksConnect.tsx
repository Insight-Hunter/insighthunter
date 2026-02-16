import { useState, useEffect, useCallback } from "react";
import { FiCheck, FiRefreshCw, FiAlertTriangle } from "react-icons/fi";
import "./QuickBooksConnect.css";

interface QuickBooksConnectProps {
  companyId: string;
}

export default function QuickBooksConnect({
  companyId,
}: QuickBooksConnectProps) {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realmId, setRealmId] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787"; // Use env var for prod

  // Load connection state from storage
  useEffect(() => {
    const saved = localStorage.getItem(`qb-connected-${companyId}`);
    if (saved) {
      const { connected, realmId: savedRealmId } = JSON.parse(saved);
      setConnected(connected);
      setRealmId(savedRealmId);
    }
  }, [companyId]);

  const saveConnection = useCallback(
    (isConnected: boolean, newRealmId?: string) => {
      const data = { connected: isConnected, realmId: newRealmId || realmId };
      setConnected(isConnected);
      setRealmId(newRealmId || realmId);
      localStorage.setItem(`qb-connected-${companyId}`, JSON.stringify(data));
    },
    [companyId, realmId]
  );

  const connectQuickBooks = async () => {
    try {
      setError(null);
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/quickbooks/auth`
      );
      if (!response.ok) throw new Error("Auth URL fetch failed");
      const { authUrl } = await response.json();
      const popup = window.open(
        authUrl,
        "QuickBooks OAuth",
        "width=800,height=600,noopener,noreferrer"
      );

      // Scoped listener with cleanup
      const handleMessage = (event: MessageEvent) => {
        // Validate origin (your backend domain or localhost)
        const validOrigins = [
          window.location.origin,
          "http://localhost:8787",
          "https://yourapp.com",
        ];
        if (!validOrigins.includes(event.origin)) return;

        if (event.data.type === "quickbooks-connected") {
          saveConnection(true, event.data.realmId); // Expect backend to send realmId
          if (popup) popup.close();
        } else if (event.data.type === "quickbooks-error") {
          setError(event.data.message);
          if (popup) popup.close();
        }
      };

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    } catch (err) {
      setError("Connection failed. Check console.");
      console.error("QB Connect error:", err);
    }
  };

  useEffect(() => {
    // Cleanup listener on unmount (returned from connectQuickBooks)
  }, []);

  const syncWithQuickBooks = async () => {
    if (!realmId) return setError("No company connected");
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/quickbooks/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ realmId }), // Pass realmId for backend
        }
      );
      if (!response.ok) throw new Error("Sync failed");
      // Optionally poll for progress via WebSocket
    } catch (err) {
      setError("Sync failed. Verify tokens.");
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = () => {
    localStorage.removeItem(`qb-connected-${companyId}`);
    setConnected(false);
    setRealmId(null);
    // Call backend to revoke tokens
    fetch(`${API_URL}/api/ledger/${companyId}/quickbooks/disconnect`, {
      method: "POST",
    });
  };

  return (
    <div className="quickbooks-connect">
      <div className="qb-header">
        <img src="/quickbooks-logo.svg" alt="QuickBooks" className="qb-logo" />
        <h3>QuickBooks Integration</h3>
      </div>

      {error && (
        <div className="error-banner">
          <FiAlertTriangle /> {error}{" "}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {!connected ? (
        <div className="qb-connect">
          <p>
            Connect QuickBooks to sync: Chart of Accounts, Customers/Vendors,
            Invoices/Bills, Bank Transactions.[web:11][web:14]
          </p>
          <button onClick={connectQuickBooks} className="btn-primary">
            Connect to QuickBooks
          </button>
        </div>
      ) : (
        <div className="qb-connected">
          <div className="status-badge success">
            <FiCheck /> Connected (Realm: {realmId?.slice(-8)})
          </div>
          <div className="button-group">
            <button
              onClick={syncWithQuickBooks}
              disabled={syncing}
              className="btn-secondary"
            >
              {syncing ? <FiRefreshCw className="spinning" /> : <FiRefreshCw />}{" "}
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
            <button onClick={disconnect} className="btn-outline">
              Disconnect
            </button>
          </div>
        </div>
      )}

      <div className="qb-features">
        <h4>Synced Data:</h4>
        <ul>
          <li>Chart of Accounts (GET /v3/company/{realmId}/account)</li>
          <li>Customers & Vendors (Customer/Vendor endpoints)</li>
          <li>Invoices & Bills (Invoice/Bill with LinkedTxn)</li>
          <li>Bank Transactions (JournalEntry/Deposit)</li>
          <li>Reports (query?query=SELECT * FROM Report)</li>
        </ul>
      </div>
    </div>
  );
}
