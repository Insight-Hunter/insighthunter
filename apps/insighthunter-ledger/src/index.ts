import { Hono } from "hono";
import { accountsRoutes } from "./routes-accounts";
import { journalRoutes } from "./routes-journals";

const app = new Hono();

app.get("/health", (c) => c.json({ service: "ledger", ok: true }));
app.route("/api", accountsRoutes);
app.route("/api", journalRoutes);

export default app;
