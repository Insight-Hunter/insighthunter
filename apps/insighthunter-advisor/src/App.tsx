import React, { useEffect, useState } from 'react';
import { AdvisorShell } from './components/AdvisorShell';
import { AdvisorOnboarding } from './pages/AdvisorOnboarding';
import { FirmSettings } from './pages/FirmSettings';
import { ClientOverviewCard } from './pages/ClientOverviewCard';
import { api } from './api';
import type { Firm } from './types';
import './styles/globals.css';

const DEMO_USER_ID = 'user_demo_001';

function getHash() { return window.location.hash.slice(1) || ''; }

export default function App() {
  const [firm, setFirm] = useState<Firm | null>(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState(getHash());

  useEffect(() => {
    const onHash = () => setRoute(getHash());
    window.addEventListener('hashchange', onHash);

    api.get<{ firms?: Firm[] }>('/api/firms')
      .then(r => { if (r.firms?.[0]) setFirm(r.firms[0]); })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" aria-label="Loading" />
      </div>
    );
  }

  if (!firm) {
    return (
      <AdvisorOnboarding
        userId={DEMO_USER_ID}
        onComplete={newFirm => setFirm(newFirm)}
      />
    );
  }

  function renderRoute() {
    if (!firm) return null;
    if (route === 'settings') return <FirmSettings firmId={firm.id} currentUserId={DEMO_USER_ID} />;

    const clientMatch = route.match(/^client\/([^/]+)$/);
    if (clientMatch) return <ClientOverviewCard firmId={firm.id} clientId={clientMatch[1]} />;

    return (
      <div className="dashboard-home">
        <h1>Welcome back to <strong>{firm.name}</strong></h1>
        <p className="text-muted">Select a client from the sidebar or manage your firm settings.</p>
        <div className="quick-links">
          <a href="#settings" className="quick-link-card">
            <span className="ql-icon">⚙️</span>
            <span>Firm Settings</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <AdvisorShell firm={firm}>
      {renderRoute()}
    </AdvisorShell>
  );
}
