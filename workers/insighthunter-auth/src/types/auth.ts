export interface AuthUser {
  id:        string;
  email:     string;
  name:      string;
  orgId:     string;
  role:      'owner' | 'admin' | 'member' | 'viewer';
  plan:      'free' | 'pro' | 'white_label';
  createdAt: string;
}

export interface AuthOrg {
  id:        string;
  name:      string;
  plan:      'free' | 'pro' | 'white_label';
  ownerId:   string;
  createdAt: string;
}

// The canonical context every app receives after verification
export interface AuthContext {
  userId: string;
  orgId:  string;
  email:  string;
  name:   string;
  role:   'owner' | 'admin' | 'member' | 'viewer';
  plan:   'free' | 'pro' | 'white_label';
}

export interface JWTPayload {
  sub:   string;   // userId
  org:   string;   // orgId
  email: string;
  role:  string;
  plan:  string;
  iat:   number;
  exp:   number;
}

export interface LoginRequest {
  email:    string;
  password: string;
}

export interface RegisterRequest {
  email:    string;
  password: string;
  name:     string;
  orgName:  string;
}

export interface TokenPair {
  accessToken:  string;   // 15 min
  refreshToken: string;   // 30 days (stored in KV)
  expiresIn:    number;
}

// What the internal /internal/verify endpoint returns
export interface VerifyResponse {
  valid:   boolean;
  context: AuthContext | null;
  error:   string | null;
}
