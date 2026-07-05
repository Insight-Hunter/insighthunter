import type { EntityId } from "./ids.js";

export interface DomainEvent<TPayload = unknown, TType extends string = string> {
  readonly id: EntityId<"event">;
  readonly type: TType;
  readonly aggregateId: string;
  readonly organizationId: string;
  readonly occurredAt: string;
  readonly payload: Readonly<TPayload>;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CreateDomainEventInput<TPayload, TType extends string> {
  readonly id?: EntityId<"event">;
  readonly type: TType;
  readonly aggregateId: string;
  readonly organizationId: string;
  readonly occurredAt: string;
  readonly payload: TPayload;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export function createDomainEvent<TPayload, TType extends string>(
  input: CreateDomainEventInput<TPayload, TType>,
): DomainEvent<TPayload, TType> {
  return {
    id: input.id ?? (`event_${crypto.randomUUID()}` as EntityId<"event">),
    type: input.type,
    aggregateId: input.aggregateId,
    organizationId: input.organizationId,
    occurredAt: input.occurredAt,
    payload: input.payload,
    metadata: input.metadata ?? {},
  };
}
