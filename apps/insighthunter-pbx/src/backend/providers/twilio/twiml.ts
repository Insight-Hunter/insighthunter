// TwiML response builders used by routes/webhooks.twilio.ts. Extracted into
// their own file (per docs/file-structure.md) so call-flow logic (future
// routes/callFlows.ts) can share the same building blocks instead of
// duplicating raw XML strings.

export const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

export const SAFE_FALLBACK_TWIML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We're sorry, this number is not configured correctly. Please try again later.</Say>
  <Hangup/>
</Response>`;

/** Greeting + record-voicemail TwiML used for the current (pre-call-flow-engine) inbound voice path. */
export function voicemailPromptTwiml(orgId: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thanks for calling. Please leave a message after the tone.</Say>
  <Record maxLength="120" action="/voice/recording-complete?org=${encodeURIComponent(orgId)}" playBeep="true" />
</Response>`;
}

export function smsReplyTwiml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${body}</Message></Response>`;
}
