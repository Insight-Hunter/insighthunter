import { Hono } from 'hono';

interface Env {
  PLATFORM_DB: D1Database;
  ROUTING_CACHE: KVNamespace;
  PROVISION_QUEUE: Queue<ProvisionJob>;
  EVENTS: AnalyticsEngineDataset;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
  DISPATCH_NAMESPACE: string;
  // URL of the bundled user worker script stored in R2 or a static asset
  USER_WORKER_SCRIPT_URL: string;
  INTERNAL_TOKEN: string;
}

interface ProvisionJob {
  userId: string;
  email: string;
  plan: 'lite' | 'standard' | 'pro';
}

const app = new Hono<{ Bindings: Env }>();

// Called from auth callback (apps/insighthunter-main/functions/api/[path].ts)
// immediately after user registers
app.post('/provision', async (c) => {
  if (c.req.header('X-Internal-Token') !== c.env.INTERNAL_TOKEN) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const body = await c.req.json<ProvisionJob>();
  if (!body.userId || !body.email) {
    return c.json({ error: 'userId and email required' }, 400);
  }

  // Idempotency — check if already in platform DB
  const existing = await c.env.PLATFORM_DB
    .prepare('SELECT status FROM platform_users WHERE user_id = ?')
    .bind(body.userId)
    .first<{ status: string }>();

  if (existing) {
    return c.json({ message: 'Already exists', status: existing.status });
  }

  // Insert as 'provisioning' so dispatch worker returns 202 immediately
  await c.env.PLATFORM_DB
    .prepare(`INSERT INTO platform_users
              (user_id, email, plan, status, worker_name, created_at)
              VALUES (?, ?, ?, 'provisioning', '', datetime('now'))`)
    .bind(body.userId, body.email, body.plan ?? 'lite')
    .run();

  // Enqueue actual resource creation (durable, retried on failure)
  await c.env.PROVISION_QUEUE.send(body);

  return c.json({ message: 'Provisioning queued', userId: body.userId }, 202);
});

// ── Queue Consumer ─────────────────────────────────────────────────────
// Creates D1 + KV per user, uploads their isolated worker to the namespace
export async function queue(
  batch: MessageBatch<ProvisionJob>,
  env: Env,
): Promise<void> {
  for (const msg of batch.messages) {
    const { userId, email, plan } = msg.body;
    const slug = userId.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 16);
    const workerName = `insight-user-${slug}`;

    try {
      const headers = {
        'Authorization': `Bearer ${env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      };

      // 1. Create user D1 database
      const d1Res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/d1/database`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: `ih-user-${slug}` }),
        },
      );
      if (!d1Res.ok) throw new Error(`D1 create failed: ${await d1Res.text()}`);
      const { result: d1 } = await d1Res.json<{ result: { uuid: string } }>();

      // 2. Run user schema on the new D1
      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/d1/database/${d1.uuid}/query`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ sql: USER_DB_SCHEMA }),
        },
      );

      // 3. Create user KV namespace
      const kvRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/storage/kv/namespaces`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ title: `ih-user-kv-${slug}` }),
        },
      );
      if (!kvRes.ok) throw new Error(`KV create failed: ${await kvRes.text()}`);
      const { result: kv } = await kvRes.json<{ result: { id: string } }>();

      // 4. Fetch bundled user worker script (built artifact stored in R2)
      const scriptRes = await fetch(env.USER_WORKER_SCRIPT_URL);
      if (!scriptRes.ok) throw new Error('Could not fetch user worker script');
      const scriptBlob = await scriptRes.blob();

      // 5. Upload user worker to dispatch namespace with per-user bindings
      //    Each binding references resources created above by ID
      const metadata = JSON.stringify({
        main_module: 'index.js',
        compatibility_date: '2025-03-07',
        compatibility_flags: ['nodejs_compat'],
        bindings: [
          { type: 'd1',          name: 'USER_DB', id: d1.uuid },
          { type: 'kv_namespace', name: 'USER_KV', namespace_id: kv.id },
          { type: 'ai',          name: 'AI' },
          { type: 'r2_bucket',   name: 'USER_R2', bucket_name: `ih-user-docs-${slug}` },
          // Inject userId as env var so user worker can read it without trusting headers
          { type: 'plain_text',  name: 'OWNER_USER_ID', text: userId },
          { type: 'plain_text',  name: 'USER_PLAN',     text: plan },
        ],
      });

      const form = new FormData();
      form.append(
        'metadata',
        new Blob([metadata], { type: 'application/json' }),
        'metadata.json',
      );
      form.append('index.js', scriptBlob, 'index.js');

      const uploadRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/dispatch/namespaces/${env.DISPATCH_NAMESPACE}/scripts/${workerName}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` },
          body: form,
        },
      );
      if (!uploadRes.ok) throw new Error(`Worker upload failed: ${await uploadRes.text()}`);

      // 6. Activate user in platform DB
      await env.PLATFORM_DB
        .prepare(`UPDATE platform_users SET
          status        = 'active',
          worker_name   = ?,
          d1_database_id = ?,
          kv_namespace_id = ?,
          updated_at    = datetime('now')
          WHERE user_id = ?`)
        .bind(workerName, d1.uuid, kv.id, userId)
        .run();

      // Emit billing event
      env.EVENTS.writeDataPoint({
        blobs: [userId, plan, 'provisioned'],
        doubles: [1],
        indexes: [userId],
      });

      console.log(`[provision] ✅ ${userId} → ${workerName}`);
      msg.ack();
    } catch (err) {
      console.error(`[provision] ❌ ${userId}:`, err);
      msg.retry({ delaySeconds: 60 }); // Retry with backoff; DLQ after 3 attempts
    }
  }
}

export default app;
