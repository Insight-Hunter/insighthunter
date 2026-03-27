// apps/insighthunter-pbx/src/types/index.ts

// ─── Pricing Tiers ────────────────────────────────────────────────────────────
export type PricingTier = 'free' | 'standard' | 'pro';

export interface TierConfig {
  tier: PricingTier;
  label: string;
  maxNumbers: number;           // Phone numbers allowed
  maxExtensions: number;        // SIP extensions
  maxConcurrentCalls: number;   // Simultaneous calls
  maxQueueSize: number;         // Agents in call queue
  recordingEnabled: boolean;
  ivrEnabled: boolean;
  conferenceEnabled: boolean;
  sipEnabled: boolean;
  smsEnabled: boolean;
  mmsEnabled: boolean;
  callForwardingEnabled: boolean;
  voicemailEnabled: boolean;
  analyticsRetentionDays: number;
  recordingRetentionDays: number;
}

export const TIER_LIMITS: Record<PricingTier, TierConfig> = {
  free: {
    tier: 'free',
    label: 'Free',
    maxNumbers: 1,
    maxExtensions: 3,
    maxConcurrentCalls: 2,
    maxQueueSize: 5,
    recordingEnabled: false,
    ivrEnabled: false,
    conferenceEnabled: false,
    sipEnabled: false,
    smsEnabled: true,
    mmsEnabled: false,
    callForwardingEnabled: true,
    voicemailEnabled: true,
    analyticsRetentionDays: 7,
    recordingRetentionDays: 0,
  },
  standard: {
    tier: 'standard',
    label: 'Standard',
    maxNumbers: 5,
    maxExtensions: 25,
    maxConcurrentCalls: 10,
    maxQueueSize: 20,
    recordingEnabled: true,
    ivrEnabled: true,
    conferenceEnabled: true,
    sipEnabled: true,
    smsEnabled: true,
    mmsEnabled: true,
    callForwardingEnabled: true,
    voicemailEnabled: true,
    analyticsRetentionDays: 30,
    recordingRetentionDays: 30,
  },
  pro: {
    tier: 'pro',
    label: 'Pro / Enterprise',
    maxNumbers: 100,
    maxExtensions: 500,
    maxConcurrentCalls: 100,
    maxQueueSize: 200,
    recordingEnabled: true,
    ivrEnabled: true,
    conferenceEnabled: true,
    sipEnabled: true,
    smsEnabled: true,
    mmsEnabled: true,
    callForwardingEnabled: true,
    voicemailEnabled: true,
    analyticsRetentionDays: 365,
    recordingRetentionDays: 365,
  },
};

// ─── Tenant / Twilio Subaccount ────────────────────────────────────────────────
export interface TenantPBX {
  id: string;
  orgId: string;
  twilioSubaccountSid: string;
  twilioSubaccountAuthToken: string;
  twilioApiKeySid: string;       // For WebRTC token generation
  twilioApiKeySecret: string;
  twilioTwimlAppSid: string;     // TwiML App for WebRTC
  tier: PricingTier;
  status: 'active' | 'suspended' | 'provisioning';
  createdAt: string;
  updatedAt: string;
}

// ─── Phone Numbers ────────────────────────────────────────────────────────────
export type NumberType = 'local' | 'tollfree' | 'mobile';
export type NumberCapability = 'voice' | 'sms' | 'mms' | 'fax';

export interface PhoneNumber {
  id: string;
  orgId: string;
  twilioSid: string;
  number: string;                // E.164 format: +15551234567
  friendlyName: string;
  type: NumberType;
  capabilities: NumberCapability[];
  assignedTo?: string;           // Extension ID or 'ivr' or 'queue'
  assignedType?: 'extension' | 'ivr' | 'queue' | 'forward';
  forwardTo?: string;            // E.164 if assignedType = 'forward'
  active: boolean;
  monthlyFee: number;
  createdAt: string;
}

// ─── Extensions / Users ───────────────────────────────────────────────────────
export interface Extension {
  id: string;
  orgId: string;
  userId?: string;               // Linked InsightHunter user
  extension: string;             // 3-4 digit extension number
  displayName: string;
  email: string;
  sipUsername: string;           // For desk phone registration
  sipPassword: string;           // Hashed in DB, plaintext only at creation
  voicemailEnabled: boolean;
  voicemailPin: string;          // 4-6 digit PIN
  forwardTo?: string;            // External number fallback
  status: 'available' | 'busy' | 'away' | 'offline';
  doNotDisturb: boolean;
  twilioIdentity: string;        // For WebRTC token: "ext_<id>"
  createdAt: string;
  updatedAt: string;
}

// ─── IVR / Auto-Attendant ─────────────────────────────────────────────────────
export interface IVRMenu {
  id: string;
  orgId: string;
  name: string;
  greeting: string;              // Text-to-speech or recording URL
  greetingType: 'tts' | 'recording';
  greetingVoice: string;         // Twilio voice: 'alice', 'man', 'woman', Polly.*
  timeout: number;               // Seconds to wait for input
  numDigits: number;             // 1-5
  options: IVROption[];
  isDefault: boolean;            // Default menu for unassigned numbers
  createdAt: string;
  updatedAt: string;
}

export interface IVROption {
  digit: string;                 // '0'-'9', '#', '*'
  label: string;
  action: IVRAction;
}

