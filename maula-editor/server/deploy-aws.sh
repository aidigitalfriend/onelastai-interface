#!/bin/bash
#
# AWS EC2 Deployment Script
# AI Digital Friend Zone Backend
#
# Usage: ./deploy-aws.sh [environment] [action]
# Example: ./deploy-aws.sh production deploy
#

set -e

# ============== CONFIGURATION ==============

# Default values
ENVIRONMENT=${1:-production}
ACTION=${2:-deploy}
APP_NAME="ai-friend-zone-backend"
AWS_REGION=${AWS_REGION:-"us-east-1"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============== HELPER FUNCTIONS ==============

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    local deps=("aws" "node" "npm" "git")
    for dep in "${deps[@]}"; do
        if ! command -v $dep &> /dev/null; then
            log_error "$dep is not installed"
            exit 1
        fi
    done
    
    log_success "All dependencies are installed"
}

# ============== AWS FUNCTIONS ==============

configure_aws() {
    log_info "Configuring AWS CLI..."
    
    # Check if running on EC2 with IAM role
    if curl -s http://169.254.169.254/latest/meta-data/iam/info &> /dev/null; then
        log_info "Running on EC2 with IAM role"
    else
        # Check for credentials
        if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
            log_error "AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
            exit 1
        fi
    fi
    
    log_success "AWS configured for region: $AWS_REGION"
}

get_secrets() {
    log_info "Fetching secrets from AWS Secrets Manager..."
    
    local secret_id="${APP_NAME}/${ENVIRONMENT}"
    
    if aws secretsmanager describe-secret --secret-id "$secret_id" --region "$AWS_REGION" &> /dev/null; then
        aws secretsmanager get-secret-value \
            --secret-id "$secret_id" \
            --region "$AWS_REGION" \
            --query 'SecretString' \
            --output text > .env.secrets
        
        log_success "Secrets retrieved and saved to .env.secrets"
    else
        log_warning "No secrets found in Secrets Manager"
    fi
}

# ============== BUILD FUNCTIONS ==============

install_dependencies() {
    log_info "Installing Node.js dependencies..."
    
    npm ci --production=false
    
    log_success "Dependencies installed"
}

build_application() {
    log_info "Building application..."
    
    npm run build
    
    log_success "Application built successfully"
}

run_migrations() {
    log_info "Running database migrations..."
    
    if [ "$RUN_MIGRATIONS" = "true" ]; then
        npx prisma migrate deploy
        log_success "Migrations completed"
    else
        log_info "Skipping migrations (RUN_MIGRATIONS != true)"
    fi
}

# ============== DEPLOYMENT FUNCTIONS ==============

deploy_to_ec2() {
    log_info "Deploying to EC2..."
    
    local instance_id=${EC2_INSTANCE_ID:-""}
    local deploy_path=${DEPLOY_PATH:-"/opt/ai-friend-zone"}
    
    if [ -z "$instance_id" ]; then
        log_error "EC2_INSTANCE_ID not set"
        exit 1
    fi
    
    # Create deployment package
    log_info "Creating deployment package..."
    tar -czf deploy.tar.gz \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='*.log' \
        dist/ \
        package.json \
        package-lock.json \
        prisma/
    
    # Upload to S3
    local s3_bucket=${DEPLOY_S3_BUCKET:-"${APP_NAME}-deployments"}
    local deploy_key="deployments/${ENVIRONMENT}/$(date +%Y%m%d-%H%M%S).tar.gz"
    
    log_info "Uploading to S3: s3://${s3_bucket}/${deploy_key}"
    aws s3 cp deploy.tar.gz "s3://${s3_bucket}/${deploy_key}" --region "$AWS_REGION"
    
    # Deploy via SSM
    log_info "Executing deployment on EC2..."
    aws ssm send-command \
        --instance-ids "$instance_id" \
        --document-name "AWS-RunShellScript" \
        --parameters commands="[
            \"cd ${deploy_path}\",
            \"aws s3 cp s3://${s3_bucket}/${deploy_key} deploy.tar.gz\",
            \"tar -xzf deploy.tar.gz\",
            \"npm ci --production\",
            \"npx prisma generate\",
            \"pm2 restart ${APP_NAME} || pm2 start dist/ec2-server.js --name ${APP_NAME}\",
            \"rm deploy.tar.gz\"
        ]" \
        --region "$AWS_REGION" \
        --output text
    
    # Cleanup local file
    rm deploy.tar.gz
    
    log_success "Deployment initiated on EC2 instance: $instance_id"
}

