import { Hono } from "hono"; export const submissionsApi = new Hono(); submissionsApi.get("/", (c) => c.json({ submissions: [] }));
