# ☁️ CloudPBX — Business Phone System

### Cloudflare Workers + Twilio + Claude AI

A fully-packaged enterprise phone system with toll-free numbers, local DIDs per extension, AI receptionist, voicemail, and mass SMS campaigns.

-----

## Architecture

```
Caller → Twilio → Cloudflare Workers (PBX Engine)
                         │
                 ┌───────┼────────────┐
                 ↓       ↓            ↓
              D1 DB    R2 (VM)     KV (SMS)
                         │
                 Claude AI (Routing + SMS)
```

### Features

|Feature                  |Technology                              |
|-------------------------|----------------------------------------|
|Toll-free number         |Twilio                                  |
|Local DID per extension  |Twilio (auto-provisioned)               |
|IVR / call routing       |Twilio TwiML + Hono                     |
|AI Receptionist          |Claude claude-opus-4-6 (speech-to-route)|
|Voicemail + transcription|Twilio Recording → R2                   |
|Individual SMS AI chat   |Claude + KV conversation state          |
|Mass SMS campaigns       |Cloudflare Queues (rate-limited)        |
|Admin dashboard          |Vanilla JS, Apple HIG design            |
|Opt-out compliance       |STOP/UNSUBSCRIBE handling               |

-----

## Quick Setup

### 1. Install & configure

```bash
npm install
cp wrangler.jsonc.example wrangler.jsonc  # edit with your values
```

### 2. Set secrets (never commit these)

```bash
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_TOLL_FREE_NUMBER  # e.g. +18005557890
wrangler secret put ANTHROPIC_API_KEY
```

### 3. Create Cloudflare resources

```bash
npm run setup
# Creates: D1 DB, KV namespace, R2 buckets, Queues
```

After running, copy the generated IDs into `wrangler.jsonc`.

### 4. Run database migrations

```bash
npm run db:migrate        # local
npm run db:migrate:remote # production
```

### 5. Configure Twilio webhooks

In your [Twilio Console](https://console.twilio.com):

**Toll-free number → Configure:**

- Voice webhook: `https://your-worker.workers.dev/ivr/inbound` (HTTP POST)
- SMS webhook: `https://your-worker.workers.dev/sms/inbound` (HTTP POST)

### 6. Deploy

```bash
npm run deploy
```

### 7. Copy dashboard to public folder

```bash
mkdir -p public
cp src/dashboard.html public/index.html
```

### 8. Initialize DB via API

```bash
curl -X POST https://your-worker.workers.dev/api/init-db
```

-----

## API Reference

### Extensions

```bash
# List all extensions
GET /api/extensions

# Add extension (auto-provisions local Twilio number)
POST /api/extensions
{
  "ext": "101",
  "name": "Jane Smith",
  "department": "Sales",
  "email": "jane@company.com",
  "forwardTo": "+15551234567"  # optional cell/landline
}

# Update extension
PUT /api/extensions/:id

# Deactivate extension
DELETE /api/extensions/:id
```

### Voicemail

```bash
# List voicemails (filter by extension)
GET /api/voicemails?ext=101

# Stream voicemail audio
GET /api/voicemails/:id/audio

# Mark as listened
POST /api/voicemails/:id/listen
```

### SMS

```bash
# Send individual SMS
POST /api/sms/send
{ "to": "+15551234567", "message": "Hello!" }

# List active conversations
GET /api/conversations

# Agent reply to conversation
POST /api/conversations/reply
{ "from": "+15551234567", "to": "+18005557890", "message": "How can I help?" }
```

### Campaigns

```bash
# Create + send mass SMS campaign
POST /api/campaigns
{
  "name": "Spring Sale",
  "message": "Hi! Don't miss our 50% off sale this weekend.",
  "recipients": ["+15551111111", "+15552222222"],
  "fromNumber": "+18005557890"
}

# List campaigns with progress
GET /api/campaigns
```

### Analytics

```bash
GET /api/analytics/calls?period=7d   # 7d, 30d, 90d
GET /api/analytics/sms
GET /api/dashboard
```

-----

## Call Flow

```
Inbound Call
    │
    ├─ Direct DID? → Route to specific extension → Voicemail if unavailable
    │
    └─ Toll-free? → Main IVR Menu
                        │
                        ├─ Press 0 → AI Receptionist (Claude)
                        │                │
                        │                └─ Speech → Route intelligently
                        │
                        ├─ Press 101-199 → Extension direct dial
                        │
                        └─ No input → Repeat menu
```

-----

## SMS AI Conversation

Inbound SMS is handled by Claude automatically:

- Greets caller and answers questions
- Routes to human agent if requested
- Handles STOP/UNSUBSCRIBE compliance automatically
- Maintains conversation context for 7 days

To take over a conversation from AI:

1. Open Admin Dashboard → SMS Inbox
1. Select conversation
1. Type and send — automatically disables AI for that thread

-----

## Recording & Compliance Notes

- All voicemails stored in R2 (never expire by default; set lifecycle rules as needed)
- Transcription powered by Twilio’s built-in service
- TCPA compliance: always include opt-out in first campaign message
- Campaign messages are rate-limited to ~1/sec per Twilio guidelines
- Opt-outs are stored in D1 and automatically filtered from all campaigns

-----

## Extension Provisioning

When you add an extension via the API:

1. CloudPBX searches Twilio for an available local number in the specified area code
1. Purchases and configures it automatically
1. Sets Voice + SMS webhooks to this worker
1. Stores the DID in D1

Callers can dial the local DID directly to reach that extension, or call the toll-free to use the main menu.