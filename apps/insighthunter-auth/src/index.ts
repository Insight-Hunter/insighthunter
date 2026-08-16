// apps/insighthunter-auth/src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";

export interface Env {
  USER_REGISTRY: KVNamespace; // maps email -> userId -> workerId
  AUTH_SECRET: string; // JWT signing secret
  DISPATCH_NAMESPACE: DispatchNamespace; // Workers for Platforms binding
}

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: ["https://insighthunter.app", "https://app.insighthunter.app"],
    credentials: true,
  }),
);

app.post("/register", async (c) => {
  const { email, password } = await c.req.json();
  const userId = crypto.randomUUID();

  // Each user gets an isolated Worker via Workers for Platforms (Dispatch Namespace)
  // This ensures zero shared database/state between customers.
  await c.env.DISPATCH_NAMESPACE.put(`user-${userId}`, USER_WORKER_SCRIPT, {
    tags: [`user:${userId}`],
  });

  const passwordHash = await hashPassword(password);
  await c.env.USER_REGISTRY.put(email, JSON.stringify({ userId, passwordHash }));

  const token = await signJWT({ userId, email }, c.env.AUTH_SECRET);
  return c.json({ token, userId });
});

app.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  const record = await c.env.USER_REGISTRY.get(email);
  if (!record) return c.json({ error: "Invalid credentials" }, 401);

  const { userId, passwordHash } = JSON.parse(record);
  const valid = await verifyPassword(password, passwordHash);
  if (!valid) return c.json({ error: "Invalid credentials" }, 401);

  const token = await signJWT({ userId, email }, c.env.AUTH_SECRET);
  return c.json({ token, userId });
});

app.get("/session", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return c.json({ error: "No token" }, 401);
  try {
    const payload = await verifyJWT(authHeader.slice(7), c.env.AUTH_SECRET);
    return c.json({ valid: true, ...payload });
  } catch {
    return c.json({ valid: false }, 401);
  }
});

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return (await hashPassword(password)) === hash;
}

async function signJWT(payload: object, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "");
  const data = `${enc(header)}.${enc(payload)}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, "")}`;
}

async function verifyJWT(token: string, secret: string): Promise<any> {
  const [h, p, s] = token.split(".");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
    new TextEncoder().encode(`${h}.${p}`),
  );
  if (!valid) throw new Error("Invalid signature");
  return JSON.parse(atob(p));
}

const USER_WORKER_SCRIPT = `export default { async fetch(req, env) { return new Response("isolated user worker"); } }`;

export default app;
