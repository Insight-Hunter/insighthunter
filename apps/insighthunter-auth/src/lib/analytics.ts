import type { Env } from "@/types";

export type AuthEvent =
  | "register"
  | "login"
  | "logout"
  | "token_refresh"
  | "token_verify"
  | "password_reset_request"
  | "password_reset_complete"
  | "email_verify"
  | "role_assigned"
  | "login_failed"
  | "register_failed";

export function trackAuthEvent(
  env: Env,
  event: AuthEvent,
  orgId: string,
  meta: Record<string, string | number | boolean> = {}
): void {
  try {
    env.EVENTS.writeDataPoint({
      blobs:   [event, orgId, env.APP_ENV],
      doubles: [Date.now()],
      indexes: [orgId],
    });
  } catch {
    // non-blocking
  }
}
