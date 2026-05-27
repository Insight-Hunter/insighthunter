import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const SEVERITY_ICON = {
    critical: '🔴',
    warning: '🟡',
    info: '🔵',
};
export function GlobalAlertFeed({ alerts, onClose, onResolve }) {
    return (_jsx("div", { className: "alert-feed-overlay", role: "dialog", "aria-label": "Alert Feed", children: _jsxs("div", { className: "alert-feed-panel", children: [_jsxs("div", { className: "alert-feed-header", children: [_jsx("h2", { children: "Alert Feed" }), _jsx("button", { onClick: onClose, "aria-label": "Close alert feed", className: "close-btn", children: _jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M18 6 6 18M6 6l12 12" }) }) })] }), alerts.length === 0 ? (_jsxs("div", { className: "empty-state", children: [_jsx("span", { className: "empty-icon", children: "\u2705" }), _jsx("p", { children: "All clear \u2014 no unresolved alerts." })] })) : (_jsx("ul", { role: "list", className: "alert-list", children: alerts.map(alert => (_jsxs("li", { className: `alert-item severity-${alert.severity}`, children: [_jsx("span", { className: "alert-severity-icon", "aria-hidden": "true", children: SEVERITY_ICON[alert.severity] ?? '⚪' }), _jsxs("div", { className: "alert-content", children: [_jsx("p", { className: "alert-title", children: alert.title }), alert.body && _jsx("p", { className: "alert-body", children: alert.body }), _jsxs("p", { className: "alert-meta", children: [alert.alert_type, alert.business_id ? ` · ${alert.business_id}` : ''] })] }), _jsx("button", { className: "resolve-btn", onClick: () => onResolve(alert.id), "aria-label": `Resolve: ${alert.title}`, children: "Resolve" })] }, alert.id))) }))] }) }));
}
