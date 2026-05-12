import { Hono } from "hono"; export const w9Api = new Hono(); w9Api.get("/", (c) => c.json({ forms: [] })); w9Api.post("/", async (c) => c.json({ saved: await c.req.json<any>() }));
