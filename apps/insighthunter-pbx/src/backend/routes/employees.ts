// apps/insighthunter-pbx/src/backend/routes/employees.ts
//
// Planning stub for employee/extension assignment (docs/insight-pbx-master-prompt.md §4.2).
// TODO(employees): not implemented. Depends on numbers.ts (extensions are sub-resources of numbers).
// Returns 501 so callers get an explicit, typed "not built yet" response
// instead of a silent 404 that could be mistaken for a routing bug.
import { Hono } from "hono";
import type { Env } from "../types.js";

export const employees = new Hono<{ Bindings: Env }>();

employees.all("*", (c) => c.json({ error: "not_implemented", feature: "employees" }, 501));
