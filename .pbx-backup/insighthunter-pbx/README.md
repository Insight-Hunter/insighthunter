# Insight Hunter PBX

A production-grade cloud PBX built entirely on Cloudflare's edge stack.
Carrier layer: **Telnyx** (SIP/PSTN). No servers, no VoIP boxes.

## Architecture

```
PSTN/SIP ──► Telnyx ──► Webhooks ──► Cloudflare Worker (Hono)
                                         │
              ┌──────────────────────────┤
              │          │               │
           D1 (CDR)   R2 (VM Audio)  KV (Config)
              │
    Durable Objects ──► PBXCoordinator (live call state + WS)
              │
           Queues ──► Workers AI (Whisper transcription)
              │
       Analytics Engine (call metrics)
```

## Features

| Module | Description |
|---|---|
| IVR / Auto-Attendant | DTMF-driven menus with TTS greetings |
| Extensions | SIP extensions mapped to DIDs |
| Ring Groups | Simultaneous / round-robin / sequential |
| Voicemail | R2 storage + AI Whisper transcription |
| CDR | Full call history with stats API |
| Business Hours | Per-org open/closed schedules |
| Live Dashboard | WebSocket real-time call status |

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Create Cloudflare resources
```bash
# D1 database
npx wrangler d1 create insight-hunter-pbx

# KV namespace
npx wrangler kv namespace create PBX_CONFIG

# R2 bucket
npx wrangler r2 bucket create insight-hunter-voicemail

# Queue
npx wrangler queues create pbx-transcription-queue
npx wrangler queues create pbx-transcription-dlq
```

### 3. Update wrangler.jsonc
Replace `YOUR_D1_DATABASE_ID`, `YOUR_KV_NAMESPACE_ID`, and `YOUR_KV_PREVIEW_ID`
with the IDs returned from step 2.

### 4. Set secrets
```bash
npx wrangler secret put TELNYX_API_KEY
npx wrangler secret put TELNYX_APP_ID
npx wrangler secret put TELNYX_WEBHOOK_SECRET
npx wrangler secret put JWT_SECRET
```

### 5. Initialize database
```bash
# Local dev
npm run db:init

# Remote (production)
npm run db:init:remote
```

### 6. Deploy
```bash
npm run deploy
```

### 7. Configure Telnyx
In your Telnyx Mission Control Portal:
- Create a **Call Control Application**
- Set the webhook URL to: `https://insight-hunter-pbx.YOUR_SUBDOMAIN.workers.dev/api/calls/webhook`
- Assign your DIDs to the application

## API Reference

### Extensions
| Method | Path | Description |
|---|---|---|
| GET | `/api/extensions` | List extensions |
| POST | `/api/extensions` | Create extension |
| PUT | `/api/extensions/:id` | Update extension |
| DELETE | `/api/extensions/:id` | Delete extension |

### IVR
| Method | Path | Description |
|---|---|---|
| GET | `/api/ivr` | List menus |
| POST | `/api/ivr` | Create menu |
| PUT | `/api/ivr/:id` | Update menu |
| PUT | `/api/ivr/did/:did` | Map DID → menu |

### Voicemail
| Method | Path | Description |
|---|---|---|
| GET | `/api/voicemail` | List voicemails |
| GET | `/api/voicemail/audio/:key` | Stream audio |
| PATCH | `/api/voicemail/:id/read` | Mark read |
| DELETE | `/api/voicemail/:id` | Delete |

### CDR
| Method | Path | Description |
|---|---|---|
| GET | `/api/cdr` | Paginated call history |
| GET | `/api/cdr/summary` | Aggregated stats |

### Live Dashboard (WebSocket)
```js
const ws = new WebSocket(
  'wss://insight-hunter-pbx.YOUR_SUBDOMAIN.workers.dev/api/calls/ws',
  [],
  { headers: { Authorization: 'Bearer <token>' } }
);
ws.onmessage = (e) => console.log(JSON.parse(e.data));
// { type: "update",  { active_calls: [...], extension_status: {...} } }
```

### Config
| Method | Path | Description |
|---|---|---|
| GET/PUT | `/api/config/business-hours` | Business hour schedule |
| GET/POST | `/api/config/ring-groups` | Ring group management |
| PUT | `/api/config/default-extension` | Default operator extension |
| PUT | `/api/config/closed-message` | After-hours TTS message |

## Business Hours Payload

```json
{
  "enabled": true,
  "timezone": "America/New_York",
  "schedule": {
    "monday":    { "open": "09:00", "close": "17:00", "closed": false },
    "tuesday":   { "open": "09:00", "close": "17:00", "closed": false },
    "wednesday": { "open": "09:00", "close": "17:00", "closed": false },
    "thursday":  { "open": "09:00", "close": "17:00", "closed": false },
    "friday":    { "open": "09:00", "close": "17:00", "closed": false },
    "saturday":  { "open": "00:00", "close": "00:00", "closed": true },
    "sunday":    { "open": "00:00", "close": "00:00", "closed": true }
  }
}
```

## IVR Menu Payload

```json
{
  "name": "Main Menu",
  "greeting_text": "Thank you for calling Insight Hunter. Press 1 for sales, 2 for support, or 0 for the operator.",
  "greeting_type": "tts",
  "timeout": 5,
  "options": [
    { "digit": "1", "label": "Sales", "action": { "type": "extension", "target": "EXTENSION_ID" } },
    { "digit": "2", "label": "Support", "action": { "type": "ring_group", "target": "RING_GROUP_ID" } },
    { "digit": "0", "label": "Operator", "action": { "type": "extension", "target": "OPERATOR_EXT_ID" } }
  ],
  "invalid_action": { "type": "ivr", "target": "SAME_MENU_ID" }
}
```

## Cost Estimate (monthly, 1,000 calls/mo, avg 3 min)

| Service | Usage | Cost |
|---|---|---|
| Workers | ~30K requests | Free tier |
| D1 | ~100K rows | Free tier |
| R2 | ~1 GB audio | ~$0.02 |
| KV | ~50K reads | Free tier |
| Queues | ~1K messages | Free tier |
| Workers AI | ~1K transcriptions | ~$0.05 |
| **Telnyx** | 3,000 min inbound | ~$4.50 |
| **Total** | | **~$5/mo** |
