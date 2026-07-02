import { describe, expect, it } from "vitest";
import { Result } from "../src/index";

describe("Result", () => {
  it("creates success with ok()", () => {
    const result = Result.ok(123);
    expect(result.isOk()).toBe(true);
    expect(result.value).toBe(123);
  });

  it("maps success value", () => {
    const result = Result.ok(2).map((value) => value * 3);
    expect(result.isOk()).toBe(true);
    expect(result.value).toBe(6);
  });

  it("preserves error on fail()", () => {
    const result = Result.fail<number, Error>(new Error("boom"));
    expect(result.isFail()).toBe(true);
    expect(result.error.message).toBe("boom");
  });
});
