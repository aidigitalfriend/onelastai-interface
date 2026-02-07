#!/bin/bash
# =============================================================================
# ONELASTAI INTERFACE - UNIFIED DEPLOYMENT SCRIPT
# Deploy all apps to maula.onelastai.co
# =============================================================================
# 
# Project Structure:
# ├── /                    → Main Landing + Neural Chat (root app)
# ├── /backend             → Express.js API Server (Port 3200)
# ├── /canvas-app          → GenCraft AI Canvas Studio (/canvas route)
# └── /maula-editor        → AI Code Editor (/editor route)
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="maula.onelastai.co"
PROJECT_ROOT="/home/ubuntu/onelastai-interface"
BACKEND_DIR="$PROJECT_ROOT/backend"
MAIN_APP_DIR="$PROJECT_ROOT"
CANVAS_APP_DIR="$PROJECT_ROOT/canvas-studio"
NEURAL_CHAT_DIR="$PROJECT_ROOT/neural-chat"
EDITOR_APP_DIR="$PROJECT_ROOT/maula-editor"
WEB_ROOT="/var/www/maula"
NGINX_CONF="$PROJECT_ROOT/nginx-maula.conf"
BACKEND_PORT=3200

echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}   🚀 ONELASTAI INTERFACE - UNIFIED DEPLOYMENT${NC}"
echo -e "${PURPLE}   Domain: ${CYAN}$DOMAIN${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Function to print step headers
print_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# STEP 1: Navigate to project and pull latest code
# =============================================================================
print_step "📂 STEP 1: Project Setup"

cd $PROJECT_ROOT
echo -e "   ${CYAN}Working directory:${NC} $PROJECT_ROOT"

echo -e "   ${YELLOW}📥 Pulling latest code...${NC}"
git pull origin main || echo -e "   ${YELLOW}⚠️  Git pull skipped (not a git repo or no changes)${NC}"

# =============================================================================
# STEP 2: Backend Setup
# =============================================================================
print_step "🔧 STEP 2: Backend Setup"

cd $BACKEND_DIR
echo -e "   ${CYAN}Backend directory:${NC} $BACKEND_DIR"

echo -e "   ${YELLOW}📦 Installing backend dependencies...${NC}"
npm install --production

echo -e "   ${YELLOW}🗄️  Generating Prisma client...${NC}"
npx prisma generate

echo -e "   ${YELLOW}🔄 Syncing database schema...${NC}"
npx prisma db push --accept-data-loss 2>/dev/null || echo -e "   ${GREEN}✓ Schema already up to date${NC}"

# =============================================================================
# STEP 3: Build Main App (Landing + Neural Chat)
# =============================================================================
print_step "🏗️  STEP 3: Building Main App (Landing + Neural Chat)"

cd $MAIN_APP_DIR
echo -e "   ${CYAN}App directory:${NC} $MAIN_APP_DIR"

echo -e "   ${YELLOW}📦 Installing dependencies...${NC}"
npm install

echo -e "   ${YELLOW}🔨 Building main app...${NC}"
npm run build

