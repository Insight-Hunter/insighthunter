const CF_BASE = "https://api.cloudflare.com/client/v4";

export interface D1CreateResult {
  databaseId: string;
  name: string;
}

export async function createUserDatabase(
  accountId: string,
  apiToken: string,
  userId: string,
  locationHint = "WNAM"
): Promise<D1CreateResult> {
  const res = await fetch(`${CF_BASE}/accounts/${accountId}/d1/database`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `ih-user-${userId}`,
      primary_location_hint: locationHint,
    }),
  });

  const json = await res.json<{ success: boolean; result: { uuid: string; name: string } }>();
  if (!json.success) throw new Error(`D1 create failed for user ${userId}`);

  return { databaseId: json.result.uuid, name: json.result.name };
}

export async function seedUserDatabase(
  accountId: string,
  apiToken: string,
  databaseId: string
): Promise<void> {
  const schema = `
    CREATE TABLE IF NOT EXISTS transactions (
      id          TEXT PRIMARY KEY,
      account_id  TEXT NOT NULL,
      amount      REAL NOT NULL,
      description TEXT,
      category    TEXT,
      date        TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      type       TEXT NOT NULL,
      balance    REAL DEFAULT 0,
      currency   TEXT DEFAULT 'USD',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reports (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      type       TEXT NOT NULL,
      payload    TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `;

  const res = await fetch(
    `${CF_BASE}/accounts/${accountId}/d1/database/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: schema }),
    }
  );

  const json = await res.json<{ success: boolean; errors: unknown[] }>();
  if (!json.success) throw new Error(`Schema seed failed: ${JSON.stringify(json.errors)}`);
}
