export interface DomainEvent<T = unknown> {
  id: string;
  type: string;
  occurredAt: string;
  organizationId: string;
  payload: T;
}

export type EventHandler<TEvent extends DomainEvent = DomainEvent> = (
  event: TEvent,
) => void | Promise<void>;

export type Unsubscribe = () => void;

export interface EventBus {
  publish<TEvent extends DomainEvent>(event: TEvent): Promise<void>;
  subscribe<TEvent extends DomainEvent>(type: string, handler: EventHandler<TEvent>): Unsubscribe;
}
