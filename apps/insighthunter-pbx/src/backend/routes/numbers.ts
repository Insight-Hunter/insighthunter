// apps/insighthunter-pbx/src/backend/routes/numbers.ts
//
// Planning stub for phone number search/provisioning/assignment (docs/insight-pbx-master-prompt.md §4.2).
// TODO(numbers): not implemented. This is the highest-priority next phase: implementing it removes the unverified tenant-resolution fallback documented in README.md.
// Returns 501 so callers get an explicit, typed "not built yet" response
// instead of a silent 404 that could be mistaken for a routing bug.
import { Hono } from "hono";
import type { Env } from "../types.js";

export const numbers = new Hono<{ Bindings: Env }>();

numbers.all("*", (c) => c.json({ error: "not_implemented", feature: "numbers" }, 501));
