import { describe, expect, it } from "vitest";
import { Result } from "../src/index";

describe("Result", () => {
  it("creates success", () => {
    const result = Result.success(123);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(123);
  });
});
