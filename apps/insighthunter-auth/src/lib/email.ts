// insighthunter-auth — transactional email via Resend
// All links land on the marketing/auth domain so users see a consistent URL.

const FROM_ADDRESS = "InsightHunter <noreply@insighthunter.app>";
const AUTH_ORIGIN  = "https://auth.insighthunter.app";

export async function sendVerificationEmail(
  apiKey: string,
  to: string,
  token: string,
): Promise<void> {
  const link = `${AUTH_ORIGIN}/verify-email?token=${encodeURIComponent(token)}`;
  await resendSend(apiKey, {
    to,
    subject: "Verify your InsightHunter account",
    html: verificationHtml(link),
    text: `Verify your InsightHunter account\n\nClick the link below (expires in 24 hours):\n${link}\n\nIf you did not create an account, you can ignore this email.`,
  });
}

export async function sendPasswordResetEmail(
  apiKey: string,
  to: string,
  token: string,
): Promise<void> {
  const link = `${AUTH_ORIGIN}/reset-password?token=${encodeURIComponent(token)}`;
  await resendSend(apiKey, {
    to,
    subject: "Reset your InsightHunter password",
    html: resetHtml(link),
    text: `Reset your InsightHunter password\n\nClick the link below (expires in 1 hour):\n${link}\n\nIf you did not request a password reset, you can ignore this email.`,
  });
}

export async function sendWelcomeEmail(
  apiKey: string,
  to: string,
  name: string,
): Promise<void> {
  const dashboardLink = "https://app.insighthunter.app";
  await resendSend(apiKey, {
    to,
    subject: "Welcome to InsightHunter!",
    html: welcomeHtml(name, dashboardLink),
    text: `Welcome to InsightHunter, ${name}!\n\nYour account is ready. Head to your dashboard:\n${dashboardLink}`,
  });
}

// ── Resend transport ──────────────────────────────────────────────────────────

interface SendOpts {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function resendSend(apiKey: string, opts: SendOpts): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to:   [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });
  if (!res.ok) {
    // Don't leak the full response body into logs — just status.
    throw new Error(`Resend error ${res.status}: ${res.statusText}`);
  }
}

// ── HTML templates ────────────────────────────────────────────────────────────
// Minimal inline-styled email safe across major clients.

function baseHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>InsightHunter</title></head>
<body style="margin:0;padding:0;background:#f7f2ec;font-family:system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fffdf9;border:1px solid #dfd6ce;border-radius:12px;padding:32px">
<tr><td>
<p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#2b2118">⚡ InsightHunter</p>
${content}
<hr style="border:none;border-top:1px solid #ece8e2;margin:24px 0">
<p style="margin:0;font-size:12px;color:#a09890">InsightHunter &middot; Financial intelligence for small business</p>
</td></tr></table>
</td></tr></table>
</body></html>`;
}

function btnHtml(link: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${link}" style="display:inline-block;padding:12px 28px;background:#8b5e3c;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px">${label}</a></p>
<p style="margin:0;font-size:12px;color:#a09890">Or copy this link: <a href="${link}" style="color:#8b5e3c">${link}</a></p>`;
}

function verificationHtml(link: string): string {
  return baseHtml(`
    <p style="font-size:18px;font-weight:700;color:#2b2118;margin:0 0 8px">Verify your email</p>
    <p style="color:#675d55;margin:0 0 4px">Click the button below to verify your InsightHunter account. This link expires in <strong>24 hours</strong>.</p>
    ${btnHtml(link, "Verify Email")}
    <p style="font-size:12px;color:#a09890;margin:16px 0 0">If you did not create an account, you can safely ignore this email.</p>`);
}

function resetHtml(link: string): string {
  return baseHtml(`
    <p style="font-size:18px;font-weight:700;color:#2b2118;margin:0 0 8px">Reset your password</p>
    <p style="color:#675d55;margin:0 0 4px">Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
    ${btnHtml(link, "Reset Password")}
    <p style="font-size:12px;color:#a09890;margin:16px 0 0">If you did not request a password reset, you can safely ignore this email.</p>`);
}

function welcomeHtml(name: string, dashboardLink: string): string {
  const safeName = name.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
  return baseHtml(`
    <p style="font-size:18px;font-weight:700;color:#2b2118;margin:0 0 8px">Welcome, ${safeName}! 👋</p>
    <p style="color:#675d55;margin:0 0 4px">Your InsightHunter account is ready. Head to your dashboard to get started.</p>
    ${btnHtml(dashboardLink, "Go to Dashboard")}`);
}
