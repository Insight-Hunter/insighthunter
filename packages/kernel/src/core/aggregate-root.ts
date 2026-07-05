import type { DomainEvent } from "./domain-event.js";
import { EntityId } from "./entity-id.js";

export abstract class AggregateRoot {
  public readonly id: EntityId;
  private readonly domainEventsInternal: DomainEvent[] = [];

  protected constructor(id?: EntityId) {
    this.id = id ?? EntityId.create();
  }

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEventsInternal.push(event);
  }

  public pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEventsInternal];
    this.domainEventsInternal.length = 0;
    return events;
  }
}
