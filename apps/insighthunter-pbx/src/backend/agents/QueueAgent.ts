// apps/insighthunter-pbx/src/backend/agents/QueueAgent.ts
//
// Planning stub Durable Object for call queue + agent-presence coordination (docs/insight-pbx-master-prompt.md §4.8).
// NOT bound in wrangler.toml yet — instantiating this class today has no
// effect. Adding it live requires: (1) a `[[durable_objects.bindings]]`
// entry, (2) a `[[migrations]]` block with a `new_sqlite_classes`/
// `new_classes` entry, and (3) wiring the binding name into types.ts Env.
// Do not add those without also implementing the methods below.
// Backs services/queueService.ts.
// TODO(QueueAgent): implement once QueueAgent is actually needed.
export class QueueAgent implements DurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: unknown,
  ) {}

  async fetch(_request: Request): Promise<Response> {
    return new Response(JSON.stringify({ error: "not_implemented", agent: "QueueAgent" }), {
      status: 501,
      headers: { "content-type": "application/json" },
    });
  }
}
