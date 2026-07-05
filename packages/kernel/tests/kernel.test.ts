import { describe, expect, it } from "vitest";
import type { DomainEvent } from "../src/core/domain-event.js";
import { EntityId } from "../src/core/entity-id.js";
import { AggregateRoot, Result, ValueObject } from "../src/index.js";

class Customer extends AggregateRoot {
  public readonly name: string;

  public constructor(name: string) {
    super();
    this.name = name;
    this.addDomainEvent({
      eventName: "customer.created",
      aggregateId: this.id,
      occurredAt: new Date(),
      payload: { name },
    } satisfies DomainEvent<{ name: string }>);
  }
}

class Address extends ValueObject<{
  readonly city: string;
  readonly line1: string;
}> {
  public static create(line1: string, city: string): Address {
    return new Address({ city, line1 });
  }
}

describe("@insighthunter/kernel", () => {
  it("records and pulls aggregate domain events", () => {
    const customer = new Customer("Acme");

    const events = customer.pullDomainEvents();

    expect(events).toHaveLength(1);
    expect(events[0]?.eventName).toBe("customer.created");
    expect(customer.pullDomainEvents()).toHaveLength(0);
  });

  it("compares value objects by stable property values", () => {
    expect(
      Address.create("1 Market", "San Francisco").equals(
        Address.create("1 Market", "San Francisco"),
      ),
    ).toBe(true);
    expect(
      Address.create("1 Market", "San Francisco").equals(
        Address.create("2 Market", "San Francisco"),
      ),
    ).toBe(false);
  });

  it("EntityId generates stable identity", () => {
    const id = EntityId.create("fixed-id");
    expect(id.value).toBe("fixed-id");
    expect(id.equals(EntityId.create("fixed-id"))).toBe(true);
    expect(id.equals(EntityId.create("other-id"))).toBe(false);
  });

  it("Result.ok holds a value and Result.fail holds an error", () => {
    const ok = Result.ok("hello");
    expect(ok.isSuccess).toBe(true);
    expect(ok.value).toBe("hello");

    const fail = Result.fail(new Error("oops"));
    expect(fail.isFailure).toBe(true);
    expect(fail.error.message).toBe("oops");
  });
});
