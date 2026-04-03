import type { Context, Next } from "hono";
import type { Env, AuthUser } from "../types.js";

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

export async function authMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<Response | void> {
  const token =
    c.req.header("Authorization")?.replace("Bearer ", "") ??
    c.req.header("Cookie")?.match(/ih_session=([^;]+)/)?.[1];

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Check session cache first to avoid round-trip on every request
  const cached = await c.env.SESSION_CACHE.get(`session:${token}`);
  if (cached) {
    c.set("user", JSON.parse(cached) as AuthUser);
    return next();
  }

  // Validate token with insighthunter-auth
  const res = await fetch(`${c.env.AUTH_WORKER_URL}/api/session/validate`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return c.json({ error: "Invalid session" }, 401);
  }

  const user = (await res.json()) as AuthUser;
  // Cache for 5 minutes to reduce auth worker load
  await c.env.SESSION_CACHE.put(`session:${token}`, JSON.stringify(user), {
    expirationTtl: 300,
  });
  c.set("user", user);
  return next();
}
