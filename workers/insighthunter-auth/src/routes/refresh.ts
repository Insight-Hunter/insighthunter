import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "@/types";
import { validateBody } from "@/middleware/validate";
import { rateLimitMiddleware } from "@/middleware/rateLimit";
import { rotateRefreshToken } from "@/services/tokenService";
import { getUserById } from "@/db/queries";
import { trackAuthEvent } from "@/lib/analytics";
import { logger } from "@/lib/logger";

const RefreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const refresh = new Hono<{ Bindings: Env; Variables: { body: z.infer<typeof RefreshSchema> } }>();

refresh.post(
  "/",
  rateLimitMiddleware(30),
  validateBody(RefreshSchema),
  async (c) => {
    const { refreshToken } = c.get("body");

    const tokens = await rotateRefreshToken(
      c.env,
      refreshToken,
      (id) => getUserById(c.env.DB, id) as any
    );

    if (!tokens) {
      logger.warn("Token refresh failed — invalid or expired token");
      return c.json({ error: "Invalid or expired refresh token." }, 401);
    }

    trackAuthEvent(c.env, "token_refresh", "unknown");
    return c.json({ ok: true, tokens });
  }
);

export default refresh;
