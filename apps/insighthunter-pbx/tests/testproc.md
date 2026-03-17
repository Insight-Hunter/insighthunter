# PBX Worker — Example API calls

## Search available numbers in 404 area code
curl "https://insighthunter-pbx.workers.dev/pbx/numbers/search?area_code=404"   -H "Authorization: Bearer $TOKEN"

## Provision a number
curl -X POST "https://insighthunter-pbx.workers.dev/pbx/numbers/provision"   -H "Content-Type: application/json"   -H "Authorization: Bearer $TOKEN"   -d '{"phone_number":"+14041234567","friendly_name":"Insight Hunter HQ"}'

## Update IVR greeting and routing
curl -X PUT "https://insighthunter-pbx.workers.dev/pbx/ivr"   -H "Content-Type: application/json"   -H "Authorization: Bearer $TOKEN"   -d '{
    "greeting": "Thanks for calling. Press 1 for sales, 2 for billing, or hold for voicemail.",
    "routes": {"1": "sales", "2": "billing"},
    "voicemail_enabled": true
  }'

## Add a call route
curl -X POST "https://insighthunter-pbx.workers.dev/pbx/routes"   -H "Content-Type: application/json"   -H "Authorization: Bearer $TOKEN"   -d '{"label":"sales","forward_to":"+14045551234","description":"Sales line"}'

## Send an SMS
curl -X POST "https://insighthunter-pbx.workers.dev/pbx/sms/send"   -H "Content-Type: application/json"   -H "Authorization: Bearer $TOKEN"   -d '{"to":"+14045559999","body":"Thanks for reaching out! We will call you back shortly."}'

## Get call log
curl "https://insighthunter-pbx.workers.dev/pbx/calls?limit=25"   -H "Authorization: Bearer $TOKEN"

## Get voicemails
curl "https://insighthunter-pbx.workers.dev/pbx/voicemails"   -H "Authorization: Bearer $TOKEN"

## Twilio Webhook URLs (configure in Twilio console or set when provisioning):
## Voice URL:  https://insighthunter-pbx.workers.dev/pbx/twiml/voice?user_id={userId}
## SMS URL:    https://insighthunter-pbx.workers.dev/pbx/twiml/sms?user_id={userId}
## Status CB:  https://insighthunter-pbx.workers.dev/pbx/twiml/status?user_id={userId}

## Deploy:
## wrangler d1 execute insighthunter-auth-db --file=insighthunter-pbx-schema.sql
## wrangler deploy --config insighthunter-pbx-wrangler.jsonc
