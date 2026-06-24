import React, { useEffect, useMemo, useState } from 'react';

type DashboardSummary = {
  orgId: string;
  summary: {
    totalCases: number;
    completeCases: number;
    activeCases: number;
  };
};

type FormationCase = {
  id: string;
  org_id: string;
  user_id: string;
  status: string;
  entity_type: string | null;
  business_name: string | null;
  state: string | null;
  created_at: string;
  updated_at: string;
};

type AuthUser = {
  userId: string;
  orgId: string;
  email: string;
  name: string;
  tier: string;
  role: string;
};

declare global {
  interface Window {
    __BIZFORMA_CONFIG__?: {
      appBaseUrl: string;
      authBaseUrl: string;
    };
  }
}

const entityOptions = [
  'SOLE_PROP',
  'LLC',
  'S_CORP',
  'C_CORP',
  'PARTNERSHIP',
  'NONPROFIT',
];

export function App() {
  const config = useMemo(
    () =>
      window.__BIZFORMA_CONFIG__ ?? {
        appBaseUrl: 'https://bizforma.insighthunter.app',
        authBaseUrl: 'https://auth.insighthunter.app',
      },
    [],
  );

  const [user, setUser] = useState<AuthUser | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [cases, setCases] = useState<FormationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState({
    business_name: '',
    entity_type: 'LLC',
    state: 'GA',
  });

  useEffect(() => {
    void loadApp();
  }, []);

  async function loadApp() {
    try {
      const [meRes, dashboardRes, casesRes] = await Promise.all([
        fetch('/api/me', { credentials: 'include' }),
        fetch('/api/dashboard', { credentials: 'include' }),
        fetch('/api/cases', { credentials: 'include' }),
      ]);

      if (meRes.status === 401) {
        setLoading(false);
        return;
      }

      const meData = await meRes.json();
      const dashboardData = await dashboardRes.json();
      const casesData = await casesRes.json();

      setUser(meData.user);
      setDashboard(dashboardData);
      setCases(casesData.items ?? []);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function createCase() {
    const response = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(formState),
    });

    if (!response.ok) return;

    const created = (await response.json()) as FormationCase;
    setCases((prev) => [created, ...prev]);
    setDashboard((prev) =>
      prev
        ? {
            ...prev,
            summary: {
              ...prev.summary,
              totalCases: prev.summary.totalCases + 1,
              activeCases: prev.summary.activeCases + 1,
            },
          }
        : prev,
    );
  }

  if (loading) {
    return <div className="screen center">Loading BizForma…</div>;
  }

  if (!user) {
    return (
      <div className="screen">
        <div className="hero-card">
          <div className="eyebrow">Insight Hunter · BizForma</div>
          <h1>Entity formation and compliance without blind spots.</h1>
          <p className="lead">
            BizForma centralizes formation, EIN prep, compliance tracking, and
            customer onboarding while identity stays trusted at auth.insighthunter.app.
          </p>
          <div className="button-row">
            <a className="btn btn-primary" href="/auth/signup">
              Create account
            </a>
            <a className="btn btn-secondary" href="/auth/login">
              Sign in
            </a>
          </div>
          <div className="meta-grid">
            <div className="meta-card">
              <strong>Cloudflare-native</strong>
              <span>D1, R2, KV, Durable Objects, Queues, Workflows.</span>
            </div>
            <div className="meta-card">
              <strong>Shared SaaS core</strong>
              <span>Tenant-aware v1 with clean enterprise upgrade path.</span>
            </div>
            <div className="meta-card">
              <strong>Enterprise-ready</strong>
              <span>Workers for Platforms remains available later for isolated tenant workers.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen app-shell">
      <aside className="sidebar">
        <div>
          <div className="eyebrow">BizForma</div>
          <h2>Insight Hunter</h2>
        </div>
        <nav className="nav-list">
          <a href="#overview">Overview</a>
          <a href="#formation">Formation</a>
          <a href="#compliance">Compliance</a>
          <a href="#documents">Documents</a>
          <a href="#advisor">Advisor</a>
        </nav>
        <div className="profile-card">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
          <span>
            {user.role} · {user.tier}
          </span>
        </div>
      </aside>

      <main className="content">
        <section className="topbar">
          <div>
            <div className="eyebrow">Organization</div>
            <h1>{dashboard?.orgId}</h1>
          </div>
          <div className="button-row">
            <a className="btn btn-secondary" href={config.authBaseUrl} target="_blank" rel="noreferrer">
              Auth portal
            </a>
            <button className="btn btn-primary" onClick={createCase}>
              Quick create
            </button>
          </div>
        </section>

        <section className="stats-grid" id="overview">
          <StatCard label="Formation cases" value={String(dashboard?.summary.totalCases ?? 0)} />
          <StatCard label="Active cases" value={String(dashboard?.summary.activeCases ?? 0)} />
          <StatCard label="Completed" value={String(dashboard?.summary.completeCases ?? 0)} />
        </section>

        <section className="workspace-grid" id="formation">
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="eyebrow">New case</div>
                <h3>Create a formation workflow</h3>
              </div>
            </div>

            <label>
              Business name
              <input
                value={formState.business_name}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, business_name: e.target.value }))
                }
                placeholder="Peachtree Advisory LLC"
              />
            </label>

            <label>
              Entity type
              <select
                value={formState.entity_type}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, entity_type: e.target.value }))
                }
              >
                {entityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              State
              <input
                value={formState.state}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))
                }
                placeholder="GA"
                maxLength={2}
              />
            </label>

            <button className="btn btn-primary full" onClick={createCase}>
              Create formation case
            </button>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Pipeline</div>
                <h3>Recent formation cases</h3>
              </div>
            </div>

            <div className="case-list">
              {cases.length === 0 ? (
                <div className="empty-card">No cases yet. Create your first one now.</div>
              ) : (
                cases.map((item) => (
                  <div className="case-card" key={item.id}>
                    <div>
                      <strong>{item.business_name || 'Untitled business'}</strong>
                      <div className="case-meta">
                        {item.entity_type || 'Entity TBD'} · {item.state || 'State TBD'}
                      </div>
                    </div>
                    <span className="status-pill">{item.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="workspace-grid" id="compliance">
          <div className="panel">
            <div className="eyebrow">Compliance</div>
            <h3>Recurring obligations</h3>
            <p>
              Track annual reports, BOI filing, renewals, and internal deadlines with
              tenant-aware records in D1 and future queue-based reminders.
            </p>
          </div>
          <div className="panel">
            <div className="eyebrow">Documents</div>
            <h3>R2-backed vault</h3>
            <p>
              Store formation docs, tax setup materials, and organization files with
              access mediated by your centralized auth layer.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
