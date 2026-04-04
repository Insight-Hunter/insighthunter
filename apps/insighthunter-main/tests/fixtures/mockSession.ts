import type { AuthUser, Session } from "../../src/types/auth";

export const mockUser: AuthUser = {
  id: "user_test_001",
  email: "test@example.com",
  name: "Test User",
  orgId: "org_test_001",
  role: "owner",
  tier: "standard",
  createdAt: "2026-01-01T00:00:00Z",
};

export const mockSession: Session = {
  token: "mock_jwt_token_for_testing",
  userId: mockUser.id,
  orgId: mockUser.orgId,
  expiresAt: Date.now() + 86400_000,
};
