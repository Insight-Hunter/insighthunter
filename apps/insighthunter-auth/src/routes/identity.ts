// apps/auth/src/routes/identity.ts
// Core identity endpoints: register, login, logout

import { writeAudit } from "@insighthunter/audit";
import { randomId } from "@insighthunter/kernel";
import { Hono } from "hono";
import { sendVerificationEmail } from "../lib/email";
import { hashPassword, verifyPassword } from "../lib/password";
import { issueToken } from "../lib/tokens";

type Bindings = {
  DB: D1Database;
  AUTH_KV: KVNamespace;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
};

export const identityRoutes = new Hono<{ Bindings: Bindings }>();

// POST /auth/register
identityRoutes.post("/register", async (c) => {
  const { email, password, name } = await c.req.json<{
    email: string;
    password: string;
    name: string;
  }>();

  if (!email || !password || !name) {
    return c.json({ error: "email, password, and name are required" }, 400);
  }

  // Check duplicate
  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?1")
    .bind(email.toLowerCase())
    .first();

  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const userId = randomId("usr");
  const passwordHash = await hashPassword(password);
  const verifyToken = randomId("vtk");

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO users (id, email, name, password_hash, email_verified, created_at)
       VALUES (?1, ?2, ?3, ?4, 0, datetime('now'))`,
    ).bind(userId, email.toLowerCase(), name, passwordHash),
    c.env.DB.prepare(
      `INSERT INTO email_verifications (user_id, token, expires_at)
       VALUES (?1, ?2, datetime('now', '+24 hours'))`,
    ).bind(userId, verifyToken),
  ]);

  await sendVerificationEmail(c.env.RESEND_API_KEY, email, verifyToken);

  return c.json({ ok: true, userId, message: "Verification email sent" }, 201);
});

// POST /auth/login
identityRoutes.post("/login", async (c) => {
  const { email, password } = await c.req.json<{
    email: string;
    password: string;
  }>();

  const user = await c.env.DB.prepare(
    `SELECT id, email, name, password_hash, email_verified, mfa_enabled
     FROM users WHERE email = ?1`,
  )
    .bind(email.toLowerCase())
    .first<{
      id: string;
      email: string;
      name: string;
      password_hash: string;
      email_verified: number;
      mfa_enabled: number;
    }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  if (!user.email_verified) {
    return c.json({ error: "Email not verified" }, 403);
  }

  // If MFA enabled, return partial token requiring MFA step
  if (user.mfa_enabled) {
    const mfaChallenge = randomId("mfa");
    await c.env.AUTH_KV.put(`mfa:${mfaChallenge}`, user.id, { expirationTtl: 300 });
    return c.json({ mfaRequired: true, mfaChallenge }, 200);
  }

  // Get user's primary org + role
  const member = await c.env.DB.prepare(
    `SELECT org_id, role FROM org_members WHERE user_id = ?1 AND status = 'active' LIMIT 1`,
  )
    .bind(user.id)
    .first<{ org_id: string; role: string }>();

  const token = await issueToken(
    {
      sub: user.id,
      org: member?.org_id ?? "",
      role: (member?.role ?? "read_only") as never,
      email: user.email,
    },
    c.env.JWT_SECRET,
  );

  await writeAudit(c.env.DB, {
    org_id: member?.org_id ?? "none",
    user_id: user.id,
    action: "user.login",
    ip: c.req.header("CF-Connecting-IP"),
  });

  return c.json({ ok: true, token, userId: user.id });
});

// POST /auth/logout
identityRoutes.post("/logout", async (c) => {
  // Stateless JWT — client discards token; optionally blacklist in KV for short TTL
  const authHeader = c.req.header("Authorization");
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    // Blacklist for remaining TTL (max 1hr)
    await c.env.AUTH_KV.put(`blacklist:${token.slice(-20)}`, "1", {
      expirationTtl: 3600,
    });
  }
  return c.json({ ok: true });
});
