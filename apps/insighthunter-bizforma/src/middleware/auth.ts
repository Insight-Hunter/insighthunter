// middleware/auth.ts — JWT auth middleware for BizForma
import type { Context, Next } from "hono";
import type { BizformaEnv } from "../types.js";

interface JWTPayload {
  sub: string;
  org: string;
  role: string;
  email: string;
  name?: string;
  exp: number;
}

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    orgId: string;
    role: string;
    email: string;
    name: string;
  }
}

export async function requireAuth(
  c: Context<{ Bindings: BizformaEnv }>,
  next: Next
): Promise<Response | void> {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return c.json({ error: "Unauthorized", code: "MISSING_TOKEN" }, 401);

  const payload = await verifyJWT(token, c.env.JWT_SECRET ?? "");
  if (!payload) return c.json({ error: "Unauthorized", code: "INVALID_TOKEN" }, 401);

  c.set("userId", payload.sub);
  c.set("orgId",  payload.org);
  c.set("role",   payload.role);
  c.set("email",  payload.email);
  c.set("name",   payload.name ?? payload.email);

  await next();
}

async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [h, p, s] = parts;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sig = Uint8Array.from(
      atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify("HMAC", key, sig, enc.encode(`${h}.${p}`));
    if (!valid) return null;

    const payload = JSON.parse(atob(p)) as JWTPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}
