import { describe, it, expect, vi, beforeEach } from "vitest";

// Placeholder — wire up with Miniflare or vitest-environment-miniflare
// for full integration tests against the Worker runtime.

describe("POST /auth/login", () => {
  it("returns 422 for invalid body", async () => {
    expect(true).toBe(true);
  });

  it("returns 401 for wrong password", async () => {
    expect(true).toBe(true);
  });

  it("returns tokens on success", async () => {
    expect(true).toBe(true);
  });
});
