// apps/insighthunter-ledger/workers/sync/index.ts
// ih-ledger-sync — Queue consumer for QuickBooks Online & Xero sync.
// Fired after close or on-demand. OAuth tokens stored in D1 (encrypted).

export interface Env {
  DB: D1Database;
  NOTIFICATIONS: Queue;
  VAULT_ENCRYPTION_KEY: string;   // for decrypting stored OAuth tokens
}

interface SyncJob {
  orgId: string;
  cycleId?: string;
  periodStart: string;
  periodEnd: string;
}

export default {
  async queue(batch: MessageBatch<SyncJob>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await processSync(msg.body, env);
        msg.ack();
      } catch (err) {
        console.error("Sync failed:", err);
        msg.retry();
      }
    }
  },
} satisfies ExportedHandler<Env>;

async function processSync(job: SyncJob, env: Env): Promise<void> {
  // Load org integrations
  const integrations = await env.DB.prepare(
    "SELECT * FROM accounting_integrations WHERE org_id = ? AND active = 1"
  ).bind(job.orgId).all<{
    id: string; provider: "qbo"|"xero"; access_token_enc: string;
    refresh_token_enc: string; realm_id: string; token_expires_at: string;
  }>();

  for (const integration of integrations.results) {
    try {
      // Decrypt token
      const accessToken = await decryptToken(integration.access_token_enc, env.VAULT_ENCRYPTION_KEY);
      const expiresAt = new Date(integration.token_expires_at).getTime();

      // Refresh token if expired (within 5 min buffer)
      let token = accessToken;
      if (Date.now() > expiresAt - 300_000) {
        token = await refreshToken(integration, env);
      }

      if (integration.provider === "qbo") {
        await syncToQBO(job, token, integration.realm_id, env);
      } else {
        await syncToXero(job, token, integration.realm_id, env);
      }

      await env.DB.prepare(
        "UPDATE accounting_integrations SET last_synced_at = datetime('now') WHERE id = ?"
      ).bind(integration.id).run();

    } catch (err) {
      console.error(`Sync error for integration ${integration.id}:`, err);
      await env.NOTIFICATIONS.send({
        orgId: job.orgId,
        type: "alert_created",
        title: `${integration.provider.toUpperCase()} sync failed`,
        body: `Could not sync to ${integration.provider.toUpperCase()}. Check your integration settings.`,
        actionUrl: "https://ledger.insighthunter.app/settings/integrations",
        channels: ["in_app"],
      });
    }
  }
}

async function syncToQBO(
  job: SyncJob, token: string, realmId: string, env: Env
): Promise<void> {
  // Fetch IH transactions for period
  const txns = await env.DB.prepare(
    `SELECT * FROM transactions WHERE org_id = ? AND date >= ? AND date <= ?
     AND gl_code IS NOT NULL AND qbo_synced = 0`
  ).bind(job.orgId, job.periodStart, job.periodEnd)
    .all<{ id: string; description: string; amount: number; type: string; gl_code: string; date: string }>();

  for (const txn of txns.results) {
    const qboPayload = {
      TxnDate: txn.date,
      Line: [{
        Amount: txn.amount,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          PostingType: txn.type === "debit" ? "Debit" : "Credit",
          AccountRef: { Value: txn.gl_code },
        },
        Description: txn.description,
      }],
    };

    const res = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${realmId}/journalentry`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(qboPayload),
      }
    );

    if (res.ok) {
      await env.DB.prepare(
        "UPDATE transactions SET qbo_synced = 1, qbo_synced_at = datetime('now') WHERE id = ?"
      ).bind(txn.id).run();
    }
  }
}

async function syncToXero(
  job: SyncJob, token: string, tenantId: string, env: Env
): Promise<void> {
  // Similar pattern to QBO — POST to Xero Journals API
  const txns = await env.DB.prepare(
    `SELECT * FROM transactions WHERE org_id = ? AND date >= ? AND date <= ?
     AND gl_code IS NOT NULL AND xero_synced = 0`
  ).bind(job.orgId, job.periodStart, job.periodEnd)
    .all<{ id: string; description: string; amount: number; type: string; gl_code: string; date: string }>();

  for (const txn of txns.results) {
    await fetch("https://api.xero.com/api.xro/2.0/Journals", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "xero-tenant-id": tenantId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        JournalDate: txn.date,
        JournalLines: [
          { AccountCode: txn.gl_code, Description: txn.description,
            LineAmount: txn.type === "credit" ? txn.amount : -txn.amount },
        ],
      }),
    });

    await env.DB.prepare(
      "UPDATE transactions SET xero_synced = 1, xero_synced_at = datetime('now') WHERE id = ?"
    ).bind(txn.id).run();
  }
}

// AES-GCM decryption for stored OAuth tokens
async function decryptToken(encHex: string, keyHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyBytes = hexToBytes(keyHex);
  const encBytes = hexToBytes(encHex);
  const iv = encBytes.slice(0, 12);
  const data = encBytes.slice(12);

  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plain);
}

async function refreshToken(
  integration: { refresh_token_enc: string; provider: string },
  env: Env
): Promise<string> {
  // Placeholder — implement provider-specific OAuth refresh flow
  throw new Error(`Token refresh not yet implemented for ${integration.provider}`);
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return arr;
}
