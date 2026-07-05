import type { DomainEvent } from "./DomainEvent.js";
export interface EventMetadata {
  readonly eventId: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
  readonly schemaVersion: number;
}
export interface EventEnvelope<TEvent extends DomainEvent = DomainEvent> {
  readonly event: TEvent;
  readonly metadata: EventMetadata;
}
