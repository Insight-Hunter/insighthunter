// setup-cf-access-v6.js
// Run: node setup-cf-access-v6.js

// ── FILL THESE IN — use env vars, never hardcode ──────────
const CF_API_TOKEN  = process.env.CF_API_TOKEN;   // export CF_API_TOKEN=cfat_...
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;  // export CF_ACCOUNT_ID=18c8e...

const ALLOW_POLICY_ID  = "2b7550ac-d758-4852-bea4-020f8f0c20f1";
const BYPASS_POLICY_ID = "9c85437d-c6f5-4e42-a34a-93d1d2d39133";
// ──────────────────────────────────────────────────────────

if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
  console.error("❌ Set CF_API_TOKEN and CF_ACCOUNT_ID as environment variables.");
  process.exit(1);
}

const ROOT    = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}`;
const HEADERS = {
  "Authorization": `Bearer ${CF_API_TOKEN}`,
  "Content-Type":  "application/json",
};

async function api(method, path, body = null) {
  const res = await fetch(`${ROOT}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : null,
  });
  const text = await res.text();
  if (!text || text.trim() === "") {
    if (res.ok) return null;
    console.error(`❌ HTTP ${res.status} empty body: ${method} ${path}`);
    process.exit(1);
  }
  let data;
  try { data = JSON.parse(text); } catch {
    console.error(`❌ Non-JSON: ${method} ${path}\n${text}`);
    process.exit(1);
  }
  if (data.success === false) {
    console.error(`❌ API failed: ${method} ${path}`);
    console.error(JSON.stringify(data.errors, null, 2));
    process.exit(1);
  }
  return data.result ?? data;
}

async function getIHApps() {
  const apps = await api("GET", "/access/apps");
  return (apps || []).filter(a =>
    a.domain?.includes("insighthunter.app") ||
    a.name?.includes("Insight Hunter") ||
    a.name?.includes("IH Public")
  );
}

async function deleteApp(id, name) {
  await api("DELETE", `/access/apps/${id}`);
  console.log(`   ✅ Deleted: "${name}"`);
}

async function createApp(name, domain, path) {
  const body = {
    name,
    type: "self_hosted",
    domain,
    session_duration: "24h",
    http_only_cookie_attribute: true,
  };
  if (path) body.path = path;
  const app = await api("POST", "/access/apps", body);
  console.log(`   ✅ App created → ID: ${app.id}`);
  return app.id;
}

createAppWithPolicy(appId, policyId) {
  await api("POST", `/access/apps/${appId}/policies`, [{ id: policyId }]);
  console.log(`   ✅ Policy attached → ${policyId}`);
}

async function main() {
  console.log("\n🚀 Insight Hunter — Cloudflare Access (v6)\n");

  console.log("🗑️  Step 1: Removing existing IH apps...");
  const old = await getIHApps();
  if (old.length === 0) {
    console.log("   None found — skipping.");
  } else {
    for (const a of old) await deleteApp(a.id, a.name);
  }

  console.log("\n🔒 Step 2: Creating apps...\n");

  console.log("  [1/3] Main protected app:");
  const mainId = await createApp("Insight Hunter - Auth App", "auth.insighthunter.app", null);
  await attachPolicy(mainId, ALLOW_POLICY_ID);

  console.log("\n  [2/3] Bypass — /auth/register:");
  const regId = await createApp("IH Public - Register", "auth.insighthunter.app", "auth/register");
  await attachPolicy(regId, BYPASS_POLICY_ID);

  console.log("\n  [3/3] Bypass — /auth/login:");
  const loginId = await createApp("IH Public - Login", "auth.insighthunter.app", "auth/login");
  await attachPolicy(loginId, BYPASS_POLICY_ID);

  console.log("\n✅  DONE");
  console.log(`  Main: ${mainId} | Register: ${regId} | Login: ${loginId}`);
  console.log(`\n🔗 https://one.dash.cloudflare.com/${CF_ACCOUNT_ID}/access/apps`);
}

main().catch(err => {
  console.error("❌ Unexpected error:", err.message);
  process.exit(1);
});
