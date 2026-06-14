export interface Env {
  TEAM_DOMAIN: string;   // https://insighthunter.cloudflareaccess.com
  POLICY_AUD: string;    // Access application AUD tag
  ENVIRONMENT?: string;
}

interface AccessJWTPayload {
  aud: string[];
  email?: string;
  name?: string;
  sub: string;
  iss: string;
  iat?: number;
  exp: number;
  groups?: string[];
}

interface CloudflareIdentity {
  email: string;
  name: string;
  groups: string[];
  user_uuid?: string;
}

function decodeBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function decodeJsonBase64Url<T>(input: string): T {
  const bytes = decodeBase64Url(input);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text) as T;
}

async function verifyAccessJWT(
  token: string,
  teamDomain: string,
  policyAud: string,
): Promise<AccessJWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;
    const header = decodeJsonBase64Url<{ kid: string; alg?: string }>(headerB64);

    const certsResp = await fetch(`${teamDomain}/cdn-cgi/access/certs`, {
      cf: { cacheTtl: 3600, cacheEverything: true },
    } as RequestInit);

    if (!certsResp.ok) return null;

    const { keys } = await certsResp.json<{ keys: JsonWebKey[] }>();
    const jwk = keys.find((k: any) => (k as any).kid === header.kid);
    if (!jwk) return null;

    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      decodeBase64Url(sigB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`),
    );

    if (!valid) return null;

    const payload = decodeJsonBase64Url<AccessJWTPayload>(payloadB64);
    if (!payload?.sub) return null;
    if (!payload?.aud?.includes(policyAud)) return null;
    if (payload.iss !== teamDomain) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch (err) {
    console.error("[auth] Access JWT verification failed:", err);
    return null;
  }
}

async function getIdentity(
  request: Request,
  teamDomain: string,
): Promise<CloudflareIdentity | null> {
  try {
    const res = await fetch(`${teamDomain}/cdn-cgi/access/get-identity`, {
      headers: { Cookie: request.headers.get("Cookie") ?? "" },
    });

    if (!res.ok) return null;
    return await res.json<CloudflareIdentity>();
  } catch (err) {
    console.error("[auth] getIdentity failed:", err);
    return null;
  }
}

function buildCookie(name: string, value: string, maxAgeSeconds = 86400): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

function sanitizeRedirect(input: string | null): string {
  if (!input) {
    return "https://insighthunter-platform-worker.dmco.workers.dev/dashboard";
  }

  try {
    const url = new URL(input);

    const allowedHosts = new Set([
      "insighthunter-platform-worker.dmco.workers.dev",
      "auth.insighthunter.app",
      "insighthunter.app",
      "www.insighthunter.app",
    ]);

    if (!allowedHosts.has(url.hostname)) {
      return "https://insighthunter-platform-worker.dmco.workers.dev/dashboard";
    }

    return url.toString();
  } catch {
    return "https://insighthunter-platform-worker.dmco.workers.dev/dashboard";
  }
}

function loginPageHTML(redirect: string): string {
  const encodedRedirect = redirect ? encodeURIComponent(redirect) : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="Sign in to InsightHunter">
<title>InsightHunter — Sign In</title>
<link rel="preconnect" href="https://api.fontshare.com">
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap" rel="stylesheet">
<style>
  :root {
    --color-bg: #0F172A;
    --color-surface: #1E293B;
    --color-surface-2: #253044;
    --color-border: #334155;
    --color-border-subtle: rgba(148, 163, 184, 0.12);
    --color-primary: #38BDF8;
    --color-primary-hover: #0EA5E9;
    --color-primary-active: #0284C7;
    --color-primary-dim: rgba(56, 189, 248, 0.08);
    --color-primary-glow: rgba(56, 189, 248, 0.15);
    --color-success: #4ADE80;
    --color-warning: #FB923C;
    --color-text: #F1F5F9;
    --color-text-muted: #94A3B8;
    --color-text-faint: #475569;
    --font-body: 'Satoshi', 'Inter', system-ui, sans-serif;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;
    --radius-full: 9999px;
    --shadow-card:
      0 0 0 1px rgba(148, 163, 184, 0.08),
      0 4px 24px rgba(0, 0, 0, 0.40),
      0 1px 2px rgba(0, 0, 0, 0.30);
    --shadow-glow: 0 0 32px rgba(56, 189, 248, 0.08);
    --transition: 180ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-size-adjust: none;
  }

  body {
    font-family: var(--font-body);
    background-color: var(--color-bg);
    color: var(--color-text);
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    position: relative;
    overflow-x: hidden;
  }

  body::before {
    content: "";
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
    z-index: 0;
  }

  body::after {
    content: "";
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -60%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.06) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  .brand-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--color-primary-active), var(--color-primary), #7DD3FC);
    z-index: 2;
  }

  .auth-card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 420px;
    background: var(--color-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xl);
    padding: 2.5rem 2rem;
    box-shadow: var(--shadow-card), var(--shadow-glow);
  }

  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.625rem;
    margin-bottom: 2rem;
    text-decoration: none;
  }

  .logo-mark {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-md);
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-active) 100%);
    box-shadow: 0 0 16px rgba(56, 189, 248, 0.3);
    flex-shrink: 0;
  }

  .logo-text {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--color-text);
  }

  .logo-text span {
    color: var(--color-primary);
  }

  .status-wrap {
    text-align: center;
    margin-bottom: 1.25rem;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-success);
    background: rgba(74, 222, 128, 0.08);
    border: 1px solid rgba(74, 222, 128, 0.2);
    border-radius: var(--radius-full);
    padding: 0.25rem 0.625rem;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    background: var(--color-success);
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.85); }
  }

  .auth-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .auth-header h1 {
    font-size: 1.375rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  .auth-header p {
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--color-text-muted);
  }

  .features {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }

  .feature-item svg {
    color: var(--color-primary);
    flex-shrink: 0;
  }

  #cf-access-login-form,
  .cf-access-login-form {
    width: 100%;
    min-height: 56px;
  }

  .access-fallback {
    width: 100%;
    padding: 1rem 1.125rem;
    border-radius: var(--radius-lg);
    border: 1px solid rgba(56, 189, 248, 0.25);
    background: var(--color-primary-dim);
    color: var(--color-text-muted);
    text-align: center;
    font-size: 0.875rem;
  }

  .auth-footer {
    margin-top: 1.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--color-border);
    text-align: center;
    font-size: 0.8125rem;
    line-height: 1.7;
    color: var(--color-text-faint);
  }

  .auth-footer a {
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color var(--transition);
  }

  .auth-footer a:hover {
    color: var(--color-primary);
  }

  @media (max-width: 480px) {
    body {
      padding: 1rem;
      align-items: flex-start;
      padding-top: 3rem;
    }

    .auth-card {
      padding: 2rem 1.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
</head>
<body>
  <div class="brand-bar" aria-hidden="true"></div>

  <main class="auth-card" role="main">
    <a href="https://insighthunter.app" class="logo" aria-label="InsightHunter home">
      <div class="logo-mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="#0F172A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
          <path d="M11 8v6M8 11h6" stroke-width="2.2"></path>
        </svg>
      </div>
      <span class="logo-text">Insight<span>Hunter</span></span>
    </a>

    <div class="status-wrap">
      <span class="status-badge">
        <span class="status-dot" aria-hidden="true"></span>
        All systems operational
      </span>
    </div>

    <section class="auth-header" aria-label="Sign in heading">
      <h1>Welcome back</h1>
      <p>Sign in to access your financial intelligence platform.</p>
    </section>

    <section class="features" aria-label="Platform features">
      <div class="feature-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Bookkeeping
      </div>
      <div class="feature-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Payroll
      </div>
      <div class="feature-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Analytics
      </div>
      <div class="feature-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Scout
      </div>
    </section>

    <div id="cf-access-login-form" role="region" aria-label="Sign in options">
      <div class="access-fallback">Cloudflare Access sign-in options loading…</div>
    </div>

    ${encodedRedirect ? `<input type="hidden" name="redirect" value="${encodedRedirect}">` : ""}

    <footer class="auth-footer">
      Protected by
      <a href="https://www.cloudflare.com/zero-trust/" target="_blank" rel="noopener noreferrer">Cloudflare Zero Trust</a>
      &nbsp;&middot;&nbsp;
      <a href="https://insighthunter.app/terms" target="_blank" rel="noopener noreferrer">Terms</a>
      &nbsp;&middot;&nbsp;
      <a href="https://insighthunter.app/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
    </footer>
  </main>
</body>
</html>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        service: "auth.insighthunter.app",
        env: env.ENVIRONMENT ?? "production",
      });
    }

    if (url.pathname === "/callback") {
      const token = request.headers.get("Cf-Access-Jwt-Assertion");
      if (!token) {
        return new Response("Missing Access JWT", { status: 401 });
      }

      const accessPayload = await verifyAccessJWT(token, env.TEAM_DOMAIN, env.POLICY_AUD);
      if (!accessPayload) {
        return new Response("Invalid or expired Access JWT", { status: 403 });
      }

      const identity = await getIdentity(request, env.TEAM_DOMAIN);
      if (!identity) {
        return new Response("Unauthorized", { status: 403 });
      }

      const redirectTo = sanitizeRedirect(url.searchParams.get("redirect"));

      const headers = new Headers();
      headers.set("Location", redirectTo);
      headers.append("Set-Cookie", buildCookie("ih_user", identity.email, 86400));
      headers.append("Set-Cookie", buildCookie("ih_name", identity.name || identity.email, 86400));

      return new Response(null, {
        status: 302,
        headers,
      });
    }

    const redirect = url.searchParams.get("redirect") ?? "";
    return new Response(loginPageHTML(redirect), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  },
} satisfies ExportedHandler<Env>;

