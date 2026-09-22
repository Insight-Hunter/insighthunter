import { verifySession } from "./crypto.js";

interface VaultEnv {
  SESSION_SECRET: string;
}

/**
 * UserVault — one Durable Object instance per user.
 *
 * This is the isolation boundary: no other user's Worker invocation can ever
 * address this instance, and its storage (DO transactional SQLite) is private
 * to it. Module workers (bookkeeping, reports, etc.) get routed to a user's
 * vault by deriving the DO id from userId — they never touch a shared table.
 *
 * This class only exposes generic get/put/delete/list here; each module
 * extends usage by namespacing its own keys (e.g. "bookkeeping:tx:123").
 * For heavier structured data, module workers can instead provision their
 * own per-user D1 database reference stored in this vault's metadata.
 */
export class UserVault {
  private static readonly OWNER_KEY = "__owner_user_id";
  state: DurableObjectState;
  private readonly sessionSecret: string;

  constructor(state: DurableObjectState, env: VaultEnv) {
    this.state = state;
    this.sessionSecret = env.SESSION_SECRET;
  }

  async fetch(request: Request): Promise<Response> {
    const identity = await this.authorize(request);
    if (!identity) return new Response("unauthorized", { status: 401 });

    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    if (key === UserVault.OWNER_KEY) {
      return new Response("forbidden", { status: 403 });
    }

    if (request.method === "GET") {
      if (!key) return this.list();
      const value = await this.state.storage.get(key);
      return Response.json({ key, value: value ?? null });
    }

    if (request.method === "PUT") {
      if (!key) return new Response("key required", { status: 400 });
      const value = await request.json();
      await this.state.storage.put(key, value);
      return Response.json({ key, stored: true });
    }

    if (request.method === "DELETE") {
      if (!key) return new Response("key required", { status: 400 });
      const deleted = await this.state.storage.delete(key);
      return Response.json({ key, deleted });
    }

    return new Response("method not allowed", { status: 405 });
  }

  private async authorize(request: Request): Promise<string | null> {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return null;
    const session = await verifySession(authorization.slice(7), this.sessionSecret);
    if (!session) return null;

    const ownerId = await this.state.storage.get<string>(UserVault.OWNER_KEY);
    if (ownerId && ownerId !== session.userId) return null;
    if (!ownerId) await this.state.storage.put(UserVault.OWNER_KEY, session.userId);
    return session.userId;
  }

  private async list(): Promise<Response> {
    const map = await this.state.storage.list();
    return Response.json({ keys: Array.from(map.keys()).filter((key) => key !== UserVault.OWNER_KEY) });
  }
}
