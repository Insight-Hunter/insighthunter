// apps/insighthunter-pbx/src/services/consent.test.ts
import { describe, expect, it } from "vitest";
import { classifyKeyword } from "./consent.js";

describe("classifyKeyword", () => {
  it("classifies stop keywords case-insensitively", () => {
    expect(classifyKeyword("STOP")).toBe("stop");
    expect(classifyKeyword("  stop  ")).toBe("stop");
    expect(classifyKeyword("unsubscribe")).toBe("stop");
    expect(classifyKeyword("Cancel")).toBe("stop");
  });

  it("classifies start keywords", () => {
    expect(classifyKeyword("start")).toBe("start");
    expect(classifyKeyword("YES")).toBe("start");
  });

  it("classifies help keywords", () => {
    expect(classifyKeyword("help")).toBe("help");
    expect(classifyKeyword("INFO")).toBe("help");
  });

  it("returns null for ordinary message bodies", () => {
    expect(classifyKeyword("Hi, is the shop open today?")).toBeNull();
    expect(classifyKeyword("")).toBeNull();
  });
});
