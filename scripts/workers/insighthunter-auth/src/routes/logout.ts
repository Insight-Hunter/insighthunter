import { Hono } from "hono";
import type { Env, AccessTokenPayload } from "@/types";
import { verifyAccessToken } from "@/lib/jwt";
import { revokeRefreshToken } from "@/services/tokenService";
import { destroyAllSessions } from "@/services/sessionService";
import { trackAuthEvent } from "@/lib/analytics";
import { logger } from "@/lib/logger";

const logout = new Hono<{ Bindings: Env }>();

logout.post("/", async (c) => {
  const authHeader   = c.req.header("Authorization") ?? "";
  const accessToken  = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const body         = await c.req.json().catch(() => ({}) as Record<string, string>);
  const refreshToken = (body as Record<string, string>).refreshToken;

  let userId = "unknown";

  if (accessToken) {
    const payload = await verifyAccessToken(accessToken, c.env.JWT_SECRET);
    if (payload) {
      userId = payload.sub;
      await destroyAllSessions(c.env, payload.sub);
      trackAuthEvent(c.env, "logout", payload.orgId);
    }
  }

  if (refreshToken) {
    await revokeRefreshToken(c.env, refreshToken).catch(() => {});
  }

  logger.info("User logged out", { userId });
  return c.json({ ok: true, message: "Logged out successfully." });
});

export default logout;
