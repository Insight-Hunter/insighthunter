import type { Env } from "@/types";
import { logger } from "@/lib/logger";

const FROM    = "Insight Hunter <noreply@insighthunter.com>";
const SUBJECT = {
  verify: "Verify your Insight Hunter email",
  reset:  "Reset your Insight Hunter password",
};

async function sendEmail(
  env: Env,
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  // MailChannels Send API (free via Cloudflare Workers)
  const res = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "X-Api-Key":     env.MAILCHANNELS_API_KEY ?? "",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "noreply@insighthunter.com", name: "Insight Hunter" },
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html",  value: html },
      ],
    }),
  });

  if (!res.ok) {
    logger.warn("Email send failed", { to, status: res.status });
    throw new Error(`Email delivery failed: ${res.status}`);
  }
}

export async function sendVerificationEmail(
  env: Env,
  email: string,
  name: string,
  token: string
): Promise<void> {
  const link = `${env.APP_URL}/auth/verify-email?token=${token}`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2>Verify your email</h2>
      <p>Hi ${name},</p>
      <p>Click the button below to verify your Insight Hunter account:</p>
      <a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
        Verify Email
      </a>
      <p style="color:#6b7280;font-size:12px;margin-top:24px">
        This link expires in 24 hours. If you didn't create an account, ignore this email.
      </p>
    </div>`;
  const text = `Hi ${name},\n\nVerify your email:\n${link}\n\nLink expires in 24 hours.`;
  await sendEmail(env, email, SUBJECT.verify, html, text);
}

export async function sendPasswordResetEmail(
  env: Env,
  email: string,
  name: string,
  token: string
): Promise<void> {
  const link = `${env.APP_URL}/auth/reset-password?token=${token}`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2>Reset your password</h2>
      <p>Hi ${name},</p>
      <p>Click the button below to reset your Insight Hunter password:</p>
      <a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
        Reset Password
      </a>
      <p style="color:#6b7280;font-size:12px;margin-top:24px">
        This link expires in 1 hour. If you didn't request this, ignore this email.
      </p>
    </div>`;
  const text = `Hi ${name},\n\nReset your password:\n${link}\n\nLink expires in 1 hour.`;
  await sendEmail(env, email, SUBJECT.reset, html, text);
}
