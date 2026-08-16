// apps/insighthunter-auth/src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  AUTH_KV: KVNamespace;
  JWT_SECRET: string;
  USER_VAULT: DurableObjectNamespace;
}

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function signJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const header = { alg: "HS256", typ: "JWT" };
  const enc = (o: unknown) => btoa(JSON.stringify(o)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const data = `${enc(header)}.${enc({ ...payload, iat: Date.now() })}`;
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const b64sig = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${data}.${b64sig}`;
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({
  origin: ["https://insighthunter.app", "https://app.insighthunter.app"],
  credentials: true,
}));

app.post("/register", async (c) => {
  const { email, password, tier } = await c.req.json();
  if (!email || !password) return c.json({ error: "email and password required" }, 400);

  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return c.json({ error: "email already registered" }, 409);

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const vaultDoId = c.env.USER_VAULT.newUniqueId().toString();

  await c.env.DB.prepare(
    "INSERT INTO users (id, email, password_hash, tier, vault_do_id, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(userId, email, passwordHash, tier ?? "startup", vaultDoId, Date.now()).run();

  const token = await signJWT({ userId, email }, c.env.JWT_SECRET);
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
  await c.env.SESSIONS.put(token, JSON.stringify({ userId, email }), { expirationTtl: 60 * 60 * 24 * 7 });

  return c.json({ userId, email, tier: tier ?? "startup", token, expiresAt });
});

app.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!user) return c.json({ error: "invalid credentials" }, 401);

  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.password_hash) return c.json({ error: "invalid credentials" }, 401);

  const token = await signJWT({ userId: user.id, email }, c.env.JWT_SECRET);
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
  await c.env.SESSIONS.put(token, JSON.stringify({ userId: user.id, email }), { expirationTtl: 60 * 60 * 24 * 7 });

  return c.json({ userId: user.id, email, tier: user.tier, token, expiresAt });
});

app.get("/session", async (c) => {
  const auth = c.req.header("Authorization");
  const token = auth?.replace("Bearer ", "");
  if (!token) return c.json({ error: "No token" }, 401);

  const session = await c.env.SESSIONS.get(token);
  if (!session) return c.json({ valid: false }, 401);

  const { userId, email } = JSON.parse(session);
  return c.json({ valid: true, userId, email });
});

app.post("/logout", async (c) => {
  const auth = c.req.header("Authorization");
  const token = auth?.replace("Bearer ", "");
  if (token) await c.env.SESSIONS.delete(token);
  return c.json({ ok: true });
});

export default app;

export class UserVault {
  state: DurableObjectState;
  constructor(state: DurableObjectState) {
    this.state = state;
  }
  async fetch(request: Request): Promise<Response> {
    return new Response("UserVault storage ready", { status: 200 });
  }
}
