export interface OnboardingPayload {
  businessName: string;
  plan: string;
  ownerEmail: string;
}

export async function submitOnboarding(payload: OnboardingPayload): Promise<Response> {
  return fetch("/api/onboard", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}
