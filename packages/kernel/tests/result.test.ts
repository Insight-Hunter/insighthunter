import test from "node:test";
import assert from "node:assert/strict";
import { Result } from "../src/primitives/Result.js";

test("Result.ok maps successfully", () => {
  const result = Result.ok(2).map((value) => value * 3);

  assert.equal(result.isOk(), true);
  assert.equal(result.value, 6);
});

test("Result.fail preserves error", () => {
  const result = Result.fail<number, Error>(new Error("boom"));

  assert.equal(result.isFail(), true);
  assert.equal(result.error.message, "boom");
});
