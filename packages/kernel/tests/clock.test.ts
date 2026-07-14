import assert from "node:assert/strict";
import test from "node:test";

import { SystemClock } from "../src/core/clock.js";

test("SystemClock returns a Date", () => {
  const clock = new SystemClock();
  const now = clock.now();

  assert.equal(now instanceof Date, true);
});
