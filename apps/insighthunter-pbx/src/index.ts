// apps/insighthunter-pbx/src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { requireAuth } from "./middleware/auth.js";
import { requirePbxTier } from "./middleware/tier-gate.js";
import { voice } from "./routes/voice.js";
import { sms } from "./routes/sms.js";
import { voicemail } from "./routes/voicemail.js";

export interface Env {
  DB: D1Database;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", secureHeaders());
app.use(
  "/api/*",
  cors({ origin: (o) => (o?.endsWith(".insighthunter.app") ? o : null), credentials: true }),
);

app.get("/health", (c) => c.json({ service: "pbx", ok: true }));

// Twilio webhooks are unauthenticated by our session model (Twilio signs
// requests itself) — validated inside routes/voice.ts via X-Twilio-Signature.
app.route("/voice", voice);

app.use("/api/*", requireAuth, requirePbxTier);
app.route("/api/sms", sms);
app.route("/api/voicemail", voicemail);

export default app;
