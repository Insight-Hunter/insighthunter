import React, { useMemo, useState } from "react";

type NavKey =
  | "overview"
  | "formation"
  | "compliance"
  | "documents"
  | "tax"
  | "payroll"
  | "forms"
  | "ai";

const AUTH_ORIGIN =
  import.meta.env.VITE_AUTH_ORIGIN || "https://auth.insighthunter.app";
const APP_ORIGIN =
  import.meta.env.VITE_APP_ORIGIN || "https://bizforma.insighthunter.app";

const navItems: Array<{ key: NavKey; label: string; blurb: string }> = [
  { key: "overview", label: "Overview", blurb: "Workspace summary and next steps" },
  { key: "formation", label: "Formation", blurb: "Wizard, EIN, state filing, entity setup" },
  { key: "compliance", label: "Compliance", blurb: "Deadlines, renewals, BOI and reminders" },
  { key: "documents", label: "Documents", blurb: "R2-backed business document vault" },
  { key: "tax", label: "Tax", blurb: "W-9, tax accounts, S-Corp election guidance" },
  { key: "payroll", label: "Payroll", blurb: "W-4, 1099, contractors and payroll setup" },
  { key: "forms", label: "Lego Forms", blurb: "Templates, submissions, AI-assisted forms" },
  { key: "ai", label: "AI Advisor", blurb: "Name ideas, entity advice, advisor chat" },
];

function authUrl(path: "login" | "signup") {
  const redirectUri = `${APP_ORIGIN}/auth/callback`;
  return `${AUTH_ORIGIN}/${path}?redirect_uri=${encodeURIComponent(
    redirectUri
  )}&audience=bizforma`;
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "rgba(5,11,28,0.85)",
        border: "1px solid rgba(94,212,255,0.10)",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 24, color: "#E8F3FF" }}>{title}</h2>
        <p style={{ margin: "8px 0 0", color: "#A8D7FF" }}>{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        background: tone,
        border: "1px solid rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ fontSize: 13, color: "#A8D7FF", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#F8FAFF" }}>{value}</div>
    </div>
  );
}

