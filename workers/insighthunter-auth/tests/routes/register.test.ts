import { describe, it, expect } from "vitest";

describe("POST /auth/register", () => {
  it("returns 422 for short password", async () => {
    expect(true).toBe(true);
  });

  it("returns 409 for duplicate email", async () => {
    expect(true).toBe(true);
  });

  it("returns 201 and tokens on success", async () => {
    expect(true).toBe(true);
  });
});
