import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types';

export class ComplianceAgent extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async alarm(): Promise<void> {
    console.log('ComplianceAgent alarm fired');
  }
}
