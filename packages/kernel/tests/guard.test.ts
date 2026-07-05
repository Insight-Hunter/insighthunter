import { describe, expect, it } from "vitest";
import { Guard } from "../src/primitives/Guard.js";

describe("Guard", () => {
  it("rejects null", () => {
    const result = Guard.againstNullOrUndefined(null, "email");
    expect(result.isSuccess).toBe(false);
  });
});
