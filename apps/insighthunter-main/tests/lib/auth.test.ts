import { describe, it, expect, vi, beforeEach } from "vitest";

describe("auth helpers", () => {
  beforeEach(() => {
    // Cookie mocking in Node (no document)
    vi.stubGlobal("document", {
      cookie: "",
    });
  });

  it("getToken returns null when no cookie set", async () => {
    const { getToken } = await import("../../src/lib/auth");
    expect(getToken()).toBeNull();
  });
});
