# Curl examples

## Health
curl -s https://bizforma.insighthunter.app/health

## Auth config
curl -s https://bizforma.insighthunter.app/auth/config

## Simulated auth callback
open "https://bizforma.insighthunter.app/api/session/callback?access_token=REPLACE_TOKEN&redirect_to=/app"

## Create business after auth cookie exists
curl -s -X POST https://bizforma.insighthunter.app/api/business \
  -H 'content-type: application/json' \
  --cookie 'bizforma_session=REPLACE_SESSION' \
  -d '{"name":"Insight Hunter Biz LLC","stateCode":"GA","entityType":"LLC"}'
