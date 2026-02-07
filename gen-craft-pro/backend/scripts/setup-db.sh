#!/bin/bash
# ──────────────────────────────────────────────────
# GenCraft Pro — Database Setup Script
# ──────────────────────────────────────────────────
# Usage:
#   cd backend && bash scripts/setup-db.sh
#
# Prerequisites:
#   - PostgreSQL running (local or Docker)
#   - DATABASE_URL set in .env
# ──────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

echo "╔══════════════════════════════════════════════╗"
echo "║     GenCraft Pro — Database Setup            ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Check for .env
if [ ! -f .env ]; then
  echo "⚠️  No .env file found. Creating from template..."
  cat > .env <<'EOF'
# Database
DATABASE_URL="postgresql://gencraft:gencraft@localhost:5432/gencraft?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="change-me-in-production"

# AWS (optional — leave blank for local dev)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
DEPLOY_BUCKET="gencraft-assets"

# Stripe (optional)
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# AI (optional)
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""

# Server
PORT=4000
NODE_ENV=development
EOF
  echo "✅ Created .env with defaults — edit DATABASE_URL if needed."
  echo ""
fi

# Source .env
export $(grep -v '^#' .env | xargs)

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set in .env. Aborting."
  exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

echo ""
echo "🗄️  Pushing schema to database..."
npx prisma db push --accept-data-loss

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Optional commands:"
echo "  npx prisma studio          — Open Prisma Studio (visual DB editor)"
echo "  npx prisma migrate dev     — Create migration files for version control"
echo "  npx prisma db seed         — Run seed script (if configured)"
echo ""
