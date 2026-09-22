// insighthunter-auth — Authentication Worker
// Handles: register, login, logout, session read, session verify (Service Binding)
import { hashPassword, verifyPassword, signSession, verifySession } from "./crypto.js";
import type { Env, Tier, OrgRole } from "./types.js";

const APP_ORIGIN     = "https://app.insighthunter.app";
const SESSION_COOKIE = "ih_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

const ALLOWED_TIERS = new Set<Tier>(["lite", "standard", "pro", "enterprise"]);

const securityHeaders: HeadersInit = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; style-src 'self' 'unsafe-inline';",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

// ── HTML helpers ──────────────────────────────────────────────────────────────

function html(body: string, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Insight Hunter</title><style>body{margin:0;background:#f7f2ec;color:#2b2118;font:16px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.card{box-sizing:border-box;width:min(100% - 2rem,28rem);margin:8vh auto;padding:2rem;background:#fffdf9;border:1px solid #dfd6ce;border-radius:1rem;box-shadow:0 1rem 2.5rem rgb(43 33 24 / .08)}h1{margin:0 0 .5rem;font-size:2rem}p{line-height:1.5;color:#675d55}.field{display:grid;gap:.4rem;margin:1rem 0}input{box-sizing:border-box;width:100%;padding:.75rem;border:1px solid #b9afa5;border-radius:.5rem;font:inherit}button{box-sizing:border-box;width:100%;margin-top:.5rem;padding:.8rem;border:0;border-radius:.5rem;background:#8b5e3c;color:#fff;font:inherit;font-weight:700;cursor:pointer}a{color:#8b5e3c;font-weight:700}.error{padding:.75rem;border-radius:.5rem;background:#fee8e6;color:#8a1c12}</style></head><body>${body}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=UTF-8", ...securityHeaders, ...extraHeaders } }
  );
}

function escape(value: string): string {
  return value.replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c] ?? c);
}

// ── Validation helpers ────────────────────────────────────────────────────────

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function safeTier(value: string | null): Tier {
  return value && ALLOWED_TIERS.has(value as Tier) ? (value as Tier) : "lite";
}

