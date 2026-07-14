import assert from "node:assert/strict";
import test from "node:test";

import { DomainError } from "../src/core/domain-error.js";

test("DomainError exposes code and message", () => {
  const error = new DomainError("invalid_state", "State transition is invalid.");

  assert.equal(error.code, "invalid_state");
  assert.equal(error.message, "State transition is invalid.");
});
