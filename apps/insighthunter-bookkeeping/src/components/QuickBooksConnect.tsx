// src/components/QuickBooksConnect.tsx
import { useState } from 'react';
import { FiCheck, FiRefreshCw } from 'react-icons/fi';
import './QuickBooksConnect.css';

interface QuickBooksConnectProps {
  companyId: string;
}

export default function QuickBooksConnect({ companyId }: QuickBooksConnectProps) {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const API_URL = 'http://localhost:8787';

  async function connectQuickBooks() {
    try {
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/quickbooks/auth`
      );
      const data = await response.json();

      // Open QuickBooks OAuth in new window
      window.open(data.authUrl, 'QuickBooks OAuth', 'width=800,height=600');

      // Listen for OAuth completion
      window.addEventListener('message', (event) => {
        if (event.data.type === 'quickbooks-connected') {
          setConnected(true);
        }
      });
    } catch (error) {
      console.error('Failed to connect QuickBooks:', error);
    }
  }

  async function syncWithQuickBooks() {
    setSyncing(true);
    
    try {
      await fetch(`${API_URL}/api/ledger/${companyId}/quickbooks/sync`, {
        method: 'POST',
      });
      
      alert('Sync completed successfully!');
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="quickbooks-connect">
      <div className="qb-header">
        <img src="/quickbooks-logo.svg" alt="QuickBooks" className="qb-logo" />
        <h3>QuickBooks Integration</h3>
      </div>

      {!connected ? (
        <div className="qb-connect">
          <p>Connect your QuickBooks account to sync data automatically</p>
          <button onClick={connectQuickBooks} className="btn-primary">
            Connect to QuickBooks
          </button>
        </div>
      ) : (
        <div className="qb-connected">
          <div className="status-badge">
            <FiCheck /> Connected
          </div>
          <button
            onClick={syncWithQuickBooks}
            disabled={syncing}
            className="btn-secondary"
          >
            {syncing ? (
              <>
                <FiRefreshCw className="spinning" /> Syncing...
              </>
            ) : (
              <>
                <FiRefreshCw /> Sync Now
              </>
            )}
          </button>
        </div>
      )}

      <div className="qb-features">
        <h4>What gets synced:</h4>
        <ul>
          <li>Chart of Accounts</li>
          <li>Customers & Vendors</li>
          <li>Invoices & Bills</li>
          <li>Bank Transactions</li>
          <li>Financial Reports</li>
        </ul>
      </div>
    </div>
  );
}
// src/components/QuickBooksConnect.tsx
import { useState } from 'react';
import { FiCheck, FiRefreshCw } from 'react-icons/fi';
import './QuickBooksConnect.css';

interface QuickBooksConnectProps {
  companyId: string;
}

export default function QuickBooksConnect({ companyId }: QuickBooksConnectProps) {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const API_URL = 'http://localhost:8787';

  async function connectQuickBooks() {
    try {
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/quickbooks/auth`
      );
      const data = await response.json();

      // Open QuickBooks OAuth in new window
      window.open(data.authUrl, 'QuickBooks OAuth', 'width=800,height=600');

      // Listen for OAuth completion
      window.addEventListener('message', (event) => {
        if (event.data.type === 'quickbooks-connected') {
          setConnected(true);
        }
      });
    } catch (error) {
      console.error('Failed to connect QuickBooks:', error);
    }
  }

  async function syncWithQuickBooks() {
    setSyncing(true);
    
    try {
      await fetch(`${API_URL}/api/ledger/${companyId}/quickbooks/sync`, {
        method: 'POST',
      });
      
      alert('Sync completed successfully!');
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="quickbooks-connect">
      <div className="qb-header">
        <img src="/quickbooks-logo.svg" alt="QuickBooks" className="qb-logo" />
        <h3>QuickBooks Integration</h3>
      </div>

      {!connected ? (
        <div className="qb-connect">
          <p>Connect your QuickBooks account to sync data automatically</p>
          <button onClick={connectQuickBooks} className="btn-primary">
            Connect to QuickBooks
          </button>
        </div>
      ) : (
        <div className="qb-connected">
          <div className="status-badge">
            <FiCheck /> Connected
          </div>
          <button
            onClick={syncWithQuickBooks}
            disabled={syncing}
            className="btn-secondary"
          >
            {syncing ? (
              <>
                <FiRefreshCw className="spinning" /> Syncing...
              </>
            ) : (
              <>
                <FiRefreshCw /> Sync Now
              </>
            )}
          </button>
        </div>
      )}

      <div className="qb-features">
        <h4>What gets synced:</h4>
        <ul>
          <li>Chart of Accounts</li>
          <li>Customers & Vendors</li>
          <li>Invoices & Bills</li>
          <li>Bank Transactions</li>
          <li>Financial Reports</li>
        </ul>
      </div>
    </div>
  );
}
