import type { DomainEvent } from "./DomainEvent.js";
import type { EventEnvelope } from "./EventEnvelope.js";
export type EventHandler<TEvent extends DomainEvent = DomainEvent> = (
  envelope: EventEnvelope<TEvent>,
) => Promise<void> | void;
export declare class DomainEventBus {
  private readonly handlers;
  subscribe<TEvent extends DomainEvent>(
    eventName: string,
    handler: EventHandler<TEvent>,
  ): () => void;
  publish<TEvent extends DomainEvent>(
    event: TEvent,
    metadata?: Partial<EventEnvelope<TEvent>["metadata"]>,
  ): Promise<void>;
}
