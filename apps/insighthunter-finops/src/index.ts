import { Hono } from "hono";
const app = new Hono();
app.get("/health", (c) => c.json({ service: "finops", ok: true }));
app.get("/payables", (c) => c.json({ items: [] }));
app.get("/receivables", (c) => c.json({ items: [] }));
export default app;
