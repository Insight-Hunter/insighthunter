import { describe, it, expect, vi } from "vitest";
import { issueTokenPair, rotateRefreshToken } from "../../src/services/tokenService";

const mockEnv = {
  JWT_SECRET:     "test_jwt_secret_that_is_long_enough_64chars_minimum_xxxxxxxxxxxxx",
  REFRESH_SECRET: "test_refresh_secret_that_is_long_enough_64chars_minimum_xxxxxxxxx",
  JWT_EXPIRY:     "900",
  REFRESH_EXPIRY: "2592000",
  TOKENS: {
    put:    vi.fn().mockResolvedValue(undefined),
    get:    vi.fn().mockResolvedValue(JSON.stringify({ valid: true })),
    delete: vi.fn().mockResolvedValue(undefined),
  },
} as any;

const mockUser = {
  id:     "user-001",
  email:  "test@example.com",
  name:   "Test",
  orgId: "org-001",
  role:   "owner",
  plan:   "lite",
};

describe("tokenService.issueTokenPair", () => {
  it("returns access and refresh tokens", async () => {
    const result = await issueTokenPair(mockUser, mockEnv.JWT_SECRET, mockEnv.TOKENS);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.expiresIn).toBe(900);
  });

  it("access token has 3 segments (HS256 JWT)", async () => {
    const result = await issueTokenPair(mockUser, mockEnv.JWT_SECRET, mockEnv.TOKENS);
    expect(result.accessToken.split(".")).toHaveLength(3);
  });
});

describe("tokenService.rotateRefreshToken", () => {
  it("returns null for invalid token", async () => {
    const result = await rotateRefreshToken(mockEnv, "bad.token.here", async () => null);
    expect(result).toBeNull();
  });

  it("issues new tokens on valid rotation", async () => {
    const { refreshToken } = await issueTokenPair(mockUser, mockEnv.REFRESH_SECRET, mockEnv.TOKENS);
    const result = await rotateRefreshToken(mockEnv, refreshToken, async () => mockUser);
    expect(result).not.toBeNull();
    expect(result?.accessToken).toBeTruthy();
  });
});
 