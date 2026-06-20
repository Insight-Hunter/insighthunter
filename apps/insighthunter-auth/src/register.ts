// register.ts — POST /auth/register
// Validates input, stores pending registration in KV, sends verification email.

import type { Env } from "./types";
import {
  VALID_PLANS,
  VERIFY_TOKEN_TTL_SECONDS,
  corsPreflightResponse,
  generateToken,
  hashPassword,
  jsonResponse,
} from "./shared";

// ── Verification email ───────────────────────────────────────────────────────

async function sendVerificationEmail(
  env: Env,
  userEmail: string,
  verifyUrl: string,
): Promise<void> {
  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Verify your InsightHunter account</title>
</head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#0F172A;color:#F1F5F9;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#1E293B;border-radius:12px;padding:40px;border:1px solid rgba(148,163,184,0.12);">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <div style="width:38px;height:38px;border-radius:8px;background:linear-gradient(135deg,#38BDF8,#0284C7);display:inline-flex;align-items:center;justify-content:center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F172A" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <span style="font-size:1.25rem;font-weight:700;color:#F1F5F9;">Insight<span style="color:#38BDF8">Hunter</span></span>
      </div>
    </div>
    <h1 style="font-size:1.375rem;font-weight:600;margin-bottom:12px;text-align:center;">Verify your email address</h1>
    <p style="color:#94A3B8;line-height:1.6;text-align:center;margin-bottom:32px;">
      You're one step away from accessing your financial intelligence platform.
      Click the button below to verify your account.
    </p>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${verifyUrl}"
         style="display:inline-block;padding:14px 32px;background:#38BDF8;color:#0F172A;font-weight:700;font-size:1rem;border-radius:8px;text-decoration:none;">
        Verify my account
      </a>
    </div>
    <p style="color:#475569;font-size:0.8125rem;text-align:center;line-height:1.6;">
      This link expires in 24 hours. If you didn't create an InsightHunter account,
      you can safely ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid rgba(148,163,184,0.1);margin:24px 0;">
    <p style="color:#475569;font-size:0.75rem;text-align:center;">
      InsightHunter &nbsp;·&nbsp;
      <a href="https://insighthunter.app/privacy" style="color:#64748B;">Privacy Policy</a>
    </p>
  </div>
</body>
</html>`;

  await env.EMAIL.send({
    from: { email: "noreply@insighthunter.app", name: "InsightHunter" },
    to: [{ email: userEmail }],
    subject: "Verify your InsightHunter account",
    content: [
      {
        type: "text/plain",
        value: `Welcome to InsightHunter!\n\nVerify your account:\n${verifyUrl}\n\nExpires in 24 hours. If you didn't register, ignore this.`,
      },
      { type: "text/html", value: htmlBody },
    ],
  });
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function handleRegister(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS") return corsPreflightResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  // ── Input extraction & coercion ──────────────────────────────────────────
  const email    = typeof body.email    === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name     = typeof body.name     === "string" ? body.name.trim() : "";
  const org_name = typeof body.org_name === "string" ? body.org_name.trim() : "";
  const plan     =
    typeof body.plan === "string" && VALID_PLANS.has(body.plan) ? body.plan : "lite";

  // ── Validation ────────────────────────────────────────────────────────────
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return jsonResponse({ error: "A valid email address is required." }, 422);
  if (!password || password.length < 8)
    return jsonResponse({ error: "Password must be at least 8 characters." }, 422);
  if (!name)
    return jsonResponse({ error: "Full name is required." }, 422);
  if (!org_name)
    return jsonResponse({ error: "Company name is required." }, 422);

  // ── Duplicate / rate-limit checks ────────────────────────────────────────
  const existingUser = await env.SESSIONS.get(`user:${email}`);
  if (existingUser)
    return jsonResponse({ error: "An account with this email already exists." }, 409);

  const existingPending = await env.SESSIONS.get(`pending_email:${email}`);
  if (existingPending)
    return jsonResponse(
      { error: "A verification email was already sent. Check your inbox or wait 10 minutes." },
      429,
    );

  // ── Persist pending registration ─────────────────────────────────────────
  const passwordHash = await hashPassword(password, env.PASSWORD_PEPPER);
  const verifyToken  = generateToken(32); // 64-char hex

  await Promise.all([
    env.SESSIONS.put(
      `pending:${verifyToken}`,
      JSON.stringify({ email, name, org_name, plan, passwordHash, createdAt: Date.now() }),
      { expirationTtl: VERIFY_TOKEN_TTL_SECONDS },
    ),
    // Short-lived guard to prevent duplicate sends within 10 minutes
    env.SESSIONS.put(`pending_email:${email}`, verifyToken, { expirationTtl: 600 }),
  ]);

  // ── Send verification email ───────────────────────────────────────────────
  const verifyUrl = `https://auth.insighthunter.app/auth/verify?token=${verifyToken}`;
  try {
    await sendVerificationEmail(env, email, verifyUrl);
  } catch (err) {
    // Roll back KV writes so the user can retry cleanly
    await Promise.all([
      env.SESSIONS.delete(`pending:${verifyToken}`),
      env.SESSIONS.delete(`pending_email:${email}`),
    ]);
    console.error("[auth] Email send failed:", err);
    return jsonResponse({ error: "Failed to send verification email. Please try again." }, 502);
  }

  return jsonResponse({ ok: true, message: "Check your email to verify your account." }, 201);
}
