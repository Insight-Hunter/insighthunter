import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { AdvisorShell } from './components/AdvisorShell';
import { AdvisorOnboarding } from './pages/AdvisorOnboarding';
import { FirmSettings } from './pages/FirmSettings';
import { ClientOverviewCard } from './pages/ClientOverviewCard';
import { api } from './api';
import './styles/globals.css';
const DEMO_USER_ID = 'user_demo_001';
function getHash() { return window.location.hash.slice(1) || ''; }
export default function App() {
    const [firm, setFirm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [route, setRoute] = useState(getHash());
    useEffect(() => {
        const onHash = () => setRoute(getHash());
        window.addEventListener('hashchange', onHash);
        api.get('/api/firms')
            .then(r => { if (r.firms?.[0])
            setFirm(r.firms[0]); })
            .catch(() => { })
            .finally(() => setLoading(false));
        return () => window.removeEventListener('hashchange', onHash);
    }, []);
    if (loading) {
        return (_jsx("div", { className: "app-loading", children: _jsx("div", { className: "spinner", "aria-label": "Loading" }) }));
    }
    if (!firm) {
        return (_jsx(AdvisorOnboarding, { userId: DEMO_USER_ID, onComplete: newFirm => setFirm(newFirm) }));
    }
    function renderRoute() {
        if (!firm)
            return null;
        if (route === 'settings')
            return _jsx(FirmSettings, { firmId: firm.id, currentUserId: DEMO_USER_ID });
        const clientMatch = route.match(/^client\/([^/]+)$/);
        if (clientMatch)
            return _jsx(ClientOverviewCard, { firmId: firm.id, clientId: clientMatch[1] });
        return (_jsxs("div", { className: "dashboard-home", children: [_jsxs("h1", { children: ["Welcome back to ", _jsx("strong", { children: firm.name })] }), _jsx("p", { className: "text-muted", children: "Select a client from the sidebar or manage your firm settings." }), _jsx("div", { className: "quick-links", children: _jsxs("a", { href: "#settings", className: "quick-link-card", children: [_jsx("span", { className: "ql-icon", children: "\u2699\uFE0F" }), _jsx("span", { children: "Firm Settings" })] }) })] }));
    }
    return (_jsx(AdvisorShell, { firm: firm, children: renderRoute() }));
}
