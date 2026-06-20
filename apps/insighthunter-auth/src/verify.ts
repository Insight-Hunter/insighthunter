// verify.ts — GET /auth/verify?token=<hex>
// Consumes the pending registration token, creates the user record,
// opens a session, and redirects to the dashboard.

import type { Env } from "./types";
import {
  SESSION_TTL_SECONDS,
  buildSecureCookie,
  createSession,
  generateToken,
} from "./shared";

// ── Error page ───────────────────────────────────────────────────────────────

function verifyErrorHTML(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verification Failed — InsightHunter</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:'Helvetica Neue',sans-serif;
      background:#0F172A;color:#F1F5F9;
      min-height:100vh;display:grid;place-items:center;padding:1.5rem;
    }
    .card{
      max-width:420px;width:100%;
      background:#1E293B;border:1px solid rgba(148,163,184,.12);
      border-radius:1rem;padding:2.5rem 2rem;text-align:center;
    }
    h1{font-size:1.25rem;font-weight:600;margin:.75rem 0}
    p{color:#94A3B8;margin-bottom:1.5rem;line-height:1.6}
    a{
      display:inline-block;padding:.75rem 1.5rem;
      background:#38BDF8;color:#0F172A;
      font-weight:700;border-radius:.5rem;text-decoration:none;
    }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:2.5rem">⚠️</div>
    <h1>Verification failed</h1>
    <p>${message}</p>
    <a href="https://insighthunter.app/auth/register">Try registering again</a>
  </div>
</body>
</html>`;
}

function htmlError(message: string, status: number): Response {
  return new Response(verifyErrorHTML(message), {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// ── Route handler ────────────────────────────────────────────────────────────

interface PendingRegistration {
  email: string;
  name: string;
  org_name: string;
  plan: string;
  passwordHash: string;
  createdAt: number;
}

export async function handleVerify(request: Request, env: Env): Promise<Response> {
  const url   = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  // Basic structural validation — token must be 64 lowercase hex chars
  if (!token || token.length !== 64 || !/^[0-9a-f]+$/.test(token))
    return htmlError("Invalid or malformed verification link.", 400);

  // Look up the pending registration
  const raw = await env.SESSIONS.get(`pending:${token}`);
  if (!raw)
    return htmlError(
      "This verification link has expired or has already been used.",
      410,
    );

  let pending: PendingRegistration;
  try {
    pending = JSON.parse(raw) as PendingRegistration;
  } catch {
    return htmlError("Verification data is corrupt. Please register again.", 500);
  }

  // ── Create the permanent user record ─────────────────────────────────────
  const userId = generateToken(16); // 32-char hex user ID

  await Promise.all([
    env.SESSIONS.put(
      `user:${pending.email}`,
      JSON.stringify({
        userId,
        email:        pending.email,
        name:         pending.name,
        org_name:     pending.org_name,
        plan:         pending.plan,
        passwordHash: pending.passwordHash,
        verifiedAt:   Date.now(),
        createdAt:    pending.createdAt,
      }),
    ),
    // Consume the token so it can't be replayed
    env.SESSIONS.delete(`pending:${token}`),
    env.SESSIONS.delete(`pending_email:${pending.email}`),
  ]);

  // ── Open a session immediately so the user lands logged in ───────────────
  const sessionId = await createSession(
    env.SESSIONS,
    {
      email:     pending.email,
      name:      pending.name,
      groups:    [pending.plan],
      user_uuid: userId,
    },
    SESSION_TTL_SECONDS,
  );

  const headers = new Headers({
    Location:   `https://app.insighthunter.app/dashboard?welcome=1&plan=${pending.plan}`,
    "Set-Cookie": buildSecureCookie("ih_session", sessionId, env.COOKIE_DOMAIN),
  });

  return new Response(null, { status: 302, headers });
}
