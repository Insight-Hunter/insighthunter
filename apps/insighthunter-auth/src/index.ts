// index.ts — InsightHunter Auth Worker
// Cloudflare Access integration with session KV store.
// All JWT logic delegated to access.ts — no duplication.

import { validateAccessJWT, getIdentity } from "./access";
import type { Env, PendingRegistration } from "./types";

// ── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_REDIRECT_HOSTS = new Set([
  "insighthunter.app",
  "www.insighthunter.app",
  "app.insighthunter.app",
  "auth.insighthunter.app",
]);

const DEFAULT_REDIRECT = "https://app.insighthunter.app/dashboard";
const SESSION_TTL_SECONDS = 86_400;       // 24 hours
const VERIFY_TOKEN_TTL_SECONDS = 86_400; // 24 hours — single use
const VALID_PLANS = new Set(["lite", "standard", "pro"]);

// ── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeRedirect(input: string | null): string {
  if (!input) return DEFAULT_REDIRECT;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:") return DEFAULT_REDIRECT;
    if (!ALLOWED_REDIRECT_HOSTS.has(url.hostname)) return DEFAULT_REDIRECT;
    return url.toString().replace(/[\r\n]/g, "");
  } catch {
    return DEFAULT_REDIRECT;
  }
}

function buildSecureCookie(
  name: string,
  value: string,
  domain: string,
  maxAge = SESSION_TTL_SECONDS,
): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    `Domain=${domain}`,
  ].join("; ");
}

function generateToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function createSession(
  kv: KVNamespace,
  identity: { email: string; name: string; groups: string[]; user_uuid: string },
  ttl: number,
): Promise<string> {
  const sessionId = generateToken(32);
  await kv.put(
    `session:${sessionId}`,
    JSON.stringify({
      email: identity.email,
      name: identity.name,
      groups: identity.groups,
      user_uuid: identity.user_uuid,
      createdAt: Date.now(),
    }),
    { expirationTtl: ttl },
  );
  return sessionId;
}

/** SHA-256 hex of pepper+password — workers runtime has SubtleCrypto */
async function hashPassword(password: string, pepper: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pepper + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

function jsonResponse(body: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "https://insighthunter.app",
      "Access-Control-Allow-Credentials": "true",
      ...extraHeaders,
    },
  });
}

function corsPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://insighthunter.app",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// ── Email Helpers ────────────────────────────────────────────────────────────

