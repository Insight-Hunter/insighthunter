import { describe, expect, it } from 'vitest';
import { AggregateRoot } from '../src/domain/AggregateRoot.js';
class TestAggregate extends AggregateRoot {
    constructor() {
        super('agg-1');
    }
    recordSomething() {
        const event = {
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
//# sourceMappingURL=aggregate-root.test.js.map