// apps/insighthunter-pbx/src/workers/scheduled.ts
// Nightly cron: archive call recordings from Twilio to R2 for long-term
// storage, then delete from Twilio to avoid per-minute storage charges.
// Also purges recordings beyond the tenant's retention window.

import { Env, TIER_LIMITS } from '../types/index.js';
import Twilio from 'twilio';

export async function handleScheduled(event: ScheduledEvent, env: Env): Promise<void> {
  if (event.cron === '0 3 * * *') {
    await archiveRecordings(env);
  }
}

async function archiveRecordings(env: Env): Promise<void> {
  // Get all active tenants
  const tenants = await env.DB
    .prepare(`SELECT * FROM tenant_pbx WHERE status = 'active'`)
    .all<any>();

  for (const tenant of tenants.results) {
    try {
      await archiveTenantRecordings(env, tenant);
    } catch (err) {
      console.error(`Recording archive failed for org ${tenant.org_id}:`, err);
    }
  }
}

async function archiveTenantRecordings(env: Env, tenant: any): Promise<void> {
  const client = Twilio(tenant.twilio_subaccount_sid, tenant.twilio_subaccount_auth_token);
  const config = TIER_LIMITS[tenant.tier as keyof typeof TIER_LIMITS];

  // Find call records with Twilio recording SIDs not yet archived to R2
  const unarchived = await env.DB
    .prepare(`
      SELECT id, org_id, twilio_call_sid, recording_sid, recording_url
      FROM call_records
      WHERE org_id = ? AND recording_sid IS NOT NULL AND recording_url NOT LIKE 'r2://%'
      LIMIT 50
    `)
    .bind(tenant.org_id)
    .all<any>();

  for (const record of unarchived.results) {
    if (!record.recording_sid) continue;

    try {
      // Download from Twilio
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${tenant.twilio_subaccount_sid}/Recordings/${record.recording_sid}.mp3`,
        {
          headers: {
            Authorization: `Basic ${btoa(`${tenant.twilio_subaccount_sid}:${tenant.twilio_subaccount_auth_token}`)}`,
          },
        }
      );

      if (!response.ok) continue;

      const audioBuffer = await response.arrayBuffer();
      const r2Key = `${tenant.org_id}/calls/${record.twilio_call_sid}/${record.recording_sid}.mp3`;

      // Upload to R2
      await env.PBX_RECORDINGS.put(r2Key, audioBuffer, {
        httpMetadata: { contentType: 'audio/mpeg' },
        customMetadata: {
          orgId: tenant.org_id,
          callSid: record.twilio_call_sid,
          recordingSid: record.recording_sid,
        },
      });

      // Update DB to point to R2
      await env.DB
        .prepare(`UPDATE call_records SET recording_url = ? WHERE id = ? AND org_id = ?`)
        .bind(`r2://${r2Key}`, record.id, tenant.org_id)
        .run();

      // Delete from Twilio to stop storage charges
      await client.recordings(record.recording_sid).remove();

    } catch (err) {
      console.error(`Failed to archive recording ${record.recording_sid}:`, err);
    }
  }

  // Similarly archive voicemail recordings
  const unarchivedVMs = await env.DB
    .prepare(`
      SELECT id, org_id, twilio_call_sid, recording_sid, recording_url
      FROM voicemails
      WHERE org_id = ? AND recording_url NOT LIKE 'r2://%'
      LIMIT 50
    `)
    .bind(tenant.org_id)
    .all<any>();

  for (const vm of unarchivedVMs.results) {
    try {
      const response = await fetch(vm.recording_url, {
        headers: {
          Authorization: `Basic ${btoa(`${tenant.twilio_subaccount_sid}:${tenant.twilio_subaccount_auth_token}`)}`,
        },
      });

      if (!response.ok) continue;

      const audioBuffer = await response.arrayBuffer();
      const r2Key = `${tenant.org_id}/voicemail/${vm.twilio_call_sid}/${vm.recording_sid}.mp3`;

      await env.PBX_RECORDINGS.put(r2Key, audioBuffer, {
        httpMetadata: { contentType: 'audio/mpeg' },
        customMetadata: { orgId: tenant.org_id, type: 'voicemail' },
      });

      await env.DB
        .prepare(`UPDATE voicemails SET recording_url = ? WHERE id = ? AND org_id = ?`)
        .bind(`r2://${r2Key}`, vm.id, tenant.org_id)
        .run();

    } catch (err) {
      console.error(`Failed to archive voicemail ${vm.recording_sid}:`, err);
    }
  }

  // Purge recordings beyond retention window
  if (config.recordingRetentionDays > 0) {
    const cutoff = new Date(
      Date.now() - config.recordingRetentionDays * 86400 * 1000
    ).toISOString();

    const expired = await env.DB
      .prepare(`
        SELECT recording_url FROM call_records
        WHERE org_id = ? AND recording_url LIKE 'r2://%' AND ended_at < ?
      `)
      .bind(tenant.org_id, cutoff)
      .all<{ recording_url: string }>();

    for (const rec of expired.results) {
      const r2Key = rec.recording_url.replace('r2://', '');
      await env.PBX_RECORDINGS.delete(r2Key).catch(() => {});
    }

    await env.DB
      .prepare(`
        UPDATE call_records SET recording_url = NULL, recording_sid = NULL
        WHERE org_id = ? AND ended_at < ?
      `)
      .bind(tenant.org_id, cutoff)
      .run();
  }

  env.ANALYTICS.writeDataPoint({
    blobs: ['recording_archive', tenant.tier],
    doubles: [unarchived.results.length],
    indexes: [tenant.org_id],
  });
}
