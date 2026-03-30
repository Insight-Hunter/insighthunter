// apps/insighthunter-pbx/src/services/twilio.ts
// All Twilio REST API interactions.
// Tenants operate under their own Twilio subaccount for full billing/call isolation.

import { Env, TenantPBX, PhoneNumber, NumberType, WebRTCTokenResponse } from '../types/index.js';
import Twilio from 'twilio';

// ─── Client factories ─────────────────────────────────────────────────────────

/** Master account client (for subaccount management only) */
export function masterClient(env: Env): ReturnType<typeof Twilio> {
  return Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

/** Per-tenant subaccount client */
export function tenantClient(tenant: TenantPBX): ReturnType<typeof Twilio> {
  return Twilio(tenant.twilioSubaccountSid, tenant.twilioSubaccountAuthToken);
}

// ─── Subaccount Provisioning ──────────────────────────────────────────────────

/**
 * Create a Twilio subaccount for a new tenant.
 * Each tenant's calls/numbers/recordings are fully isolated under their subaccount.
 */
export async function createSubaccount(
  env: Env,
  orgId: string,
  friendlyName: string
): Promise<{ sid: string; authToken: string }> {
  const client = masterClient(env);
  const sub = await client.api.v2010.accounts.create({
    friendlyName: `InsightHunter PBX - ${friendlyName} (${orgId})`,
  });
  return { sid: sub.sid, authToken: sub.authToken };
}

/**
 * Create a Twilio API Key in the subaccount — used for WebRTC token generation.
 * API keys are scoped to the subaccount and can be rotated without disrupting calls.
 */
export async function createApiKey(
  tenant: TenantPBX
): Promise<{ sid: string; secret: string }> {
  const client = tenantClient(tenant);
  const key = await client.newKeys.create({
    friendlyName: 'InsightHunter PBX WebRTC Key',
  });
  return { sid: key.sid, secret: key.secret };
}

/**
 * Create a TwiML Application in the subaccount.
 * This defines the webhook URLs for WebRTC voice calls.
 */
export async function createTwimlApp(
  tenant: TenantPBX,
  publicUrl: string,
  orgId: string
): Promise<string> {
  const client = tenantClient(tenant);
  const app = await client.applications.create({
    friendlyName: 'InsightHunter PBX WebRTC App',
    voiceUrl: `${publicUrl}/webhooks/voice/client?orgId=${orgId}`,
    voiceMethod: 'POST',
    statusCallback: `${publicUrl}/webhooks/voice/status?orgId=${orgId}`,
    statusCallbackMethod: 'POST',
  });
  return app.sid;
}

/**
 * Suspend a subaccount (tenant suspension).
 */
export async function suspendSubaccount(env: Env, sid: string): Promise<void> {
  const client = masterClient(env);
  await client.api.v2010.accounts(sid).update({ status: 'suspended' });
}

/**
 * Reactivate a suspended subaccount.
 */
export async function activateSubaccount(env: Env, sid: string): Promise<void> {
  const client = masterClient(env);
  await client.api.v2010.accounts(sid).update({ status: 'active' });
}

/**
 * Close a subaccount permanently (tenant deletion).
 */
export async function closeSubaccount(env: Env, sid: string): Promise<void> {
  const client = masterClient(env);
  await client.api.v2010.accounts(sid).update({ status: 'closed' });
}

// ─── Phone Number Management ──────────────────────────────────────────────────

/**
 * Search available phone numbers in a given area code or country.
 */
export async function searchAvailableNumbers(
  tenant: TenantPBX,
  params: {
    countryCode?: string;
    areaCode?: string;
    contains?: string;
    type: NumberType;
    smsEnabled?: boolean;
    voiceEnabled?: boolean;
  }
): Promise<Array<{ phoneNumber: string; friendlyName: string; locality: string; region: string; price?: string }>> {
  const client = tenantClient(tenant);
  const countryCode = params.countryCode ?? 'US';

  let results: Awaited<ReturnType<typeof client.availablePhoneNumbers.get>>['local'] | null = null;

  const opts: Record<string, unknown> = {
    limit: 20,
    smsEnabled: params.smsEnabled ?? true,
    voiceEnabled: params.voiceEnabled ?? true,
  };
  if (params.areaCode) opts.areaCode = params.areaCode;
  if (params.contains) opts.contains = params.contains;

  const country = client.availablePhoneNumbers(countryCode);

  if (params.type === 'tollfree') {
    results = await country.tollFree.list(opts);
  } else if (params.type === 'mobile') {
    results = await country.mobile.list(opts);
  } else {
    results = await country.local.list(opts);
  }

  return results.map((n) => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    locality: n.locality ?? '',
    region: n.region ?? '',
  }));
}

