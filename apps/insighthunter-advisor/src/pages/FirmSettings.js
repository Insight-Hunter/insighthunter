import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api';
export function FirmSettings({ firmId, currentUserId }) {
    const [members, setMembers] = useState([]);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('staff');
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState(null);
    useEffect(() => {
        api.get(`/api/firms/${firmId}/members`)
            .then(r => setMembers(r.members))
            .catch(console.error);
    }, [firmId]);
    async function handleInvite(e) {
        e.preventDefault();
        if (!email.trim())
            return;
        setStatus('sending');
        setError(null);
        try {
            await api.post(`/api/firms/${firmId}/members/invite`, { email, role });
            setStatus('sent');
            setEmail('');
        }
        catch (err) {
            setError(err.message);
            setStatus('error');
        }
    }
    async function handleRemove(userId) {
        if (!confirm('Remove this team member?'))
            return;
        await api.del(`/api/firms/${firmId}/members/${userId}`).catch(console.error);
        setMembers(prev => prev.filter(m => m.user_id !== userId));
    }
    return (_jsxs("div", { className: "firm-settings", children: [_jsx("h1", { children: "Firm Settings" }), _jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: "Team Members" }), _jsx("ul", { role: "list", className: "members-list", children: members.map(m => (_jsxs("li", { className: "member-row", children: [_jsx("span", { className: "member-avatar", children: m.user_id.slice(0, 2).toUpperCase() }), _jsxs("div", { className: "member-info", children: [_jsx("span", { className: "member-id", children: m.user_id }), _jsx("span", { className: `role-badge role-${m.role}`, children: m.role })] }), m.user_id !== currentUserId && m.role !== 'owner' && (_jsx("button", { className: "btn btn-ghost btn-sm danger", onClick: () => handleRemove(m.user_id), "aria-label": `Remove ${m.user_id}`, children: "Remove" }))] }, m.id))) })] }), _jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: "Invite Staff" }), _jsxs("form", { onSubmit: handleInvite, className: "invite-form", children: [_jsxs("div", { className: "form-row", children: [_jsx("label", { htmlFor: "invite-email", children: "Email address" }), _jsx("input", { id: "invite-email", type: "email", value: email, onChange: e => setEmail(e.target.value), placeholder: "colleague@firm.com", required: true, autoComplete: "email" })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { htmlFor: "invite-role", children: "Role" }), _jsxs("select", { id: "invite-role", value: role, onChange: e => setRole(e.target.value), children: [_jsx("option", { value: "admin", children: "Admin" }), _jsx("option", { value: "staff", children: "Staff" }), _jsx("option", { value: "viewer", children: "Viewer" })] })] }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: status === 'sending', children: status === 'sending' ? 'Sending…' : 'Send Invite' }), status === 'sent' && _jsx("p", { className: "success-msg", children: "\u2713 Invite sent" }), error && _jsx("p", { className: "error-msg", children: error })] })] })] }));
}