function safeReturnTo(value: string | null): string {
  if (!value) return `${APP_ORIGIN}/`;
  try {
    const url = new URL(value);
    if (url.origin === APP_ORIGIN) return url.toString();
  } catch { /* fall through */ }
  return `${APP_ORIGIN}/`;
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`;
}
function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
function cookieToken(request: Request): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match  = cookie.match(/(?:^|;\s*)ih_session=([^;]+)/);
  const raw    = match?.[1];
  if (!raw) return null;
  try { return decodeURIComponent(raw); } catch { return null; }
}
function bearerToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}

// ── Form parsing ──────────────────────────────────────────────────────────────

async function parseForm(request: Request) {
  const form = await request.formData();
  return {
    email:    String(form.get("email")   ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
    name:     String(form.get("name")    ?? "").trim(),
    orgName:  String(form.get("orgName") ?? "").trim(),
    tier:     safeTier(String(form.get("tier") ?? "lite")),
    returnTo: safeReturnTo(String(form.get("returnTo") ?? "")),
  };
}

// ── Auth page renderer ────────────────────────────────────────────────────────

function authPage(mode: "login" | "register", returnTo: string, tier: Tier, error?: string): Response {
  const isLogin = mode === "login";
  const title   = isLogin ? "Log in to Insight Hunter" : "Create your Insight Hunter account";
  const message = isLogin ? "Access your financial dashboard." : `Start with the ${escape(tier)} plan. Upgrade any time.`;
  const errorHtml   = error ? `<p class="error" role="alert">${escape(error)}</p>` : "";
  const extraFields = isLogin ? "" : `
    <input type="hidden" name="tier" value="${escape(tier)}">
    <label class="field">Full name<input name="name" autocomplete="name" required maxlength="120"></label>
    <label class="field">Organisation name<input name="orgName" autocomplete="organization" maxlength="120"></label>`;
  const action    = isLogin ? "/login" : "/register";
  const altHref   = isLogin ? `/register?returnTo=${encodeURIComponent(returnTo)}&tier=${tier}` : `/login?returnTo=${encodeURIComponent(returnTo)}`;
  const altLabel  = isLogin ? "Create an account" : "Log in";

  return html(
    `<main class="card">
      <h1>${title}</h1><p>${message}</p>${errorHtml}
      <form method="post" action="${action}">
        <input type="hidden" name="returnTo" value="${escape(returnTo)}">
        ${extraFields}
        <label class="field">Email<input type="email" name="email" autocomplete="email" required maxlength="254"></label>
        <label class="field">Password<input type="password" name="password" autocomplete="${isLogin ? "current-password" : "new-password"}" required minlength="12" maxlength="128"></label>
        <button type="submit">${isLogin ? "Log in" : "Create account"}</button>
      </form>
      <p>${isLogin ? "New?" : "Already have an account?"} <a href="${altHref}">${altLabel}</a></p>
    </main>`
  );
}

// ── DB row type ───────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  org_name: string;
  role: OrgRole;
  tier: Tier;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url    = new URL(request.url);
    const method = request.method.toUpperCase();

    // ── Health ──────────────────────────────────────────────────────────────
    if (method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true, service: "insighthunter-auth" }, { headers: securityHeaders });
    }

    // ── Root redirect ────────────────────────────────────────────────────────
    if (method === "GET" && url.pathname === "/") {
      const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
      return Response.redirect(`${url.origin}/login?returnTo=${encodeURIComponent(returnTo)}`, 302);
    }

    // ── Login page ───────────────────────────────────────────────────────────
    if (method === "GET" && url.pathname === "/login") {
      return authPage("login",
        safeReturnTo(url.searchParams.get("returnTo")),
        safeTier(url.searchParams.get("tier"))
      );
    }

    // ── Register page ────────────────────────────────────────────────────────
    if (method === "GET" && url.pathname === "/register") {
      return authPage("register",
        safeReturnTo(url.searchParams.get("returnTo")),
        safeTier(url.searchParams.get("tier"))
      );
    }

    // ── POST /register ───────────────────────────────────────────────────────
    if (method === "POST" && url.pathname === "/register") {
      const { email, password, name, orgName, tier, returnTo } = await parseForm(request);

      if (!validEmail(email) || password.length < 12 || name.length < 2 || name.length > 120) {
        return authPage("register", returnTo, tier,
          "Please provide a valid name, email, and a password of at least 12 characters.");
      }

      const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?1")
        .bind(email).first<{ id: string }>();
      if (existing) {
        return authPage("register", returnTo, tier,
          "Unable to create this account. Try logging in or use another email.");
      }

      const now          = Date.now();
      const id           = crypto.randomUUID();
      const passwordHash = await hashPassword(password);

      await env.DB.prepare(
        `INSERT INTO users (id, email, password_hash, name, org_name, role, tier, status, vault_do_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'owner', ?6, 'active', '', ?7, ?7)`
      ).bind(id, email, passwordHash, name, orgName || name, tier, now).run();

      const token = await signSession(
        { userId: id, email, name, orgName: orgName || name, role: "owner", tier, issuedAt: now, expiresAt: now + SESSION_TTL_MS },
        env.SESSION_SECRET
      );
      return new Response(null, {
        status: 303,
        headers: { Location: returnTo, "Set-Cookie": sessionCookie(token), ...securityHeaders },
      });
    }

    // ── POST /login ──────────────────────────────────────────────────────────
    if (method === "POST" && url.pathname === "/login") {
      const { email, password, returnTo, tier: tierParam } = await parseForm(request);

      const user = validEmail(email)
        ? await env.DB.prepare(
            "SELECT id, email, password_hash, name, org_name, role, tier FROM users WHERE email = ?1"
          ).bind(email).first<UserRow>()
        : null;

      const valid = user ? await verifyPassword(password, user.password_hash) : false;
      if (!user || !valid) {
        return authPage("login", returnTo, tierParam, "Invalid email or password.");
      }

      const now = Date.now();
      const token = await signSession(
        {
          userId:  user.id,
          email:   user.email,
          name:    user.name,
          orgName: user.org_name,
          role:    user.role,
          tier:    user.tier,
          issuedAt:  now,
          expiresAt: now + SESSION_TTL_MS,
        },
        env.SESSION_SECRET
      );
      return new Response(null, {
        status: 303,
        headers: { Location: returnTo, "Set-Cookie": sessionCookie(token), ...securityHeaders },
      });
    }

    // ── POST /logout ─────────────────────────────────────────────────────────
    if (method === "POST" && url.pathname === "/logout") {
      return new Response(null, {
        status: 303,
        headers: { Location: `${url.origin}/login`, "Set-Cookie": clearSessionCookie(), ...securityHeaders },
      });
    }

    // ── GET /session — cookie-based read (used by browser JS) ────────────────
    if (method === "GET" && url.pathname === "/session") {
      const token   = cookieToken(request);
      const session = token ? await verifySession(token, env.SESSION_SECRET) : null;
      if (!session) return Response.json({ authenticated: false }, { status: 401, headers: securityHeaders });
      return Response.json({
        authenticated: true,
        userId:  session.userId,
        email:   session.email,
        name:    session.name,
        orgName: session.orgName,
        role:    session.role,
        tier:    session.tier,
      }, { headers: securityHeaders });
    }

    // ── GET /session/verify — Service Binding endpoint for insighthunter-dashboard ──
    // Called internally via env.AUTH_SERVICE.fetch(). Accepts Bearer token.
    // Returns the Session shape expected by insighthunter-dashboard's Session interface.
    if (method === "GET" && url.pathname === "/session/verify") {
      const token   = bearerToken(request) ?? cookieToken(request);
      const session = token ? await verifySession(token, env.SESSION_SECRET) : null;
      if (!session) {
        return Response.json({ valid: false }, { status: 401, headers: securityHeaders });
      }
      return Response.json({
        valid:   true,
        userId:  session.userId,
        email:   session.email,
        name:    session.name,
        orgName: session.orgName,
        role:    session.role,
        tier:    session.tier,
      }, { headers: securityHeaders });
    }

    return new Response("Not found", { status: 404, headers: securityHeaders });
  },
};
