import { Hono } from "hono";
import { getAccessIdentity } from "./access.js";

export interface Env {
  SESSIONS: KVNamespace;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ service: "auth", ok: true }));

/**
 * Identity endpoint: validates the Cloudflare Access JWT headers present on
 * every request that has passed through a Cloudflare Access policy. Returns
 * the caller's email and audience so downstream services can use it.
 */
app.get("/identity", (c) => {
  const identity = getAccessIdentity(c.req.raw.headers);
  if (!identity) {
    return c.json({ error: "Unauthenticated" }, 401);
  }
  return c.json(identity);
});

/**
 * Verify endpoint: used by the gateway to authenticate inbound requests.
 * Reads the Cloudflare Access identity from headers and caches it in KV so
 * subsequent calls within the same session are fast.
 */
app.post("/verify", async (c) => {
  const identity = getAccessIdentity(c.req.raw.headers);
  if (!identity) {
    return c.json({ ok: false, error: "Unauthenticated" }, 401);
  }

  const sessionKey = `session:${identity.email}`;
  await c.env.SESSIONS.put(sessionKey, JSON.stringify(identity), {
    expirationTtl: 3600,
  });

  return c.json({ ok: true, identity });
});

export default app;
