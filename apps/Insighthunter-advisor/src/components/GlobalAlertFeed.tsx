import React from 'react';
import type { AdvisorAlert } from '../types';

const SEVERITY_ICON: Record<string, string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🔵',
};

interface Props {
  firmId: string;
  alerts: AdvisorAlert[];
  onClose: () => void;
  onResolve: (alertId: string) => void;
}

export function GlobalAlertFeed({ alerts, onClose, onResolve }: Props) {
  return (
    <div className="alert-feed-overlay" role="dialog" aria-label="Alert Feed">
      <div className="alert-feed-panel">
        <div className="alert-feed-header">
          <h2>Alert Feed</h2>
          <button onClick={onClose} aria-label="Close alert feed" className="close-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">✅</span>
            <p>All clear — no unresolved alerts.</p>
          </div>
        ) : (
          <ul role="list" className="alert-list">
            {alerts.map(alert => (
              <li key={alert.id} className={`alert-item severity-${alert.severity}`}>
                <span className="alert-severity-icon" aria-hidden="true">
                  {SEVERITY_ICON[alert.severity] ?? '⚪'}
                </span>
                <div className="alert-content">
                  <p className="alert-title">{alert.title}</p>
                  {alert.body && <p className="alert-body">{alert.body}</p>}
                  <p className="alert-meta">
                    {alert.alert_type}{alert.business_id ? ` · ${alert.business_id}` : ''}
                  </p>
                </div>
                <button
                  className="resolve-btn"
                  onClick={() => onResolve(alert.id)}
                  aria-label={`Resolve: ${alert.title}`}
                >
                  Resolve
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
