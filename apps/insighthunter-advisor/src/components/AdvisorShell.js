import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { ClientSwitcher } from "./ClientSwitcher";
import { GlobalAlertFeed } from "./GlobalAlertFeed";
import { api } from "../api";
function ThemeToggle() {
    const [dark, setDark] = useState(() => document.documentElement.getAttribute("data-theme") === "dark" ||
        (!document.documentElement.getAttribute("data-theme") &&
            window.matchMedia("(prefers-color-scheme: dark)").matches));
    function toggle() {
        const next = !dark;
        setDark(next);
        document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    }
    return (_jsx("button", { className: "theme-toggle", onClick: toggle, "aria-label": `Switch to ${dark ? "light" : "dark"} mode`, children: dark
            ? _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "5" }), _jsx("path", { d: "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" })] })
            : _jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" }) }) }));
}
export function AdvisorShell({ firm, navigate, children }) {
    const [clients, setClients] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [alertOpen, setAlertOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const activeClientId = (() => {
        const m = window.location.hash.replace(/^#\/?/, "").match(/^client\/([^/]+)$/);
        return m ? m[1] : null;
    })();
    useEffect(() => {
        api.get(`/api/firms/${firm.id}/clients`)
            .then(r => setClients(r.clients)).catch(console.error);
        api.get(`/api/firms/${firm.id}/alerts`)
            .then(r => setAlerts(r.alerts)).catch(console.error);
    }, [firm.id]);
    const unresolvedCount = alerts.length;
    function handleSelectClient(id) {
        navigate(`client/${id}`);
        setMobileOpen(false);
    }
    function handleResolve(alertId) {
        api.patch(`/api/firms/${firm.id}/alerts/${alertId}/resolve`)
            .then(() => setAlerts(prev => prev.filter(a => a.id !== alertId)))
            .catch(console.error);
    }
    const sidebar = (_jsxs("aside", { className: "sidebar", "aria-label": "Firm navigation", children: [_jsxs("div", { className: "sidebar-header", children: [_jsxs("div", { className: "logo", children: [_jsxs("svg", { "aria-label": "InsightHunter", viewBox: "0 0 32 32", fill: "none", width: "26", height: "26", children: [_jsx("rect", { width: "32", height: "32", rx: "8", fill: "var(--color-primary)" }), _jsx("path", { d: "M9 23L16 9l7 14", stroke: "#fff", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M11.5 18h9", stroke: "#fff", strokeWidth: "2", strokeLinecap: "round" })] }), _jsx("span", { className: "logo-text", children: "InsightHunter" })] }), _jsxs("div", { className: "sidebar-header-controls", children: [_jsx(ThemeToggle, {}), _jsx("button", { className: "mobile-close-btn", onClick: () => setMobileOpen(false), "aria-label": "Close menu", children: _jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M18 6 6 18M6 6l12 12" }) }) })] })] }), _jsxs("div", { className: "sidebar-firm", children: [_jsx("span", { className: "sidebar-firm-name", children: firm.name }), _jsx("span", { className: `firm-badge plan-${firm.plan}`, children: firm.plan })] }), _jsx(ClientSwitcher, { clients: clients, activeClientId: activeClientId, onSelect: handleSelectClient }), _jsxs("div", { className: "sidebar-footer", children: [_jsxs("button", { className: `alert-feed-toggle${unresolvedCount > 0 ? " has-alerts" : ""}`, onClick: () => { setAlertOpen(true); setMobileOpen(false); }, "aria-label": `Open alert feed — ${unresolvedCount} unresolved`, children: [_jsxs("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }), _jsx("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })] }), _jsx("span", { children: "Alerts" }), unresolvedCount > 0 && (_jsx("span", { className: "badge-count", "aria-label": `${unresolvedCount} unresolved`, children: unresolvedCount }))] }), _jsxs("button", { className: "sidebar-settings-btn", onClick: () => { navigate("settings"); setMobileOpen(false); }, "aria-label": "Firm settings", children: [_jsxs("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" }), _jsx("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" })] }), _jsx("span", { children: "Firm Settings" })] })] })] }));
    return (_jsxs("div", { className: "advisor-shell", children: [_jsxs("div", { className: "mobile-topbar", children: [_jsx("button", { className: "hamburger", onClick: () => setMobileOpen(true), "aria-label": "Open menu", children: _jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M3 12h18M3 6h18M3 18h18" }) }) }), _jsxs("div", { className: "mobile-logo", children: [_jsxs("svg", { viewBox: "0 0 32 32", fill: "none", width: "22", height: "22", "aria-hidden": "true", children: [_jsx("rect", { width: "32", height: "32", rx: "8", fill: "var(--color-primary)" }), _jsx("path", { d: "M9 23L16 9l7 14", stroke: "#fff", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M11.5 18h9", stroke: "#fff", strokeWidth: "2", strokeLinecap: "round" })] }), _jsx("span", { children: firm.name })] }), _jsx(ThemeToggle, {})] }), _jsx("div", { className: "sidebar-desktop", children: sidebar }), mobileOpen && (_jsxs(_Fragment, { children: [_jsx("div", { className: "sidebar-backdrop", onClick: () => setMobileOpen(false), "aria-hidden": "true" }), _jsx("div", { className: "sidebar-mobile", children: sidebar })] })), _jsxs("main", { className: "shell-main", id: "main-content", children: [alertOpen && (_jsx(GlobalAlertFeed, { firmId: firm.id, alerts: alerts, onClose: () => setAlertOpen(false), onResolve: handleResolve })), children] })] }));
}
