// insighthunter-auth — Authentication Worker
// Handles: register, login, logout, session read, session verify (Service Binding)
import { hashPassword, verifyPassword, signSession, verifySession } from "./crypto.js";
import { sendPasswordResetEmail } from "./lib/email.js";
import type { Env, Tier, OrgRole, SessionPayload } from "./types.js";

export { UserVault } from "./vault.js";

const APP_ORIGIN     = "https://app.insighthunter.app";
const MARKETING_ORIGIN = "https://insighthunter.app";
const SESSION_COOKIE = "ih_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

const ALLOWED_TIERS = new Set<Tier>(["lite", "standard", "pro", "enterprise"]);

const securityHeaders: HeadersInit = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; style-src 'self' 'unsafe-inline';",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Access-Control-Allow-Origin": "https://insighthunter.app",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

function jsonAuthResponse(token: string, session: SessionPayload): Response {
  return Response.json({ token, ...session }, { headers: securityHeaders });
}

function isJsonRequest(request: Request): boolean {
  return (request.headers.get("Content-Type") ?? "").includes("application/json");
}

function jsonAuthError(error: string, status: number): Response {
  return Response.json({ error }, { status, headers: securityHeaders });
}

function resetToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
}

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
    if (url.origin === APP_ORIGIN || url.origin === MARKETING_ORIGIN) return url.toString();
  } catch { /* fall through */ }
  return `${APP_ORIGIN}/`;
}

function redirectWithToken(returnTo: string, token: string): string {
  const url = new URL(returnTo);
  url.searchParams.set("token", token);
  return url.toString();
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
  const values = isJsonRequest(request) ? await request.json<Record<string, unknown>>() : Object.fromEntries(await request.formData());
  return {
    email:    String(values["email"] ?? "").trim().toLowerCase(),
    password: String(values["password"] ?? ""),
    name:     String(values["name"] ?? "").trim(),
    orgName:  String(values["orgName"] ?? "").trim(),
    tier:     safeTier(String(values["tier"] ?? values["plan"] ?? "lite")),
    returnTo: safeReturnTo(String(values["returnTo"] ?? "")),
  };
}

