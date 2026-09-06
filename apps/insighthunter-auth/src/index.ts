import { hashPassword, verifyPassword, signSession, verifySession } from "./crypto";
import type { Env } from "./types";

const APP_ORIGIN = "https://app.insighthunter.app";
const ALLOWED_PLANS = new Set(["lite", "standard", "pro"]);
const SESSION_COOKIE = "ih_session";

const securityHeaders: HeadersInit = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; style-src 'self' 'unsafe-inline';",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

function html(body: string, status = 200, headers: HeadersInit = {}): Response {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Insight Hunter</title><style>body{margin:0;background:#f7f2ec;color:#2b2118;font:16px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.card{box-sizing:border-box;width:min(100% - 2rem,28rem);margin:8vh auto;padding:2rem;background:#fffdf9;border:1px solid #dfd6ce;border-radius:1rem;box-shadow:0 1rem 2.5rem rgb(43 33 24 / .08)}h1{margin:0 0 .5rem;font-size:2rem}p{line-height:1.5;color:#675d55}.field{display:grid;gap:.4rem;margin:1rem 0}input{box-sizing:border-box;width:100%;padding:.75rem;border:1px solid #b9afa5;border-radius:.5rem;font:inherit}button{box-sizing:border-box;width:100%;margin-top:.5rem;padding:.8rem;border:0;border-radius:.5rem;background:#8b5e3c;color:#fff;font:inherit;font-weight:700;cursor:pointer}a{color:#8b5e3c;font-weight:700}.error{padding:.75rem;border-radius:.5rem;background:#fee8e6;color:#8a1c12}</style></head><body>${body}</body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=UTF-8", ...securityHeaders, ...headers },
  });
}

function safeReturnTo(value: string | null): string {
  if (!value) return `${APP_ORIGIN}/dashboard`;
  try {
    const url = new URL(value);
    if (url.origin === APP_ORIGIN && url.pathname.startsWith("/dashboard")) return url.toString();
  } catch {
    // Fall through to the fixed dashboard destination.
  }
  return `${APP_ORIGIN}/dashboard`;
}

function safePlan(value: string | null): string {
  return value && ALLOWED_PLANS.has(value) ? value : "lite";
}

function formValue(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function authPage(mode: "login" | "register", returnTo: string, plan: string, error?: string): Response {
  const isLogin = mode === "login";
  const action = isLogin ? "/login" : "/register";
  const alternate = isLogin ? "/register" : "/login";
  const alternateLabel = isLogin ? "Create an account" : "Log in";
  const title = isLogin ? "Log in to Insight Hunter" : "Create your Insight Hunter account";
  const message = isLogin ? "Access your financial dashboard." : `Start with the ${formValue(plan)} plan. You can upgrade later.`;
  const errorHtml = error ? `<p class="error" role="alert">${formValue(error)}</p>` : "";
  const planField = isLogin ? "" : `<input type="hidden" name="plan" value="${formValue(plan)}">`;
  const nameField = isLogin ? "" : `<label class="field">Full name<input name="name" autocomplete="name" required maxlength="120"></label>`;

  return html(`<main class="card"><h1>${title}</h1><p>${message}</p>${errorHtml}<form method="post" action="${action}"><input type="hidden" name="returnTo" value="${formValue(returnTo)}">${planField}${nameField}<label class="field">Email<input type="email" name="email" autocomplete="email" required maxlength="254"></label><label class="field">Password<input type="password" name="password" autocomplete="${isLogin ? "current-password" : "new-password"}" required minlength="12" maxlength="128"></label><button type="submit">${isLogin ? "Log in" : "Create account"}</button></form><p>${isLogin ? "New to Insight Hunter?" : "Already have an account?"} <a href="${alternate}?returnTo=${encodeURIComponent(returnTo)}${isLogin ? `&plan=${encodeURIComponent(plan)}` : ""}">${alternateLabel}</a></p></main>`);
}

function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`;
}

function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function parseForm(request: Request): Promise<{ email: string; password: string; name: string; plan: string; returnTo: string }> {
  const form = await request.formData();
  return {
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
    name: String(form.get("name") ?? "").trim(),
    plan: safePlan(String(form.get("plan") ?? "lite")),
    returnTo: safeReturnTo(String(form.get("returnTo") ?? "")),
  };
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
    const plan = safePlan(url.searchParams.get("plan"));

    if (method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true, service: "insighthunter-auth" }, { headers: securityHeaders });
    }

    if (method === "GET" && url.pathname === "/") {
      return Response.redirect(new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, url.origin), 302);
    }

    if (method === "GET" && url.pathname === "/login") {
      return authPage("login", returnTo, plan);
    }

    if (method === "GET" && url.pathname === "/register") {
      return authPage("register", returnTo, plan);
    }

    if (method === "POST" && url.pathname === "/register") {
      const { email, password, name, plan: selectedPlan, returnTo: destination } = await parseForm(request);
      if (!validEmail(email) || password.length < 12 || name.length < 2 || name.length > 120) {
        return authPage("register", destination, selectedPlan, "Please provide a valid name, email, and a password of at least 12 characters.");
      }

      const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?1").bind(email).first<{ id: string }>();
      if (existing) {
        return authPage("register", destination, selectedPlan, "Unable to create this account. Try logging in or use another email address.");
      }

      const id = crypto.randomUUID();
      const passwordHash = await hashPassword(password);
      await env.DB.prepare("INSERT INTO users (id, email, password_hash, name, plan, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
        .bind(id, email, passwordHash, name, selectedPlan, new Date().toISOString())
        .run();

      const token = await signSession({ sub: id, email }, env);
      return Response.redirect(destination, 303, { headers: { ...securityHeaders, "Set-Cookie": sessionCookie(token) } });
    }

    if (method === "POST" && url.pathname === "/login") {
      const { email, password, returnTo: destination } = await parseForm(request);
      const user = validEmail(email)
        ? await env.DB.prepare("SELECT id, email, password_hash FROM users WHERE email = ?1").bind(email).first<{ id: string; email: string; password_hash: string }>()
        : null;
      const valid = user ? await verifyPassword(password, user.password_hash) : false;
      if (!user || !valid) {
        return authPage("login", destination, plan, "Invalid email or password.");
      }

      const token = await signSession({ sub: user.id, email: user.email }, env);
      return Response.redirect(destination, 303, { headers: { ...securityHeaders, "Set-Cookie": sessionCookie(token) } });
    }

    if (method === "POST" && url.pathname === "/logout") {
      return Response.redirect(new URL("/login", url.origin), 303, { headers: { ...securityHeaders, "Set-Cookie": clearSessionCookie() } });
    }

    if (url.pathname === "/session" && method === "GET") {
      const cookie = request.headers.get("Cookie") ?? "";
      const token = cookie.split("; ").find((entry) => entry.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
      if (!token) return Response.json({ authenticated: false }, { status: 401, headers: securityHeaders });
      const session = await verifySession(token, env);
      if (!session) return Response.json({ authenticated: false }, { status: 401, headers: securityHeaders });
      return Response.json({ authenticated: true, session }, { headers: securityHeaders });
    }

    return new Response("Not found", { status: 404, headers: securityHeaders });
  },
};