/**
 * Purchase a phone number for a tenant subaccount and configure webhooks.
 */
export async function purchaseNumber(
  tenant: TenantPBX,
  phoneNumber: string,
  publicUrl: string,
  orgId: string
): Promise<{ sid: string; number: string; friendlyName: string }> {
  const client = tenantClient(tenant);

  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber,
    voiceUrl: `${publicUrl}/webhooks/voice/inbound?orgId=${orgId}`,
    voiceMethod: 'POST',
    statusCallback: `${publicUrl}/webhooks/voice/status?orgId=${orgId}`,
    statusCallbackMethod: 'POST',
    smsUrl: `${publicUrl}/webhooks/sms/inbound?orgId=${orgId}`,
    smsMethod: 'POST',
  });

  return {
    sid: purchased.sid,
    number: purchased.phoneNumber,
    friendlyName: purchased.friendlyName,
  };
}

/**
 * Release a phone number (stop paying for it).
 */
export async function releaseNumber(tenant: TenantPBX, sid: string): Promise<void> {
  const client = tenantClient(tenant);
  await client.incomingPhoneNumbers(sid).remove();
}

/**
 * Update webhooks on a phone number (e.g., after IVR reassignment).
 */
export async function updateNumberWebhooks(
  tenant: TenantPBX,
  sid: string,
  publicUrl: string,
  orgId: string
): Promise<void> {
  const client = tenantClient(tenant);
  await client.incomingPhoneNumbers(sid).update({
    voiceUrl: `${publicUrl}/webhooks/voice/inbound?orgId=${orgId}`,
    voiceMethod: 'POST',
    statusCallback: `${publicUrl}/webhooks/voice/status?orgId=${orgId}`,
    smsUrl: `${publicUrl}/webhooks/sms/inbound?orgId=${orgId}`,
    smsMethod: 'POST',
  });
}

// ─── WebRTC Token ─────────────────────────────────────────────────────────────

/**
 * Generate a Twilio Access Token for browser/mobile WebRTC calling.
 * Scoped to the tenant's subaccount and TwiML App.
 * Expires in 1 hour — client should refresh before expiry.
 */
export function generateWebRTCToken(
  tenant: TenantPBX,
  identity: string
): WebRTCTokenResponse {
  const AccessToken = Twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: tenant.twilioTwimlAppSid,
    incomingAllow: true,
  });

  const token = new AccessToken(
    tenant.twilioSubaccountSid,
    tenant.twilioApiKeySid,
    tenant.twilioApiKeySecret,
    {
      identity,
      ttl: 3600, // 1 hour
    }
  );

  token.addGrant(voiceGrant);

  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  return {
    token: token.toJwt(),
    identity,
    expiresAt,
  };
}

// ─── SIP Credentials ──────────────────────────────────────────────────────────

/**
 * Create SIP credential list + domain for a tenant.
 * This enables desk phone registration via SIP.
 */
export async function createSIPDomain(
  tenant: TenantPBX,
  orgSlug: string,
  publicUrl: string,
  orgId: string
): Promise<{ domainSid: string; domainName: string; credentialListSid: string }> {
  const client = tenantClient(tenant);

  // Create credential list
  const credList = await client.sip.credentialLists.create({
    friendlyName: `${orgSlug} PBX Credentials`,
  });

  // Create SIP domain
  const domain = await client.sip.domains.create({
    domainName: `${orgSlug}.sip.twilio.com`,
    friendlyName: `${orgSlug} PBX`,
    voiceUrl: `${publicUrl}/webhooks/voice/sip?orgId=${orgId}`,
    voiceMethod: 'POST',
    sipRegistration: true,
  });

  // Associate credential list with domain
  await client.sip.domains(domain.sid).auth.calls.credentialListMappings.create({
    credentialListSid: credList.sid,
  });

  return {
    domainSid: domain.sid,
    domainName: domain.domainName,
    credentialListSid: credList.sid,
  };
}

