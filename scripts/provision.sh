#!/bin/bash
set -e

echo "═══════════════════════════════════════════════"
echo "  InsightHunter — One-Time Resource Provisioning"
echo "═══════════════════════════════════════════════"
echo ""

# --- D1 Databases ---
echo "▶ Provisioning D1 databases..."
DATABASES=(
    "insighthunter-auth"
    "insighthunter-bookkeeping"
    "insighthunter-bizforma"
    "insighthunter-payroll"
    "insighthunter-advisor"
    "insighthunter-insights"
    "insighthunter-report"
    "insighthunter-scout"
    "ih-platform-worker"
    "ih-tenant-template"
    "insighthunter-finops"
    "insighthunter-ledger"
)

for db in "${DATABASES[@]}"; do
    echo "  Checking D1 database: $db"
    if npx wrangler d1 info "$db" >/dev/null 2>&1; then
        echo "  🔹 D1 database '$db' already exists. Skipping."
    else
        echo "  Creating D1 database: $db"
        npx wrangler d1 create "$db"
    fi
done

# --- KV Namespaces ---
echo ""
echo "▶ Provisioning KV namespaces..."
NAMESPACES=(
    "SESSIONS"
    "REFRESH_TOKENS"
    "REPORT_CACHE"
    "BIZ_CACHE"
    "CALL_STATE"
    "PAYROLL_CACHE"
    "USAGE"
    "TENANT_CACHE"
)

for ns in "${NAMESPACES[@]}"; do
    echo "  Checking KV namespace: $ns"
    if output=$(npx wrangler kv namespace create "$ns" 2>&1); then
        echo "  ✅ Created KV namespace '$ns'."
        echo "$output"
    elif echo "$output" | grep -q "already exists"; then
        echo "  🔹 KV namespace '$ns' already exists. Skipping."
    else
        echo "  ❌ Failed to create KV namespace '$ns'."
        echo "$output"
        exit 1
    fi
done

# --- R2 Buckets ---
echo ""
echo "▶ Provisioning R2 buckets..."
BUCKETS=(
    "ih-receipts"
    "ih-bizforma-docs"
    "ih-voicemail"
    "ih-pay-stubs"
)

for bucket in "${BUCKETS[@]}"; do
    echo "  Checking R2 bucket: $bucket"
    if npx wrangler r2 bucket get "$bucket" >/dev/null 2>&1; then
        echo "  🔹 R2 bucket '$bucket' already exists. Skipping."
    else
        echo "  Creating R2 bucket: $bucket"
        npx wrangler r2 bucket create "$bucket"
    fi
done

# --- Dispatch Namespace ---
echo ""
echo "▶ Provisioning Workers dispatch namespace..."
DISPATCH_NAMESPACE="insighthunter-tenants"
echo "  Checking dispatch namespace: $DISPATCH_NAMESPACE"
if npx wrangler dispatch-namespace get "$DISPATCH_NAMESPACE" >/dev/null 2>&1; then
    echo "  🔹 Dispatch namespace '$DISPATCH_NAMESPACE' already exists. Skipping."
else
    echo "  Creating dispatch namespace: $DISPATCH_NAMESPACE"
    npx wrangler dispatch-namespace create "$DISPATCH_NAMESPACE"
fi

# --- Vectorize Index ---
echo ""
echo "▶ Provisioning Vectorize index..."
VECTORIZE_INDEX="ih-financial-docs"
echo "  Checking Vectorize index: $VECTORIZE_INDEX"
if npx wrangler vectorize index get "$VECTORIZE_INDEX" >/dev/null 2>&1; then
    echo "  🔹 Vectorize index '$VECTORIZE_INDEX' already exists. Skipping."
else
    echo "  Creating Vectorize index: $VECTORIZE_INDEX"
    npx wrangler vectorize index create "$VECTORIZE_INDEX" --dimensions=384 --metric=cosine
fi


echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ Provisioning complete!"
echo ""
echo "  NEXT STEPS:"
echo "  1. Copy each resource ID from the output above"
echo "  2. Replace REPLACE_AFTER_PROVISION in all wrangler.jsonc files"
echo "  3. Set CF_ACCOUNT_ID in insighthunter-dispatch/wrangler.jsonc"
echo "  4. Run: bash scripts/secrets.sh"
echo "  5. Run: bash scripts/deploy.sh"
echo "═══════════════════════════════════════════════"
