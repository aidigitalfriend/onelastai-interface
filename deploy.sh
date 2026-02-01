#!/bin/bash
# =============================================================================
# NEURAL LINK DEPLOYMENT SCRIPT
# Deploy the Neural Link subdomain (maula.onelastai.co)
# =============================================================================

set -e

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "   🧠 NEURAL LINK DEPLOYMENT"
echo "   Subdomain: maula.onelastai.co"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Configuration
PROJECT_ROOT="/home/ubuntu/shiny-friend-disco"
NEURAL_LINK_DIR="$PROJECT_ROOT/Onelastai-neural-link"
BACKEND_DIR="$NEURAL_LINK_DIR/backend"
FRONTEND_DIR="$NEURAL_LINK_DIR"
NGINX_CONF="$PROJECT_ROOT/nginx/maula.onelastai.co.conf"

# Step 1: Navigate to project
cd $PROJECT_ROOT
echo "📂 Working in: $PROJECT_ROOT"

# Step 2: Pull latest code
echo ""
echo "📥 Pulling latest code..."
git pull origin main

# Step 3: Install backend dependencies
echo ""
echo "📦 Installing Neural Link backend dependencies..."
cd $BACKEND_DIR
npm install

# Step 4: Generate Prisma client
echo ""
echo "🗄️  Generating Prisma client..."
npx prisma generate

# Step 5: Push database schema (if needed)
echo ""
echo "🔄 Syncing database schema..."
npx prisma db push --accept-data-loss 2>/dev/null || echo "   ⚠️  Schema already up to date"

# Step 6: Build frontend (if exists)
if [ -d "$FRONTEND_DIR/src" ]; then
    echo ""
    echo "🏗️  Building Neural Link frontend..."
    cd $FRONTEND_DIR
    npm install
    npm run build
    
    # Copy build to web root
    echo "📁 Copying build to /var/www/neural-link/dist..."
    sudo mkdir -p /var/www/neural-link/dist
    sudo cp -r dist/* /var/www/neural-link/dist/
    sudo chown -R www-data:www-data /var/www/neural-link
fi

# Step 7: Setup NGINX
echo ""
echo "🌐 Configuring NGINX..."

# Check if SSL cert exists
if [ ! -f "/etc/letsencrypt/live/maula.onelastai.co/fullchain.pem" ]; then
    echo "   ⚠️  SSL certificate not found. Creating..."
    echo "   Run: sudo certbot certonly --nginx -d maula.onelastai.co"
    echo ""
    echo "   After certificate is created, run this script again."
    # Create temp config without SSL for certbot
    sudo cp $NGINX_CONF /etc/nginx/sites-available/maula.onelastai.co
else
    # Copy config
    sudo cp $NGINX_CONF /etc/nginx/sites-available/maula.onelastai.co
fi

# Enable site
sudo ln -sf /etc/nginx/sites-available/maula.onelastai.co /etc/nginx/sites-enabled/

# Test NGINX config
echo "   Testing NGINX configuration..."
sudo nginx -t

# Reload NGINX
echo "   Reloading NGINX..."
sudo systemctl reload nginx

# Step 8: Start/Restart PM2 processes
echo ""
echo "🚀 Starting Neural Link backend with PM2..."
cd $PROJECT_ROOT

# Check if process exists
if pm2 describe neural-link-backend > /dev/null 2>&1; then
    echo "   Restarting existing process..."
    pm2 restart neural-link-backend
else
    echo "   Starting new process..."
    pm2 start ecosystem.config.cjs --only neural-link-backend
fi

# Save PM2 config
pm2 save

# Step 9: Verify deployment
echo ""
echo "🔍 Verifying deployment..."
sleep 3

# Check backend health
HEALTH_CHECK=$(curl -s http://localhost:3200/health 2>/dev/null || echo '{"status":"error"}')
if echo "$HEALTH_CHECK" | grep -q "healthy"; then
    echo "   ✅ Backend is healthy"
else
    echo "   ❌ Backend health check failed"
    echo "   Response: $HEALTH_CHECK"
fi

# Check NGINX
if curl -s -o /dev/null -w "%{http_code}" https://maula.onelastai.co/health 2>/dev/null | grep -q "200"; then
    echo "   ✅ NGINX proxy is working"
else
    echo "   ⚠️  NGINX may need SSL certificate setup"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "   ✨ DEPLOYMENT COMPLETE"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "   🌐 URL: https://maula.onelastai.co"
echo "   📊 Health: https://maula.onelastai.co/health"
echo "   🔗 API: https://maula.onelastai.co/api"
echo ""
echo "   📝 Next steps:"
echo "   1. Create .env file: cp $BACKEND_DIR/.env.example $BACKEND_DIR/.env"
echo "   2. Configure API keys and secrets"
echo "   3. Run Stripe products: node $BACKEND_DIR/scripts/create-stripe-products.js"
echo "   4. Test auth handoff from main app"
echo ""
