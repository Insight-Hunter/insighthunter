import React from 'react';
import type { FirmClient } from '../types';

interface Props {
  clients: FirmClient[];
  activeClientId: string | null;
  onSelect: (id: string) => void;
}

export function ClientSwitcher({ clients, activeClientId, onSelect }: Props) {
  if (clients.length === 0) {
    return (
      <div className="client-switcher empty">
        <p className="empty-hint">No clients yet</p>
      </div>
    );
  }

  return (
    <nav className="client-switcher" aria-label="Client list">
      <p className="switcher-label">Clients</p>
      <ul role="list">
        {clients.map(c => {
          const isActive = c.id === activeClientId;
          return (
            <li key={c.id}>
              <button
                className={`client-item${isActive ? ' active' : ''}`}
                onClick={() => onSelect(c.id)}
                aria-pressed={isActive}
              >
                <span className="client-avatar">
                  {c.business_id.slice(0, 2).toUpperCase()}
                </span>
                <span className="client-info">
                  <span className="client-biz-id">{c.business_id}</span>
                  <span className={`client-status status-${c.status}`}>{c.status}</span>
                </span>
                {typeof c.open_alert_count === 'number' && c.open_alert_count > 0 && (
                  <span className="badge-count" aria-label={`${c.open_alert_count} open alerts`}>
                    {c.open_alert_count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
