import type { DomainEvent } from './types.js';

export interface CreateDomainEventInput<TPayload> {
  id?: string;
  type: string;
  organizationId: string;
  payload: TPayload;
  occurredAt?: string;
}

export function createDomainEvent<TPayload>(
  input: CreateDomainEventInput<TPayload>,
): DomainEvent<TPayload> {
  return {
    id: input.id ?? crypto.randomUUID(),
    type: input.type,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    organizationId: input.organizationId,
    payload: input.payload,
  };
}
