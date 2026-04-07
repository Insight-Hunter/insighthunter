import { Hono } from "hono";
import { sign } from "hono/jwt";
import { z } from "zod";
import type { Env } from "../types";
import { hashPassword, verifyPassword } from "../utils/crypto";
import { TenantProvisioningService } from "../services/tenantProvisioningService";
import { uploadTenantScript } from "../services/uploadTenantScript";
import { buildDefaultTenantScript } from "../services/tenantScriptTemplate";


const auth = new Hono<{ Bindings: Env }>();

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(2),
  tier: z.enum(["lite", "standard", "pro"]).default("lite"),
});

auth.post("/signup", async (c) => {
  let body: z.infer<typeof SignupSchema>;
  try {
    body = SignupSchema.parse(await c.req.json());
  } catch (e) {
    return c.json({ error: "Invalid input", details: (e as any).errors }, 400);
  }

  const { email, password, orgName, tier } = body;
// src/backend/routes/auth.ts  (signup handler — excerpt)

// Inside auth.post("/signup", ...) — after D1 user/org rows are created:

async function provisionTenantWorker(
  env: Env,
  orgId: string,
  tier: string
): 
  
  Promise<{ scriptName: string; kvNamespaceId: string }> {
  const scriptName = `tenant-${orgId}`;

  // Step A: Create a dedicated KV namespace for this tenant
  const kvRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/storage/kv/namespaces`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: `ih-tenant-${orgId}` }),
    }
  );

  const kvJson = await kvRes.json<{
    success: boolean;
    result: { id: string };
  }>();

  if (!kvJson.success) {
    throw new Error(`KV namespace creation failed for org ${orgId}`);
  }

  const kvNamespaceId = kvJson.result.id;

  // Step B: Build and upload the default tenant script
  const scriptContent = buildDefaultTenantScript({
    orgId,
    tier,
    platformApiUrl: env.PLATFORM_API_URL,
  });

  const uploadResult = await uploadTenantScript({
    accountId: env.CF_ACCOUNT_ID,
    apiToken: env.CF_API_TOKEN,
    dispatchNamespace: env.WFP_DISPATCH_NAMESPACE,
    scriptName,
    scriptContent,
    kvNamespaceId,
    orgId,
    tier: tier as "lite" | "standard" | "pro",
    annotations: {
      message: `Initial provisioning — ${tier} tier`,
      tag: `signup-${Date.now()}`,
    },
  });

  console.log(
    `Tenant Worker uploaded: ${scriptName} startup_ms=${uploadResult.startup_time_ms}`
  );

  return { scriptName, kvNamespaceId };
}

  // --- 1. Check for existing user ---
  const existing = await c.env.DB.prepare(
    "SELECT id FROM users WHERE email = ?"
  )
    .bind(email.toLowerCase())
    .first();

  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  // --- 2. Create org + user atomically ---
  const orgId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO orgs (id, name, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(orgId, orgName, tier, now, now),
    c.env.DB.prepare(
      `INSERT INTO users (id, org_id, email, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, 'owner', ?)`
    ).bind(userId, orgId, email.toLowerCase(), passwordHash, now),
  ]);

  // --- 3. Provision tenant Worker (Workers for Platforms) ---
  let provisioned = null;
  try {
    const provisioner = new TenantProvisioningService(c.env);
    provisioned = await provisioner.provision(orgId, tier);

    // Store provisioning metadata in D1 for future management
    await c.env.DB.prepare(
      `INSERT INTO tenant_workers
         (org_id, script_name, kv_namespace_id, dispatch_namespace, tier, provisioned_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        orgId,
        provisioned.scriptName,
        provisioned.kvNamespaceId,
        provisioned.dispatchNamespace,
        tier,
        now
      )
      .run();
  } catch (err) {
    // Don't fail signup if provisioning fails — queue a retry instead
    console.error("Tenant provisioning failed, queuing retry:", err);
    await c.env.PROVISION_QUEUE.send({
      type: "provision",
      orgId,
      tier,
      retryCount: 0,
    });
  }

  // --- 4. Seed bookkeeping (queue message to BookkeepingAgent) ---
  await c.env.PROVISION_QUEUE.send({
    type: "seed_bookkeeping",
    orgId,
    tier,
  });

  // --- 5. Track provisioning event (Analytics Engine) ---
  c.env.BILLING_EVENTS.writeDataPoint({
    blobs: ["signup", orgId, tier, email.toLowerCase()],
    doubles: [1],
    indexes: [orgId],
  });

  // --- 6. Issue JWT ---
  const token = await sign(
    {
      sub: userId,
      org: orgId,
      tier,
      role: "owner",
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    },
    c.env.JWT_SECRET
  );

  return c.json(
    {
      token,
      user: { id: userId, email, orgId, tier, role: "owner" },
      provisioned: provisioned !== null,
    },
    201
  );
});

// --- Login ---
auth.post("/login", async (c) => {
  const { email, password } = await c.req.json<{
    email: string;
    password: string;
  }>();

  const user = await c.env.DB.prepare(
    `SELECT u.id, u.org_id, u.password_hash, u.role, o.tier
       FROM users u
       JOIN orgs o ON o.id = u.org_id
      WHERE u.email = ?`
  )
    .bind(email.toLowerCase())
    .first<{
      id: string;
      org_id: string;
      password_hash: string;
      role: string;
      tier: string;
    }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await sign(
    {
      sub: user.id,
      org: user.org_id,
      tier: user.tier,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    },
    c.env.JWT_SECRET
  );

  return c.json({ token });
});

// --- Session validate (called by other workers) ---
auth.get("/session/validate", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return c.json({ valid: false }, 401);

  try {
    const { verify } = await import("hono/jwt");
    const payload = await verify(token, c.env.JWT_SECRET);
    return c.json({ valid: true, payload });
  } catch {
    return c.json({ valid: false }, 401);
  }
});

export default auth;
