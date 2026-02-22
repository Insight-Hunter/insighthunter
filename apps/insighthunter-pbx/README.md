# ☁️ CloudPBX — Business Phone System

### Cloudflare Workers + Twilio + Workers AI

A fully-packaged enterprise phone system with a toll-free number, local DIDs per extension, an AI receptionist, voicemail, and mass SMS campaigns — all running on Cloudflare’s edge with no external AI API keys required.

-----

## Architecture

```
Caller → Twilio → Cloudflare Workers (PBX Engine)
                         │
              ┌──────────┼──────────────┐
              ↓          ↓              ↓
           D1 DB      R2 (VM)       KV (SMS)
                         │
              Workers AI (Routing + SMS replies)
              @cf/meta/llama-3.1-8b-instruct
```

-----

## Features

|Feature                |Technology                                        |
|-----------------------|--------------------------------------------------|
|Toll-free number       |Twilio                                            |
|Local DID per extension|Twilio (auto-provisioned on extension creation)   |
|IVR / call routing     |Twilio TwiML + Hono                               |
|AI Receptionist        |Workers AI — speech → intent → routing            |
|Voicemail storage      |Twilio Recording → R2                             |
|Voicemail transcription|Twilio built-in transcription → D1                |
|Individual SMS AI chat |Workers AI + KV conversation state                |
|Mass SMS campaigns     |Cloudflare Queues (rate-limited, opt-out filtered)|
|TCPA compliance        |STOP / UNSUBSCRIBE / START handling               |
|Admin dashboard        |Vanilla JS, Apple HIG design                      |

-----

## Quick Setup

### 1. Install dependencies

```bash
npm installg
```

### 2. Set Twilio secrets

Workers AI runs natively — no AI API key is needed. Only Twilio credentials are required.

```bash
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_TOLL_FREE_NUMBER   # e.g. +18005557890
```

### 3. Create Cloudflare resources

```bash
npm run setup
# Creates: D1 database, KV namespace, two R2 buckets, and two Queues
```

After running, copy the generated IDs printed in the terminal into `wrangler.jsonc`:

- `d1_databases[0].database_id`
- `kv_namespaces[0].id` and `preview_id`

### 4. Update wrangler.jsonc

Set your deployed worker URL in the `vars` block:

```jsonc
"vars": {
  "BASE_URL": "https://cloud-pbx.your-account.workers.dev",
  "COMPANY_NAME": "Acme Corp",
  "COMPANY_GREETING": "We're here to help.",
  "AI_MODEL": "@cf/meta/llama-3.1-8b-instruct"
}
```

### 5. Run database migrations

```bash
npm run db:migrate          # local dev
npm run db:migrate:remote   # production
```

### 6. Copy dashboard to public folder

```bash
mkdir -p public
cp src/dashboard.html public/index.html
```

### 7. Deploy

```bash
npm run deploy
```

### 8. Configure Twilio webhooks

