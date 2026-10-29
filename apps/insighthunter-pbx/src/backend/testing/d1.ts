import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import type { DatabaseSync as DatabaseSyncType, SQLInputValue } from "node:sqlite";

// vite strips the "node:" prefix on static imports, which breaks node:sqlite.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: typeof DatabaseSyncType;
};

/** Minimal D1 shim over in-memory SQLite that applies the real migrations/. */
export function createTestDb(): D1Database {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync("migrations").sort()) {
    sqlite.exec(readFileSync(`migrations/${file}`, "utf8"));
  }
  const prepare = (query: string) => {
    let values: SQLInputValue[] = [];
    const statement = {
      bind(...args: SQLInputValue[]) {
        values = args;
        return statement;
      },
      async all() {
        return { results: sqlite.prepare(query).all(...values) };
      },
      async first() {
        return sqlite.prepare(query).get(...values) ?? null;
      },
      async run() {
        const r = sqlite.prepare(query).run(...values);
        return {
          success: true,
          meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) },
        };
      },
    };
    return statement;
  };
  return {
    prepare,
    async batch(statements: { run(): Promise<unknown> }[]) {
      sqlite.exec("BEGIN");
      try {
        const out = [];
        for (const s of statements) out.push(await s.run());
        sqlite.exec("COMMIT");
        return out;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
}
