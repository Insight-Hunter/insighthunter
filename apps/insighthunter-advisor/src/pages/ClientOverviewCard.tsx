import React, { useEffect, useState, useRef } from "react";
import type { ClientOverview, AdvisorNote, BizFormaHealth, ComplianceHealth, PayrollHealth, OverallHealth } from "../types";
import { api } from "../api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const OVERALL_CONFIG: Record<OverallHealth, { label: string; cls: string; icon: string }> = {
  healthy: { label: "Healthy",  cls: "status-healthy",  icon: "✓" },
  warning: { label: "Warning",  cls: "status-warning",  icon: "!" },
  critical:{ label: "Critical", cls: "status-critical", icon: "✕" },
  unknown: { label: "Unknown",  cls: "status-unknown",  icon: "–" },
};

function fmtEpoch(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Sub-panels ────────────────────────────────────────────────────────────────

function BizFormaPanel({ h }: { h: BizFormaHealth }) {
  return (
    <div className="health-panel">
      <div className="hp-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        </svg>
        Formation
      </div>
      <dl className="hp-rows">
        <div className="hp-row"><dt>Status</dt>
          <dd><span className={`hp-badge formation-${h.formation_status}`}>{h.formation_status}</span></dd>
        </div>
        <div className="hp-row"><dt>Entity</dt>       <dd>{h.entity_type}</dd></div>
        <div className="hp-row"><dt>State</dt>        <dd>{h.state ?? "—"}</dd></div>
        <div className="hp-row"><dt>Reg. Agent</dt>   <dd>{h.registered_agent}</dd></div>
        <div className="hp-row"><dt>Annual Report</dt><dd>{fmtEpoch(h.annual_report_due)}</dd></div>
      </dl>
    </div>
  );
}

function CompliancePanel({ h }: { h: ComplianceHealth }) {
  return (
    <div className="health-panel">
      <div className="hp-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        Compliance
      </div>
      <dl className="hp-rows">
        <div className="hp-row"><dt>Health</dt>
          <dd><span className={`hp-badge compliance-${h.overall}`}>{h.overall}</span></dd>
        </div>
        <div className="hp-row"><dt>Open Tasks</dt>
          <dd className={h.open_tasks > 0 ? "hp-warn" : ""}>{h.open_tasks}</dd>
        </div>
        <div className="hp-row"><dt>Missing Docs</dt>
          <dd className={h.missing_docs > 0 ? "hp-warn" : ""}>{h.missing_docs}</dd>
        </div>
        <div className="hp-row"><dt>Next Deadline</dt><dd>{fmtEpoch(h.next_deadline)}</dd></div>
        <div className="hp-row"><dt>Deadline Type</dt>
          <dd>{h.next_deadline_type ? h.next_deadline_type.replace(/_/g, " ") : "—"}</dd>
        </div>
      </dl>
    </div>
  );
}

function PayrollPanel({ h }: { h: PayrollHealth }) {
  return (
    <div className="health-panel">
      <div className="hp-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
        </svg>
        Payroll
      </div>
      <dl className="hp-rows">
        <div className="hp-row"><dt>Status</dt>
          <dd><span className={`hp-badge payroll-${h.status}`}>{h.status.replace(/_/g," ")}</span></dd>
        </div>
        <div className="hp-row"><dt>Employees</dt>  <dd>{h.employee_count ?? "—"}</dd></div>
        <div className="hp-row"><dt>Next Payroll</dt><dd>{fmtEpoch(h.next_payroll)}</dd></div>
        <div className="hp-row"><dt>Last Payroll</dt><dd>{fmtEpoch(h.last_payroll)}</dd></div>
        <div className="hp-row"><dt>Setup</dt>
          <dd>{h.setup_complete
            ? <span className="hp-badge payroll-active">Complete</span>
            : <span className="hp-badge payroll-pending_setup">Incomplete</span>}
          </dd>
        </div>
      </dl>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { firmId: string; clientId: string; currentUserId: string; }

export function ClientOverviewCard({ firmId, clientId, currentUserId }: Props) {
  const [data, setData]           = useState<ClientOverview | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [noteBody, setNoteBody]   = useState("");
  const [notePin, setNotePin]     = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    api.get<ClientOverview>(`/api/firms/${firmId}/clients/${clientId}/overview`)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [firmId, clientId]);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteBody.trim() || !data) return;
    setNoteSaving(true);
    try {
      const note = await api.post<AdvisorNote>(
        `/api/firms/${firmId}/clients/${clientId}/notes`,
        { body: noteBody.trim(), pinned: notePin },
      );
      setData(prev => prev ? {
        ...prev,
        notes: notePin ? [note, ...prev.notes] : [...prev.notes, note],
      } : prev);
      setNoteBody(""); setNotePin(false);
    } catch (err) { console.error(err); }
    finally { setNoteSaving(false); }
  }

  async function handleDeleteNote(noteId: string) {
    await api.del(`/api/firms/${firmId}/clients/${clientId}/notes/${noteId}`).catch(console.error);
    setData(prev => prev ? { ...prev, notes: prev.notes.filter(n => n.id !== noteId) } : prev);
  }

  async function handleTogglePin(note: AdvisorNote) {
    await api.patch(`/api/firms/${firmId}/clients/${clientId}/notes/${note.id}`, { pinned: !note.pinned })
      .catch(console.error);
    setData(prev => prev ? {
      ...prev,
      notes: prev.notes
        .map(n => n.id === note.id ? { ...n, pinned: note.pinned ? 0 : 1 } : n)
        .sort((a, b) => (b.pinned || 0) - (a.pinned || 0)),
    } : prev);
  }

  if (loading) return (
    <div className="overview-loading" aria-busy="true" aria-label="Loading client overview">
      <div className="skeleton" style={{ height: "72px", borderRadius: "12px" }}/>
      <div className="health-panels-skeleton">
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: "180px", borderRadius: "10px" }}/>)}
      </div>
    </div>
  );
  if (error)  return <div className="error-state" role="alert">⚠ {error}</div>;
  if (!data)  return null;

  const { client, health, alerts, notes } = data;
  const overall = OVERALL_CONFIG[health.overall] ?? OVERALL_CONFIG.unknown;

  return (
    <div className="client-overview-card">

      {/* Header row */}
      <div className="overview-header">
        <div>
          <h1 className="overview-title">{client.business_id}</h1>
          <p className="overview-subtitle">Client Overview</p>
        </div>
        <div className="overview-header-right">
          <span className={`overall-badge ${overall.cls}`} aria-label={`Overall health: ${overall.label}`}>
            <span className="overall-icon" aria-hidden="true">{overall.icon}</span>
            {overall.label}
          </span>
          <span className={`status-pill status-${client.status}`}>{client.status}</span>
        </div>
      </div>

      {/* Health panels — BizForma / Compliance / Payroll */}
      <div className="health-panels" aria-label="Health breakdown">
        <BizFormaPanel  h={health.bizforma}    />
        <CompliancePanel h={health.compliance} />
        <PayrollPanel    h={health.payroll}    />
      </div>

      {/* Alert count strip */}
      {health.ai_alert_count > 0 && (
        <div className="alert-strip">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>{health.ai_alert_count} unresolved alert{health.ai_alert_count !== 1 ? "s" : ""}</span>
          {health.stitched_at && (
            <span className="stitched-at">
              Updated {new Date(health.stitched_at * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
        </div>
      )}

      {/* Active alerts */}
      {alerts.length > 0 && (
        <section className="overview-section">
          <h2 className="section-heading">Active Alerts</h2>
          <ul role="list" className="mini-alert-list">
            {alerts.slice(0, 6).map(a => (
              <li key={a.id} className={`mini-alert severity-${a.severity}`}>
                <span className={`severity-pip severity-pip--${a.severity}`} aria-hidden="true"/>
                <span className="mini-alert-type">{a.alert_type.replace(/_/g, " ")}</span>
                <span className="mini-alert-title">{a.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Advisor notes */}
      <section className="overview-section">
        <h2 className="section-heading">Advisor Notes</h2>

        {notes.length > 0 ? (
          <ul role="list" className="notes-list">
            {notes.map(n => (
              <li key={n.id} className={`note-item${n.pinned ? " pinned" : ""}`}>
                <p className="note-body">{n.body}</p>
                {n.author_user_id === currentUserId && (
                  <div className="note-actions">
                    <button className="note-action-btn" onClick={() => handleTogglePin(n)}
                      aria-label={n.pinned ? "Unpin note" : "Pin note"} title={n.pinned ? "Unpin" : "Pin"}>
                      {n.pinned ? "📌" : "📍"}
                    </button>
                    <button className="note-action-btn danger" onClick={() => handleDeleteNote(n.id)}
                      aria-label="Delete note" title="Delete">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-notes">No notes yet. Add one below.</p>
        )}

        <form onSubmit={handleAddNote} className="add-note-form">
          <label htmlFor="note-textarea" className="sr-only">New advisor note</label>
          <textarea
            id="note-textarea"
            ref={noteRef}
            className="note-textarea"
            placeholder="Add an internal advisor note…"
            value={noteBody}
            onChange={e => setNoteBody(e.target.value)}
            rows={3}
          />
          <div className="note-form-controls">
            <label className="pin-label">
              <input type="checkbox" checked={notePin} onChange={e => setNotePin(e.target.checked)}/>
              Pin to top
            </label>
            <button type="submit" className="btn btn-primary btn-sm" disabled={noteSaving || !noteBody.trim()}>
              {noteSaving ? "Saving…" : "Add Note"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