async function sendVerificationEmail(
  env: Env,
  userEmail: string,
  verifyUrl: string,
): Promise<void> {
  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Verify your InsightHunter account</title></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#0F172A;color:#F1F5F9;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#1E293B;border-radius:12px;padding:40px;border:1px solid rgba(148,163,184,0.12);">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <div style="width:38px;height:38px;border-radius:8px;background:linear-gradient(135deg,#38BDF8,#0284C7);display:inline-flex;align-items:center;justify-content:center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F172A" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        <span style="font-size:1.25rem;font-weight:700;color:#F1F5F9;">Insight<span style="color:#38BDF8">Hunter</span></span>
      </div>
    </div>
    <h1 style="font-size:1.375rem;font-weight:600;margin-bottom:12px;text-align:center;">Verify your email address</h1>
    <p style="color:#94A3B8;line-height:1.6;text-align:center;margin-bottom:32px;">
      You're one step away from accessing your financial intelligence platform.
      Click the button below to verify your account.
    </p>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${verifyUrl}"
         style="display:inline-block;padding:14px 32px;background:#38BDF8;color:#0F172A;font-weight:700;font-size:1rem;border-radius:8px;text-decoration:none;">
        Verify my account
      </a>
    </div>
    <p style="color:#475569;font-size:0.8125rem;text-align:center;line-height:1.6;">
      This link expires in 24 hours. If you didn't create an InsightHunter account,
      you can safely ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid rgba(148,163,184,0.1);margin:24px 0;">
    <p style="color:#475569;font-size:0.75rem;text-align:center;">
      InsightHunter &nbsp;·&nbsp;
      <a href="https://insighthunter.app/privacy" style="color:#64748B;">Privacy Policy</a>
    </p>
  </div>
</body>
</html>`;

  await env.EMAIL.send({
    from: { email: "noreply@insighthunter.app", name: "InsightHunter" },
    to: [{ email: userEmail }],
    subject: "Verify your InsightHunter account",
    content: [
      { type: "text/plain", value: `Welcome to InsightHunter!\n\nClick the link below to verify your account:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, ignore this email.` },
      { type: "text/html", value: htmlBody },
    ],
  });
}

// ── Register Route ───────────────────────────────────────────────────────────

async function handleRegister(request: Request, env: Env): Promise<Response> {
  // CORS preflight
  if (request.method === "OPTIONS") return corsPreflightResponse();
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  // ── Input validation ──────────────────────────────────────────────────────
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const org_name = typeof body.org_name === "string" ? body.org_name.trim() : "";
  const plan = typeof body.plan === "string" && VALID_PLANS.has(body.plan) ? body.plan : "lite";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: "A valid email address is required." }, 422);
  }
  if (!password || password.length < 8) {
    return jsonResponse({ error: "Password must be at least 8 characters." }, 422);
  }
  if (!name) {
    return jsonResponse({ error: "Full name is required." }, 422);
  }
  if (!org_name) {
    return jsonResponse({ error: "Company name is required." }, 422);
  }

  // ── Duplicate check ───────────────────────────────────────────────────────
  const existingUser = await env.SESSIONS.get(`user:${email}`);
  if (existingUser) {
    return jsonResponse({ error: "An account with this email already exists." }, 409);
  }

  // Check for existing pending registration (rate-limit re-registrations)
  const existingPending = await env.SESSIONS.get(`pending_email:${email}`);
  if (existingPending) {
    return jsonResponse(
      { error: "A verification email was already sent. Please check your inbox or wait 10 minutes before retrying." },
      429,
    );
  }

  // ── Hash password ─────────────────────────────────────────────────────────
  const passwordHash = await hashPassword(password, env.PASSWORD_PEPPER ?? "ih_default_pepper");

  // ── Generate verification token ───────────────────────────────────────────
  const verifyToken = generateToken(32); // 64-char hex

  const pendingPayload: PendingRegistration = {
    email,
    name,
    org_name,
    plan,
    passwordHash,
    createdAt: Date.now(),
  };

  // Store pending registration — keyed by token (primary) and email (dedup guard)
  await Promise.all([
    env.SESSIONS.put(
      `pending:${verifyToken}`,
      JSON.stringify(pendingPayload),
      { expirationTtl: VERIFY_TOKEN_TTL_SECONDS },
    ),
    env.SESSIONS.put(
      `pending_email:${email}`,
      verifyToken,
      { expirationTtl: 600 }, // 10-min re-send cooldown
    ),
  ]);

  // ── Send verification email ───────────────────────────────────────────────
  const verifyUrl = `https://auth.insighthunter.app/auth/verify?token=${verifyToken}`;

  try {
    await sendVerificationEmail(env, email, verifyUrl);
  } catch (emailErr) {
    // Clean up so user can retry — email failure is not a registration failure
    await Promise.all([
      env.SESSIONS.delete(`pending:${verifyToken}`),
      env.SESSIONS.delete(`pending_email:${email}`),
    ]);
    console.error("[auth] Email send failed:", emailErr);
    return jsonResponse(
      { error: "Failed to send verification email. Please try again." },
      502,
    );
  }

  return jsonResponse(
    { ok: true, message: "Check your email to verify your account." },
    201,
  );
}

// ── Verify Route ─────────────────────────────────────────────────────────────

