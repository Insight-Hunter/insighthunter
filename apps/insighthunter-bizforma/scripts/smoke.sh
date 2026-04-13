#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${1:-http://127.0.0.1:8787}"
echo "GET $BASE_URL/health"
curl -s "$BASE_URL/health"
echo

echo "GET $BASE_URL/auth/config"
curl -s "$BASE_URL/auth/config"
echo
