import { Hono } from "hono";
import type { Env } from "../types.js";
import { authMiddleware } from "../middleware/auth.js";
import { tierGate } from "../middleware/tier.js";
import {
  buildQBAuthUrl,
  exchangeCodeForTokens,
  saveQBTokens,
  getQBConnection,
  pullQBAccounts,
} from "../services/quickbooksService.js";

const quickbooks = new Hono<{ Bindings: Env }>();

// QB OAuth callback does not require auth (it's the redirect from Intuit)
quickbooks.get("/callback", async (c) => {
  const code = c.req.query("code");
  const realmId = c.req.query("realmId");
  const state = c.req.query("state"); // orgId encoded in state

  if (!code || !realmId || !state) {
    return c.redirect(
      "https://bookkeeping.insighthunter.app/dashboard/settings?qb_error=missing_params"
    );
  }

  try {
    const conn = await exchangeCodeForTokens(code, realmId, c.env);
    await saveQBTokens(state, { ...conn, org_id: state }, c.env);

    // Pull accounts from QB immediately after connecting
    await pullQBAccounts(state, c.env);

    return c.redirect(
      `https://bookkeeping.insighthunter.app/dashboard/settings?qb_connected=1&company=${encodeURIComponent(
        conn.company_name
      )}`
    );
  } catch (err) {
    console.error("QB OAuth error:", err);
    return c.redirect(
      "https://bookkeeping.insighthunter.app/dashboard/settings?qb_error=oauth_failed"
    );
  }
});

// All routes below require auth + standard/pro tier
quickbooks.use("*", authMiddleware, tierGate("qbSync"));

// GET /api/quickbooks/connect-url — returns the OAuth URL for connecting
quickbooks.get("/connect-url", async (c) => {
  const user = c.get("user");
  const url = buildQBAuthUrl(c.env, user.orgId);
  return c.json({ url });
});

// GET /api/quickbooks/status
quickbooks.get("/status", async (c) => {
  const user = c.get("user");
  const conn = await getQBConnection(user.orgId, c.env);
  if (!conn) return c.json({ connected: false });
  return c.json({
    connected: true,
    companyName: conn.company_name,
    lastSyncedAt: conn.last_synced_at,
    connectedAt: conn.connected_at,
  });
});

// POST /api/quickbooks/sync/accounts — pull latest accounts from QB
quickbooks.post("/sync/accounts", async (c) => {
  const user = c.get("user");
  const count = await pullQBAccounts(user.orgId, c.env);
  return c.json({ pulled: count });
});

// POST /api/quickbooks/disconnect
quickbooks.post("/disconnect", async (c) => {
  const user = c.get("user");
  await c.env.QB_TOKENS.delete(`qb:${user.orgId}`);
  return c.json({ ok: true });
});

export default quickbooks;
