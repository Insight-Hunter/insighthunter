import type { DomainEvent } from "./domain-event.js";
export declare abstract class Entity<TId extends string, TProps extends object> {
  readonly id: TId;
  protected readonly props: TProps;
  protected constructor(id: TId, props: TProps);
  equals(other: Entity<TId, TProps>): boolean;
  toJSON(): Readonly<
    TProps & {
      id: TId;
    }
  >;
}
export declare abstract class AggregateRoot<
  TId extends string,
  TProps extends object,
> extends Entity<TId, TProps> {
  private readonly events;
  protected record(event: DomainEvent): void;
  pullDomainEvents(): DomainEvent[];
  peekDomainEvents(): readonly DomainEvent[];
}
