import { describe, expect, it } from 'vitest';
import { AggregateRoot } from '../src/domain/AggregateRoot.js';
import type { DomainEvent } from '../src/events/DomainEvent.js';

class TestAggregate extends AggregateRoot<string> {
  constructor() {
    super('agg-1');
  }

  recordSomething(): void {
    const event: DomainEvent = {
      name: 'something.recorded',
      occurredAt: new Date('2026-01-01T00:00:00Z'),
      payload: { ok: true },
    };
    this.addEvent(event);
  }
}

describe('AggregateRoot', () => {
  it('stores and clears events', () => {
    const aggregate = new TestAggregate();
    aggregate.recordSomething();
    expect(aggregate.pullEvents()).toHaveLength(1);
    expect(aggregate.pullEvents()).toHaveLength(0);
  });
});
