#!/bin/bash
#
# LocalStack Initialization Script
# Creates S3 buckets and other AWS resources for local development
#

set -e

echo "Initializing LocalStack resources..."

# Wait for LocalStack to be ready
sleep 5

# ============== S3 BUCKETS ==============

echo "Creating S3 buckets..."

# Main storage bucket
awslocal s3 mb s3://ai-friend-zone-local --region us-east-1
awslocal s3api put-bucket-cors --bucket ai-friend-zone-local --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}'

# Deployments bucket
awslocal s3 mb s3://ai-friend-zone-deployments --region us-east-1

# Create folder structure
awslocal s3api put-object --bucket ai-friend-zone-local --key projects/
awslocal s3api put-object --bucket ai-friend-zone-local --key user-files/
awslocal s3api put-object --bucket ai-friend-zone-local --key assets/
awslocal s3api put-object --bucket ai-friend-zone-local --key backups/
awslocal s3api put-object --bucket ai-friend-zone-local --key temp/

echo "S3 buckets created successfully"

# ============== SQS QUEUES ==============

echo "Creating SQS queues..."

awslocal sqs create-queue --queue-name deploy-queue --region us-east-1
awslocal sqs create-queue --queue-name email-queue --region us-east-1
awslocal sqs create-queue --queue-name analytics-queue --region us-east-1

echo "SQS queues created successfully"

# ============== SECRETS MANAGER ==============

echo "Creating secrets..."

# Create development secrets
awslocal secretsmanager create-secret \
  --name ai-friend-zone/development \
  --description "Development secrets" \
  --secret-string '{
    "DB_PASSWORD": "postgres123",
    "JWT_SECRET": "local-development-secret-key-12345",
    "OPENAI_API_KEY": "sk-test-key",
    "STRIPE_SECRET_KEY": "sk_test_key"
  }' \
  --region us-east-1

echo "Secrets created successfully"

# ============== VERIFICATION ==============

echo ""
echo "============================================"
echo "LocalStack initialization complete!"
echo "============================================"
echo ""
echo "S3 Buckets:"
awslocal s3 ls
echo ""
echo "SQS Queues:"
awslocal sqs list-queues --region us-east-1
echo ""
echo "Secrets:"
awslocal secretsmanager list-secrets --region us-east-1 --query 'SecretList[].Name'
echo ""
echo "============================================"