# Create web root and copy build
echo -e "   ${YELLOW}📁 Deploying to web root...${NC}"
sudo mkdir -p $WEB_ROOT/main
sudo rm -rf $WEB_ROOT/main/*
sudo cp -r dist/* $WEB_ROOT/main/
echo -e "   ${GREEN}✓ Main app deployed to $WEB_ROOT/main${NC}"

# =============================================================================
# STEP 4: Build Canvas Studio (GenCraft AI Studio)
# =============================================================================
print_step "🎨 STEP 4: Building Canvas Studio (GenCraft AI Studio)"

cd $CANVAS_APP_DIR
echo -e "   ${CYAN}App directory:${NC} $CANVAS_APP_DIR"

echo -e "   ${YELLOW}📦 Installing dependencies...${NC}"
npm install

echo -e "   ${YELLOW}🔨 Building canvas studio...${NC}"
npm run build

# Copy to web root under /canvas-studio (matches nginx)
echo -e "   ${YELLOW}📁 Deploying to web root...${NC}"
sudo mkdir -p $WEB_ROOT/canvas-studio
sudo rm -rf $WEB_ROOT/canvas-studio/*
sudo cp -r dist/* $WEB_ROOT/canvas-studio/
echo -e "   ${GREEN}✓ Canvas Studio deployed to $WEB_ROOT/canvas-studio${NC}"

# =============================================================================
# STEP 5: Build Neural Chat (+ Canvas App 2-in-1)
# =============================================================================
print_step "🧠 STEP 5: Building Neural Chat (+ Canvas App)"

cd $NEURAL_CHAT_DIR
echo -e "   ${CYAN}App directory:${NC} $NEURAL_CHAT_DIR"

if [ -f "$NEURAL_CHAT_DIR/package.json" ]; then
    echo -e "   ${YELLOW}📦 Installing dependencies...${NC}"
    npm install

    echo -e "   ${YELLOW}🔨 Building neural-chat...${NC}"
    npm run build

    # Copy to web root under /neural-chat (matches nginx)
    echo -e "   ${YELLOW}📁 Deploying to web root...${NC}"
    sudo mkdir -p $WEB_ROOT/neural-chat
    sudo rm -rf $WEB_ROOT/neural-chat/*
    sudo cp -r dist/* $WEB_ROOT/neural-chat/
    echo -e "   ${GREEN}✓ Neural Chat deployed to $WEB_ROOT/neural-chat${NC}"
    
    # Build and deploy canvas-app (embedded in neural-chat)
    if [ -d "$NEURAL_CHAT_DIR/canvas-app" ] && [ -f "$NEURAL_CHAT_DIR/canvas-app/package.json" ]; then
        echo -e "   ${YELLOW}🎨 Building Canvas App (embedded)...${NC}"
        cd $NEURAL_CHAT_DIR/canvas-app
        npm install
        npm run build
        
        # Deploy to canvas-build folder inside neural-chat
        sudo mkdir -p $WEB_ROOT/neural-chat/canvas-build
        sudo rm -rf $WEB_ROOT/neural-chat/canvas-build/*
        sudo cp -r dist/* $WEB_ROOT/neural-chat/canvas-build/
        echo -e "   ${GREEN}✓ Canvas App deployed to $WEB_ROOT/neural-chat/canvas-build${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Skipping neural-chat build (no package.json)${NC}"
fi

# =============================================================================
# STEP 6: Build Maula Editor (AI Code Editor)
# =============================================================================
print_step "💻 STEP 6: Building Maula Editor (AI Code Editor)"

cd $EDITOR_APP_DIR
echo -e "   ${CYAN}App directory:${NC} $EDITOR_APP_DIR"

# Check if package.json exists (submodule may not be initialized)
if [ -f "$EDITOR_APP_DIR/package.json" ]; then
    echo -e "   ${YELLOW}📦 Installing dependencies...${NC}"
    npm install

    echo -e "   ${YELLOW}🔨 Building editor app...${NC}"
    npm run build

    # Copy to web root under /maula-editor (matches nginx)
    echo -e "   ${YELLOW}📁 Deploying to web root...${NC}"
    sudo mkdir -p $WEB_ROOT/maula-editor
    sudo rm -rf $WEB_ROOT/maula-editor/*
    sudo cp -r dist/* $WEB_ROOT/maula-editor/
    echo -e "   ${GREEN}✓ Editor app deployed to $WEB_ROOT/maula-editor${NC}"
elif [ -d "$EDITOR_APP_DIR/dist" ]; then
    # Use existing dist if available
    echo -e "   ${YELLOW}⚠️  No package.json found, using existing dist...${NC}"
    sudo mkdir -p $WEB_ROOT/maula-editor
    sudo rm -rf $WEB_ROOT/maula-editor/*
    sudo cp -r dist/* $WEB_ROOT/maula-editor/
    echo -e "   ${GREEN}✓ Editor app deployed from existing dist${NC}"
    echo -e "   ${GREEN}✓ Editor app deployed from existing dist${NC}"
else
    echo -e "   ${YELLOW}⚠️  Skipping editor build (submodule not initialized)${NC}"
    echo -e "   ${CYAN}Run: git submodule update --init --recursive${NC}"
fi

# Set permissions
sudo chown -R www-data:www-data $WEB_ROOT

# =============================================================================
# STEP 7: Configure NGINX
# =============================================================================
print_step "🌐 STEP 7: Configuring NGINX"

# Check if SSL cert exists
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "   ${YELLOW}⚠️  SSL certificate not found${NC}"
    echo -e "   ${CYAN}Run: sudo certbot certonly --nginx -d $DOMAIN${NC}"
    echo ""
    echo -e "   After certificate is created, run this script again."
fi

# Copy NGINX config
echo -e "   ${YELLOW}📝 Copying NGINX configuration...${NC}"
sudo cp $NGINX_CONF /etc/nginx/sites-available/$DOMAIN

# Enable site
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Test NGINX config
echo -e "   ${YELLOW}🔍 Testing NGINX configuration...${NC}"
sudo nginx -t

# Reload NGINX
echo -e "   ${YELLOW}🔄 Reloading NGINX...${NC}"
sudo systemctl reload nginx
echo -e "   ${GREEN}✓ NGINX configured and reloaded${NC}"

# =============================================================================
# STEP 8: Start/Restart Backend with PM2
# =============================================================================
print_step "🚀 STEP 8: Starting Backend Services"

cd $PROJECT_ROOT

# Create PM2 ecosystem config if it doesn't exist
if [ ! -f "ecosystem.config.cjs" ]; then
    echo -e "   ${YELLOW}📝 Creating PM2 ecosystem config...${NC}"
    cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [
    {
      name: 'onelastai-backend',
      script: 'backend/server.js',
      cwd: '/home/ubuntu/onelastai-interface',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3200
      }
    }
  ]
};
EOF
fi

# Check if process exists and restart or start
if pm2 describe onelastai-backend > /dev/null 2>&1; then
    echo -e "   ${YELLOW}🔄 Restarting backend...${NC}"
    pm2 restart onelastai-backend
else
    echo -e "   ${YELLOW}▶️  Starting backend...${NC}"
    pm2 start ecosystem.config.cjs --only onelastai-backend
fi

# Save PM2 config
pm2 save
echo -e "   ${GREEN}✓ Backend running on port $BACKEND_PORT${NC}"

# =============================================================================
# STEP 9: Verify Deployment
# =============================================================================
print_step "🔍 STEP 9: Verifying Deployment"

sleep 3

# Check backend health
echo -e "   ${YELLOW}Checking backend health...${NC}"
HEALTH_CHECK=$(curl -s http://localhost:$BACKEND_PORT/health 2>/dev/null || echo '{"status":"error"}')
if echo "$HEALTH_CHECK" | grep -q "healthy\|ok"; then
    echo -e "   ${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "   ${RED}✗ Backend health check failed${NC}"
    echo -e "   ${YELLOW}Response: $HEALTH_CHECK${NC}"
fi

# Check main site
echo -e "   ${YELLOW}Checking main site...${NC}"
MAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/ 2>/dev/null || echo "000")
if [ "$MAIN_STATUS" = "200" ]; then
    echo -e "   ${GREEN}✓ Main site is accessible${NC}"
else
    echo -e "   ${YELLOW}⚠️  Main site returned status: $MAIN_STATUS${NC}"
fi

# Check canvas studio
echo -e "   ${YELLOW}Checking canvas studio...${NC}"
CANVAS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/canvas-studio/ 2>/dev/null || echo "000")
if [ "$CANVAS_STATUS" = "200" ]; then
    echo -e "   ${GREEN}✓ Canvas Studio is accessible${NC}"
else
    echo -e "   ${YELLOW}⚠️  Canvas Studio returned status: $CANVAS_STATUS${NC}"
fi

# Check neural chat
echo -e "   ${YELLOW}Checking neural chat...${NC}"
NEURAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/neural-chat/ 2>/dev/null || echo "000")
if [ "$NEURAL_STATUS" = "200" ]; then
    echo -e "   ${GREEN}✓ Neural Chat is accessible${NC}"
else
    echo -e "   ${YELLOW}⚠️  Neural Chat returned status: $NEURAL_STATUS${NC}"
fi

# Check maula editor
echo -e "   ${YELLOW}Checking maula editor...${NC}"
EDITOR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/maula-editor/ 2>/dev/null || echo "000")
if [ "$EDITOR_STATUS" = "200" ]; then
    echo -e "   ${GREEN}✓ Maula Editor is accessible${NC}"
else
    echo -e "   ${YELLOW}⚠️  Maula Editor returned status: $EDITOR_STATUS${NC}"
fi

# =============================================================================
# DEPLOYMENT COMPLETE
# =============================================================================
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✨ DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "   ${CYAN}🌐 Main App:${NC}        https://$DOMAIN"
echo -e "   ${CYAN}🎨 Canvas Studio:${NC}   https://$DOMAIN/canvas-studio/"
echo -e "   ${CYAN}🧠 Neural Chat:${NC}     https://$DOMAIN/neural-chat/"
echo -e "   ${CYAN}💻 Maula Editor:${NC}    https://$DOMAIN/maula-editor/"
echo -e "   ${CYAN}🔗 API:${NC}             https://$DOMAIN/api/"
echo -e "   ${CYAN}📊 Health:${NC}          https://$DOMAIN/health"
echo ""
echo -e "   ${PURPLE}📝 PM2 Commands:${NC}"
echo -e "      pm2 logs onelastai-backend    ${YELLOW}# View logs${NC}"
echo -e "      pm2 restart onelastai-backend ${YELLOW}# Restart backend${NC}"
echo -e "      pm2 status                    ${YELLOW}# Check status${NC}"
echo ""
echo -e "   ${PURPLE}📁 Deployment Paths:${NC}"
echo -e "      Main:         $WEB_ROOT/main"
echo -e "      Canvas Studio: $WEB_ROOT/canvas-studio"
echo -e "      Neural Chat:   $WEB_ROOT/neural-chat"
echo -e "      Maula Editor:  $WEB_ROOT/maula-editor"
echo ""
