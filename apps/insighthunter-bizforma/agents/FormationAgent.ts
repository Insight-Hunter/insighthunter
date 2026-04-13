export class FormationAgent extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) { super(ctx, env); }
  async fetch(request: Request) {
    return new Response(JSON.stringify({ ok: true, agent: 'formation', url: request.url }), { headers: { 'content-type': 'application/json' } });
  }
}
