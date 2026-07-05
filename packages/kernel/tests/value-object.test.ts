import assert from "node:assert/strict";
import test from "node:test";

import { ValueObject } from "../src/core/value-object.js";

class EmailAddress extends ValueObject<{ value: string }> {
  public constructor(value: string) {
    super({ value });
  }
}

test("ValueObject equality is based on props", () => {
  const first = new EmailAddress("a@example.com");
  const second = new EmailAddress("a@example.com");
  const third = new EmailAddress("b@example.com");

  assert.equal(first.equals(second), true);
  assert.equal(first.equals(third), false);
});
