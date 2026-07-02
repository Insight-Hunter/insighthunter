import { describe, expect, it } from "vitest";
import { packageName } from "../src/index";

describe("package", () => {
  it("exports package name", () => {
    expect(packageName).toBeDefined();
  });
});
