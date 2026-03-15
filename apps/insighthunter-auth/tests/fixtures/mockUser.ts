import type { User, AccessTokenPayload } from "../../src/types";

export const mockUser: User = {
  id:             "user-test-001",
  org_id:         "org-test-001",
  email:          "test@insighthunter.com",
  name:           "Test User",
  password_hash:  "pbkdf2:100000:abc123salt:abc123hash",
  role:           "owner",
  tier:           "lite",
  email_verified: 1,
  status:         "active",
  created_at:     "2026-01-01T00:00:00.000Z",
  updated_at:     "2026-01-01T00:00:00.000Z",
};

export const mockTokenPayload: AccessTokenPayload = {
  sub:   mockUser.id,
  email: mockUser.email,
  name:  mockUser.name,
  orgId: mockUser.org_id,
  role:  mockUser.role,
  tier:  mockUser.tier,
  type:  "access",
  iat:   Math.floor(Date.now() / 1000),
  exp:   Math.floor(Date.now() / 1000) + 3600,
};
