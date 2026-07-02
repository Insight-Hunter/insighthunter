import { Entity } from './Entity.js';

export abstract class AggregateRoot<TId> extends Entity<TId> {
  private readonly domainEvents: unknown[] = [];

  protected record(event: unknown): void {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): readonly unknown[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }
}