function rateKey(scope: "ip" | "email", value: string): string { return `login-rate:${scope}:${value.toLowerCase()}`; }
async function rateLimitExceeded(env: Env, ip: string, email: string): Promise<boolean> {
  const [ipCount, emailCount] = await Promise.all([env.SESSIONS.get<number>(rateKey("ip", ip)), env.SESSIONS.get<number>(rateKey("email", email))]);
  return (ipCount ?? 0) >= 10 || (emailCount ?? 0) >= 10;
}
async function recordFailedLogin(env: Env, ip: string, email: string): Promise<void> {
  const entries: ["ip" | "email", string][] = [["ip", ip], ["email", email]];
  await Promise.all(entries.map(async ([scope, value]) => {
    const key = rateKey(scope as "ip" | "email", value);
    const count = (await env.SESSIONS.get<number>(key)) ?? 0;
    await env.SESSIONS.put(key, String(count + 1), { expirationTtl: 900 });
  }));
}
async function clearLoginRateLimit(env: Env, ip: string, email: string): Promise<void> {
  await Promise.all([env.SESSIONS.delete(rateKey("ip", ip)), env.SESSIONS.delete(rateKey("email", email))]);
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
      ${isLogin ? '<p><a href="/forgot-password">Forgot your password?</a></p>' : ""}
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

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: securityHeaders });
    }

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

    if (method === "GET" && url.pathname === "/forgot-password") {
      return html(`<main class="card"><h1>Reset your password</h1><p>Enter your email and we'll send a reset link if an account exists.</p><form method="post" action="/forgot-password"><label class="field">Email<input type="email" name="email" autocomplete="email" required maxlength="254"></label><button type="submit">Send reset link</button></form><p><a href="/login">Back to log in</a></p></main>`);
    }

    if (method === "GET" && url.pathname === "/reset-password") {
      const token = escape(url.searchParams.get("token") ?? "");
      return html(`<main class="card"><h1>Choose a new password</h1><form method="post" action="/reset-password"><input type="hidden" name="token" value="${token}"><label class="field">New password<input type="password" name="password" autocomplete="new-password" required minlength="12" maxlength="128"></label><button type="submit">Update password</button></form></main>`);
    }

    if (method === "POST" && url.pathname === "/forgot-password") {
      const { email } = await parseForm(request);
      if (validEmail(email)) {
        const user = await env.DB.prepare("SELECT id FROM users WHERE email = ?1")
          .bind(email).first<{ id: string }>();
        if (user) {
          const token = resetToken();
          const expiresAt = Date.now() + 60 * 60 * 1000;
          await env.DB.prepare("DELETE FROM password_resets WHERE user_id = ?1 OR expires_at < ?2")
            .bind(user.id, Date.now()).run();
          await env.DB.prepare(
            "INSERT INTO password_resets (user_id, token, used, expires_at, created_at) VALUES (?1, ?2, 0, ?3, ?4)"
          ).bind(user.id, token, expiresAt, Date.now()).run();
          try {
            await sendPasswordResetEmail(env.SEND_EMAIL, email, token);
          } catch (error) {
            console.error("password reset email failed", error);
          }
        }
      }
      if (!isJsonRequest(request)) {
        return html("<main class=\"card\"><h1>Check your email</h1><p>If an account exists for that email, a reset link is on its way.</p><p><a href=\"/login\">Back to log in</a></p></main>");
      }
      return Response.json({ ok: true }, { headers: securityHeaders });
    }

    if (method === "POST" && url.pathname === "/reset-password") {
      const values = isJsonRequest(request)
        ? await request.json<Record<string, unknown>>()
        : Object.fromEntries(await request.formData());
      const token = String(values["token"] ?? "");
      const password = String(values["password"] ?? "");
      if (!token || password.length < 12) {
        if (!isJsonRequest(request)) return html("<main class=\"card\"><h1>Reset link invalid</h1><p>This reset link is invalid or expired.</p><p><a href=\"/forgot-password\">Request another link</a></p></main>", 400);
        return jsonAuthError("invalid_reset", 400);
      }

      const reset = await env.DB.prepare(
        "SELECT user_id FROM password_resets WHERE token = ?1 AND used = 0 AND expires_at > ?2"
      ).bind(token, Date.now()).first<{ user_id: string }>();
      if (!reset) {
        if (!isJsonRequest(request)) return html("<main class=\"card\"><h1>Reset link invalid</h1><p>This reset link is invalid or expired.</p><p><a href=\"/forgot-password\">Request another link</a></p></main>", 400);
        return jsonAuthError("invalid_reset", 400);
      }

      const passwordHash = await hashPassword(password);
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET password_hash = ?1, updated_at = ?2 WHERE id = ?3")
          .bind(passwordHash, Date.now(), reset.user_id),
        env.DB.prepare("UPDATE password_resets SET used = 1 WHERE token = ?1").bind(token),
      ]);
      if (!isJsonRequest(request)) return Response.redirect(`${url.origin}/login?reset=success`, 303);
      return Response.json({ ok: true }, { headers: securityHeaders });
    }

    // ── POST /register ───────────────────────────────────────────────────────
    if (method === "POST" && url.pathname === "/register") {
      const { email, password, name, orgName, tier, returnTo } = await parseForm(request);
      const jsonRequest = isJsonRequest(request);

      if (!validEmail(email) || password.length < 12 || (!jsonRequest && (name.length < 2 || name.length > 120))) {
        if (jsonRequest) return jsonAuthError("invalid_registration", 400);
        return authPage("register", returnTo, tier,
          "Please provide a valid name, email, and a password of at least 12 characters.");
      }

      const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?1")
        .bind(email).first<{ id: string }>();
      if (existing) {
        if (jsonRequest) return jsonAuthError("email_in_use", 409);
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
      if ((request.headers.get("Content-Type") ?? "").includes("application/json")) {
        return jsonAuthResponse(token, { userId: id, email, name, orgName: orgName || name, role: "owner", tier, issuedAt: now, expiresAt: now + SESSION_TTL_MS });
      }
      return new Response(null, {
        status: 303,
        headers: { Location: redirectWithToken(returnTo, token), "Set-Cookie": sessionCookie(token), ...securityHeaders },
      });
    }

    // ── POST /login ──────────────────────────────────────────────────────────
    if (method === "POST" && url.pathname === "/login") {
  const { email, password, returnTo, tier: tierParam } = await parseForm(request);
      const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
      const jsonRequest = isJsonRequest(request);
      if (await rateLimitExceeded(env, ip, email)) {
        if (jsonRequest) return jsonAuthError("rate_limited", 429);
    return authPage("login", returnTo, tierParam, "Too many login attempts. Try again later.");
  }
      const user = validEmail(email)
        ? await env.DB.prepare(
            "SELECT id, email, password_hash, name, org_name, role, tier FROM users WHERE email = ?1"
          ).bind(email).first<UserRow>()
        : null;

      const valid = user ? await verifyPassword(password, user.password_hash) : false;
      if (!user || !valid) {
        await recordFailedLogin(env, ip, email);
        if (jsonRequest) return jsonAuthError("invalid_credentials", 401);
        return authPage("login", returnTo, tierParam, "Invalid email or password.");
      }
      await clearLoginRateLimit(env, ip, email);

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
      if (jsonRequest) {
        return jsonAuthResponse(token, { userId: user.id, email: user.email, name: user.name, orgName: user.org_name, role: user.role, tier: user.tier, issuedAt: now, expiresAt: now + SESSION_TTL_MS });
      }
      return new Response(null, {
        status: 303,
        headers: { Location: redirectWithToken(returnTo, token), "Set-Cookie": sessionCookie(token), ...securityHeaders },
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
    // Called internally via env.AUTH_SERVICE.fetch(). Accepts ****** Cookie token.
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
