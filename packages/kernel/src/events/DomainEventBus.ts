import { randomUUID } from "node:crypto";
import type { DomainEvent } from "./DomainEvent.js";
import type { EventEnvelope } from "./EventEnvelope.js";

export type EventHandler<TEvent extends DomainEvent = DomainEvent> = (
  envelope: EventEnvelope<TEvent>,
) => Promise<void> | void;

export class DomainEventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  public subscribe<TEvent extends DomainEvent>(
    eventName: string,
    handler: EventHandler<TEvent>,
  ): () => void {
    const handlers = this.handlers.get(eventName) ?? new Set<EventHandler>();
    handlers.add(handler as EventHandler);
    this.handlers.set(eventName, handlers);

    return () => {
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) {
        this.handlers.delete(eventName);
      }
    };
  }

  public async publish<TEvent extends DomainEvent>(
    event: TEvent,
    metadata?: Partial<EventEnvelope<TEvent>["metadata"]>,
  ): Promise<void> {
    const handlers = this.handlers.get(event.eventName);
    if (!handlers || handlers.size === 0) {
      return;
    }

    const envelope: EventEnvelope<TEvent> = {
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
