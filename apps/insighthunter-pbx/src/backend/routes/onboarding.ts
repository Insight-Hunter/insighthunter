// apps/insighthunter-pbx/src/backend/routes/onboarding.ts
//
// Planning stub for organization communication setup (numbers, greetings, business hours) (docs/insight-pbx-master-prompt.md §4.1).
// TODO(onboarding): not implemented. Build once a tenant onboarding wizard for PBX is designed.
// Returns 501 so callers get an explicit, typed "not built yet" response
// instead of a silent 404 that could be mistaken for a routing bug.
import { Hono } from "hono";
import type { Env } from "../types.js";

export const onboarding = new Hono<{ Bindings: Env }>();

onboarding.all("*", (c) => c.json({ error: "not_implemented", feature: "onboarding" }, 501));
