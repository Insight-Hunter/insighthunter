import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ClientSwitcher({ clients, activeClientId, onSelect }) {
    if (clients.length === 0) {
        return (_jsx("div", { className: "client-switcher empty", children: _jsx("p", { className: "empty-hint", children: "No clients yet" }) }));
    }
    return (_jsxs("nav", { className: "client-switcher", "aria-label": "Client list", children: [_jsx("p", { className: "switcher-label", children: "Clients" }), _jsx("ul", { role: "list", children: clients.map(c => {
                    const isActive = c.id === activeClientId;
                    return (_jsx("li", { children: _jsxs("button", { className: `client-item${isActive ? ' active' : ''}`, onClick: () => onSelect(c.id), "aria-pressed": isActive, children: [_jsx("span", { className: "client-avatar", children: c.business_id.slice(0, 2).toUpperCase() }), _jsxs("span", { className: "client-info", children: [_jsx("span", { className: "client-biz-id", children: c.business_id }), _jsx("span", { className: `client-status status-${c.status}`, children: c.status })] }), typeof c.open_alert_count === 'number' && c.open_alert_count > 0 && (_jsx("span", { className: "badge-count", "aria-label": `${c.open_alert_count} open alerts`, children: c.open_alert_count }))] }) }, c.id));
                }) })] }));
}
