import assert from "node:assert/strict";
import test from "node:test";
import { ValueObject } from "../src/domain/ValueObject.js";
class Name extends ValueObject {
  get value() {
    return this.unpack().value;
  }
}
test("ValueObject equality is structural", () => {
  const a = new Name({ value: "Insight Hunter" });
  const b = new Name({ value: "Insight Hunter" });
  assert.equal(a.equals(b), true);
});
//# sourceMappingURL=value-object.test.js.map
