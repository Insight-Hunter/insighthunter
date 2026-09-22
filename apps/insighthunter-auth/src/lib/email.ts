// Transactional email via Cloudflare Email Service

const VERIFICATION_BASE_URL = "https://insighthunter.app";
const DEFAULT_FROM_NAME = "InsightHunter";

export interface SendEmailBinding {
  send(message: {
    to: string | { email: string; name?: string };
    from: string | { email: string; name?: string };
    subject: string;
    html?: string;
    text?: string;
  }): Promise<unknown>;
}

export async function sendVerificationEmail(
  binding: SendEmailBinding,
  to: string,
  token: string,
  fromName = DEFAULT_FROM_NAME,
): Promise<void> {
  const link = `${VERIFICATION_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail(binding, {
    to,
    fromName,
    subject: "Verify your InsightHunter account",
    html: `<p>Click to verify your email: <a href="${link}">${link}</a></p><p>Expires in 24 hours.</p>`,
    text: `Click to verify your email: ${link}\n\nExpires in 24 hours.`,
  });
}

export async function sendPasswordResetEmail(
  binding: SendEmailBinding,
  to: string,
  token: string,
  fromName = DEFAULT_FROM_NAME,
): Promise<void> {
  const link = `${VERIFICATION_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail(binding, {
    to,
    fromName,
    subject: "Reset your InsightHunter password",
    html: `<p>Reset your password: <a href="${link}">${link}</a></p><p>Expires in 1 hour.</p>`,
    text: `Reset your InsightHunter password: ${link}\n\nExpires in 1 hour.`,
  });
}

async function sendEmail(
  binding: SendEmailBinding,
  opts: { to: string; fromName: string; subject: string; html: string; text: string },
): Promise<void> {
  await binding.send({
    from: { email: "noreply@insighthunter.app", name: opts.fromName },
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}
