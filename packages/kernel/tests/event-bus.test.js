import assert from "node:assert/strict";
import test from "node:test";
import { DomainEventBus } from "../src/events/DomainEventBus.js";
test("DomainEventBus publishes to subscribers", async () => {
  const bus = new DomainEventBus();
  let received = false;
  const unsubscribe = bus.subscribe("user.created", async (envelope) => {
    received = true;
    assert.equal(envelope.event.eventName, "user.created");
    assert.equal(envelope.metadata.schemaVersion, 1);
  });
  const event = {
    eventName: "user.created",
    aggregateId: "user-1",
    occurredAt: new Date("2026-07-02T00:00:00.000Z"),
    payload: { email: "user@example.com" },
  };
  await bus.publish(event);
  unsubscribe();
  assert.equal(received, true);
});
//# sourceMappingURL=event-bus.test.js.map
