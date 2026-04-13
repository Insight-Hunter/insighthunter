export class ComplianceAgent extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) { super(ctx, env); }
  async fetch(request: Request) {
    return new Response(JSON.stringify({ ok: true, agent: 'compliance', url: request.url }), { headers: { 'content-type': 'application/json' } });
  }
}
