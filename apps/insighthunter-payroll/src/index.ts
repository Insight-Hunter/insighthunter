import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ service: "payroll", ok: true }));
app.get("/runs", (c) => c.json({ items: [] }));

export default app;
