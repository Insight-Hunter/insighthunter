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
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

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

  private async list(): Promise<Response> {
    const map = await this.state.storage.list();
    return Response.json({ keys: Array.from(map.keys()) });
  }
}
