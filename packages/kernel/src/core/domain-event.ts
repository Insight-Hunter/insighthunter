import type { EntityId } from "./entity-id.js";

export interface DomainEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  readonly eventName: string;
  readonly aggregateId: EntityId;
  readonly occurredAt: Date;
  readonly payload: Readonly<TPayload>;
}
