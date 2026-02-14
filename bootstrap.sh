#!/usr/bin/env bash
set -e

echo ""
echo "🚀 InsightHunter — Full System Bootstrap"
echo "----------------------------------------"
echo ""

###############################################
# 1. CREATE ROOT REPO
###############################################

echo "📁 Creating root folder..."
mkdir -p insighthunter
cd insighthunter

echo "📦 Initializing root package.json..."
cat > package.json << 'EOF'
{
  "name": "insighthunter",
  "private": true,
  "version": "1.0.0",
  "workspaces": [
    "apps/*",
    "packages/*",
    "infra"
  ]
}
EOF

echo "📁 Creating base folders..."
mkdir -p apps packages infra

###############################################
# 2. INSTALL ROOT DEPENDENCIES
###############################################

echo "📦 Installing root dependencies..."
npm init -y > /dev/null
npm install -D typescript ts-node nodemon

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
EOF

###############################################
# 3. SCAFFOLD ALL APPS
###############################################

echo ""
echo "🏗️ Creating app scaffolds..."
echo ""

APPS=(
  "insighthunter-mobile"
  "insighthunter-desktop"
  "insighthunter-bookkeeping"
  "insighthunter-lite"
  "insighthunter-standard"
  "insighthunter-full"
  "bizforma"
  "insighthunter-scout"
  "insighthunter-pro-services"
  "insighthunter-marketing"
  "insighthunter-launcher"
  "insighthunter-web"
)

for APP in "${APPS[@]}"; do
  echo "📁 apps/$APP"
  mkdir -p apps/$APP/public
  mkdir -p apps/$APP/src

  cat > apps/$APP/package.json << EOF
{
  "name": "$APP",
  "version": "1.0.0"
}
EOF
done

###############################################
# 4. SCAFFOLD SHARED PACKAGES
###############################################

echo ""
echo "📦 Creating shared packages..."
echo ""

PACKAGES=(
  "shared-types"
  "shared-utils"
  "compliance-module"
  "core-worker"
)

for PKG in "${PACKAGES[@]}"; do
  echo "📁 packages/$PKG"
  mkdir -p packages/$PKG/src

  cat > packages/$PKG/package.json << EOF
{
  "name": "@insighthunter/$PKG",
  "version": "1.0.0"
}
EOF
done

###############################################
# 5. INFRA SETUP
###############################################

echo ""
echo "☁️ Creating infra scaffolding..."
echo ""

mkdir -p infra/access
mkdir -p infra/sql
mkdir -p infra/scripts

cat > infra/access/policies.yaml << 'EOF'
policies:
  - name: InsightHunter Login
    decision: allow
    include:
      - email: "*@insighthunter.com"
EOF

###############################################
# 6. CLOUDFLARE WORKER SETUP
###############################################

echo ""
echo "⚙️ Setting up Cloudflare Worker..."
echo ""

mkdir -p packages/core-worker

cat > packages/core-worker/wrangler.toml << 'EOF'
name = "core-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[durable_objects.bindings]]
name = "COMPLIANCE_STATE"
class_name = "ComplianceStateDO"

[[durable_objects.bindings]]
name = "AUDIT_LOG"
class_name = "AuditLogDO"

[r2_buckets]
binding = "UPLOADS"
bucket_name = "insighthunter-uploads"
EOF

###############################################
# 7. DEV SCRIPTS
###############################################

echo ""
echo "🛠️ Creating dev scripts..."
echo ""

cat > dev.sh << 'EOF'
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
EOF

chmod +x dev.sh

###############################################
# 8. FINISH
###############################################

echo ""
echo "🎉 InsightHunter bootstrap complete!"
echo "-----------------------------------"
echo "Next steps:"
echo "1. cd insighthunter"
echo "2. Run: ./dev.sh"
echo ""
