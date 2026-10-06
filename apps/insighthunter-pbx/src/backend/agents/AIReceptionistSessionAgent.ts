// apps/insighthunter-pbx/src/backend/agents/AIReceptionistSessionAgent.ts
//
// Planning stub Durable Object for AI receptionist live session state (docs/insight-pbx-master-prompt.md §4.7).
// NOT bound in wrangler.toml yet — instantiating this class today has no
// effect. Adding it live requires: (1) a `[[durable_objects.bindings]]`
// entry, (2) a `[[migrations]]` block with a `new_sqlite_classes`/
// `new_classes` entry, and (3) wiring the binding name into types.ts Env.
// Do not add those without also implementing the methods below.
// Backs services/aiReceptionistService.ts; also depends on providers/interfaces/TranscriptionProvider.ts.
// TODO(AIReceptionistSessionAgent): implement once AIReceptionistSessionAgent is actually needed.
export class AIReceptionistSessionAgent implements DurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: unknown,
  ) {}

  async fetch(_request: Request): Promise<Response> {
    return new Response(
      JSON.stringify({ error: "not_implemented", agent: "AIReceptionistSessionAgent" }),
      { status: 501, headers: { "content-type": "application/json" } },
    );
  }
}
