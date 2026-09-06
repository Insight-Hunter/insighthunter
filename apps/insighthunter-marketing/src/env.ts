export interface Env {
  /** Public origin this site is canonically served from, e.g. https://insighthunter.app */
  CANONICAL_ORIGIN: string;
  /** Origin of the authentication gateway that owns signup/login. */
  AUTH_ORIGIN: string;
  /** Origin of the authenticated dashboard (Command Center). */
  APP_ORIGIN: string;
  /** Mailbox that receives contact form notifications (not stored server-side). */
  CONTACT_TO_EMAIL: string;
  /** Used to rate-limit the public contact form. No PII is ever stored in it. */
  RATE_LIMIT: KVNamespace;
}

export type PlanId = "startup" | "standard" | "pro";

export const PLAN_IDS: readonly PlanId[] = ["startup", "standard", "pro"];

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as readonly string[]).includes(value);
}
