import type { DomainEvent, EventBus, EventHandler, Unsubscribe } from './types.js';

type HandlerMap = Map<string, Set<EventHandler>>;

export class InMemoryEventBus implements EventBus {
  private readonly handlers: HandlerMap = new Map();

  subscribe<TEvent extends DomainEvent>(
    type: string,
    handler: EventHandler<TEvent>,
  ): Unsubscribe {
    const handlersForType = this.handlers.get(type) ?? new Set<EventHandler>();
    handlersForType.add(handler as EventHandler);
    this.handlers.set(type, handlersForType);

    return () => {
      const currentHandlers = this.handlers.get(type);
      if (!currentHandlers) {
        return;
      }

      currentHandlers.delete(handler as EventHandler);

      if (currentHandlers.size === 0) {
        this.handlers.delete(type);
      }
    };
  }

  async publish<TEvent extends DomainEvent>(event: TEvent): Promise<void> {
    const handlersForType = this.handlers.get(event.type);
    if (!handlersForType || handlersForType.size === 0) {
      return;
    }

    for (const handler of handlersForType) {
      await handler(event);
    }
  }
}
