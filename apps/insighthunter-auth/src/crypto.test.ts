// apps/insighthunter-auth/src/crypto.test.ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signSession, verifySession } from "./crypto.js";

describe("password hashing", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("correct-horse-battery-staple", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces different hashes for the same password (salted)", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });
});

describe("session signing", () => {
  const secret = "test-secret-not-for-production";

  it("verifies a session it just signed", async () => {
    const token = await signSession({ userId: "u1", orgId: "o1" }, secret);
    const payload = await verifySession(token, secret);
    expect(payload?.userId).toBe("u1");
  });

  it("rejects a tampered session token", async () => {
    const token = await signSession({ userId: "u1", orgId: "o1" }, secret);
    const tampered = token.slice(0, -2) + "xx";
    const payload = await verifySession(tampered, secret);
    expect(payload).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signSession({ userId: "u1", orgId: "o1" }, secret);
    const payload = await verifySession(token, "different-secret");
    expect(payload).toBeNull();
  });
});
