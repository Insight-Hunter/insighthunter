// apps/auth/src/lib/email.ts
// Transactional email via Resend API

const BASE_URL = "https://auth.insighthunter.app";

export async function sendVerificationEmail(
  apiKey: string,
  to: string,
  token: string
): Promise<void> {
  const link = `${BASE_URL}/auth/verify-email?token=${token}`;
  await resendSend(apiKey, {
    to,
    subject: "Verify your InsightHunter account",
    html: `<p>Click to verify your email: <a href="${link}">${link}</a></p><p>Expires in 24 hours.</p>`,
  });
}

export async function sendPasswordResetEmail(
  apiKey: string,
  to: string,
  token: string
): Promise<void> {
  const link = `${BASE_URL}/auth/reset-password?token=${token}`;
  await resendSend(apiKey, {
    to,
    subject: "Reset your InsightHunter password",
    html: `<p>Reset your password: <a href="${link}">${link}</a></p><p>Expires in 1 hour.</p>`,
  });
}

async function resendSend(
  apiKey: string,
  opts: { to: string; subject: string; html: string }
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "InsightHunter <noreply@insighthunter.app>",
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend error: ${res.status} ${await res.text()}`);
  }
}
