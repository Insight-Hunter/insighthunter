import type { Env, QBConnection, JournalEntry, Account } from "../types.js";

const QB_TOKEN_URL =
  "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QB_REVOKE_URL =
  "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";
const QB_BASE = "https://quickbooks.api.intuit.com/v3/company";
const QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";

// Encrypt a string with AES-GCM using the ENCRYPTION_KEY secret
async function encrypt(plain: string, keyHex: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(keyHex.slice(0, 64)),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plain)
  );
  return btoa(
    String.fromCharCode(...iv) + String.fromCharCode(...new Uint8Array(enc))
  );
}

async function decrypt(b64: string, keyHex: string): Promise<string> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const data = raw.slice(12);
  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(keyHex.slice(0, 64)),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(dec);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function buildQBAuthUrl(env: Env, state: string): string {
  const params = new URLSearchParams({
    client_id: env.QB_CLIENT_ID,
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: env.QB_REDIRECT_URI,
    response_type: "code",
    state,
  });
  return `${QB_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  realmId: string,
  env: Env
): Promise<QBConnection & { orgId?: string }> {
  const creds = btoa(`${env.QB_CLIENT_ID}:${env.QB_CLIENT_SECRET}`);
  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${creds}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.QB_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    throw new Error(`QB token exchange failed: ${res.status}`);
  }

  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // Fetch company info to get the name
  const companyRes = await fetch(
    `${QB_BASE}/${realmId}/companyinfo/${realmId}?minorversion=65`,
    {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/json",
      },
    }
  );

  const companyData = (await companyRes.json()) as {
    CompanyInfo?: { CompanyName?: string };
  };
  const companyName =
    companyData.CompanyInfo?.CompanyName ?? "QuickBooks Company";

  return {
    org_id: "",
    realm_id: realmId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
    company_name: companyName,
    last_synced_at: null,
    connected_at: new Date().toISOString(),
  };
}

export async function saveQBTokens(
  orgId: string,
  conn: QBConnection,
  env: Env
): Promise<void> {
  const encrypted = {
    ...conn,
    access_token: await encrypt(conn.access_token, env.ENCRYPTION_KEY),
    refresh_token: await encrypt(conn.refresh_token, env.ENCRYPTION_KEY),
  };
  await env.QB_TOKENS.put(`qb:${orgId}`, JSON.stringify(encrypted));
}

export async function getQBConnection(
  orgId: string,
  env: Env
): Promise<QBConnection | null> {
  const raw = await env.QB_TOKENS.get(`qb:${orgId}`);
  if (!raw) return null;
  const stored = JSON.parse(raw) as QBConnection;
  return {
    ...stored,
    access_token: await decrypt(stored.access_token, env.ENCRYPTION_KEY),
    refresh_token: await decrypt(stored.refresh_token, env.ENCRYPTION_KEY),
  };
}

async function refreshQBToken(
  conn: QBConnection,
  env: Env
): Promise<QBConnection> {
  const creds = btoa(`${env.QB_CLIENT_ID}:${env.QB_CLIENT_SECRET}`);
  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${creds}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: conn.refresh_token,
    }),
  });

  if (!res.ok) throw new Error(`QB token refresh failed: ${res.status}`);

  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    ...conn,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };
}

async function getValidToken(orgId: string, env: Env): Promise<string> {
  let conn = await getQBConnection(orgId, env);
  if (!conn) throw new Error("QuickBooks not connected");

  // Refresh if token expires within 5 minutes
  if (conn.expires_at - Date.now() < 5 * 60 * 1000) {
    conn = await refreshQBToken(conn, env);
    await saveQBTokens(orgId, conn, env);
  }
  return conn.access_token;
}

// Push a journal entry to QuickBooks
export async function pushJournalEntry(
  orgId: string,
  je: JournalEntry,
  env: Env
): Promise<string> {
  const conn = await getQBConnection(orgId, env);
  if (!conn) throw new Error("QuickBooks not connected");
  const token = await getValidToken(orgId, env);

  const qbLines = je.lines?.map((line, idx) => ({
    Id: String(idx + 1),
    Description: line.description ?? je.memo,
    Amount: line.debit > 0 ? line.debit : line.credit,
    DetailType: "JournalEntryLineDetail",
    JournalEntryLineDetail: {
      PostingType: line.debit > 0 ? "Debit" : "Credit",
      AccountRef: { value: line.account_id },
    },
  }));

  const body = {
    DocNumber: je.reference ?? je.id.slice(0, 8),
    TxnDate: je.date,
    PrivateNote: je.memo,
    Line: qbLines,
  };

  const res = await fetch(
    `${QB_BASE}/${conn.realm_id}/journalentry?minorversion=65`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ JournalEntry: body }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`QB push failed: ${err}`);
  }

  const data = (await res.json()) as { JournalEntry: { Id: string } };
  return data.JournalEntry.Id;
}

// Pull accounts from QB and upsert into local D1
export async function pullQBAccounts(orgId: string, env: Env): Promise<number> {
  const conn = await getQBConnection(orgId, env);
  if (!conn) throw new Error("QuickBooks not connected");
  const token = await getValidToken(orgId, env);

  const res = await fetch(
    `${QB_BASE}/${conn.realm_id}/query?query=SELECT * FROM Account MAXRESULTS 1000&minorversion=65`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) throw new Error(`QB pull failed: ${res.status}`);

  const data = (await res.json()) as {
    QueryResponse?: {
      Account?: Array<{
        Id: string;
        Name: string;
        AccountType: string;
        AccountSubType: string;
        AcctNum?: string;
      }>;
    };
  };
  const qbAccounts = data.QueryResponse?.Account ?? [];
  const now = new Date().toISOString();

  // Map QB account types to our types
  const typeMap: Record<string, string> = {
    Bank: "asset",
    "Accounts Receivable": "asset",
    "Other Current Asset": "asset",
    "Fixed Asset": "asset",
    "Other Asset": "asset",
    "Accounts Payable": "liability",
    "Credit Card": "liability",
    "Other Current Liability": "liability",
    "Long Term Liability": "liability",
    Equity: "equity",
    Income: "revenue",
    "Other Income": "other_income",
    "Cost of Goods Sold": "cost_of_goods_sold",
    Expense: "expense",
    "Other Expense": "other_expense",
  };

  const stmts = qbAccounts.map((a) =>
    env.DB.prepare(
      `INSERT INTO accounts (id, org_id, name, code, type, subtype, is_active, qb_account_id, balance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, 0, ?, ?)
       ON CONFLICT(org_id, code) DO UPDATE SET qb_account_id=excluded.qb_account_id, updated_at=excluded.updated_at`
    ).bind(
      crypto.randomUUID(),
      orgId,
      a.Name,
      a.AcctNum ?? a.Id,
      typeMap[a.AccountType] ?? "expense",
      a.AccountSubType?.toLowerCase().replace(/ /g, "_") ?? "expense",
      a.Id,
      now,
      now
    )
  );

  if (stmts.length > 0) await env.DB.batch(stmts);
  return qbAccounts.length;
}
