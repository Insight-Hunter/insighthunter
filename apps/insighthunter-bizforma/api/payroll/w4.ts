import { Hono } from "hono"; export const w4Api = new Hono(); w4Api.get("/", (c) => c.json({ records: [] })); w4Api.post("/", async (c) => c.json({ saved: await c.req.json<any>() }));
