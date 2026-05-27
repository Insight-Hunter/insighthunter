import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api } from '../api';
const STEPS = [
    { id: 'firm_name', title: 'Name your firm', description: 'This is how clients will see your firm on the platform.' },
    { id: 'plan', title: 'Choose your plan', description: 'You can upgrade anytime. All plans start with a free trial.' },
    { id: 'first_client', title: 'Add your first client', description: 'Connect a client business entity to get started.' },
];
export function AdvisorOnboarding({ onComplete }) {
    const [step, setStep] = useState(0);
    const [firmName, setFirmName] = useState('');
    const [plan, setPlan] = useState('starter');
    const [businessId, setBusinessId] = useState('');
    const [createdFirm, setCreatedFirm] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    async function handleNext() {
        setError(null);
        if (step === 0) {
            if (!firmName.trim()) {
                setError('Firm name is required');
                return;
            }
            setStep(1);
        }
        else if (step === 1) {
            setLoading(true);
            try {
                const firm = await api.post('/api/firms', { name: firmName, plan });
                setCreatedFirm(firm);
                setStep(2);
            }
            catch (e) {
                setError(e.message);
            }
            finally {
                setLoading(false);
            }
        }
        else if (step === 2) {
            if (!businessId.trim() || !createdFirm) {
                setError('Business ID is required');
                return;
            }
            setLoading(true);
            try {
                await api.post(`/api/firms/${createdFirm.id}/clients`, { business_id: businessId });
                onComplete(createdFirm);
            }
            catch (e) {
                setError(e.message);
            }
            finally {
                setLoading(false);
            }
        }
    }
    const current = STEPS[step];
    return (_jsx("div", { className: "onboarding-overlay", children: _jsxs("div", { className: "onboarding-card", children: [_jsx("div", { className: "onboarding-progress", children: STEPS.map((s, i) => (_jsxs("div", { className: `progress-step${i < step ? ' done' : ''}${i === step ? ' active' : ''}`, children: [_jsx("div", { className: "step-dot", children: i < step ? '✓' : i + 1 }), _jsx("span", { className: "step-label", children: s.title })] }, s.id))) }), _jsxs("div", { className: "onboarding-body", children: [_jsx("h1", { className: "onboarding-title", children: current.title }), _jsx("p", { className: "onboarding-desc", children: current.description }), step === 0 && (_jsx("input", { type: "text", className: "onboarding-input", placeholder: "e.g. Turner Advisory LLC", value: firmName, onChange: e => setFirmName(e.target.value), autoFocus: true })), step === 1 && (_jsx("div", { className: "plan-cards", children: ['starter', 'pro', 'enterprise'].map(p => (_jsxs("button", { className: `plan-card${plan === p ? ' selected' : ''}`, onClick: () => setPlan(p), "aria-pressed": plan === p, children: [_jsx("span", { className: "plan-name", children: p.charAt(0).toUpperCase() + p.slice(1) }), _jsx("span", { className: "plan-detail", children: p === 'starter' ? 'Up to 5 clients' : p === 'pro' ? 'Unlimited clients' : 'White-label + API' })] }, p))) })), step === 2 && (_jsx("input", { type: "text", className: "onboarding-input", placeholder: "Business ID (from BizForma)", value: businessId, onChange: e => setBusinessId(e.target.value), autoFocus: true })), error && _jsx("p", { className: "error-msg", children: error }), _jsxs("div", { className: "onboarding-actions", children: [step > 0 && step < 2 && (_jsx("button", { className: "btn btn-ghost", onClick: () => setStep(s => s - 1), children: "Back" })), _jsx("button", { className: "btn btn-primary", onClick: handleNext, disabled: loading, children: loading ? 'Working…' : step === STEPS.length - 1 ? 'Finish setup' : 'Continue' })] })] })] }) }));
}
