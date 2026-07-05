import assert from "node:assert/strict";
import test from "node:test";

import { EntityId } from "../src/core/entity-id.js";

test("EntityId.create returns provided value", () => {
  const id = EntityId.create("abc-123");

  assert.equal(id.value, "abc-123");
});

test("EntityId equality works", () => {
  const first = EntityId.create("same");
  const second = EntityId.create("same");
  const third = EntityId.create("other");

  assert.equal(first.equals(second), true);
  assert.equal(first.equals(third), false);
});
