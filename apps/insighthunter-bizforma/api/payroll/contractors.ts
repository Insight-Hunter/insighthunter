import { Hono } from "hono"; export const contractorsApi = new Hono(); contractorsApi.get("/", (c) => c.json({ contractors: [] }));
