import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useRef } from "react";
import { api } from "../api";
// ── Helpers ───────────────────────────────────────────────────────────────────
const OVERALL_CONFIG = {
    healthy: { label: "Healthy", cls: "status-healthy", icon: "✓" },
    warning: { label: "Warning", cls: "status-warning", icon: "!" },
    critical: { label: "Critical", cls: "status-critical", icon: "✕" },
    unknown: { label: "Unknown", cls: "status-unknown", icon: "–" },
};
function fmtEpoch(ts) {
    if (ts == null)
        return "—";
    return new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
// ── Sub-panels ────────────────────────────────────────────────────────────────
function BizFormaPanel({ h }) {
    return (_jsxs("div", { className: "health-panel", children: [_jsxs("div", { className: "hp-title", children: [_jsxs("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true", children: [_jsx("rect", { x: "2", y: "7", width: "20", height: "14", rx: "2" }), _jsx("path", { d: "M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" })] }), "Formation"] }), _jsxs("dl", { className: "hp-rows", children: [_jsxs("div", { className: "hp-row", children: [_jsx("dt", { children: "Status" }), _jsx("dd", { children: _jsx("span", { className: `hp-badge formation-${h.formation_status}`, children: h.formation_status }) })] }), _jsxs("div", { className: "hp-row", children: [_jsx("dt", { children: "Entity" }), "       ", _jsx("dd", { children: h.entity_type })] }), _jsxs("div", { className: "hp-row", children: [_jsx("dt", { children: "State" }), "        ", _jsx("dd", { children: h.state ?? "—" })] }), _jsxs("div", { className: "hp-row", children: [_jsx("dt", { children: "Reg. Agent" }), "   ", _jsx("dd", { children: h.registered_agent })] }), _jsxs("div", { className: "hp-row", children: [_jsx("dt", { children: "Annual Report" }), _jsx("dd", { children: fmtEpoch(h.annual_report_due) })] })] })] }));
}
function CompliancePanel({ h }) {
    return (_jsxs("div", { className: "health-panel", children: [_jsxs("div", { className: "hp-title", children: [_jsxs("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true", children: [_jsx("path", { d: "M9 11l3 3L22 4" }), _jsx("path", { d: "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" })] }), "Compliance"] }), _jsxs("dl", { className: "hp-rows", children: [_jsxs("div", { className: "hp-row", children: [_jsx("dt", { children: "Health" }), _jsx("dd", { children: _jsx("span", { className: `hp-badge compliance-${h.overall}`, children: h.overall }) })] }), _jsxs("div", { className: "hp-row", children: [_jsx("dt", { children: "Open Tasks" }), _jsx("dd", { className: h.open_tasks > 0 ? "hp-warn" : "", children: h.open_tasks })] }), _jsxs("div", { className: "hp-row", children: [_jsx("dt", { children: "Missing Docs" }), _jsx("dd", { className: h.missing_docs > 0 ? "hp-warn" : "", children: h.missing_docs })] }), _jsxs("div", { className: "hp-row", children: [_jsx("dt", { children: "Next Deadline" }), _jsx("dd", { children: fmtEpoch(h.next_deadline) })] }), _jsxs("div", { className: "hp-row", children: [_jsx("dt", { children: "Deadline Type" }), _jsx("dd", { children: h.next_deadline_type ? h.next_deadline_type.replace(/_/g, " ") : "—" })] })] })] }));
}
function PayrollPanel({ h }) {
    return (_jsxs("div", { className: "health-panel", children: [_jsxs("div", { className: "hp-title", children: [_jsxs("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true", children: [_jsx("rect", { x: "2", y: "5", width: "20", height: "14", rx: "2" }), _jsx("line", { x1: "2", y1: "10", x2: "22", y2: "10" })] }), "Payroll"] }), _jsxs("dl", { className: "hp-rows", children: [_jsxs("div", { className: "hp-row", children: [_jsx("dt", { children: "Status" }), _jsx("dd", { children: _jsx("span", { className: `hp-badge payroll-${h.status}`, children: h.status.replace(/_/g, " ") }) })] }), _jsxs("div", { className: "hp-row", children: [_jsx("dt", { children: "Employees" }), "  ", _jsx("dd", { children: h.employee_count ?? "—" })] }), _jsxs("div", { className: "hp-row", children: [_jsx("dt", { children: "Next Payroll" }), _jsx("dd", { children: fmtEpoch(h.next_payroll) })] }), _jsxs("div", { className: "hp-row", children: [_jsx("dt", { children: "Last Payroll" }), _jsx("dd", { children: fmtEpoch(h.last_payroll) })] }), _jsxs("div", { className: "hp-row", children: [_jsx("dt", { children: "Setup" }), _jsx("dd", { children: h.setup_complete
                                    ? _jsx("span", { className: "hp-badge payroll-active", children: "Complete" })
                                    : _jsx("span", { className: "hp-badge payroll-pending_setup", children: "Incomplete" }) })] })] })] }));
}
export function ClientOverviewCard({ firmId, clientId, currentUserId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [noteBody, setNoteBody] = useState("");
    const [notePin, setNotePin] = useState(false);
    const [noteSaving, setNoteSaving] = useState(false);
    const noteRef = useRef(null);
    useEffect(() => {
        setLoading(true);
        setError(null);
        api.get(`/api/firms/${firmId}/clients/${clientId}/overview`)
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, [firmId, clientId]);
    async function handleAddNote(e) {
        e.preventDefault();
        if (!noteBody.trim() || !data)
            return;
        setNoteSaving(true);
        try {
            const note = await api.post(`/api/firms/${firmId}/clients/${clientId}/notes`, { body: noteBody.trim(), pinned: notePin });
            setData(prev => prev ? {
                ...prev,
                notes: notePin ? [note, ...prev.notes] : [...prev.notes, note],
            } : prev);
            setNoteBody("");
            setNotePin(false);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setNoteSaving(false);
        }
    }
    async function handleDeleteNote(noteId) {
        await api.del(`/api/firms/${firmId}/clients/${clientId}/notes/${noteId}`).catch(console.error);
        setData(prev => prev ? { ...prev, notes: prev.notes.filter(n => n.id !== noteId) } : prev);
    }
    async function handleTogglePin(note) {
        await api.patch(`/api/firms/${firmId}/clients/${clientId}/notes/${note.id}`, { pinned: !note.pinned })
            .catch(console.error);
        setData(prev => prev ? {
            ...prev,
            notes: prev.notes
                .map(n => n.id === note.id ? { ...n, pinned: note.pinned ? 0 : 1 } : n)
                .sort((a, b) => (b.pinned || 0) - (a.pinned || 0)),
        } : prev);
    }
    if (loading)
        return (_jsxs("div", { className: "overview-loading", "aria-busy": "true", "aria-label": "Loading client overview", children: [_jsx("div", { className: "skeleton", style: { height: "72px", borderRadius: "12px" } }), _jsx("div", { className: "health-panels-skeleton", children: [1, 2, 3].map(i => _jsx("div", { className: "skeleton", style: { height: "180px", borderRadius: "10px" } }, i)) })] }));
    if (error)
        return _jsxs("div", { className: "error-state", role: "alert", children: ["\u26A0 ", error] });
    if (!data)
        return null;
    const { client, health, alerts, notes } = data;
    const overall = OVERALL_CONFIG[health.overall] ?? OVERALL_CONFIG.unknown;
    return (_jsxs("div", { className: "client-overview-card", children: [_jsxs("div", { className: "overview-header", children: [_jsxs("div", { children: [_jsx("h1", { className: "overview-title", children: client.business_id }), _jsx("p", { className: "overview-subtitle", children: "Client Overview" })] }), _jsxs("div", { className: "overview-header-right", children: [_jsxs("span", { className: `overall-badge ${overall.cls}`, "aria-label": `Overall health: ${overall.label}`, children: [_jsx("span", { className: "overall-icon", "aria-hidden": "true", children: overall.icon }), overall.label] }), _jsx("span", { className: `status-pill status-${client.status}`, children: client.status })] })] }), _jsxs("div", { className: "health-panels", "aria-label": "Health breakdown", children: [_jsx(BizFormaPanel, { h: health.bizforma }), _jsx(CompliancePanel, { h: health.compliance }), _jsx(PayrollPanel, { h: health.payroll })] }), health.ai_alert_count > 0 && (_jsxs("div", { className: "alert-strip", children: [_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true", children: [_jsx("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }), _jsx("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })] }), _jsxs("span", { children: [health.ai_alert_count, " unresolved alert", health.ai_alert_count !== 1 ? "s" : ""] }), health.stitched_at && (_jsxs("span", { className: "stitched-at", children: ["Updated ", new Date(health.stitched_at * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })] }))] })), alerts.length > 0 && (_jsxs("section", { className: "overview-section", children: [_jsx("h2", { className: "section-heading", children: "Active Alerts" }), _jsx("ul", { role: "list", className: "mini-alert-list", children: alerts.slice(0, 6).map(a => (_jsxs("li", { className: `mini-alert severity-${a.severity}`, children: [_jsx("span", { className: `severity-pip severity-pip--${a.severity}`, "aria-hidden": "true" }), _jsx("span", { className: "mini-alert-type", children: a.alert_type.replace(/_/g, " ") }), _jsx("span", { className: "mini-alert-title", children: a.title })] }, a.id))) })] })), _jsxs("section", { className: "overview-section", children: [_jsx("h2", { className: "section-heading", children: "Advisor Notes" }), notes.length > 0 ? (_jsx("ul", { role: "list", className: "notes-list", children: notes.map(n => (_jsxs("li", { className: `note-item${n.pinned ? " pinned" : ""}`, children: [_jsx("p", { className: "note-body", children: n.body }), n.author_user_id === currentUserId && (_jsxs("div", { className: "note-actions", children: [_jsx("button", { className: "note-action-btn", onClick: () => handleTogglePin(n), "aria-label": n.pinned ? "Unpin note" : "Pin note", title: n.pinned ? "Unpin" : "Pin", children: n.pinned ? "📌" : "📍" }), _jsx("button", { className: "note-action-btn danger", onClick: () => handleDeleteNote(n.id), "aria-label": "Delete note", title: "Delete", children: _jsxs("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("polyline", { points: "3 6 5 6 21 6" }), _jsx("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" })] }) })] }))] }, n.id))) })) : (_jsx("p", { className: "empty-notes", children: "No notes yet. Add one below." })), _jsxs("form", { onSubmit: handleAddNote, className: "add-note-form", children: [_jsx("label", { htmlFor: "note-textarea", className: "sr-only", children: "New advisor note" }), _jsx("textarea", { id: "note-textarea", ref: noteRef, className: "note-textarea", placeholder: "Add an internal advisor note\u2026", value: noteBody, onChange: e => setNoteBody(e.target.value), rows: 3 }), _jsxs("div", { className: "note-form-controls", children: [_jsxs("label", { className: "pin-label", children: [_jsx("input", { type: "checkbox", checked: notePin, onChange: e => setNotePin(e.target.checked) }), "Pin to top"] }), _jsx("button", { type: "submit", className: "btn btn-primary btn-sm", disabled: noteSaving || !noteBody.trim(), children: noteSaving ? "Saving…" : "Add Note" })] })] })] })] }));
}
