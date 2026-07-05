import assert from "node:assert/strict";
import test from "node:test";
import { TypedId } from "../src/identity/TypedId.js";

test("TypedId equality requires same kind and same raw value", () => {
  const a = TypedId.create("AccountId", "abc");
  const b = TypedId.create("AccountId", "abc");
  const c = TypedId.create("JournalEntryId", "abc");

  assert.equal(a.equals(b), true);
  assert.equal(a.equals(c as never), false);
});
