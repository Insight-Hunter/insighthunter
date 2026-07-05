export function createDomainEvent(input) {
  return {
    id: input.id ?? `event_${crypto.randomUUID()}`,
    type: input.type,
    aggregateId: input.aggregateId,
    organizationId: input.organizationId,
    occurredAt: input.occurredAt,
    payload: input.payload,
    metadata: input.metadata ?? {},
  };
}
//# sourceMappingURL=domain-event.js.map
