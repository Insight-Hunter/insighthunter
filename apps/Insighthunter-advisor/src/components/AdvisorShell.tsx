import React, { useEffect, useState } from "react";
import { ClientSwitcher } from "./ClientSwitcher";
import { GlobalAlertFeed } from "./GlobalAlertFeed";
import type { Firm, FirmClient, AdvisorAlert } from "../types";
import { api } from "../api";

interface Props {
  firm: Firm;
  currentUserId: string;
  navigate: (path: string) => void;
  children?: React.ReactNode;
}

function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    document.documentElement.getAttribute("data-theme") === "dark" ||
    (!document.documentElement.getAttribute("data-theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  }
  return (
    <button className="theme-toggle" onClick={toggle} aria-label={`Switch to ${dark ? "light" : "dark"} mode`}>
      {dark
        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      }
    </button>
  );
}

export function AdvisorShell({ firm, currentUserId, navigate, children }: Props) {
  const [clients, setClients]       = useState<FirmClient[]>([]);
  const [alerts, setAlerts]         = useState<AdvisorAlert[]>([]);
  const [alertOpen, setAlertOpen]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeClientId = (() => {
    const m = window.location.hash.replace(/^#\/?/, "").match(/^client\/([^/]+)$/);
    return m ? m[1] : null;
  })();

  useEffect(() => {
    api.get<{ clients: FirmClient[] }>(`/api/firms/${firm.id}/clients`)
      .then(r => setClients(r.clients)).catch(console.error);
    api.get<{ alerts: AdvisorAlert[] }>(`/api/firms/${firm.id}/alerts`)
      .then(r => setAlerts(r.alerts)).catch(console.error);
  }, [firm.id]);

  const unresolvedCount = alerts.length;

  function handleSelectClient(id: string) {
    navigate(`client/${id}`);
    setMobileOpen(false);
  }

  function handleResolve(alertId: string) {
    api.patch(`/api/firms/${firm.id}/alerts/${alertId}/resolve`)
      .then(() => setAlerts(prev => prev.filter(a => a.id !== alertId)))
      .catch(console.error);
  }

  const sidebar = (
    <aside className="sidebar" aria-label="Firm navigation">
      <div className="sidebar-header">
        <div className="logo">
          <svg aria-label="InsightHunter" viewBox="0 0 32 32" fill="none" width="26" height="26">
            <rect width="32" height="32" rx="8" fill="var(--color-primary)"/>
            <path d="M9 23L16 9l7 14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11.5 18h9" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="logo-text">InsightHunter</span>
        </div>
        <div className="sidebar-header-controls">
          <ThemeToggle />
          <button className="mobile-close-btn" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="sidebar-firm">
        <span className="sidebar-firm-name">{firm.name}</span>
        <span className={`firm-badge plan-${firm.plan}`}>{firm.plan}</span>
      </div>

      <ClientSwitcher
        clients={clients}
        activeClientId={activeClientId}
        onSelect={handleSelectClient}
      />

      <div className="sidebar-footer">
        <button
          className={`alert-feed-toggle${unresolvedCount > 0 ? " has-alerts" : ""}`}
          onClick={() => { setAlertOpen(true); setMobileOpen(false); }}
          aria-label={`Open alert feed — ${unresolvedCount} unresolved`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>Alerts</span>
          {unresolvedCount > 0 && (
            <span className="badge-count" aria-label={`${unresolvedCount} unresolved`}>{unresolvedCount}</span>
          )}
        </button>

        <button
          className="sidebar-settings-btn"
          onClick={() => { navigate("settings"); setMobileOpen(false); }}
          aria-label="Firm settings"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span>Firm Settings</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="advisor-shell">
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
        <div className="mobile-logo">
          <svg viewBox="0 0 32 32" fill="none" width="22" height="22" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="var(--color-primary)"/>
            <path d="M9 23L16 9l7 14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11.5 18h9" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>{firm.name}</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Desktop sidebar — always visible */}
      <div className="sidebar-desktop">{sidebar}</div>

      {/* Mobile sidebar — overlay drawer */}
      {mobileOpen && (
        <>
          <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="sidebar-mobile">{sidebar}</div>
        </>
      )}

      <main className="shell-main" id="main-content">
        {alertOpen && (
          <GlobalAlertFeed
            firmId={firm.id}
            alerts={alerts}
            onClose={() => setAlertOpen(false)}
            onResolve={handleResolve}
          />
        )}
        {children}
      </main>
    </div>
  );
}
