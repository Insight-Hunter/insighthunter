/**
 * UserVault — one Durable Object instance per user.
 *
 * Isolation boundary: no other user's Worker invocation can ever address this
 * instance. Module workers (bookkeeping, reports, etc.) reach a user's vault
 * by deriving the DO id from their userId — they never share storage.
 *
 * Keys are namespaced by the caller: e.g. "bookkeeping:tx:123", "profile:name".
 * For heavier structured data, module workers can store their own per-user D1
 * database reference as a vault key.
 *
 * Security model
 * ──────────────
 * All requests MUST include an `X-Vault-User-Id` header that matches the DO
 * name this instance was addressed with. The auth worker stamps this header
 * when forwarding; it must never be settable by end-users directly.
 * Requests missing or mismatching the header are rejected 403.
 */
export class UserVault {
  private readonly state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    // Caller-identity guard — the DO name IS the userId.
    // The auth worker sets this header before forwarding; end-users never reach
    // this DO directly (it has no public route).
    const claimedUserId = request.headers.get("X-Vault-User-Id");
    const doName        = this.state.id.name;
    if (!claimedUserId || claimedUserId !== doName) {
      return new Response("Forbidden", { status: 403 });
    }

    const url = new URL(request.url);
    const key = url.searchParams.get("key")?.trim() || null;

    switch (request.method) {
      case "GET": {
        if (!key) return this.list();
        const value = await this.state.storage.get(key);
        return Response.json({ key, value: value ?? null });
      }

      case "PUT": {
        if (!key) return new Response("key required", { status: 400 });
        if (key.length > 512) return new Response("key too long", { status: 400 });
        const value = await request.json();
        await this.state.storage.put(key, value);
        return Response.json({ key, stored: true });
      }

      case "DELETE": {
        if (!key) return new Response("key required", { status: 400 });
        const deleted = await this.state.storage.delete(key);
        return Response.json({ key, deleted });
      }

      default:
        return new Response("Method not allowed", { status: 405 });
    }
  }

  private async list(): Promise<Response> {
    const map = await this.state.storage.list();
    return Response.json({ keys: Array.from(map.keys()) });
  }
}
