// apps/insighthunter-pbx/src/compliance.ts
// TCPA / A2P 10DLC compliance layer
// Handles: SMS opt-in/out, consent records, STOP/HELP/UNSTOP,
//          DNC checks, call recording disclosures, audit log

import type { Env } from './index'

// ── TCPA-required auto-responses ─────────────────────────────
export const SMS_AUTO_REPLIES: Record<string, string> = {
  STOP:      'You have been unsubscribed and will receive no further messages. Reply START to re-subscribe.',
  STOPALL:   'You have been unsubscribed and will receive no further messages. Reply START to re-subscribe.',
  UNSUBSCRIBE:'You have been unsubscribed and will receive no further messages. Reply START to re-subscribe.',
  CANCEL:    'You have been unsubscribed and will receive no further messages. Reply START to re-subscribe.',
  END:       'You have been unsubscribed and will receive no further messages. Reply START to re-subscribe.',
  QUIT:      'You have been unsubscribed and will receive no further messages. Reply START to re-subscribe.',
  START:     'You have been re-subscribed and will receive messages again. Reply STOP at any time to unsubscribe.',
  UNSTOP:    'You have been re-subscribed and will receive messages again. Reply STOP at any time to unsubscribe.',
  YES:       'You have been re-subscribed and will receive messages again. Reply STOP at any time to unsubscribe.',
  HELP:      'For help, visit insighthunter.app/contact or call us. Reply STOP to unsubscribe from SMS messages.',
  INFO:      'For help, visit insighthunter.app/contact or call us. Reply STOP to unsubscribe from SMS messages.',
}

// ── Opt-out keywords (CTIA required) ─────────────────────────
const OPT_OUT_WORDS  = new Set(['STOP','STOPALL','UNSUBSCRIBE','CANCEL','END','QUIT'])
const OPT_IN_WORDS   = new Set(['START','UNSTOP','YES'])

// ── Check if a number has active SMS consent ─────────────────
export async function hasConsent(
  db: D1Database,
  userId: string,
  toNumber: string
): Promise<{ ok: boolean; reason?: string }> {
  const row = await db.prepare(`
    SELECT status, consent_type, consented_at
    FROM sms_consent
    WHERE user_id = ? AND phone_number = ?
    ORDER BY created_at DESC LIMIT 1`)
    .bind(userId, toNumber)
    .first<{ status: string; consent_type: string; consented_at: string }>()

  if (!row)                      return { ok: false, reason: 'no_consent_record' }
  if (row.status === 'opted_out') return { ok: false, reason: 'opted_out' }
  if (row.status !== 'active')    return { ok: false, reason: `status:${row.status}` }
  return { ok: true }
}

// ── Record opt-in consent ─────────────────────────────────────
export async function recordConsent(
  db: D1Database,
  userId: string,
  phoneNumber: string,
  consentType: 'web_form' | 'keyword' | 'verbal' | 'import',
  metadata: {
    ip?: string
    form_url?: string
    message_type?: string   // transactional | marketing | mixed
    program_name?: string
    opt_in_message?: string
    collected_by?: string
  }
): Promise<void> {
  await db.prepare(`
    INSERT INTO sms_consent
      (id, user_id, phone_number, status, consent_type, message_type,
       program_name, opt_in_message, ip_address, form_url, consented_at, created_at)
    VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
    .bind(
      crypto.randomUUID(), userId, phoneNumber, consentType,
      metadata.message_type ?? 'mixed',
      metadata.program_name ?? '',
      metadata.opt_in_message ?? '',
      metadata.ip ?? null,
      metadata.form_url ?? null,
    ).run()
}

// ── Process inbound SMS for opt-in/out keywords ───────────────
export async function processInboundSMS(
  db: D1Database,
  userId: string,
  fromNumber: string,
  body: string
): Promise<{ auto_reply?: string; status_changed?: string }> {
  const keyword = body.trim().toUpperCase().split(' ')[0]

  if (OPT_OUT_WORDS.has(keyword)) {
    await db.prepare(`
      INSERT INTO sms_consent
        (id, user_id, phone_number, status, consent_type, consented_at, created_at)
      VALUES (?, ?, ?, 'opted_out', 'keyword', datetime('now'), datetime('now'))`)
      .bind(crypto.randomUUID(), userId, fromNumber)
      .run()

    await auditLog(db, userId, 'sms_opt_out', { phone: fromNumber, keyword })
    return { auto_reply: SMS_AUTO_REPLIES[keyword], status_changed: 'opted_out' }
  }

  if (OPT_IN_WORDS.has(keyword)) {
    await db.prepare(`
      INSERT INTO sms_consent
        (id, user_id, phone_number, status, consent_type, consented_at, created_at)
      VALUES (?, ?, ?, 'active', 'keyword', datetime('now'), datetime('now'))`)
      .bind(crypto.randomUUID(), userId, fromNumber)
      .run()

    await auditLog(db, userId, 'sms_opt_in', { phone: fromNumber, keyword })
    return { auto_reply: SMS_AUTO_REPLIES[keyword], status_changed: 'opted_in' }
  }

  if (keyword === 'HELP' || keyword === 'INFO') {
    return { auto_reply: SMS_AUTO_REPLIES[keyword] }
  }

  return {}
}

// ── Call recording disclosure TwiML ──────────────────────────
export function recordingDisclosureTwiML(
  businessName: string,
  continueUrl: string
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    This call may be recorded for quality and training purposes.
    By continuing, you consent to this recording.
  </Say>
  <Redirect>${continueUrl}</Redirect>
</Response>`
}

// ── Audit log ─────────────────────────────────────────────────
export async function auditLog(
  db: D1Database,
  userId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  await db.prepare(`
    INSERT INTO pbx_audit_log (id, user_id, event, data, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))`)
    .bind(crypto.randomUUID(), userId, event, JSON.stringify(data))
    .run()
}
