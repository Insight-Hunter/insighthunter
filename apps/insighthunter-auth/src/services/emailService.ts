import type { Env } from '../types/env';

// ── Cloudflare Email Service — native Workers binding (no API key required) ──
// Docs: https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
//
// Requires in wrangler.toml:
//   [[send_email]]
//   name = "EMAIL"
//
// Requires in Cloudflare Dashboard:
//   Email > Email Routing > Enable on insighthunter.app domain

const FROM_EMAIL = 'noreply@insighthunter.app';
const FROM_NAME  = 'Insight Hunter';

async function sendEmail(
  env: Env,
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<void> {
  await env.EMAIL.send({
    from: { email: FROM_EMAIL, name: FROM_NAME },
    to:   [{ email: to }],
    subject,
    content: [
      { type: 'text/plain', value: text },
      { type: 'text/html',  value: html },
    ],
  });
}

export async function sendVerificationEmail(
  env: Env,
  email: string,
  name: string,
  token: string,
): Promise<void> {
  const link = `${env.APP_URL}/auth/verify-email?token=${token}`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#01696f;margin-bottom:8px">Verify your email</h2>
      <p>Hi ${name},</p>
      <p>Click the button below to verify your Insight Hunter account:</p>
      <a href="${link}"
         style="display:inline-block;background:#01696f;color:#fff;padding:12px 28px;
                border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
        Verify Email
      </a>
      <p style="color:#6b7280;font-size:12px;margin-top:24px">
        This link expires in 24 hours. If you didn't create an account, ignore this email.
      </p>
    </div>`;
  const text = `Hi ${name},\n\nVerify your Insight Hunter account:\n${link}\n\nExpires in 24 hours.`;
  await sendEmail(env, email, 'Verify your Insight Hunter email', html, text);
}

export async function sendPasswordResetEmail(
  env: Env,
  email: string,
  name: string,
  token: string,
): Promise<void> {
  const link = `${env.APP_URL}/auth/reset-password?token=${token}`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#01696f;margin-bottom:8px">Reset your password</h2>
      <p>Hi ${name},</p>
      <p>Click the button below to reset your Insight Hunter password:</p>
      <a href="${link}"
         style="display:inline-block;background:#01696f;color:#fff;padding:12px 28px;
                border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
        Reset Password
      </a>
      <p style="color:#6b7280;font-size:12px;margin-top:24px">
        This link expires in 1 hour. If you didn't request this, ignore this email.
      </p>
    </div>`;
  const text = `Hi ${name},\n\nReset your Insight Hunter password:\n${link}\n\nExpires in 1 hour. If you didn't request this, ignore this email.`;
  await sendEmail(env, email, 'Reset your Insight Hunter password', html, text);
}
