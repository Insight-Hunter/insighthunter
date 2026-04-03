export interface User {
  id: string;
  email: string;
  name: string;
  companyId: string;
  createdAt: string;
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: string;
}
