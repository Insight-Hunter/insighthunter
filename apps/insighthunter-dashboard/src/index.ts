// insighthunter-dashboard — serves app.insighthunter.app
// Auth is verified via the insighthunter-auth Service Binding.
// Session token accepted as: Bearer header OR ih_session HttpOnly cookie.

export interface Env {
  AUTH_SERVICE: Fetcher;
  AUTH_ORIGIN: string;      // https://auth.insighthunter.app
  MARKETING_ORIGIN: string; // https://insighthunter.app
}

type Tier = "lite" | "standard" | "pro" | "enterprise";

interface Session {
  valid: true;
  userId: string;
  email: string;
  name?: string;
  orgName?: string;
  tier: Tier;
  role?: string;
}
const TIER_RANK: Record<Tier, number> = { lite: 0, standard: 1, pro: 2, enterprise: 3 };

const APP_TILES = [
  {
    slug: "insights",
    name: "Insights",
    icon: "📊",
    url: "https://insights.insighthunter.app",
    desc: "Financial KPIs & AI forecasting",
    minTier: "lite" as Tier,
  },
  {
    slug: "bookkeeping",
    name: "Bookkeeping",
    icon: "📒",
    url: "https://bookkeeping.insighthunter.app",
    desc: "Bank feeds, transactions & reconciliation",
    minTier: "standard" as Tier,
  },
  {
    slug: "advisor",
    name: "AI CFO Advisor",
    icon: "🤖",
    url: "https://advisor.insighthunter.app",
    desc: "AI-driven CFO advisory & recommendations",
    minTier: "standard" as Tier,
  },
  {
    slug: "reports",
    name: "Reports",
    icon: "📄",
    url: "https://reports.insighthunter.app",
    desc: "Automated financial reports",
    minTier: "standard" as Tier,
  },
  {
    slug: "bizforma",
    name: "BizForma",
    icon: "🏢",
    url: "https://bizforma.insighthunter.app",
    desc: "Entity formation & compliance",
    minTier: "standard" as Tier,
  },
  {
    slug: "payroll",
    name: "Payroll",
    icon: "💵",
    url: "https://payroll.insighthunter.app",
    desc: "Payroll & contractor payments",
    minTier: "pro" as Tier,
  },
  {
    slug: "scout",
    name: "Scout CRM",
    icon: "🔍",
    url: "https://scout.insighthunter.app",
    desc: "Leads, deals & revenue pipeline",
    minTier: "pro" as Tier,
  },
  {
    slug: "pbx",
    name: "PBX",
    icon: "📞",
    url: "https://pbx.insighthunter.app",
    desc: "Business phone & call analytics",
    minTier: "pro" as Tier,
  },
  {
    slug: "finops",
    name: "FinOps",
    icon: "💹",
    url: "https://finops.insighthunter.app",
    desc: "Cost optimization & spend tracking",
    minTier: "pro" as Tier,
  },
  {
    slug: "dispatch",
    name: "Dispatch",
    icon: "📬",
    url: "https://dispatch.insighthunter.app",
    desc: "Operations & task dispatch",
    minTier: "lite" as Tier,
  },
  {
    slug: "notifications",
    name: "Notifications",
    icon: "🔔",
    url: "https://notifications.insighthunter.app",
    desc: "Alerts & team notifications",
    minTier: "lite" as Tier,
  },
  {
    slug: "platform",
    name: "Settings",
    icon: "⚙️",
    url: "https://platform.insighthunter.app",
    desc: "Org settings, members & billing",
    minTier: "lite" as Tier,
  },
] as const;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "insighthunter-dashboard" }, { headers: securityHeaders() });
    }

    // Handoff: move short-lived token from URL param into HttpOnly cookie
    const handoffToken = url.searchParams.get("token");
    if (handoffToken && isTokenCandidate(handoffToken)) {
      url.searchParams.delete("token");
      return new Response(null, {
        status: 303,
        headers: { Location: url.toString(), "Set-Cookie": sessionCookie(handoffToken), ...securityHeaders() },
      });
    }

    if (url.pathname === "/logout") {
      return new Response(null, {
        status: 303,
        headers: { Location: env.MARKETING_ORIGIN, "Set-Cookie": clearSessionCookie(), ...securityHeaders() },
      });
    }

    if (url.pathname === "/billing/success") {
      return Response.redirect(new URL("/", url).toString(), 303);
    }
    if (url.pathname === "/billing/cancelled") {
      return Response.redirect(new URL("/pricing", env.MARKETING_ORIGIN).toString(), 303);
    }

    // Auth check
    const token = bearerToken(request) ?? cookieToken(request);
    const session = token ? await verifySession(token, env) : null;
    if (!session) return redirectToLogin(request, env);

    // JSON API — session info
    if (url.pathname === "/api/session") {
      return Response.json(session, { headers: securityHeaders() });
    }

    // All other non-root paths: 404 (module apps live on subdomains)
    if (url.pathname !== "/" && url.pathname !== "/dashboard") {
      return new Response("Not found", { status: 404, headers: securityHeaders() });
    }

    return new Response(renderDashboard(session, env), {
      headers: { "Content-Type": "text/html; charset=utf-8", ...securityHeaders() },
    });
  },
} satisfies ExportedHandler<Env>;

