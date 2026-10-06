// apps/insighthunter-pbx/src/backend/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { requireAuth } from "./middleware/auth.js";
import { requirePbxTier } from "./middleware/tier-gate.js";
import { addons } from "./routes/addons.js";
import { aiReceptionist } from "./routes/aiReceptionist.js";
import { automations } from "./routes/automations.js";
import { billing } from "./routes/billing.js";
import { callFlows } from "./routes/callFlows.js";
import { conversations } from "./routes/conversations.js";
import { departments } from "./routes/departments.js";
import { employees } from "./routes/employees.js";
import { health } from "./routes/health.js";
import { messages } from "./routes/messages.js";
import { numbers } from "./routes/numbers.js";
import { onboarding } from "./routes/onboarding.js";
import { queues } from "./routes/queues.js";
import { reports } from "./routes/reports.js";
import { voicemail } from "./routes/voicemail.js";
import { twilioSmsWebhooks, twilioVoiceWebhooks } from "./routes/webhooks.twilio.js";
import type { Env } from "./types.js";

const app = new Hono<{ Bindings: Env }>();

app.use("*", secureHeaders());
app.use(
  "/api/*",
  cors({ origin: (o) => (o?.endsWith(".insighthunter.app") ? o : null), credentials: true }),
);

app.route("/health", health);

// Twilio webhooks are unauthenticated by our session model (Twilio signs
// requests itself) — validated inside each route via X-Twilio-Signature.
// These two mount points match the external Twilio console configuration
// documented in README.md and must not change without updating Twilio.
app.route("/voice", twilioVoiceWebhooks);
app.route("/webhooks/sms", twilioSmsWebhooks);

app.use("/api/*", requireAuth, requirePbxTier);

// Implemented today:
app.route("/api/messages", messages);
app.route("/api/voicemail", voicemail);

// Planning stubs (see docs/file-structure.md) — mounted now so the route
// surface matches the target API shape, but every handler returns 501 until
// built out. See each file's header comment for the relevant master-prompt
// section and dependency order.
app.route("/api/onboarding", onboarding);
app.route("/api/numbers", numbers);
app.route("/api/departments", departments);
app.route("/api/employees", employees);
app.route("/api/call-flows", callFlows);
app.route("/api/queues", queues);
app.route("/api/conversations", conversations);
app.route("/api/automations", automations);
app.route("/api/ai-receptionist", aiReceptionist);
app.route("/api/reports", reports);
app.route("/api/billing", billing);
app.route("/api/addons", addons);

export default app;
export type { Env };
