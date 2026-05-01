import React, { useState } from 'react';
import { api } from '../api';
import type { Firm } from '../types';

interface Props {
  userId: string;
  onComplete: (firm: Firm) => void;
}

const STEPS = [
  { id: 'firm_name', title: 'Name your firm', description: 'This is how clients will see your firm on the platform.' },
  { id: 'plan',      title: 'Choose your plan', description: 'You can upgrade anytime. All plans start with a free trial.' },
  { id: 'first_client', title: 'Add your first client', description: 'Connect a client business entity to get started.' },
];

export function AdvisorOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [firmName, setFirmName] = useState('');
  const [plan, setPlan] = useState<'starter' | 'pro' | 'enterprise'>('starter');
  const [businessId, setBusinessId] = useState('');
  const [createdFirm, setCreatedFirm] = useState<Firm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleNext() {
    setError(null);
    if (step === 0) {
      if (!firmName.trim()) { setError('Firm name is required'); return; }
      setStep(1);
    } else if (step === 1) {
      setLoading(true);
      try {
        const firm = await api.post<Firm>('/api/firms', { name: firmName, plan });
        setCreatedFirm(firm);
        setStep(2);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      if (!businessId.trim() || !createdFirm) { setError('Business ID is required'); return; }
      setLoading(true);
      try {
        await api.post(`/api/firms/${createdFirm.id}/clients`, { business_id: businessId });
        onComplete(createdFirm);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
  }

  const current = STEPS[step];

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`progress-step${i < step ? ' done' : ''}${i === step ? ' active' : ''}`}>
              <div className="step-dot">{i < step ? '✓' : i + 1}</div>
              <span className="step-label">{s.title}</span>
            </div>
          ))}
        </div>

        <div className="onboarding-body">
          <h1 className="onboarding-title">{current.title}</h1>
          <p className="onboarding-desc">{current.description}</p>

          {step === 0 && (
            <input
              type="text"
              className="onboarding-input"
              placeholder="e.g. Turner Advisory LLC"
              value={firmName}
              onChange={e => setFirmName(e.target.value)}
              autoFocus
            />
          )}

          {step === 1 && (
            <div className="plan-cards">
              {(['starter', 'pro', 'enterprise'] as const).map(p => (
                <button
                  key={p}
                  className={`plan-card${plan === p ? ' selected' : ''}`}
                  onClick={() => setPlan(p)}
                  aria-pressed={plan === p}
                >
                  <span className="plan-name">{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                  <span className="plan-detail">
                    {p === 'starter' ? 'Up to 5 clients' : p === 'pro' ? 'Unlimited clients' : 'White-label + API'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <input
              type="text"
              className="onboarding-input"
              placeholder="Business ID (from BizForma)"
              value={businessId}
              onChange={e => setBusinessId(e.target.value)}
              autoFocus
            />
          )}

          {error && <p className="error-msg">{error}</p>}

          <div className="onboarding-actions">
            {step > 0 && step < 2 && (
              <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>Back</button>
            )}
            <button
              className="btn btn-primary"
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? 'Working…' : step === STEPS.length - 1 ? 'Finish setup' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
