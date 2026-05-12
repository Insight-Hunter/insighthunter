import type { Env } from '../types/env';

export class ProvisioningService {
  constructor(private env: Env) {}

  async provisionTenant(orgId: string, tier: string): Promise<void> {
    const res = await fetch('https://ih-platform-worker.insighthunter.workers.dev/api/provision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.env.PLATFORM_SERVICE_TOKEN}`,
      },
      body: JSON.stringify({ orgId, tier }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Platform provisioning failed: ${body}`);
    }
  }
}
