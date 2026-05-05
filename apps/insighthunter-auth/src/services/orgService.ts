import type { Env } from '../types/env';
import { AuthService, type DBUser } from './authService';
import { ProvisioningService } from './provisioningService';

export class OrgService {
  private auth: AuthService;
  private provisioning: ProvisioningService;

  constructor(private env: Env) {
    this.auth = new AuthService(env);
    this.provisioning = new ProvisioningService(env);
  }

  async createOrgWithUser( {
    email: string;
    password: string;
    businessName: string;
    tier: string;
  }): Promise<{ user: DBUser; org: { id: string } }> {
    const orgId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    // Create org
    await this.env.IH_AUTH_DB.prepare(
      `INSERT INTO orgs (id, name, tier, created_at) VALUES (?1, ?2, ?3, datetime('now'))`
    ).bind(orgId, data.businessName, data.tier).run();

    // Create user
    const passwordHash = await this.auth.hashPassword(data.password);
    await this.auth.createUser({ id: userId, email: data.email, passwordHash, orgId, tier: data.tier });

    // Provision tenant Worker (async, non-blocking for UX — but awaited for correctness)
    try {
      await this.provisioning.provisionTenant(orgId, data.tier);
    } catch (err) {
      console.error('Provisioning failed, will retry:', err);
      // Don't fail registration — provisioning can be retried
    }

    const user = await this.auth.findUserByEmail(data.email) as DBUser;
    return { user, org: { id: orgId } };
  }

  async findOrCreateOAuthUser(
    profile: { email: string; name: string; provider_id: string },
    provider: string
  ): Promise<DBUser> {
    let user = await this.auth.findUserByEmail(profile.email);
    if (user) return user;

    const { user: newUser } = await this.createOrgWithUser({
      email: profile.email,
      password: crypto.randomUUID(), // Random password for OAuth users
      businessName: profile.name || 'My Business',
      tier: 'lite',
    });
    return newUser;
  }
}
