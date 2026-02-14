#!/usr/bin/env bash
set -e

echo "🚀 Starting InsightHunter dev environment..."

# Core Worker
echo "🧱 Core Worker..."
(cd packages/core-worker && npx wrangler dev) &

# Desktop App
echo "🖥️ Desktop App..."
(cd apps/insighthunter-desktop && npm run tauri dev) &

# Mobile App
echo "📱 Mobile App..."
(cd apps/insighthunter-mobile && npx expo start) &

# Web App (HTML)
echo "🌐 Web App..."
(cd apps/insighthunter-web/public && python3 -m http.server 3000) &

wait
