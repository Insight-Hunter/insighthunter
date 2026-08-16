import { hashPassword, verifyPassword, signSession, verifySession } from "./crypto";
import type { Env, LoginRequest, RegisterRequest, UserRecord } from "./types";

export { UserVault } from "./vault";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h
const RATE_LIMIT_WINDOW_S = 60;
const RATE_LIMIT_MAX = 10; // per IP per window, per route

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(env, request);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    try {
      const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";

      if (url.pathname === "/register" && request.method === "POST") {
        if (await isRateLimited(env, `register:${ip}`)) return tooManyRequests(cors);
        return withCors(await handleRegister(request, env), cors);
      }

      if (url.pathname === "/login" && request.method === "POST") {
        if (await isRateLimited(env, `login:${ip}`)) return tooManyRequests(cors);
        return withCors(await handleLogin(request, env, ip), cors);
      }

      if (url.pathname === "/logout" && request.method === "POST") {
        return withCors(await handleLogout(request, env), cors);
      }

      if (url.pathname === "/session/verify" && request.method === "GET") {
        return withCors(await handleVerify(request, env), cors);
      }

      return withCors(new Response("Not found", { status: 404 }), cors);
    } catch (err) {
      console.error("auth worker error:", err);
      return withCors(
        Response.json({ error: "internal_error" }, { status: 500 }),
        cors
      );
    }
  },
} satisfies ExportedHandler<Env>;

async function handleRegister(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as RegisterRequest;
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const tier = body.tier ?? "startup";

  if (!email || !isValidEmail(email)) {
    return Response.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!password || password.length < 10) {
    return Response.json(
      { error: "weak_password", detail: "minimum 10 characters" },
      { status: 400 }
    );
  }
  if (!["startup", "standard", "pro"].includes(tier)) {
    return Response.json({ error: "invalid_tier" }, { status: 400 });
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (existing) {
    return Response.json({ error: "email_in_use" }, { status: 409 });
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const vaultDoId = env.USER_VAULT.newUniqueId().toString();
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO users (id, email, password_hash, tier, status, vault_do_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`
  )
    .bind(userId, email, passwordHash, tier, vaultDoId, now, now)
    .run();

  await env.DB.prepare(
    `INSERT INTO audit_log (user_id, event, created_at) VALUES (?, 'register', ?)`
  )
    .bind(userId, now)
    .run();

  const token = await signSession(
    { userId, email, tier, issuedAt: now, expiresAt: now + SESSION_TTL_MS },
    env.SESSION_SECRET
  );
  await env.SESSIONS.put(`session:${token}`, userId, {
    expirationTtl: SESSION_TTL_MS / 1000,
  });

  return Response.json(
    { userId, email, tier, token, expiresAt: now + SESSION_TTL_MS },
    { status: 201 }
  );
}

async function handleLogin(request: Request, env: Env, ip: string): Promise<Response> {
  const body = (await request.json()) as LoginRequest;
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) {
    return Response.json({ error: "missing_credentials" }, { status: 400 });
  }

  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
    .bind(email)
    .first<UserRecord>();

  const now = Date.now();

  if (!user || user.status !== "active" || !(await verifyPassword(password, user.password_hash))) {
    await env.DB.prepare(
      `INSERT INTO audit_log (user_id, event, ip, created_at) VALUES (?, 'login_failed', ?, ?)`
    )
      .bind(user?.id ?? null, ip, now)
      .run();
    return Response.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = await signSession(
    { userId: user.id, email: user.email, tier: user.tier, issuedAt: now, expiresAt: now + SESSION_TTL_MS },
    env.SESSION_SECRET
  );
  await env.SESSIONS.put(`session:${token}`, user.id, {
    expirationTtl: SESSION_TTL_MS / 1000,
  });
  await env.DB.prepare(
    `INSERT INTO audit_log (user_id, event, ip, created_at) VALUES (?, 'login', ?, ?)`
  )
    .bind(user.id, ip, now)
    .run();

  return Response.json({
    userId: user.id,
    email: user.email,
    tier: user.tier,
    token,
    expiresAt: now + SESSION_TTL_MS,
  });
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const token = bearerToken(request);
  if (!token) return Response.json({ error: "missing_token" }, { status: 400 });
  await env.SESSIONS.delete(`session:${token}`);
  return Response.json({ loggedOut: true });
}

async function handleVerify(request: Request, env: Env): Promise<Response> {
  const token = bearerToken(request);
  if (!token) return Response.json({ error: "missing_token" }, { status: 401 });

  const payload = await verifySession(token, env.SESSION_SECRET);
  if (!payload) return Response.json({ error: "invalid_or_expired" }, { status: 401 });

  // Confirm the token hasn't been revoked (logout) via KV lookup.
  const stillValid = await env.SESSIONS.get(`session:${token}`);
  if (!stillValid) return Response.json({ error: "session_revoked" }, { status: 401 });

  return Response.json({ valid: true, ...payload });
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function isRateLimited(env: Env, key: string): Promise<boolean> {
  const countRaw = await env.SESSIONS.get(`ratelimit:${key}`);
  const count = countRaw ? parseInt(countRaw, 10) : 0;
  if (count >= RATE_LIMIT_MAX) return true;
  await env.SESSIONS.put(`ratelimit:${key}`, String(count + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_S,
  });
  return false;
}

function corsHeaders(env: Env, request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  const allowed = origin === env.ALLOWED_ORIGIN ? origin : env.ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

function withCors(response: Response, cors: HeadersInit): Response {
  const merged = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors as Record<string, string>)) {
    merged.set(k, v);
  }
  return new Response(response.body, { status: response.status, headers: merged });
}

function tooManyRequests(cors: HeadersInit): Response {
  return withCors(Response.json({ error: "rate_limited" }, { status: 429 }), cors);
}
