import type { Env } from "../env.js";
import type { ContactSubmission } from "./validate.js";

const RETENTION_SECONDS = 90 * 24 * 60 * 60; // 90 days, matches the privacy policy's stated use.

/**
 * Persists a validated contact submission so the success message shown to
 * users is accurate (something actually happens to their message), without
 * standing up an external email/CRM dependency. This is a holding area for
 * the sales team to poll/export, not a permanent record — see
 * apps/insighthunter-marketing/README.md for the follow-up to wire real
 * delivery (e.g. email routing or a CRM webhook).
 */
export async function recordLead(
  env: Pick<Env, "LEADS">,
  submission: ContactSubmission,
): Promise<void> {
  const id = crypto.randomUUID();
  const record = { ...submission, receivedAt: new Date().toISOString() };
  await env.LEADS.put(`lead:${id}`, JSON.stringify(record), { expirationTtl: RETENTION_SECONDS });
}
