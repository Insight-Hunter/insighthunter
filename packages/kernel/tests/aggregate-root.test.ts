import assert from "node:assert/strict";
import test from "node:test";

import { AggregateRoot } from "../src/core/aggregate-root.js";
import type { DomainEvent } from "../src/core/domain-event.js";
import { EntityId } from "../src/core/entity-id.js";

class DemoAggregate extends AggregateRoot {
  public constructor(id: EntityId) {
    super(id);
  }

  public recordEvent(): void {
    const event = {
      aggregateId: this.id,
      occurredAt: new Date(),
      eventName: "demo.recorded",
      payload: { status: "ok" },
    };

    this.addDomainEvent(event);
  }
}
test("AggregateRoot pulls and clears events", () => {
  const aggregate = new DemoAggregate(EntityId.create("agg-1"));

  aggregate.recordEvent();

  const firstPull = aggregate.pullDomainEvents();
  const secondPull = aggregate.pullDomainEvents();

  assert.equal(firstPull.length, 1);
  assert.equal(firstPull[0]?.eventName, "demo.recorded");
  assert.equal(secondPull.length, 0);
});
