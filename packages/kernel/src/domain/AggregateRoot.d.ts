import type { DomainEvent } from "../events/DomainEvent.js";
import type { TypedId } from "../identity/TypedId.js";
import { Entity } from "./Entity.js";
export declare abstract class AggregateRoot<
  TId extends TypedId<string>,
  TProps extends object,
> extends Entity<TId, TProps> {
  private readonly pendingEvents;
  private versionValue;
  protected addDomainEvent(event: DomainEvent): void;
  pullDomainEvents(): ReadonlyArray<DomainEvent>;
  get version(): number;
  incrementVersion(): void;
}