// ── Auth helpers ──────────────────────────────────────────────────────────────

function bearerToken(req: Request): string | null {
  const auth = req.headers.get("Authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}

function cookieToken(req: Request): string | null {
  const cookie = req.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)ih_session=([^;]+)/);
  const raw = match?.[1];
  if (!raw) return null;
  try { return decodeURIComponent(raw); } catch { return null; }
}

function isTokenCandidate(token: string): boolean {
  return token.length <= 4096 && /^[A-Za-z0-9._-]+$/.test(token);
}

function sessionCookie(token: string): string {
  return `ih_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`;
}

function clearSessionCookie(): string {
  return "ih_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

async function verifySession(token: string, env: Env): Promise<Session | null> {
  try {
    const res = await env.AUTH_SERVICE.fetch(`${env.AUTH_ORIGIN}/session/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const value: unknown = await res.json();
    if (!value || typeof value !== "object") return null;
    const s = value as Partial<Session>;
    return s.valid === true
      && typeof s.userId === "string"
      && typeof s.email === "string"
      && isTier(s.tier)
      ? (s as Session)
      : null;
  } catch {
    return null;
  }
}

function isTier(v: unknown): v is Tier {
  return v === "lite" || v === "standard" || v === "pro" || v === "enterprise";
}

function redirectToLogin(req: Request, env: Env): Response {
  const dest = new URL("/login", env.MARKETING_ORIGIN);
  dest.searchParams.set("returnTo", req.url);
  return Response.redirect(dest.toString(), 302);
}

function securityHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  };
}

// ── Dashboard HTML ────────────────────────────────────────────────────────────

function renderDashboard(session: Session, env: Env): string {
  const userRank   = TIER_RANK[session.tier] ?? 0;
  const firstName  = (session.name ?? session.email).split(/[\s@]/)[0] ?? "there";
  const orgName    = session.orgName ?? "My Organization";
  const role       = session.role ?? "member";
  const planLabel  = session.tier.charAt(0).toUpperCase() + session.tier.slice(1);

  const accessible = APP_TILES.filter((t) => TIER_RANK[t.minTier] <= userRank);
  const locked     = APP_TILES.filter((t) => TIER_RANK[t.minTier] > userRank);

  const tileHtml = (t: (typeof APP_TILES)[number], isLocked: boolean): string =>
    `<a class="tile${isLocked ? " tile-locked" : ""}" href="${
      isLocked ? `${env.MARKETING_ORIGIN}/pricing` : t.url
    }" ${isLocked ? "" : 'target="_blank" rel="noopener noreferrer"'}>
      <div class="tile-icon">${t.icon}</div>
      <div class="tile-name">${t.name}${isLocked ? ' <span class="lock">🔒</span>' : ""}</div>
      <div class="tile-desc">${t.desc}</div>
    </a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Dashboard · InsightHunter</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--brand:#0ea5e9;--dark:#0f172a;--nav:#080f1e;--card:#1a2540;--text:#e2e8f0;--muted:#64748b;--border:#1e3a5f}
    body{font-family:system-ui,sans-serif;background:var(--dark);color:var(--text);min-height:100vh}
    nav{background:var(--nav);border-bottom:1px solid var(--border);padding:.9rem 2rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
    .logo{font-weight:900;font-size:1.15rem;color:var(--brand);letter-spacing:-.02em;text-decoration:none}
    .nav-right{display:flex;align-items:center;gap:.75rem;font-size:.83rem;color:var(--muted)}
    .plan-badge{background:#0ea5e915;color:var(--brand);border:1px solid #0ea5e930;border-radius:6px;padding:.15rem .55rem;font-size:.7rem;font-weight:700;text-transform:uppercase}
    .signout{color:var(--muted);text-decoration:none;border:1px solid var(--border);border-radius:6px;padding:.25rem .65rem;transition:color .15s}
    .signout:hover{color:var(--text)}
    main{max-width:1280px;margin:0 auto;padding:2.5rem 2rem}
    .welcome{margin-bottom:2.5rem}
    .welcome h1{font-size:1.8rem;font-weight:800;margin-bottom:.3rem}
    .welcome p{color:var(--muted);font-size:.9rem}
    .health-bar{display:inline-flex;align-items:center;gap:.75rem;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:.6rem 1.2rem;margin-top:1rem;font-size:.85rem}
    .h-score{font-size:1.5rem;font-weight:900;color:#22c55e}
    .h-meta{color:var(--muted);font-size:.8rem}
    .section-label{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:.85rem}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.85rem;margin-bottom:2.5rem}
    .tile{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem;text-decoration:none;color:var(--text);transition:border-color .15s,transform .12s;display:block}
    .tile:hover{border-color:var(--brand);transform:translateY(-2px)}
    .tile-locked{opacity:.45;cursor:pointer}
    .tile-locked:hover{border-color:#f59e0b;transform:none}
    .tile-icon{font-size:1.75rem;margin-bottom:.6rem}
    .tile-name{font-weight:700;font-size:.95rem;margin-bottom:.3rem}
    .lock{font-size:.8rem}
    .tile-desc{font-size:.78rem;color:var(--muted);line-height:1.45}
    .panels{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:.5rem}
    @media(max-width:640px){.panels{grid-template-columns:1fr}.grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}}
    .panel{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem}
    .panel h3{font-size:.82rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.85rem}
    .panel ul{list-style:none;display:flex;flex-direction:column;gap:.4rem}
    .panel li{font-size:.83rem;color:#94a3b8;padding:.35rem 0;border-bottom:1px solid #1e2d45}
    .panel li:last-child{border-bottom:none}
    .empty{color:var(--muted)!important;font-style:italic}
  </style>
</head>
<body>
  <nav>
    <a class="logo" href="/">⚡ InsightHunter</a>
    <div class="nav-right">
      <span>${orgName}</span>
      <span class="plan-badge">${planLabel}</span>
      <span>${session.email}</span>
      <a class="signout" href="/logout">Sign out</a>
    </div>
  </nav>
  <main>
    <div class="welcome">
      <h1>Welcome back, ${firstName} 👋</h1>
      <p>${orgName} &nbsp;·&nbsp; ${role}</p>
      <div class="health-bar">
        <span>Business Health Score</span>
        <span class="h-score" id="hs">—</span>
        <span class="h-meta" id="hm">loading…</span>
      </div>
    </div>

    <div class="section-label">Your Applications</div>
    <div class="grid">
      ${accessible.map((t) => tileHtml(t, false)).join("\n      ")}
      ${locked.map((t) => tileHtml(t, true)).join("\n      ")}
    </div>

    <div class="panels">
      <div class="panel">
        <h3>Notifications</h3>
        <ul id="notif-list"><li class="empty">Loading…</li></ul>
      </div>
      <div class="panel">
        <h3>Recent Activity</h3>
        <ul id="activity-list"><li class="empty">Loading…</li></ul>
      </div>
    </div>
  </main>

  <script>
    (async () => {
      try {
        const res = await fetch('/api/session', { credentials: 'include' });
        if (!res.ok) return;
        const d = await res.json();
        if (d.healthScore != null) {
          document.getElementById('hs').textContent = d.healthScore.score ?? d.healthScore;
          document.getElementById('hm').textContent = d.healthScore.label ?? '';
        } else {
          document.getElementById('hm').textContent = 'unavailable';
        }
      } catch {
        document.getElementById('hm').textContent = 'unavailable';
      }
    })();
  </script>
</body>
</html>`;
}
