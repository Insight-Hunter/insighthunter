// apps/insighthunter-pbx/src/backend/routes/departments.ts
//
// Planning stub for department management (docs/insight-pbx-master-prompt.md §4.1).
// TODO(departments): not implemented. Depends on onboarding.ts org-structure design.
// Returns 501 so callers get an explicit, typed "not built yet" response
// instead of a silent 404 that could be mistaken for a routing bug.
import { Hono } from "hono";
import type { Env } from "../types.js";

export const departments = new Hono<{ Bindings: Env }>();

departments.all("*", (c) => c.json({ error: "not_implemented", feature: "departments" }, 501));
