// scripts/setup-cf-access.js — v4 FINAL
// Combines domain+path into single string (Cloudflare requirement)
// Specific paths created first, catch-all LAST
// Safe to re-run — nukes all insighthunter apps before recreating

const CF_API_TOKEN   = process.env.CF_API_TOKEN;
const CF_ACCOUNT_ID  = process.env.CF_ACCOUNT_ID;
const ALLOW_POLICY_ID  = process.env.ALLOW_POLICY_ID  || "2b7550ac-d758-4852-bea4-020f8f0c20f1";
const BYPASS_POLICY_ID = process.env.BYPASS_POLICY_ID || "9c85437d-c6f5-4e42-a34a-93d1d2d39133";

if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
  console.error("❌  Missing CF_API_TOKEN or CF_ACCOUNT_ID");
  process.exit(1);
}

const BASE    = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}`;
const HEADERS = { "Authorization": `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" };

// ─── low-level fetch wrapper ───────────────────────────────────────────────
async function api(method, path, body = null) {
  const res  = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : null,
  });
  const text = await res.text();

  // empty body on DELETE 204 is fine
  if (!text?.trim()) {
    if (res.ok) return null;
    console.error(`❌  HTTP ${res.status} with empty body: ${method} ${path}`);
    process.exit(1);
  }

  let data;
  try { data = JSON.parse(text); }
  catch { console.error(`❌  Non-JSON response: ${method} ${path}\n${text}`); process.exit(1); }

  if (data.success === false) {
    const code = data.errors?.[0]?.code;
    // 10007 = not found, 11021 = already deleted — both are fine on DELETE
    if (method === "DELETE" && [10007, 11021].includes(code)) return null;
    console.error(`\n❌  API failed: ${method} ${path}`);
    console.error(JSON.stringify(data.errors, null, 2));
    process.exit(1);
  }

  return data.result ?? data;
}

// ─── nuke every insighthunter app (skips CF system apps) ──────────────────
async function nukeAll() {
  const apps = (await api("GET", "/access/apps")) || [];
  const SYSTEM_TYPES = new Set(["app_launcher", "warp", "biso", "infrastructure"]);

  const targets = apps.filter(a =>
    (a.domain || "").toLowerCase().includes("insighthunter.app") &&
    !SYSTEM_TYPES.has(a.type)
  );

  if (!targets.length) {
    console.log("   ✅  Clean — nothing to delete");
    return;
  }

  for (const a of targets) {
    const result = await api("DELETE", `/access/apps/${a.id}`);
    console.log(`   🗑️   Deleted  "${a.name}"  [${a.domain}]  (${a.id})`);
  }
}

// ─── create one app ────────────────────────────────────────────────────────
async function createApp(name, domain, path, policyId) {
  // KEY FIX: Cloudflare requires domain+path as ONE combined string
  // e.g.  "auth.insighthunter.app/auth/register"
  // NOT   domain:"auth.insighthunter.app", path:"auth/register"
  const fullDomain = path ? `${domain}/${path}` : domain;

  const body = {
    name,
    type: "self_hosted",
    domain: fullDomain,
    session_duration: "24h",
    http_only_cookie_attribute: true,
    same_site_cookie_attribute: "lax",
    policies: [{ id: policyId }],
  };

  const app = await api("POST", "/access/apps", body);
  console.log(`   ✅  Created  "${name}"  →  ${app.id}`);
  return app.id;
}

// ─── app definitions ───────────────────────────────────────────────────────
// ⚠️  ORDER MATTERS — specific paths FIRST, catch-all (null path) LAST
// Cloudflare will reject any path-based app added after a catch-all owns the domain
const AUTH_DOMAIN = "auth.insighthunter.app";
const MAIN_DOMAIN = "insighthunter.app";

const APPS = [
  // ── PUBLIC bypass routes (no login wall) ──────────────────────────────
  { name: "IH Public - Register",        domain: AUTH_DOMAIN, path: "auth/register",       policy: BYPASS_POLICY_ID },
  { name: "IH Public - Login",           domain: AUTH_DOMAIN, path: "auth/login",          policy: BYPASS_POLICY_ID },
  { name: "IH Public - Verify Email",    domain: AUTH_DOMAIN, path: "auth/verify",         policy: BYPASS_POLICY_ID },
  { name: "IH Public - Reset Password",  domain: AUTH_DOMAIN, path: "auth/reset",          policy: BYPASS_POLICY_ID },
  { name: "IH Public - Callback",        domain: AUTH_DOMAIN, path: "auth/callback",       policy: BYPASS_POLICY_ID },
  { name: "IH Public - Forgot Password", domain: AUTH_DOMAIN, path: "auth/forgot",         policy: BYPASS_POLICY_ID },

  // ── PROTECTED routes (login required) ────────────────────────────────
  { name: "IH App - Dashboard",          domain: AUTH_DOMAIN, path: "dashboard",           policy: ALLOW_POLICY_ID  },
  { name: "IH App - API",                domain: AUTH_DOMAIN, path: "api",                 policy: ALLOW_POLICY_ID  },
  { name: "IH App - Settings",           domain: AUTH_DOMAIN, path: "settings",            policy: ALLOW_POLICY_ID  },
  { name: "IH App - Reports",            domain: AUTH_DOMAIN, path: "reports",             policy: ALLOW_POLICY_ID  },
  { name: "IH App - Onboarding",         domain: AUTH_DOMAIN, path: "onboarding",          policy: ALLOW_POLICY_ID  },

  // ── CATCH-ALL — must be absolute last ────────────────────────────────
  { name: "Insight Hunter - Auth App",   domain: AUTH_DOMAIN, path: null,                  policy: ALLOW_POLICY_ID  },
];

// ─── main ──────────────────────────────────────────────────────────────────
async function main() {
  const line = "━".repeat(52);
  console.log(`\n🚀  Insight Hunter — Cloudflare Access Setup v4\n${line}`);

  console.log("\n🗑️   Step 1: Clearing all insighthunter.app Access apps...\n");
  await nukeAll();

  console.log(`\n🔒  Step 2: Creating ${APPS.length} apps (specific → catch-all)...\n`);
  const results = [];
  for (let i = 0; i < APPS.length; i++) {
    const { name, domain, path, policy } = APPS[i];
    process.stdout.write(`  [${i + 1}/${APPS.length}] `);
    const id = await createApp(name, domain, path, policy);
    results.push({ name, fullDomain: path ? `${domain}/${path}` : domain, id });
  }

  console.log(`\n${line}\n✅  All done!\n`);
  results.forEach(r =>
    console.log(`  ${r.fullDomain.padEnd(46)} ${r.id}`)
  );
  console.log(`\n🔗  https://one.dash.cloudflare.com/${CF_ACCOUNT_ID}/access/apps\n`);
}

main().catch(err => {
  console.error("\n❌  Fatal error:", err.message);
  process.exit(1);
});
