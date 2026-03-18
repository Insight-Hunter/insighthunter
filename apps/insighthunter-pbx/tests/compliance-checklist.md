# Twilio Compliance Setup — Insight Hunter PBX
## Required BEFORE sending any SMS to users

---

## 1 — A2P 10DLC Registration (MANDATORY for US SMS)

All business SMS in the US requires A2P 10DLC registration
since 2023. Unregistered traffic is heavily filtered by carriers.

### Step 1 — Register Your Brand
1. Twilio Console → Messaging → Regulatory Compliance → Brand Registration
2. Fill in:
   - Legal business name: **Insight Hunter LLC**
   - EIN/Tax ID (from BizForma)
   - Business type: **Private For-Profit**
   - Industry: **Software/Technology**
   - Business website: **https://insighthunter.app**
   - Business address (registered agent address)
   - Contact: name, email, phone of responsible person

### Step 2 — Register a Campaign (Use Case)
For Insight Hunter you need TWO campaigns:

#### Campaign A — Transactional (lower fee, easier approval)
- Use Case: **2FA/OTP / Account Notifications**
- Sample message 1: "Your Insight Hunter login code is 482951. Valid for 10 minutes."
- Sample message 2: "Your Insight Hunter plan has been upgraded to Standard. Reply STOP to opt out."
- Opt-in: "Users agree during account creation by checking 'Receive account notifications via SMS'"
- Opt-out: "Reply STOP at any time"
- Help message: "Reply HELP for assistance"

#### Campaign B — Marketing/Mixed
- Use Case: **Mixed / Marketing**
- Sample message 1: "Hi [Name], your BizForma formation is complete! Log in to view your dashboard. Reply STOP to unsubscribe."
- Sample message 2: "Insight Hunter: Your registered agent renewal is due in 30 days. $49/yr — renew at insighthunter.app"
- Opt-in: "Users provide consent via opt-in web form at /sms-optin.html"
- MUST include: STOP, HELP, message frequency, msg&data rates disclosure in opt-in language

### Step 3 — Link number to campaign
After approval (24–72 hours), assign your provisioned numbers to the campaign in:
Twilio Console → Phone Numbers → Manage → Active Numbers → [select] → Messaging Service

---

## 2 — Opt-In Consent Requirements (TCPA)

### What you MUST have before sending marketing SMS:
- [ ] Written/digital consent — captured via web form at `/sms-optin.html`
- [ ] Consent stored in `sms_consent` DB table with timestamp + IP
- [ ] Opt-in message shown to user at time of consent (saved in `opt_in_message` column)
- [ ] Clear disclosure that msg&data rates apply
- [ ] Message frequency disclosed (e.g. "4–8 messages/month")
- [ ] STOP/HELP instructions visible at opt-in
- [ ] NOT pre-checked marketing checkbox

### What you DON'T need consent for (transactional):
- OTP / verification codes
- Password resets
- Account security alerts
- Formation status updates (directly related to a purchase)
- Use `skip_consent_check: true` flag in `/pbx/sms/send` for these

---

## 3 — Required Auto-Responses (CTIA)

Handled automatically by `compliance.ts` — confirms these fire:

| Keyword received | Auto-reply sent |
|---|---|
| STOP, STOPALL, CANCEL, END, QUIT, UNSUBSCRIBE | "You have been unsubscribed..." |
| START, UNSTOP, YES | "You have been re-subscribed..." |
| HELP, INFO | "For help, visit insighthunter.app/contact..." |

Test each keyword manually against your number after deploy.

---

## 4 — Call Recording Compliance

MUST announce recording before recording begins.
Already handled in TwiML via `recordingDisclosureTwiML()`.

By state:
- **1-party consent states** (majority): only need to notify, no explicit consent required
- **2-party / all-party states** (CA, FL, IL, MD, MA, NH, OR, PA, WA): must get explicit consent
  - Add a Gather keypress: "Press 1 to consent to recording"
  - Only record if they press 1

Update the TwiML voice handler for 2-party states when users are in those states.

---

## 5 — Twilio Console Checklist

- [ ] Verify your Twilio account (business name, EIN, address)
- [ ] Enable 2FA on Twilio account
- [ ] Register Brand (Step 1 above) — ~$4 one-time fee
- [ ] Create Transactional campaign — ~$10/mo
- [ ] Create Marketing campaign (if needed) — ~$10/mo
- [ ] Assign phone numbers to correct campaign
- [ ] Set webhook URLs in console to match worker URL
- [ ] Test STOP/HELP keywords
- [ ] Enable Twilio Fraud Guard
- [ ] Set spending limits (Twilio Console → Billing → Spending Limits)

---

## 6 — Ongoing Compliance

- Scrub numbers against opt-out list before any blast/bulk send
- Never re-message opted-out numbers (enforced by `hasConsent()`)
- Audit log stored in `pbx_audit_log` — keep minimum 4 years
- Honor opt-out within 10 business days (but system does it instantly)
- CTIA Messaging Principles: https://api.ctia.org/docs/default-source/default-document-library/170119-ctia-messaging-principles-and-best-practices.pdf
- TCPA info: https://www.fcc.gov/consumers/guides/stopping-unwanted-robocalls-and-texts

---

## 7 — Estimated Twilio Costs

| Item | Cost |
|---|---|
| Local number rental | $1.15/mo |
| Toll-free number | $2.15/mo |
| Outbound SMS | $0.0079/msg |
| Inbound SMS | $0.0079/msg |
| Outbound calls | $0.0140/min |
| Inbound calls | $0.0085/min |
| Voicemail recording | $0.0025/min storage |
| Transcription | $0.05/30s |
| Brand registration (one-time) | ~$4 |
| Campaign fee (monthly) | ~$10/campaign |

At 200 SMS/mo: ~$1.60 + $11/mo overhead = ~$12.60 total Twilio cost.
Standard plan charges user $29/mo PBX add-on → healthy margin.
