import { Hono } from "hono";
const app = new Hono();
app.get("/", (c) => c.json({ app: "insighthunter-main", status: "ok" }));
app.get("/health", (c) => c.json({ ok: true }));
export default app;
