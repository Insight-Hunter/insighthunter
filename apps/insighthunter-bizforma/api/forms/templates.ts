import { Hono } from "hono"; export const templatesApi = new Hono(); templatesApi.get("/", (c) => c.json({ templates: [] }));
