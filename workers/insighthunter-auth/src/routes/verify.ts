import { Hono } from "hono";
import { z } from "zod";
import type { Env, AccessTokenPayload } from "@/types";
import { validateBody } from "@/middleware/validate";
import { verifyAccessToken } from "@/lib/jwt";
import { consumeVerifyToken, storeResetToken } from "@/lib/cache";
import { verifyUserEmail, getUserByEmail, getUserById, updateUserPassword } from "@/db/queries";
import { hashPassword, generateSecureToken } from "@/lib/hash";
import { sendPasswordResetEmail } from "@/services/emailService";
import { trackAuthEvent } from "@/lib/analytics";
import { logger } from "@/lib/logger";

const verify = new Hono<{ Bindings: Env }>();

// ── GET /verify — validate an access token (used by other services) ───────────
verify.get("/", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return c.json({ valid: false, error: "No token provided." }, 401);

  const payload = await verifyAccessToken(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ valid: false, error: "Invalid or expired token." }, 401);

  trackAuthEvent(c.env, "token_verify", payload.orgId);
  return c.json({ valid: true, payload });
});

// ── POST /verify/email — consume email verification token ─────────────────────
verify.post("/email", validateBody(z.object({ token: z.string().min(10) })), async (c) => {
  const { token } = c.get("body" as never) as { token: string };
  const userId    = await consumeVerifyToken(c.env.TOKENS, token);
  if (!userId) return c.json({ error: "Verification link is invalid or has expired." }, 400);

  await verifyUserEmail(c.env.DB, userId);
  trackAuthEvent(c.env, "email_verify", "unknown");
  logger.info("Email verified", { userId });
  return c.json({ ok: true, message: "Email verified successfully." });
});

// ── POST /verify/forgot-password ──────────────────────────────────────────────
verify.post("/forgot-password", validateBody(z.object({ email: z.string().email() })), async (c) => {
  const { email } = c.get("body" as never) as { email: string };
  // Always return 200 to prevent email enumeration
  const user = await getUserByEmail(c.env.DB, email);
  if (user && user.status !== "suspended") {
    const resetToken = generateSecureToken(32);
    await storeResetToken(c.env.TOKENS, resetToken, user.id);
    await sendPasswordResetEmail(c.env, user.email, user.name, resetToken).catch(() => {
      logger.warn("Reset email failed", { userId: user.id });
    });
    trackAuthEvent(c.env, "password_reset_request", user.org_id);
  }
  return c.json({ ok: true, message: "If that email exists, a reset link has been sent." });
});

// ── POST /verify/reset-password ───────────────────────────────────────────────
verify.post(
  "/reset-password",
  validateBody(z.object({ token: z.string().min(10), password: z.string().min(8).max(128) })),
  async (c) => {
    const { token, password } = c.get("body" as never) as { token: string; password: string };
    const { consumeResetToken } = await import("@/lib/cache");
    const userId = await consumeResetToken(c.env.TOKENS, token);
    if (!userId) return c.json({ error: "Reset link is invalid or has expired." }, 400);

    const hash = await hashPassword(password);
    await updateUserPassword(c.env.DB, userId, hash);

    const user = await getUserById(c.env.DB, userId);
    if (user) trackAuthEvent(c.env, "password_reset_complete", user.org_id);
    logger.info("Password reset", { userId });
    return c.json({ ok: true, message: "Password updated successfully." });
  }
);

export default verify;