export type IVRActionType =
  | 'extension'    // Ring a specific extension
  | 'queue'        // Send to call queue
  | 'voicemail'    // Go to voicemail
  | 'submenu'      // Another IVR menu
  | 'forward'      // Forward to external number
  | 'hangup'
  | 'repeat';      // Repeat the menu

export interface IVRAction {
  type: IVRActionType;
  target?: string;               // Extension ID, queue ID, menu ID, or E.164 number
  announcement?: string;         // TTS text before action
}

// ─── Call Queues ──────────────────────────────────────────────────────────────
export interface CallQueue {
  id: string;
  orgId: string;
  name: string;
  strategy: 'round-robin' | 'least-recent' | 'fewest-calls' | 'random';
  holdMusic?: string;            // URL or 'default'
  holdAnnouncement?: string;     // TTS played while waiting
  announcementInterval: number;  // Seconds between announcements
  maxWaitTime: number;           // Seconds before fallback
  maxWaitFallback: IVRAction;    // What to do when max wait exceeded
  members: QueueMember[];
  twilioQueueSid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueueMember {
  extensionId: string;
  priority: number;              // Lower = higher priority
  active: boolean;
}

// ─── Calls ────────────────────────────────────────────────────────────────────
export type CallDirection = 'inbound' | 'outbound';
export type CallStatus =
  | 'queued' | 'ringing' | 'in-progress' | 'completed'
  | 'busy' | 'failed' | 'no-answer' | 'canceled';

export interface CallRecord {
  id: string;
  orgId: string;
  twilioCallSid: string;
  direction: CallDirection;
  from: string;
  to: string;
  extensionId?: string;
  queueId?: string;
  duration: number;              // Seconds
  status: CallStatus;
  recordingUrl?: string;
  recordingSid?: string;
  recordingDuration?: number;
  transcription?: string;
  voicemail: boolean;
  voicemailUrl?: string;
  answeredAt?: string;
  endedAt?: string;
  createdAt: string;
}

// ─── SMS / MMS ────────────────────────────────────────────────────────────────
export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'received' | 'unread';

export interface Message {
  id: string;
  orgId: string;
  twilioMessageSid: string;
  threadId: string;              // Groups messages in same conversation
  from: string;
  to: string;
  body: string;
  mediaUrls: string[];
  direction: MessageDirection;
  status: MessageStatus;
  extensionId?: string;          // Which extension handles this thread
  fromNumberId?: string;         // Our phone number record
  createdAt: string;
}

export interface MessageThread {
  id: string;
  orgId: string;
  ourNumber: string;
  contactNumber: string;
  contactName?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  extensionId?: string;
}

// ─── Conference ───────────────────────────────────────────────────────────────
export interface Conference {
  id: string;
  orgId: string;
  name: string;
  accessCode: string;            // 6-digit PIN
  twilioConferenceName: string;
  status: 'active' | 'idle';
  participants: ConferenceParticipant[];
  maxParticipants: number;
  recordEnabled: boolean;
  createdAt: string;
}

export interface ConferenceParticipant {
  callSid: string;
  identity?: string;
  muted: boolean;
  hold: boolean;
  coaching: boolean;
  joinedAt: string;
}

// ─── Voicemail ────────────────────────────────────────────────────────────────
export interface Voicemail {
  id: string;
  orgId: string;
  extensionId: string;
  twilioCallSid: string;
  from: string;
  duration: number;
  recordingUrl: string;
  recordingSid: string;
  transcription?: string;
  listened: boolean;
  createdAt: string;
}

// ─── Call Analytics ───────────────────────────────────────────────────────────
export interface CallStats {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  missedCalls: number;
  avgDuration: number;
  totalDuration: number;
  callsAnswered: number;
  answerRate: number;
  period: 'today' | 'week' | 'month';
}

// ─── WebRTC Token ─────────────────────────────────────────────────────────────
export interface WebRTCTokenResponse {
  token: string;
  identity: string;
  expiresAt: string;
}

// ─── Webhook Payloads (from Twilio) ───────────────────────────────────────────
export interface TwilioVoiceWebhook {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  ForwardedFrom?: string;
  CallerName?: string;
  Duration?: string;
  RecordingUrl?: string;
  RecordingSid?: string;
  RecordingDuration?: string;
  TranscriptionText?: string;
}

export interface TwilioSMSWebhook {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
}

export interface TwilioStatusWebhook {
  CallSid: string;
  CallStatus: string;
  Duration?: string;
  RecordingUrl?: string;
  RecordingSid?: string;
}

// ─── Auth Session (from insighthunter-auth via dispatch) ─────────────────────
export interface AuthUser {
  userId: string;
  orgId: string;
  email: string;
  name: string;
  tier: PricingTier;
  roles: string[];
}

// ─── Env bindings ─────────────────────────────────────────────────────────────
export interface Env {
  DB: D1Database;
  PBX_KV: KVNamespace;
  PBX_RECORDINGS: R2Bucket;
  AI: Ai;
  ANALYTICS: AnalyticsEngineDataset;

  // Twilio master account credentials (InsightHunter platform account)
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;

  // Internal secret (from insighthunter-dispatch)
  INTERNAL_SECRET: string;

  // Public webhook base URL for Twilio callbacks
  PUBLIC_URL: string;           // https://pbx.insighthunter.app

  ENVIRONMENT: string;
}
