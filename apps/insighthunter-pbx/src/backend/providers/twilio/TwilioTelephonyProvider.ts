// docs/file-structure.md names this file as the Twilio implementation of the
// full TelephonyProvider contract (call initiation/control, once that
// interface is extended — see providers/interfaces/TelephonyProvider.ts).
//
// Today, webhook-signature verification (the only method the interface
// currently declares) is implemented directly by TwilioWebhookVerifier and
// used by routes/webhooks.twilio.ts, so there is no behavior to duplicate
// here yet. This class exists as the scaffold target for outbound
// call-control methods (dial/transfer/hold/hangup) added alongside the
// call-flow engine (routes/callFlows.ts, agents/CallSessionAgent.ts).
import type { TelephonyProvider } from "../interfaces/TelephonyProvider.js";
import { TwilioWebhookVerifier } from "./TwilioWebhookVerifier.js";

export class TwilioTelephonyProvider implements TelephonyProvider {
  private readonly webhookVerifier = new TwilioWebhookVerifier();

  async verifyWebhookSignature(req: Request, authToken: string): Promise<boolean> {
    return this.webhookVerifier.verifyWebhookSignature(req, authToken);
  }

  async findIncomingNumber(
    phoneNumber: string,
    accountSid: string,
    authToken: string,
  ): Promise<{ providerNumberId: string } | null> {
    const auth = btoa(`${accountSid}:${authToken}`);
    const url = new URL(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
    );
    url.searchParams.set("PhoneNumber", phoneNumber);
    url.searchParams.set("PageSize", "1");

    const response = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!response.ok) {
      throw new Error(`twilio_number_lookup_failed: ${response.status}`);
    }

    const result = await response.json<{
      incoming_phone_numbers?: Array<{ phone_number?: string; sid?: string }>;
    }>();
    const match = result.incoming_phone_numbers?.find(
      (number) => number.phone_number === phoneNumber && typeof number.sid === "string",
    );
    return match?.sid ? { providerNumberId: match.sid } : null;
  }

  // TODO(call-flow-engine): dial(params), transfer(callSid, target), hold(callSid), hangup(callSid)
}
