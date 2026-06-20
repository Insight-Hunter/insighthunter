// scripts/setup-cf-access.js
// Usage: CF_API_TOKEN=<token> CF_ACCOUNT_ID=<id> node scripts/setup-cf-access.js
//
// Fix: Cloudflare Access API does NOT support PUT /access/apps/:id/policies
// Policies must be embedded inside the POST /access/apps body at creation time.

const CF_API_TOKEN  = process.env.CF_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;

// Reusable (account-level) policy IDs — must already exist in CF dashboard
// Access > Policies > copy the UUID
const ALLOW_POLICY_ID  = process.env.ALLOW_POLICY_ID  || "2b7550ac-d758-4852-bea4-020f8f0c20f1";
const BYPASS_POLICY_ID = process.env.BYPASS_POLICY_ID || "9c85437d-c6f5-4e42-a34a-93d1d2d39133";

if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
  console.error("❌  Set CF_API_TOKEN and CF_ACCOUNT_ID as environment variables.");
  console.error("    Example: CF_API_TOKEN=cfat_... CF_ACCOUNT_ID=18c8e... node scripts/setup-cf-access.js");
  process.exit(1);
}

const ROOT    = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}`;
const HEADERS = {
  "Authorization": `Bearer ${CF_API_TOKEN}`,
  "Content-Type":  "application/json",
};

// ── Safe API helper ───────────────────────────────────────
async function api(method, path, body = null) {
  const res = await fetch(`${ROOT}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : null,
  });

  const text = await res.text();

  if (!text || text.trim() === "") {
    if (res.ok) return null;
    console.error(`❌ HTTP ${res.status} with empty body: ${method} ${path}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`❌ Non-JSON response from ${method} ${path}:\n${text}`);
    process.exit(1);
  }

  if (data.success === false) {
    console.error(`\n❌ API failed: ${method} ${path}`);
    console.error(JSON.stringify(data.errors, null, 2));
    process.exit(1);
  }

  return data.result ?? data;
}

// ── List all IH Access apps ───────────────────────────────
async function getIHApps() {
  const apps = await api("GET", "/access/apps");
  return (apps || []).filter(a =>
    a.domain?.includes("insighthunter.app") ||
    a.name?.includes("Insight Hunter") ||
    a.name?.includes("IH Public")
  );
}

// ── Delete an app ─────────────────────────────────────────
async function deleteApp(id, name) {
  await api("DELETE", `/access/apps/${id}`);
  console.log(`   ✅ Deleted: "${name}"`);
}

// ── Create app WITH policy embedded (fixes 405) ───────────
// The Cloudflare Access API does NOT expose PUT /access/apps/:id/policies.
// Policies must be included in the initial POST body as the `policies` array.
// Each entry references an existing reusable account-level policy by its UUID.
async function createAppWithPolicy(name, domain, path, policyId) {
  const body = {
    name,
    type: "self_hosted",
    domain,
    session_duration: "24h",
    http_only_cookie_attribute: true,
    // Embed the reusable policy at creation time — the only supported method
    policies: [
      { id: policyId }
    ],
  };
  if (path) body.path = path;

  const app = await api("POST", "/access/apps", body);
  console.log(`   ✅ Created "${name}" → ID: ${app.id}`);
  console.log(`   ✅ Policy attached  → ${policyId}`);
  return app.id;
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  console.log("\n🚀 Insight Hunter — Cloudflare Access Setup\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Step 1 — Clean up existing IH apps
  console.log("\n🗑️  Step 1: Removing existing IH apps...");
  const old = await getIHApps();
  if (old.length === 0) {
    console.log("   None found — skipping.");
  } else {
    for (const a of old) await deleteApp(a.id, a.name);
  }

  // Step 2 — Create 3 apps with policies baked in
  console.log("\n🔒 Step 2: Creating apps...\n");

  console.log("  [1/3] Main protected app (auth.insighthunter.app):");
  const mainId = await createAppWithPolicy(
    "Insight Hunter - Auth App",
    "auth.insighthunter.app",
    null,
    ALLOW_POLICY_ID
  );

  console.log("\n  [2/3] Public bypass — /auth/register:");
  const regId = await createAppWithPolicy(
    "IH Public - Register",
    "auth.insighthunter.app",
    "auth/register",
    BYPASS_POLICY_ID
  );

  console.log("\n  [3/3] Public bypass — /auth/login:");
  const loginId = await createAppWithPolicy(
    "IH Public - Login",
    "auth.insighthunter.app",
    "auth/login",
    BYPASS_POLICY_ID
  );

  // Summary
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅  DONE\n");
  console.log(`  Allow policy   : ${ALLOW_POLICY_ID}`);
  console.log(`  Bypass policy  : ${BYPASS_POLICY_ID}\n`);
  console.log(`  Main app       : ${mainId}`);
  console.log(`  Register (pub) : ${regId}`);
  console.log(`  Login (pub)    : ${loginId}`);
  console.log(`\n🔗 https://one.dash.cloudflare.com/${CF_ACCOUNT_ID}/access/apps`);
}

main().catch(err => {
  console.error("\n❌ Unexpected error:", err.message);
  process.exit(1);
});
