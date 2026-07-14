import assert from "node:assert/strict";
import test from "node:test";

import { Result } from "../src/core/result.js";

test("Result.ok stores value", () => {
  const result = Result.ok(42);

  assert.equal(result.isSuccess, true);
  assert.equal(result.value, 42);
});

test("Result.fail stores error", () => {
  const result = Result.fail(new Error("boom"));

  assert.equal(result.isFailure, true);
  assert.equal(result.error.message, "boom");
});

test("Result.map transforms successful values", () => {
  const result = Result.ok(2).map((value) => value * 3);

  assert.equal(result.value, 6);
});
