#!/bin/bash
# local-test.sh — smoke-test all API endpoints against wrangler dev
# Run: chmod +x local-test.sh && ./local-test.sh

BASE="http://localhost:8787"
GREEN='[0;32m'
RED='[0;31m'
NC='[0m'

pass() { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; }

echo "=== Insight Hunter API — Local Tests ==="
echo ""

# Health
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/health)
[ "$STATUS" = "200" ] && pass "GET /health" || fail "GET /health ($STATUS)"

# Register
RES=$(curl -s -c /tmp/ih_cookies.txt -X POST $BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123","name":"Test User"}')
echo $RES | grep -q '"ok":true' && pass "POST /api/auth/register" || fail "POST /api/auth/register: $RES"

# Login
RES=$(curl -s -c /tmp/ih_cookies.txt -b /tmp/ih_cookies.txt -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123"}')
echo $RES | grep -q '"ok":true' && pass "POST /api/auth/login" || fail "POST /api/auth/login: $RES"

# /me
RES=$(curl -s -b /tmp/ih_cookies.txt $BASE/api/auth/me)
echo $RES | grep -q '"user"' && pass "GET /api/auth/me" || fail "GET /api/auth/me: $RES"

# Bookkeeping summary
RES=$(curl -s -b /tmp/ih_cookies.txt "$BASE/api/bookkeeping/summary?from=2026-01-01&to=2026-03-31")
echo $RES | grep -q '"income"' && pass "GET /api/bookkeeping/summary" || fail "GET /api/bookkeeping/summary: $RES"

# Create transaction
RES=$(curl -s -b /tmp/ih_cookies.txt -X POST $BASE/api/bookkeeping/transactions \
  -H "Content-Type: application/json" \
  -d '{"description":"Test Sale","amount":500,"type":"income","date":"2026-03-15"}')
echo $RES | grep -q '"id"' && pass "POST /api/bookkeeping/transactions" || fail "POST /api/bookkeeping/transactions: $RES"

# Transactions list
RES=$(curl -s -b /tmp/ih_cookies.txt "$BASE/api/bookkeeping/transactions?limit=10")
echo $RES | grep -q '"transactions"' && pass "GET /api/bookkeeping/transactions" || fail "GET /api/bookkeeping/transactions: $RES"

# Employees
RES=$(curl -s -b /tmp/ih_cookies.txt $BASE/api/payroll/employees)
echo $RES | grep -q '"employees"' && pass "GET /api/payroll/employees" || fail "GET /api/payroll/employees: $RES"

# BizForma formations
RES=$(curl -s -b /tmp/ih_cookies.txt $BASE/api/bizforma/formations)
echo $RES | grep -q '"formations"' && pass "GET /api/bizforma/formations" || fail "GET /api/bizforma/formations: $RES"

# Create formation (auto-generates compliance list)
RES=$(curl -s -b /tmp/ih_cookies.txt -X POST $BASE/api/bizforma/formations \
  -H "Content-Type: application/json" \
  -d '{"business_name":"Test LLC","entity_type":"LLC","state_of_formation":"GA"}')
echo $RES | grep -q '"id"' && pass "POST /api/bizforma/formations" || fail "POST /api/bizforma/formations: $RES"

# Reports P&L
RES=$(curl -s -b /tmp/ih_cookies.txt "$BASE/api/reports/pnl?from=2026-01-01&to=2026-03-31")
echo $RES | grep -q '"income"' && pass "GET /api/reports/pnl" || fail "GET /api/reports/pnl: $RES"

# PBX calls
RES=$(curl -s -b /tmp/ih_cookies.txt $BASE/api/pbx/calls)
echo $RES | grep -q '"calls"' && pass "GET /api/pbx/calls" || fail "GET /api/pbx/calls: $RES"

# Static asset
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/)
[ "$STATUS" = "200" ] && pass "GET / (dashboard SPA)" || fail "GET / ($STATUS)"

echo ""
echo "=== Done ==="
rm -f /tmp/ih_cookies.txt
