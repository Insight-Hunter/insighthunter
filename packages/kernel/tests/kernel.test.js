import { describe, expect, it, vi } from "vitest";
import {
  AggregateRoot,
  FixedClock,
  InMemoryRepository,
  ValueObject,
  createDomainEvent,
  createEntityId,
  createKernelRuntime,
  createRequestContext,
  defineUseCase,
  err,
  isErr,
  isOk,
  ok,
  unwrap,
} from "../src/index.js";
class Customer extends AggregateRoot {
  static create(id, name) {
    const customer = new Customer(id, { name });
    customer.record(
      createDomainEvent({
        type: "customer.created",
        aggregateId: id,
        organizationId: "org-1",
        occurredAt: "2026-07-01T00:00:00.000Z",
        payload: { name },
      }),
    );
    return customer;
  }
}
class Address extends ValueObject {
  static create(line1, city) {
    return new Address({ city, line1 });
  }
}
describe("@insighthunter/kernel", () => {
  it("brands entity IDs and rejects empty values", () => {
    expect(createEntityId("organization", " org-123 ")).toBe("org-123");
    expect(() => createEntityId("organization", " ")).toThrow("organization id cannot be empty");
  });
  it("records and pulls aggregate domain events", () => {
    const customer = Customer.create("customer-1", "Acme");
    expect(customer.peekDomainEvents()).toHaveLength(1);
    const events = customer.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("customer.created");
    expect(customer.peekDomainEvents()).toHaveLength(0);
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
  it("stores aggregates in an in-memory repository", async () => {
    const repository = new InMemoryRepository();
    const customer = Customer.create("customer-1", "Acme");
    await repository.save(customer);
    expect(await repository.get("customer-1")).toBe(customer);
    await expect(repository.getOrThrow("missing", "Customer")).rejects.toMatchObject({
      code: "domain.not_found",
    });
  });
  it("models explicit use-case results", async () => {
    const useCase = defineUseCase(async (input) => {
      if (!input.enabled) {
        return err("disabled");
      }
      return ok("ready");
    });
    const context = createRequestContext({ requestId: "request-1" });
    const result = await useCase.execute({ enabled: true }, context);
    const failed = await useCase.execute({ enabled: false }, context);
    expect(isOk(result)).toBe(true);
    expect(unwrap(result)).toBe("ready");
    expect(isErr(failed)).toBe(true);
  });
  it("creates Cloudflare-native runtime context from request headers", () => {
    const waitUntil = vi.fn();
    const request = new Request("https://example.com", {
      headers: {
        "cf-ray": "ray-1",
        "x-organization-id": "org-1",
        "x-request-id": "request-1",
        "x-user-id": "user-1",
      },
    });
    const clock = new FixedClock(new Date("2026-07-01T00:00:00.000Z"));
    const runtime = createKernelRuntime({
      env: {},
      ctx: { waitUntil },
      request,
      clock,
    });
    const promise = Promise.resolve();
    runtime.waitUntil(promise);
    expect(runtime.requestContext.requestId).toBe("request-1");
    expect(runtime.requestContext.organizationId).toBe("org-1");
    expect(runtime.requestContext.actorId).toBe("user-1");
    expect(runtime.requestContext.traceId).toBe("ray-1");
    expect(runtime.clock.nowIso()).toBe("2026-07-01T00:00:00.000Z");
    expect(waitUntil).toHaveBeenCalledWith(promise);
  });
});
//# sourceMappingURL=kernel.test.js.map
