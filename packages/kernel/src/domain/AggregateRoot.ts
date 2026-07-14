import type { DomainEvent } from "../events/DomainEvent.js";
import type { TypedId } from "../identity/TypedId.js";
import { Entity } from "./Entity.js";

export abstract class AggregateRoot<
  TId extends TypedId<string>,
  TProps extends object,
> extends Entity<TId, TProps> {
  private readonly pendingEvents: DomainEvent[] = [];
  private versionValue = 0;

  protected addDomainEvent(event: DomainEvent): void {
    this.pendingEvents.push(event);
  }

  public pullDomainEvents(): ReadonlyArray<DomainEvent> {
    const events = [...this.pendingEvents];
    this.pendingEvents.length = 0;
    return events;
  }

  public get version(): number {
    return this.versionValue;
  }

  public incrementVersion(): void {
    this.versionValue += 1;
  }
}
