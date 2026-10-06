// Provider-neutral telephony contract (see docs/insight-pbx-master-prompt.md §3.3).
// TODO(backend): extend this interface with call-initiation and call-control
// methods (dial, transfer, hold, hangup) once the call-flow engine
// (routes/callFlows.ts, agents/CallSessionAgent.ts) is implemented. Today it
// only covers inbound-webhook authenticity, which is what voice/SMS webhook
// handling actually needs.

export interface TelephonyProvider {
  /** Verifies that an inbound webhook request genuinely originated from the provider. */
  verifyWebhookSignature(req: Request, authToken: string): Promise<boolean>;

  /** Confirms an E.164 number is provisioned in the configured provider account. */
  findIncomingNumber(
    phoneNumber: string,
    accountSid: string,
    authToken: string,
  ): Promise<{ providerNumberId: string } | null>;
}
