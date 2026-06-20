// scripts/setup-cf-access.js
// Usage: CF_API_TOKEN=<token> CF_ACCOUNT_ID=<id> node scripts/setup-cf-access.js

const CF_API_TOKEN  = process.env.CF_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;

const ALLOW_POLICY_ID  = process.env.ALLOW_POLICY_ID  || "2b7550ac-d758-4852-bea4-020f8f0c20f1";
const BYPASS_POLICY_ID = process.env.BYPASS_POLICY_ID || "9c85437d-c6f5-4e42-a34a-93d1d2d39133";

if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
  console.error("\u274c  Set CF_API_TOKEN and CF_ACCOUNT_ID as environment variables.");
  process.exit(1);
}

const ROOT    = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}`;
const HEADERS = {
  "Authorization": `Bearer ${CF_API_TOKEN}`,
  "Content-Type":  "application/json",
};

// Error codes that mean "already gone" on DELETE — treat as success
const ALREADY_GONE_CODES = new Set([10007, 11021]);

async function api(method, path, body = null) {
  const res = await fetch(`${ROOT}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : null,
  });
  const text = await res.text();
  if (!text || text.trim() === "") {
    if (res.ok) return null;
    console.error(`\u274c HTTP ${res.status} empty body: ${method} ${path}`);
    process.exit(1);
  }
  let data;
  try { data = JSON.parse(text); } catch {
    console.error(`\u274c Non-JSON: ${method} ${path}\n${text}`);
    process.exit(1);
  }
  if (data.success === false) {
    const code = data.errors?.[0]?.code;
    // On DELETE, "not found" / "unknown application" = already deleted = fine
    if (method === "DELETE" && ALREADY_GONE_CODES.has(code)) {
      return null; // treat as success
    }
    console.error(`\n\u274c API failed: ${method} ${path}`);
    console.error(JSON.stringify(data.errors, null, 2));
    process.exit(1);
  }
  return data.result ?? data;
}

// Nuke ALL Access apps on insighthunter.app domain
async function nukeAllIHApps() {
  const apps = await api("GET", "/access/apps");
  const targets = (apps || []).filter(a =>
    a.domain?.includes("insighthunter.app") ||
    a.name?.toLowerCase().includes("insight")
  );

  if (targets.length === 0) {
    console.log("   None found \u2014 skipping.");
    return;
  }

  for (const a of targets) {
    await api("DELETE", `/access/apps/${a.id}`);
    console.log(`   \u2705 Deleted: "${a.name}" (${a.id})`);
  }
}

async function createAppWithPolicy(name, domain, path, policyId) {
  const body = {
    name,
    type: "self_hosted",
    domain,
    session_duration: "24h",
    http_only_cookie_attribute: true,
    policies: [{ id: policyId }],
  };
  if (path) body.path = path;
  const app = await api("POST", "/access/apps", body);
  console.log(`   \u2705 Created "${name}" \u2192 ID: ${app.id}`);
  console.log(`   \u2705 Policy  \u2192 ${policyId}`);
  return app.id;
}

async function main() {
  console.log("\n\ud83d\ude80 Insight Hunter \u2014 Cloudflare Access Setup\n");
  console.log("\u2501".repeat(42));

  console.log("\n\ud83d\uddd1\ufe0f  Step 1: Removing existing IH Access apps...");
  await nukeAllIHApps();

  console.log("\n\ud83d\udd12 Step 2: Creating apps...\n");

  console.log("  [1/3] Main protected app:");
  const mainId = await createAppWithPolicy(
    "Insight Hunter - Auth App",
    "auth.insighthunter.app",
    null,
    ALLOW_POLICY_ID
  );

  console.log("\n  [2/3] Public bypass \u2014 /auth/register:");
  const regId = await createAppWithPolicy(
    "IH Public - Register",
    "auth.insighthunter.app",
    "auth/register",
    BYPASS_POLICY_ID
  );

  console.log("\n  [3/3] Public bypass \u2014 /auth/login:");
  const loginId = await createAppWithPolicy(
    "IH Public - Login",
    "auth.insighthunter.app",
    "auth/login",
    BYPASS_POLICY_ID
  );

  console.log("\n" + "\u2501".repeat(42));
  console.log("\u2705  DONE\n");
  console.log(`  Allow policy   : ${ALLOW_POLICY_ID}`);
  console.log(`  Bypass policy  : ${BYPASS_POLICY_ID}\n`);
  console.log(`  Main app       : ${mainId}`);
  console.log(`  Register (pub) : ${regId}`);
  console.log(`  Login (pub)    : ${loginId}`);
  console.log(`\n\ud83d\udd17 https://one.dash.cloudflare.com/${CF_ACCOUNT_ID}/access/apps`);
}

main().catch(err => {
  console.error("\n\u274c Unexpected error:", err.message);
  process.exit(1);
});
