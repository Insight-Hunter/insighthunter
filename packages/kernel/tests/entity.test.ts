import assert from "node:assert/strict";
import test from "node:test";
import { Entity } from "../src/domain/Entity.js";
import { TypedId } from "../src/identity/TypedId.js";

class User extends Entity<TypedId<"UserId">, { email: string }> {}

test("Entity equality is identity based", () => {
  const id = TypedId.create("UserId", "user-1");
  const a = new User(id, { email: "a@example.com" });
  const b = new User(id, { email: "b@example.com" });

  assert.equal(a.equals(b), true);
});
