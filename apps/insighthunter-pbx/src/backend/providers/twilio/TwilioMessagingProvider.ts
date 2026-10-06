import type {
  MessagingProvider,
  SendMessageParams,
  SendMessageResult,
} from "../interfaces/MessagingProvider.js";

export class TwilioMessagingProvider implements MessagingProvider {
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
  ) {}

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const auth = btoa(`${this.accountSid}:${this.authToken}`);
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: params.to, From: params.from, Body: params.body }),
      },
    );
    const json = await res.json<{ sid?: string; status?: string }>();
    if (!res.ok) {
      throw new Error(`twilio_send_failed: ${JSON.stringify(json)}`);
    }
    return { providerMessageId: json.sid ?? null, status: json.status ?? "queued" };
  }
}
