import type { DomainEvent } from "./domain-event.js";

export abstract class Entity<TId extends string, TProps extends object> {
  protected constructor(
    readonly id: TId,
    protected readonly props: TProps,
  ) {}

  equals(other: Entity<TId, TProps>): boolean {
    return this.id === other.id;
  }

  toJSON(): Readonly<TProps & { id: TId }> {
    return {
      id: this.id,
      ...this.props,
    };
  }
}

export abstract class AggregateRoot<
  TId extends string,
  TProps extends object,
> extends Entity<TId, TProps> {
  private readonly events: DomainEvent[] = [];

  protected record(event: DomainEvent): void {
    this.events.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    return this.events.splice(0);
  }

  peekDomainEvents(): readonly DomainEvent[] {
    return this.events;
  }
}
