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

  // TODO(call-flow-engine): dial(params), transfer(callSid, target), hold(callSid), hangup(callSid)
}