async function handleVerify(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  if (!token || token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
    return new Response(verifyErrorHTML("Invalid or malformed verification link."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const raw = await env.SESSIONS.get(`pending:${token}`);
  if (!raw) {
    return new Response(
      verifyErrorHTML("This verification link has expired or already been used."),
      { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  let pending: PendingRegistration;
  try {
    pending = JSON.parse(raw) as PendingRegistration;
  } catch {
    return new Response(verifyErrorHTML("Verification data is corrupt. Please register again."), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // ── Promote to verified user ───────────────────────────────────────────────
  const userId = generateToken(16); // opaque user ID
  await Promise.all([
    // Store verified user record
    env.SESSIONS.put(
      `user:${pending.email}`,
      JSON.stringify({
        userId,
        email: pending.email,
        name: pending.name,
        org_name: pending.org_name,
        plan: pending.plan,
        passwordHash: pending.passwordHash,
        verifiedAt: Date.now(),
        createdAt: pending.createdAt,
      }),
    ),
    // Delete single-use token
    env.SESSIONS.delete(`pending:${token}`),
    // Allow re-registration if needed (remove cooldown)
    env.SESSIONS.delete(`pending_email:${pending.email}`),
  ]);

  // Create session immediately — user is now logged in
  const sessionId = generateToken(32);
  await env.SESSIONS.put(
    `session:${sessionId}`,
    JSON.stringify({
      email: pending.email,
      name: pending.name,
      groups: [pending.plan],
      user_uuid: userId,
      createdAt: Date.now(),
    }),
    { expirationTtl: SESSION_TTL_SECONDS },
  );

  const headers = new Headers({
    "Location": `https://app.insighthunter.app/dashboard?welcome=1&plan=${pending.plan}`,
    "Set-Cookie": buildSecureCookie("ih_session", sessionId, env.COOKIE_DOMAIN),
  });

  return new Response(null, { status: 302, headers });
}

// ── Verify Error Page ────────────────────────────────────────────────────────

function verifyErrorHTML(message: string): string {
  return `<!DOCTYPE html><html lang="en" data-theme="dark"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Verification Failed — InsightHunter</title>
<link rel="preconnect" href="https://api.fontshare.com">
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Satoshi','Inter',sans-serif;background:#0F172A;color:#F1F5F9;min-height:100dvh;display:grid;place-items:center;padding:1.5rem}
.card{max-width:420px;width:100%;background:#1E293B;border:1px solid rgba(148,163,184,0.12);border-radius:1rem;padding:2.5rem 2rem;text-align:center}
.icon{font-size:2.5rem;margin-bottom:1rem}
h1{font-size:1.25rem;font-weight:600;margin-bottom:.75rem}
p{color:#94A3B8;line-height:1.6;margin-bottom:1.5rem}
a{display:inline-block;padding:.75rem 1.5rem;background:#38BDF8;color:#0F172A;font-weight:700;border-radius:.5rem;text-decoration:none}
</style></head><body>
<div class="card">
  <div class="icon">⚠️</div>
  <h1>Verification failed</h1>
  <p>${message}</p>
  <a href="https://insighthunter.app/auth/register">Try registering again</a>
</div>
</body></html>`;
}

// ── Login Page HTML ──────────────────────────────────────────────────────────

function loginPageHTML(redirect: string): string {
  const encodedRedirect = redirect ? encodeURIComponent(redirect) : "";
  const nonce = generateToken(8);

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="Sign in to InsightHunter — AI-powered financial intelligence for small business">
<meta name="robots" content="noindex, nofollow">
<title>InsightHunter — Sign In</title>
<link rel="preconnect" href="https://api.fontshare.com">
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0F172A;
    --surface: #1E293B;
    --border: rgba(148,163,184,0.12);
    --primary: #38BDF8;
    --primary-hover: #0EA5E9;
    --primary-dim: rgba(56,189,248,0.08);
    --success: #4ADE80;
    --text: #F1F5F9;
    --text-muted: #94A3B8;
    --text-faint: #475569;
    --font: 'Satoshi','Inter',system-ui,sans-serif;
    --r-md: 0.5rem;
    --r-lg: 0.75rem;
    --r-xl: 1rem;
    --r-full: 9999px;
    --shadow:
      0 0 0 1px rgba(148,163,184,0.08),
      0 4px 24px rgba(0,0,0,0.40),
      0 1px 2px rgba(0,0,0,0.30);
    --glow: 0 0 32px rgba(56,189,248,0.08);
    --t: 180ms cubic-bezier(0.16,1,0.3,1);
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html{-webkit-font-smoothing:antialiased;text-size-adjust:none}
  body{
    font-family:var(--font);
    background:var(--bg);
    color:var(--text);
    min-height:100dvh;
    display:grid;
    place-items:center;
    padding:1.5rem;
    overflow-x:hidden;
  }
  body::before{
    content:"";position:fixed;inset:0;
    background-image:
      linear-gradient(rgba(56,189,248,0.025) 1px,transparent 1px),
      linear-gradient(90deg,rgba(56,189,248,0.025) 1px,transparent 1px);
    background-size:48px 48px;
    pointer-events:none;z-index:0;
  }
  .brand-bar{position:fixed;top:0;left:0;right:0;height:3px;
    background:linear-gradient(90deg,#0284C7,#38BDF8,#7DD3FC);z-index:2}
  .card{
    position:relative;z-index:1;width:100%;max-width:420px;
    background:var(--surface);border:1px solid var(--border);
    border-radius:var(--r-xl);padding:2.5rem 2rem;
    box-shadow:var(--shadow),var(--glow);
  }
  .logo{
    display:flex;align-items:center;justify-content:center;
    gap:.625rem;margin-bottom:2rem;text-decoration:none;
  }
  .logo-mark{
    width:38px;height:38px;border-radius:var(--r-md);
    display:grid;place-items:center;
    background:linear-gradient(135deg,#38BDF8 0%,#0284C7 100%);
    box-shadow:0 0 16px rgba(56,189,248,0.3);flex-shrink:0;
  }
  .logo-text{font-size:1.25rem;font-weight:700;letter-spacing:-.03em;color:var(--text)}
  .logo-text span{color:var(--primary)}
  .status-wrap{text-align:center;margin-bottom:1.25rem}
  .status-badge{
    display:inline-flex;align-items:center;gap:.375rem;
    font-size:.75rem;font-weight:500;color:var(--success);
    background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);
    border-radius:var(--r-full);padding:.25rem .625rem;
  }
  .dot{
    width:6px;height:6px;background:var(--success);
    border-radius:50%;animation:pulse 2s ease-in-out infinite;
  }
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.85)}}
  .auth-header{text-align:center;margin-bottom:1.5rem}
  .auth-header h1{font-size:1.375rem;font-weight:600;letter-spacing:-.02em;margin-bottom:.5rem}
  .auth-header p{font-size:.9375rem;line-height:1.6;color:var(--text-muted)}
  .features{
    display:flex;justify-content:center;gap:1rem;
    flex-wrap:wrap;margin-bottom:1.5rem;
  }
  .feature-item{
    display:flex;align-items:center;gap:.375rem;
    font-size:.8125rem;color:var(--text-muted);
  }
  .feature-item svg{color:var(--primary);flex-shrink:0}
  #cf-access-login-form{width:100%;min-height:56px}
  .access-fallback{
    width:100%;padding:1rem 1.125rem;
    border-radius:var(--r-lg);border:1px solid rgba(56,189,248,0.25);
    background:var(--primary-dim);color:var(--text-muted);
    text-align:center;font-size:.875rem;
  }
  .auth-footer{
    margin-top:1.5rem;padding-top:1.25rem;
    border-top:1px solid rgba(148,163,184,0.1);
    text-align:center;font-size:.8125rem;
    line-height:1.7;color:var(--text-faint);
  }
  .auth-footer a{color:var(--text-muted);text-decoration:none;transition:color var(--t)}
  .auth-footer a:hover{color:var(--primary)}
  @media(max-width:480px){
    body{padding:1rem;align-items:flex-start;padding-top:3rem}
    .card{padding:2rem 1.5rem}
  }
  @media(prefers-reduced-motion:reduce){
    *{animation-duration:.01ms!important;transition-duration:.01ms!important}
  }
</style>
</head>
<body>
  <div class="brand-bar" aria-hidden="true"></div>
  <main class="card" role="main">
    <a href="https://insighthunter.app" class="logo" aria-label="InsightHunter home">
      <div class="logo-mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="#0F172A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
          <path d="M11 8v6M8 11h6" stroke-width="2.2"/>
        </svg>
      </div>
      <span class="logo-text">Insight<span>Hunter</span></span>
    </a>
    <div class="status-wrap">
      <span class="status-badge" role="status" aria-live="polite">
        <span class="dot" aria-hidden="true"></span>
        All systems operational
      </span>
    </div>
    <section class="auth-header" aria-labelledby="signin-heading">
      <h1 id="signin-heading">Welcome back</h1>
      <p>Sign in to access your financial intelligence platform.</p>
    </section>
    <section class="features" aria-label="Platform features">
      ${["Bookkeeping","Payroll","Analytics","Scout"].map((f) =>
        `<div class="feature-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>${f}</div>`).join("")}
    </section>
    <div id="cf-access-login-form" role="region" aria-label="Sign in with Cloudflare Access">
      <div class="access-fallback">Cloudflare Access sign-in loading…</div>
    </div>
    ${encodedRedirect
      ? `<input type="hidden" name="redirect" value="${encodedRedirect}" data-nonce="${nonce}">`
      : ""}
    <footer class="auth-footer">
      Protected by
      <a href="https://www.cloudflare.com/zero-trust/" target="_blank" rel="noopener noreferrer">
        Cloudflare Zero Trust</a>
      &nbsp;·&nbsp;
      <a href="https://insighthunter.app/terms" target="_blank" rel="noopener noreferrer">Terms</a>
      &nbsp;·&nbsp;
      <a href="https://insighthunter.app/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
    </footer>
  </main>
</body>
</html>`;
}

// ── Worker Export ────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // ── CORS preflight (all routes) ───────────────────────────────────────
    if (request.method === "OPTIONS") return corsPreflightResponse();

    // ── Health check ──────────────────────────────────────────────────────
    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        service: "auth.insighthunter.app",
        env: env.ENVIRONMENT,
        ts: new Date().toISOString(),
      });
    }

    // ── Registration ─────────────────────────────────────────────────────
    if (url.pathname === "/auth/register") {
      return handleRegister(request, env);
    }

    // ── Email verification ────────────────────────────────────────────────
    if (url.pathname === "/auth/verify") {
      return handleVerify(request, env);
    }

    // ── Access callback ───────────────────────────────────────────────────
    if (url.pathname === "/callback") {
      const token = request.headers.get("Cf-Access-Jwt-Assertion");
      if (!token) {
        return new Response("Missing Access JWT", { status: 401 });
      }

      const accessPayload = await validateAccessJWT(token, env.TEAM_DOMAIN, env.POLICY_AUD);
      if (!accessPayload) {
        console.warn("[auth] /callback: invalid JWT from", request.headers.get("CF-Connecting-IP"));
        return new Response("Invalid or expired Access JWT", { status: 403 });
      }

      const identity = await getIdentity(request, env.TEAM_DOMAIN);
      if (!identity) {
        return new Response("Could not resolve identity", { status: 403 });
      }

      const sessionId = await createSession(env.SESSIONS, identity, SESSION_TTL_SECONDS);

      ctx.waitUntil(
        (async () => {
          try {
            env.AUTH_EVENTS.writeDataPoint({
              blobs: [identity.email, identity.user_uuid, env.ENVIRONMENT],
              doubles: [Date.now()],
              indexes: ["login"],
            });
          } catch (e) {
            console.error("[auth] Analytics write failed:", e);
          }
        })(),
      );

      const redirectTo = sanitizeRedirect(url.searchParams.get("redirect"));
      const headers = new Headers();
      headers.set("Location", redirectTo);
      headers.append(
        "Set-Cookie",
        buildSecureCookie("ih_session", sessionId, env.COOKIE_DOMAIN, SESSION_TTL_SECONDS),
      );

      return new Response(null, { status: 302, headers });
    }

    // ── Login page (default) ──────────────────────────────────────────────
    const redirect = sanitizeRedirect(url.searchParams.get("redirect") || null);
    return new Response(loginPageHTML(redirect), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    });
  },
} satisfies ExportedHandler<Env>;
