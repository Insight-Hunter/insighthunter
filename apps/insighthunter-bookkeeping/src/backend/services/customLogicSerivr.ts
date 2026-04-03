// e.g., src/backend/services/customLogicService.ts
import type { Env } from "../types.js";

export async function runUserHook(
  env: Env,
  orgId: string,
  event: { type: string; payload: unknown }
) {
  const res = await env.USER_WORKERS.fetch(
    `https://user-worker/${orgId}/hooks/bookkeeping`,
    {
      method: "POST",
      body: JSON.stringify(event),
      headers: { "Content-Type": "application/json" },
    }
  );
  if (!res.ok) {
    console.warn("User hook failed", orgId, await res.text());
  }
}
