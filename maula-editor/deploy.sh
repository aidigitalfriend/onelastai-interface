#!/bin/bash
# ============================================
# AI Digital Friend Zone - Deployment Script
# ============================================
# Usage: ./deploy.sh [full|update|restart]
#   full    - Full deployment (first time)
#   update  - Pull latest code and restart
#   restart - Just restart services
# ============================================

set -e

# Configuration
EC2_HOST="ec2-13-250-44-150.ap-southeast-1.compute.amazonaws.com"
EC2_USER="ec2-user"
PEM_FILE="workspace-dev.pem"
APP_DIR="/home/ec2-user/ai-friend-zone"
REPO_URL="https://github.com/aidigitalfriend/copy-of-generated.git"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[i]${NC} $1"; }

# Check PEM file
if [ ! -f "$PEM_FILE" ]; then
    error "PEM file not found: $PEM_FILE"
fi
chmod 400 "$PEM_FILE"

# SSH command helper
ssh_cmd() {
    ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no -o ConnectTimeout=30 "$EC2_USER@$EC2_HOST" "$1"
}

# SCP command helper
scp_cmd() {
    scp -i "$PEM_FILE" -o StrictHostKeyChecking=no "$1" "$EC2_USER@$EC2_HOST:$2"
}

# Test connection
test_connection() {
    info "Testing connection to EC2..."
    if ssh_cmd "echo 'Connected successfully'" 2>/dev/null; then
        log "Connection successful!"
        return 0
    else
        error "Cannot connect to EC2. Check if instance is running and security group allows SSH."
    fi
}

# Install dependencies on EC2
install_dependencies() {
    info "Installing dependencies on EC2..."
    ssh_cmd "
        # Update system
        sudo yum update -y
        
        # Install Git
        sudo yum install -y git
        
        # Install Docker
        sudo yum install -y docker
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -aG docker ec2-user
        
        # Install Docker Compose
        sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        
        # Install Node.js 20
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
        
        # Install PM2
        sudo npm install -g pm2
        
        # Install Nginx
        sudo yum install -y nginx
        sudo systemctl start nginx
        sudo systemctl enable nginx
        
        echo 'Dependencies installed!'
    "
    log "Dependencies installed!"
}

# Clone or pull repository
setup_code() {
    info "Setting up code on EC2..."
    ssh_cmd "
        if [ -d '$APP_DIR' ]; then
            echo 'Repository exists, pulling latest...'
            cd $APP_DIR
            git fetch origin
            git reset --hard origin/main
        else
            echo 'Cloning repository...'
            git clone $REPO_URL $APP_DIR
        fi
    "
    log "Code setup complete!"
}

# Upload environment files
upload_env() {
    info "Uploading environment files..."
    
    # Upload server .env
    if [ -f "server/.env" ]; then
        scp_cmd "server/.env" "$APP_DIR/server/.env"
        log "Server .env uploaded"
    else
        warn "server/.env not found locally"
    fi
    
    # Upload root .env
    if [ -f ".env" ]; then
        scp_cmd ".env" "$APP_DIR/.env"
        log "Root .env uploaded"
    fi
    
    # Upload frontend .env.local
    if [ -f ".env.local" ]; then
        scp_cmd ".env.local" "$APP_DIR/.env.local"
        log "Frontend .env.local uploaded"
    fi
}

# Setup Nginx
setup_nginx() {
    info "Configuring Nginx..."
    ssh_cmd "
        sudo tee /etc/nginx/conf.d/ai-friend-zone.conf > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
    }
}
NGINX
        sudo nginx -t && sudo systemctl reload nginx
    "
    log "Nginx configured!"
}

# Build and start application
build_and_start() {
    info "Building and starting application..."
    ssh_cmd "
        cd $APP_DIR
        
        # Install frontend dependencies and build
        echo '📦 Installing frontend dependencies...'
        npm install
        echo '🔨 Building frontend...'
        npm run build
        
        # Install server dependencies
        echo '📦 Installing server dependencies...'
        cd server
        npm install
        
        # Generate Prisma client
        echo '🗃️ Generating Prisma client...'
        npx prisma generate
        
        # Run migrations (if any)
        echo '🗃️ Running database migrations...'
        npx prisma db push --accept-data-loss || true
        
        # Build NestJS
        echo '🔨 Building server...'
        npm run build
        
        # Copy proto files to dist
        echo '📋 Copying proto files...'
        mkdir -p dist/nest-src/grpc/protos
        cp -r grpc/protos/* dist/nest-src/grpc/protos/ 2>/dev/null || true
        
        # Start PostgreSQL Docker container if not running
        echo '🐘 Starting PostgreSQL...'
        docker ps | grep -q ai-friend-db || docker run -d --name ai-friend-db --restart unless-stopped -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres123 -e POSTGRES_DB=ai_friend_zone -p 5432:5432 -v pgdata:/var/lib/postgresql/data pgvector/pgvector:pg16
        sleep 3
        
        # Update DATABASE_URL to use local PostgreSQL
        sed -i 's|DATABASE_URL=.*|DATABASE_URL=\"postgresql://postgres:postgres123@localhost:5432/ai_friend_zone\"|' .env
        
        # Run database migrations
        echo '🗃️ Running Prisma migrations...'
        npx prisma db push --accept-data-loss
        
        # Start with PM2
        echo '🚀 Starting services with PM2...'
        cd $APP_DIR
        
        # Stop existing processes
        pm2 delete all 2>/dev/null || true
        
        # Start frontend (serve static files)
        pm2 serve dist 3000 --name frontend --spa
        
        # Start backend (NestJS output is in dist/nest-src/)
        cd server
        pm2 start dist/nest-src/main.js --name backend
        
        # Save PM2 config
        pm2 save
        
        echo '✅ Application started!'
        pm2 status
    "
    log "Application deployed and running!"
}

# Restart services
restart_services() {
    info "Restarting services..."
    ssh_cmd "
        pm2 restart all
        pm2 status
    "
    log "Services restarted!"
}

# Show status
show_status() {
    info "Checking status..."
    ssh_cmd "
        echo '=== PM2 Status ==='
        pm2 status
        echo ''
        echo '=== Nginx Status ==='
        sudo systemctl status nginx --no-pager | head -5
        echo ''
        echo '=== Docker Status ==='
        docker ps 2>/dev/null || echo 'Docker not running'
    "
}

# Main deployment
full_deploy() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  AI Digital Friend Zone - Full Deploy  ${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    test_connection
    install_dependencies
    setup_code
    upload_env
    setup_nginx
    build_and_start
    show_status
    
    echo ""
    log "🎉 Deployment complete!"
    info "Frontend: http://$EC2_HOST"
    info "API: http://$EC2_HOST/api"
}

# Update deployment
update_deploy() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  AI Digital Friend Zone - Update       ${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    test_connection
    setup_code
    upload_env
    build_and_start
    show_status
    
    echo ""
    log "🎉 Update complete!"
}

# Parse command
case "${1:-full}" in
    full)
        full_deploy
        ;;
    update)
        update_deploy
        ;;
    restart)
        test_connection
        restart_services
        ;;
    status)
        test_connection
        show_status
        ;;
    *)
        echo "Usage: $0 [full|update|restart|status]"
        exit 1
        ;;
esac
