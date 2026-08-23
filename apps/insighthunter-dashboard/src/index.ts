export interface Env {
  AUTH_SERVICE: Fetcher;
  AUTH_ORIGIN: string;
  MARKETING_ORIGIN: string;
}

type Tier = "startup" | "standard" | "pro";

interface Session {
  valid: true;
  userId: string;
  email: string;
  tier: Tier;
}

const MODULES = [
  { name: "Bookkeeping", tier: "startup", href: "https://bookkeeping.insighthunter.app", description: "Transactions, imports, and reconciliation." },
  { name: "Reports", tier: "startup", href: "https://reports.insighthunter.app", description: "P&L, balance sheet, cash flow, and exports." },
  { name: "Insights", tier: "standard", href: "https://insights.insighthunter.app", description: "Cash planning and CFO-level decision support." },
  { name: "BizForma", tier: "standard", href: "https://bizforma.insighthunter.app", description: "Formation workflows and compliance calendar." },
  { name: "Payroll", tier: "pro", href: "https://payroll.insighthunter.app", description: "Provider-backed payroll operations and journals." },
  { name: "Business phone", tier: "pro", href: "https://pbx.insighthunter.app", description: "Calls, messages, voicemail, and automation." },
] as const;

const TIER_RANK: Record<Tier, number> = { startup: 0, standard: 1, pro: 2 };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") return Response.json({ ok: true, service: "insighthunter-dashboard" });

    // The current marketing signup flow hands the short-lived session token to
    // the dashboard in the URL. Immediately move it into an HttpOnly cookie
    // and redirect to a clean URL so it does not remain in browser history.
    const handoffToken = url.searchParams.get("token");
    if (handoffToken && isTokenCandidate(handoffToken)) {
      url.searchParams.delete("token");
      return new Response(null, {
        status: 303,
        headers: {
          Location: url.toString(),
          "Set-Cookie": sessionCookie(handoffToken),
          ...securityHeaders(),
        },
      });
    }

    if (url.pathname === "/logout") {
      return new Response(null, {
        status: 303,
        headers: { Location: env.MARKETING_ORIGIN, "Set-Cookie": clearSessionCookie(), ...securityHeaders() },
      });
    }

    const token = bearerToken(request) ?? cookieToken(request);
    const session = token ? await verifySession(token, env) : null;
    if (!session) return redirectToLogin(request, env);

    if (url.pathname === "/api/session") return Response.json(session, { headers: securityHeaders() });
    if (url.pathname !== "/" && url.pathname !== "/dashboard") return new Response("Not found", { status: 404, headers: securityHeaders() });

    return new Response(renderDashboard(session, env), {
      headers: { "Content-Type": "text/html; charset=utf-8", ...securityHeaders() },
    });
  },
} satisfies ExportedHandler<Env>;

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

function cookieToken(request: Request): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)ih_session=([^;]+)/);
  const encodedToken = match?.[1];
  if (!encodedToken) return null;
  try {
    return decodeURIComponent(encodedToken);
  } catch {
    return null;
  }
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
  const response = await env.AUTH_SERVICE.fetch(`${env.AUTH_ORIGIN}/session/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const value: unknown = await response.json();
  if (!value || typeof value !== "object") return null;
  const session = value as Partial<Session>;
  return session.valid === true
    && typeof session.userId === "string"
    && typeof session.email === "string"
    && isTier(session.tier)
    ? session as Session
    : null;
}

function isTier(value: unknown): value is Tier {
  return value === "startup" || value === "standard" || value === "pro";
}

function redirectToLogin(request: Request, env: Env): Response {
  const destination = new URL("/login", env.MARKETING_ORIGIN);
  destination.searchParams.set("returnTo", request.url);
  return Response.redirect(destination.toString(), 302);
}

function securityHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

function renderDashboard(session: Session, env: Env): string {
  const cards = MODULES.map((module) => {
    const allowed = TIER_RANK[session.tier] >= TIER_RANK[module.tier];
    const action = allowed
      ? `<a href="${module.href}">Open module</a>`
      : `<a href="${env.MARKETING_ORIGIN}/pricing">Upgrade to ${module.tier}</a>`;
    return `<article class="card ${allowed ? "" : "locked"}"><p class="tier">${module.tier}</p><h2>${module.name}</h2><p>${module.description}</p>${action}</article>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dashboard · Insight Hunter</title><style>body{margin:0;background:#101826;color:#e8eef7;font:16px system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:3rem 1.5rem}.eyebrow,.tier{text-transform:uppercase;letter-spacing:.08em;font-size:.75rem;color:#8ab4f8}h1{margin:.25rem 0;font-size:2rem}.sub{color:#a9b8cb}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;margin-top:2rem}.card{background:#192538;border:1px solid #2b3b54;border-radius:12px;padding:1.4rem}.card.locked{opacity:.7}.card h2{margin:.3rem 0}.card p{line-height:1.5;color:#c0ccdb}.card a{display:inline-block;margin-top:.5rem;color:#101826;background:#8ab4f8;padding:.55rem .8rem;border-radius:6px;text-decoration:none;font-weight:700}.locked a{background:transparent;border:1px solid #8ab4f8;color:#8ab4f8}.logout{color:#8ab4f8;float:right}</style></head><body><main><a class="logout" href="/logout">Sign out</a><p class="eyebrow">${session.tier} workspace</p><h1>Welcome back</h1><p class="sub">${session.email} · Your financial tools and services are ready below.</p><section class="grid">${cards}</section></main></body></html>`;
}
