// apps/insighthunter-pbx/src/providers/twilio/TwilioWebhookVerifier.test.ts
import { describe, expect, it } from "vitest";
import { TwilioWebhookVerifier } from "./TwilioWebhookVerifier.js";

const AUTH_TOKEN = "test-auth-token";

async function signedRequest(url: string, params: Record<string, string>) {
  const body = new URLSearchParams(params);
  const values = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}${value}`)
    .join("");
  const data = new TextEncoder().encode(url + values);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(AUTH_TOKEN),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, data);
  const signature = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return new Request(url, {
    method: "POST",
    headers: {
      "X-Twilio-Signature": signature,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

describe("TwilioWebhookVerifier", () => {
  it("accepts a correctly signed request", async () => {
    const req = await signedRequest("https://pbx.insighthunter.app/voice/inbound?org=abc", {
      CallSid: "CA123",
      To: "+15551234567",
    });
    const verifier = new TwilioWebhookVerifier();
    expect(await verifier.verifyWebhookSignature(req, AUTH_TOKEN)).toBe(true);
  });

  it("rejects a request with a tampered body", async () => {
    const req = await signedRequest("https://pbx.insighthunter.app/voice/inbound?org=abc", {
      CallSid: "CA123",
      To: "+15551234567",
    });
    const tampered = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: new URLSearchParams({ CallSid: "CA999", To: "+15551234567" }),
    });
    const verifier = new TwilioWebhookVerifier();
    expect(await verifier.verifyWebhookSignature(tampered, AUTH_TOKEN)).toBe(false);
  });

  it("rejects a request missing the signature header", async () => {
    const req = new Request("https://pbx.insighthunter.app/voice/inbound", {
      method: "POST",
      body: new URLSearchParams({ CallSid: "CA123" }),
    });
    const verifier = new TwilioWebhookVerifier();
    expect(await verifier.verifyWebhookSignature(req, AUTH_TOKEN)).toBe(false);
  });
});