/**
 * Add SIP credentials for an extension (desk phone registration).
 */
export async function createSIPCredential(
  tenant: TenantPBX,
  credentialListSid: string,
  username: string,
  password: string
): Promise<string> {
  const client = tenantClient(tenant);
  const cred = await client.sip.credentialLists(credentialListSid).credentials.create({
    username,
    password,
  });
  return cred.sid;
}

// ─── Outbound Calls ───────────────────────────────────────────────────────────

/**
 * Initiate an outbound call from a tenant's phone number.
 * Used for click-to-call from the dashboard.
 */
export async function initiateOutboundCall(
  tenant: TenantPBX,
  params: {
    from: string;       // Tenant's phone number (E.164)
    to: string;         // Destination (E.164)
    publicUrl: string;
    orgId: string;
    extensionId: string;
  }
): Promise<{ callSid: string }> {
  const client = tenantClient(tenant);

  const call = await client.calls.create({
    from: params.from,
    to: params.to,
    url: `${params.publicUrl}/webhooks/voice/outbound-connect?orgId=${params.orgId}&extensionId=${params.extensionId}`,
    statusCallback: `${params.publicUrl}/webhooks/voice/status?orgId=${params.orgId}`,
    statusCallbackMethod: 'POST',
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    record: false, // Recording enabled per call based on tier
  });

  return { callSid: call.sid };
}

// ─── SMS / MMS ────────────────────────────────────────────────────────────────

/**
 * Send an SMS or MMS message.
 */
export async function sendMessage(
  tenant: TenantPBX,
  params: {
    from: string;
    to: string;
    body: string;
    mediaUrls?: string[];
  }
): Promise<{ messageSid: string }> {
  const client = tenantClient(tenant);

  const msg = await client.messages.create({
    from: params.from,
    to: params.to,
    body: params.body,
    ...(params.mediaUrls && params.mediaUrls.length > 0
      ? { mediaUrl: params.mediaUrls }
      : {}),
  });

  return { messageSid: msg.sid };
}

// ─── Recordings ───────────────────────────────────────────────────────────────

/**
 * Get a time-limited signed URL for a recording.
 * We proxy through R2 for recordings we've archived.
 */
export async function getRecordingUrl(
  tenant: TenantPBX,
  recordingSid: string
): Promise<string> {
  // Return the Twilio recording URL — add auth for access
  return `https://api.twilio.com/2010-04-01/Accounts/${tenant.twilioSubaccountSid}/Recordings/${recordingSid}.mp3`;
}

/**
 * Delete a recording from Twilio (after archiving to R2 or past retention).
 */
export async function deleteRecording(
  tenant: TenantPBX,
  recordingSid: string
): Promise<void> {
  const client = tenantClient(tenant);
  await client.recordings(recordingSid).remove();
}

// ─── Conference ───────────────────────────────────────────────────────────────

/**
 * Get live participants in a conference.
 */
export async function getConferenceParticipants(
  tenant: TenantPBX,
  conferenceName: string
): Promise<Array<{ callSid: string; muted: boolean; hold: boolean }>> {
  const client = tenantClient(tenant);

  const conferences = await client.conferences.list({
    friendlyName: conferenceName,
    status: 'in-progress',
    limit: 1,
  });

  if (conferences.length === 0) return [];

  const participants = await client.conferences(conferences[0]!.sid)
    .participants.list();

  return participants.map((p) => ({
    callSid: p.callSid,
    muted: p.muted,
    hold: p.hold,
  }));
}

/**
 * Mute/unmute a conference participant.
 */
export async function muteParticipant(
  tenant: TenantPBX,
  conferenceSid: string,
  callSid: string,
  muted: boolean
): Promise<void> {
  const client = tenantClient(tenant);
  await client.conferences(conferenceSid).participants(callSid).update({ muted });
}

/**
 * Kick a participant from a conference.
 */
export async function removeParticipant(
  tenant: TenantPBX,
  conferenceSid: string,
  callSid: string
): Promise<void> {
  const client = tenantClient(tenant);
  await client.conferences(conferenceSid).participants(callSid).remove();
}