In your [Twilio Console](https://console.twilio.com), configure your toll-free number:

|Event             |URL                                          |Method   |
|------------------|---------------------------------------------|---------|
|A call comes in   |`https://your-worker.workers.dev/ivr/inbound`|HTTP POST|
|A message comes in|`https://your-worker.workers.dev/sms/inbound`|HTTP POST|

### 9. Initialize the database

```bash
curl -X POST https://your-worker.workers.dev/api/init-db
```

-----

## Workers AI Configuration

AI inference runs entirely within Cloudflare via the `AI` binding — no external API key, no third-party dependency.

The model is controlled by the `AI_MODEL` environment variable in `wrangler.jsonc`:

|Model                                     |Speed   |Quality  |Best for                    |
|------------------------------------------|--------|---------|----------------------------|
|`@cf/meta/llama-3.1-8b-instruct`          |Fast    |Good     |Default — low latency IVR   |
|`@cf/meta/llama-3.3-70b-instruct-fp8-fast`|Moderate|Excellent|Higher-quality routing + SMS|
|`@cf/mistral/mistral-7b-instruct-v0.1`    |Fast    |Good     |Alternative 7B option       |

To switch models, update `AI_MODEL` in `wrangler.jsonc` and redeploy — no code changes needed.

> **Note:** Workers AI usage is billed through your Cloudflare account. The 8B model is included in the Workers AI free tier (up to 10,000 neurons/day). See [Cloudflare AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) for details.

-----

## Call Flow

```
Inbound Call
    │
    ├─ Direct local DID? ──→ Connect to that extension directly
    │                              └─ Unanswered → Voicemail
    │
    └─ Toll-free number? ──→ Main IVR Menu
                                   │
                                   ├─ Press 0 ──→ AI Receptionist (Workers AI)
                                   │                    │
                                   │                    └─ Speech transcribed by Twilio
                                   │                         └─ Workers AI determines:
                                   │                              transfer / voicemail /
                                   │                              info / goodbye
                                   │
                                   ├─ Press 101–199 ──→ Extension direct dial
                                   │                        └─ Unanswered → Voicemail
                                   │
                                   └─ Press 9 / no input ──→ Repeat menu
```

-----

## SMS AI Conversation

Inbound SMS is handled automatically by Workers AI:

- Maintains full conversation history per sender (stored in KV, 7-day TTL)
- Answers questions, provides info, and routes callers to the right team
- Automatically transfers to human agent when requested
- Enforces TCPA opt-out/opt-in via STOP / START keywords

**To take over a thread from AI:**

1. Open Admin Dashboard → SMS Inbox
1. Select the conversation
1. Reply manually — the thread is automatically flagged as `human` and AI stops responding

-----

## API Reference

### Extensions

```bash
# List all extensions
GET /api/extensions

# Add extension (auto-provisions a local Twilio DID)
POST /api/extensions
{
  "ext": "101",
  "name": "Jane Smith",
  "department": "Sales",
  "email": "jane@company.com",
  "forwardTo": "+15551234567"   # optional: forward to external number
}

# Update extension
PUT /api/extensions/:id

# Deactivate extension
DELETE /api/extensions/:id
```

### Voicemail

```bash
# List voicemails (optionally filter by extension)
GET /api/voicemails
GET /api/voicemails?ext=101

# Stream voicemail audio (MP3 from R2)
GET /api/voicemails/:id/audio

# Mark as listened
POST /api/voicemails/:id/listen
```

### SMS

```bash
# Send a one-off SMS
POST /api/sms/send
{ "to": "+15551234567", "message": "Hello!" }

# List active AI/human conversations
GET /api/conversations

# Get a specific conversation thread
GET /api/conversations/:from/:to

# Human agent reply (marks thread as human-handled)
POST /api/conversations/reply
{ "from": "+15551234567", "to": "+18005557890", "message": "How can I help?" }
```

### Campaigns

```bash
# Create and send a mass SMS campaign
POST /api/campaigns
{
  "name": "Spring Sale",
  "message": "Hi! Don't miss our 50% off sale this weekend. Reply STOP to opt out.",
  "recipients": ["+15551111111", "+15552222222"],
  "fromNumber": "+18005557890"   # optional, defaults to toll-free
}

# List campaigns with progress
GET /api/campaigns
```

### Analytics

```bash
GET /api/analytics/calls?period=7d   # periods: 7d, 30d, 90d
GET /api/analytics/sms
GET /api/dashboard                   # summary counts for today
```

-----

## Extension Provisioning

When you `POST /api/extensions`, CloudPBX automatically:

1. Searches Twilio for an available local number in the requested area code
1. Purchases and configures the number
1. Sets Voice + SMS webhooks to point to this worker
1. Stores the DID in D1 linked to the extension

Callers can dial the extension’s local DID directly, or call the main toll-free number and navigate the IVR menu.

-----

## Recording & Compliance Notes

- Voicemails are stored indefinitely in R2 by default — configure [R2 lifecycle rules](https://developers.cloudflare.com/r2/buckets/object-lifecycles/) to auto-expire if needed
- Transcription is handled by Twilio’s built-in service and saved to D1
- Campaign messages are rate-limited to ~1 SMS/second to respect Twilio toll-free limits
- All STOP / UNSUBSCRIBE opt-outs are persisted in D1 and automatically filtered from every future campaign
- Always include an opt-out instruction in the first marketing message sent to a new recipient