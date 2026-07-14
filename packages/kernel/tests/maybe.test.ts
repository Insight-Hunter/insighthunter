import { describe, expect, it } from "vitest";
import { Maybe } from "../src/primitives/Maybe.js";

describe("Maybe", () => {
  it("tracks presence", () => {
    expect(Maybe.some("x").isSome()).toBe(true);
    expect(Maybe.none<string>().isSome()).toBe(false);
  });
});
