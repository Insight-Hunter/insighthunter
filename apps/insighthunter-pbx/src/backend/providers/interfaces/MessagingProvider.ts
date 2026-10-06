// Provider-neutral messaging contract. Business logic depends on this, not
// on Twilio directly, so an alternate/blended carrier can be added later
// without rewriting routes/services (see docs/insight-pbx-master-prompt.md §3.3).

export interface SendMessageParams {
  to: string;
  from: string;
  body: string;
}

export interface SendMessageResult {
  providerMessageId: string | null;
  status: string;
}

export interface MessagingProvider {
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>;
}
