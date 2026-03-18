
// apps/insighthunter-pbx/src/compliance.ts
// TCPA / A2P 10DLC compliance layer
// Handles: SMS opt-in/out, consent records, STOP/HELP/UNSTOP,
// DNC checks, call recording disclosures, audit log

import type { Env } from "/types"

// ── TCPA-required auto-responses ─────────────────────────────
export const SMS_AUTO_REPLIES: Record<string, string> = {
  STOP: 'You have been unsubscribed and will receive no further messages. Reply START to re-subscribe.',
  STOPALL: 'You have been unsubscribed and will receive no further messages. Reply START to re-subscribe.',
  UNSUBSCRIBE: 'You have been unsubscribed and will receive no further messages. Reply START to re-subscribe.',
  CANCEL: 'You have been unsubscribed and will receive no further messages. Reply START to re-subscribe.',
  END: 'You have been unsubscribed and will receive no further messages. Reply START to re-subscribe.',
  QUIT: 'You have been unsubscribed and will receive no further messages. Reply START to re-subscribe.',
  HELP: 'For help, please contact us at [Your Contact Number] or visit our website at [Your Website URL].',
  START: 'You have successfully re-subscribed. You will now receive messages from us again.',
  UNSTOP: 'You have successfully re-subscribed. You will now receive messages from us again.',
  YES: 'You have successfully re-subscribed. You will now receive messages from us again.',
}

// ── DNC Registry Check ───────────────────────────────────────
// This is a placeholder. In a real app, you would integrate with a DNC scrubbing service.
export async function isDNC(env: Env, phoneNumber: string): Promise<boolean> {
  console.log(`Checking DNC for ${phoneNumber}...`)
  // Replace with actual DNC lookup logic.
  return false
}

// ── Call Recording Disclosure ────────────────────────────────
export const RECORDING_DISCLOSURE = 'This call may be recorded for quality and training purposes.'

// ── Consent Management ───────────────────────────────────────
const consentDB = new Map<string, boolean>()

export function recordConsent(phoneNumber: string, consent: boolean) {
  console.log(`Recording consent for ${phoneNumber}: ${consent}`)
  consentDB.set(phoneNumber, consent)
}

export function hasConsent(phoneNumber: string): boolean {
  return consentDB.get(phoneNumber) || false
}

// ── Audit Logging ────────────────────────────────────────────
export function logAuditEvent(event: string, details: any) {
  console.log(`[AUDIT] ${event}:`, details)
}
