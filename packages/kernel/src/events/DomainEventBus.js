import { randomUUID } from "node:crypto";
export class DomainEventBus {
  handlers = new Map();
  subscribe(eventName, handler) {
    const handlers = this.handlers.get(eventName) ?? new Set();
    handlers.add(handler);
    this.handlers.set(eventName, handlers);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventName);
      }
    };
  }
  async publish(event, metadata) {
    const handlers = this.handlers.get(event.eventName);
    if (!handlers || handlers.size === 0) {
      return;
    }
    const envelope = {
      event,
      metadata: {
        eventId: metadata?.eventId ?? randomUUID(),
        correlationId: metadata?.correlationId,
        causationId: metadata?.causationId,
        tenantId: metadata?.tenantId,
        actorId: metadata?.actorId,
        schemaVersion: metadata?.schemaVersion ?? 1,
      },
    };
    for (const handler of handlers) {
      await handler(envelope);
    }
  }
}
//# sourceMappingURL=DomainEventBus.js.map