function App() {
  const [active, setActive] = useState<NavKey>("overview");

  const activeMeta = useMemo(
    () => navItems.find((item) => item.key === active) ?? navItems[0],
    [active]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(94,212,255,0.22), transparent 28%), radial-gradient(circle at top right, rgba(64,183,238,0.16), transparent 24%), linear-gradient(180deg, #041021 0%, #070F23 52%, #0C1A39 100%)",
        color: "#E8F3FF",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "24px 20px 40px",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 24,
            padding: 18,
            borderRadius: 22,
            background: "rgba(8,15,34,0.88)",
            border: "1px solid rgba(94,212,255,0.08)",
            boxShadow: "0 12px 35px rgba(0,0,0,0.35)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div>
            <div style={{ fontSize: 13, letterSpacing: 1.5, color: "#40B7EE", fontWeight: 700 }}>
              INSIGHT HUNTER
            </div>
            <h1 style={{ margin: "6px 0 4px", fontSize: 30, color: "#E8F3FF" }}>BizForma</h1>
            <p style={{ margin: 0, color: "#C8E6FF" }}>
              Business formation, compliance, payroll, documents, and AI guidance in one Cloudflare-native workspace.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a
              href={authUrl("login")}
              style={{
                textDecoration: "none",
                padding: "12px 16px",
                borderRadius: 14,
                color: "#E8F3FF",
                background: "rgba(94,212,255,0.12)",
                border: "1px solid rgba(94,212,255,0.12)",
                fontWeight: 600,
              }}
            >
              Log in
            </a>
            <a
              href={authUrl("signup")}
              style={{
                textDecoration: "none",
                padding: "12px 16px",
                borderRadius: 14,
                color: "#ffffff",
                background: "linear-gradient(135deg, #5ED4FF, #E34E24)",
                border: "1px solid rgba(94,212,255,0.08)",
                fontWeight: 700,
              }}
            >
              Sign up
            </a>
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px minmax(0, 1fr)",
            gap: 20,
          }}
        >
          <aside
            style={{
              background: "rgba(8,16,35,0.86)",
              border: "1px solid rgba(94,212,255,0.08)",
              borderRadius: 22,
              padding: 16,
              boxShadow: "0 12px 35px rgba(0,0,0,0.35)",
              backdropFilter: "blur(16px)",
              height: "fit-content",
            }}
          >
            <div style={{ padding: "6px 8px 12px", color: "#A8D7FF", fontSize: 13 }}>
              Workspace
            </div>

            <nav style={{ display: "grid", gap: 10 }}>
              {navItems.map((item) => {
                const isActive = item.key === active;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActive(item.key)}
                    style={{
                      textAlign: "left",
                      padding: 14,
                      borderRadius: 16,
                      border: isActive
                        ? "1px solid rgba(13,148,136,0.28)"
                        : "1px solid rgba(15,23,42,0.06)",
                      background: isActive
                        ? "linear-gradient(135deg, rgba(94,212,255,0.16), rgba(64,183,238,0.08))"
                        : "rgba(255,255,255,0.08)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#E8F3FF" }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: "#A8D7FF", marginTop: 4 }}>
                      {item.blurb}
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main style={{ display: "grid", gap: 20 }}>
            <Panel title={activeMeta.label} subtitle={activeMeta.blurb}>
              {active === "overview" && (
                <div style={{ display: "grid", gap: 18 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                      gap: 14,
                    }}
                  >
                    <StatCard label="Open formation cases" value="3" tone="rgba(94,212,255,0.10)" />
                    <StatCard label="Upcoming deadlines" value="7" tone="rgba(64,183,238,0.10)" />
                    <StatCard label="Vault documents" value="18" tone="rgba(94,212,255,0.10)" />
                    <StatCard label="Pending tax tasks" value="5" tone="rgba(227,78,36,0.12)" />
                  </div>

                  <div
                    style={{
                      padding: 18,
                      borderRadius: 18,
                      background: "rgba(5,11,28,0.85)",
                      border: "1px solid rgba(94,212,255,0.08)",
                    }}
                  >
                    <h3 style={{ marginTop: 0, color: "#E8F3FF" }}>Recommended next actions</h3>
                    <ul style={{ margin: 0, paddingLeft: 18, color: "#C8E6FF", lineHeight: 1.7 }}>
                      <li>Finish the 11-step formation wizard for your new entity.</li>
                      <li>Connect document uploads to the R2 document vault.</li>
                      <li>Generate the first compliance calendar and renewal schedule.</li>
                      <li>Route protected API requests through centralized auth validation.</li>
                    </ul>
                  </div>
                </div>
              )}

              {active !== "overview" && (
                <div
                  style={{
                    padding: 18,
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.74)",
                    border: "1px solid rgba(15,23,42,0.06)",
                    color: "#334155",
                    lineHeight: 1.7,
                  }}
                >
                  <strong>{activeMeta.label}</strong> is mounted as a starter workspace panel from the
                  root app shell. Next, wire this tab to its dedicated components and API routes from
                  your `components/`, `api/`, and `services/` folders.
                </div>
              )}
            </Panel>

            <Panel
              title="Platform wiring"
              subtitle="Cloudflare-native app structure with centralized auth"
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 14,
                }}
              >
                {[
                  "Frontend served from Vite build output through the Worker asset binding",
                  "Protected APIs validated against AUTH.insighthunter.app before business logic runs",
                  "D1, KV, R2, Queues, Durable Objects, Workflows, and AI wired behind the Worker",
                ].map((item) => (
                  <div
                    key={item}
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.8)",
                      border: "1px solid rgba(15,23,42,0.06)",
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </Panel>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