deploy_docker() {
    log_info "Building and deploying Docker image..."
    
    local ecr_registry=${DOCKER_REGISTRY:-""}
    local image_name=${DOCKER_IMAGE_NAME:-"$APP_NAME"}
    local image_tag="${ENVIRONMENT}-$(git rev-parse --short HEAD)"
    
    if [ -z "$ecr_registry" ]; then
        log_error "DOCKER_REGISTRY not set"
        exit 1
    fi
    
    # Login to ECR
    log_info "Logging in to ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ecr_registry"
    
    # Build image
    log_info "Building Docker image..."
    docker build -t "${image_name}:${image_tag}" -f Dockerfile .
    
    # Tag and push
    docker tag "${image_name}:${image_tag}" "${ecr_registry}/${image_name}:${image_tag}"
    docker tag "${image_name}:${image_tag}" "${ecr_registry}/${image_name}:latest"
    
    log_info "Pushing to ECR..."
    docker push "${ecr_registry}/${image_name}:${image_tag}"
    docker push "${ecr_registry}/${image_name}:latest"
    
    log_success "Docker image pushed: ${ecr_registry}/${image_name}:${image_tag}"
    
    # Update ECS service if configured
    if [ -n "$ECS_CLUSTER" ] && [ -n "$ECS_SERVICE" ]; then
        log_info "Updating ECS service..."
        aws ecs update-service \
            --cluster "$ECS_CLUSTER" \
            --service "$ECS_SERVICE" \
            --force-new-deployment \
            --region "$AWS_REGION"
        log_success "ECS service update initiated"
    fi
}

# ============== HEALTH CHECK ==============

health_check() {
    log_info "Running health check..."
    
    local health_url=${HEALTH_URL:-"http://localhost:4000/health"}
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$health_url" | grep -q '"status":"ok"'; then
            log_success "Health check passed!"
            return 0
        fi
        
        log_info "Waiting for server to be ready... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# ============== ROLLBACK ==============

rollback() {
    log_info "Rolling back to previous deployment..."
    
    local s3_bucket=${DEPLOY_S3_BUCKET:-"${APP_NAME}-deployments"}
    
    # Get previous deployment
    local previous=$(aws s3 ls "s3://${s3_bucket}/deployments/${ENVIRONMENT}/" \
        --region "$AWS_REGION" | sort -r | head -2 | tail -1 | awk '{print $4}')
    
    if [ -z "$previous" ]; then
        log_error "No previous deployment found"
        exit 1
    fi
    
    log_info "Rolling back to: $previous"
    
    # Download and deploy previous version
    aws s3 cp "s3://${s3_bucket}/deployments/${ENVIRONMENT}/${previous}" deploy.tar.gz --region "$AWS_REGION"
    tar -xzf deploy.tar.gz
    npm ci --production
    npx prisma generate
    pm2 restart ${APP_NAME}
    rm deploy.tar.gz
    
    log_success "Rollback completed"
}

# ============== MAIN ==============

main() {
    echo ""
    echo "========================================"
    echo "   AWS EC2 Deployment: $ENVIRONMENT"
    echo "========================================"
    echo ""
    
    check_dependencies
    configure_aws
    
    case $ACTION in
        deploy)
            install_dependencies
            build_application
            run_migrations
            deploy_to_ec2
            health_check
            ;;
        docker)
            deploy_docker
            ;;
        build)
            install_dependencies
            build_application
            ;;
        migrate)
            run_migrations
            ;;
        rollback)
            rollback
            ;;
        health)
            health_check
            ;;
        *)
            log_error "Unknown action: $ACTION"
            echo "Usage: $0 [environment] [action]"
            echo "Actions: deploy, docker, build, migrate, rollback, health"
            exit 1
            ;;
    esac
    
    echo ""
    log_success "Deployment script completed!"
    echo ""
}

main "$@"
