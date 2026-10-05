import { Hono } from "hono";
import type { AppBindings } from "../types.js";
import { badRequest, ok } from "../utils/http.js";
import { taskSchema } from "../utils/validators.js";
import { createTask, listTasksByOrg } from "../services/task-service.js";

export const tasks = new Hono<AppBindings>();

tasks.get("/", async (c) => {
  const tasks = await listTasksByOrg(c.env, c.get("orgId"));
  return ok(c, { tasks });
});

tasks.post("/", async (c) => {
  const parsed = taskSchema.safeParse(await c.req.json());
  if (!parsed.success) return badRequest(c, "Invalid payload", parsed.error.flatten());

  const taskId = await createTask(c.env, {
    org_id: c.get("orgId"),
    ...parsed.data
  });

  return ok(c, { ok: true, task_id: taskId }, 201);
});
