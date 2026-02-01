# AWS Backend Deployment Guide

## AI Digital Friend Zone - AWS EC2, RDS PostgreSQL, S3

This guide covers deploying the backend to AWS with:
- **EC2** for compute
- **RDS PostgreSQL** for database
- **S3** for file storage
- **ElastiCache Redis** for caching (optional)
- **CloudWatch** for monitoring

---

## 📋 Prerequisites

1. AWS Account with appropriate IAM permissions
2. AWS CLI installed and configured
3. Node.js 18+ installed
4. Docker (optional, for container deployment)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     VPC (10.0.0.0/16)                       ││
│  │  ┌─────────────────┐    ┌─────────────────┐                 ││
│  │  │  Public Subnet  │    │ Private Subnet  │                 ││
│  │  │  (10.0.1.0/24)  │    │ (10.0.2.0/24)   │                 ││
│  │  │                 │    │                 │                 ││
│  │  │  ┌───────────┐  │    │  ┌───────────┐  │                 ││
│  │  │  │    ALB    │──│────│──│   EC2     │  │                 ││
│  │  │  └───────────┘  │    │  │ (Node.js) │  │                 ││
│  │  │                 │    │  └─────┬─────┘  │                 ││
│  │  └─────────────────┘    │        │        │                 ││
│  │                         │  ┌─────┴─────┐  │                 ││
│  │                         │  │    RDS    │  │                 ││
│  │                         │  │ PostgreSQL│  │                 ││
│  │                         │  └───────────┘  │                 ││
│  │                         │                 │                 ││
│  │                         │  ┌───────────┐  │                 ││
│  │                         │  │   Redis   │  │                 ││
│  │                         │  │(ElastiCache)│ │                 ││
│  │                         │  └───────────┘  │                 ││
│  │                         └─────────────────┘                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │     S3      │  │ CloudWatch  │  │   Secrets   │              │
│  │   Bucket    │  │    Logs     │  │   Manager   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Set Up AWS Infrastructure

```bash
# Create VPC, Subnets, Security Groups
aws cloudformation create-stack \
  --stack-name ai-friend-zone-vpc \
  --template-body file://cloudformation/vpc.yaml

# Create RDS PostgreSQL
aws cloudformation create-stack \
  --stack-name ai-friend-zone-rds \
  --template-body file://cloudformation/rds.yaml

# Create S3 Bucket
aws s3 mb s3://ai-friend-zone-storage --region us-east-1
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.production .env

# Edit with your AWS values
nano .env
```

### 3. Deploy

```bash
# Option 1: Direct EC2 deployment
./deploy-aws.sh production deploy

# Option 2: Docker/ECS deployment
./deploy-aws.sh production docker
```

---

## 📦 File Structure

```
server/
├── src/
│   ├── config/
│   │   └── aws.config.js       # AWS configuration
│   ├── services/
│   │   ├── s3-storage.js       # S3 file operations
│   │   └── rds-database.js     # PostgreSQL operations
│   ├── routes/
│   │   ├── storage.js          # S3 API routes
│   │   └── health.js           # Health check routes
│   └── ec2-server.js           # Main server entry
├── prisma/
│   └── schema.prisma           # Database schema
├── .env.production             # Production environment
├── Dockerfile.aws              # Docker image
├── docker-compose.aws.yml      # Local AWS development
├── deploy-aws.sh               # Deployment script
└── localstack-init.sh          # LocalStack initialization
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_REGION` | AWS region | `us-east-1` |
| `RDS_HOSTNAME` | RDS endpoint | `db.xxx.rds.amazonaws.com` |
| `RDS_DB_NAME` | Database name | `ai_friend_zone` |
| `RDS_USERNAME` | Database user | `postgres` |
| `RDS_PASSWORD` | Database password | `secure_password` |
| `AWS_S3_BUCKET` | S3 bucket name | `ai-friend-zone-storage` |
| `JWT_SECRET` | JWT signing key | `your_secret_key` |

### RDS Configuration

```javascript
// Recommended RDS settings
{
  instanceClass: 'db.t3.medium',
  engine: 'postgres',
  engineVersion: '16',
  allocatedStorage: 100,
  maxAllocatedStorage: 500,
  multiAZ: true,
  storageType: 'gp3',
  backupRetentionPeriod: 7,
}
```

### S3 Configuration

```javascript
// S3 bucket structure
{
  folders: {
    projects: 'projects/',      // Project files
    userFiles: 'user-files/',   // User uploads
    assets: 'assets/',          // Static assets
    backups: 'backups/',        // Project backups
    deployments: 'deployments/' // Deployment artifacts
  }
}
```

---

## 🐳 Local Development with Docker

### Start Local AWS Stack

```bash
# Start all services
docker-compose -f docker-compose.aws.yml up -d

# View logs
docker-compose -f docker-compose.aws.yml logs -f

# Access services:
# - Backend API: http://localhost:4000
# - Adminer (DB): http://localhost:8080
# - Redis Commander: http://localhost:8081
# - LocalStack S3: http://localhost:4566
```

### Test S3 Locally

```bash
# Using AWS CLI with LocalStack
aws --endpoint-url=http://localhost:4566 s3 ls
aws --endpoint-url=http://localhost:4566 s3 cp test.txt s3://ai-friend-zone-local/
```

---

## 📊 API Endpoints

### Health Checks

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Simple health check (ALB) |
| `GET /health/detailed` | Detailed component status |
| `GET /health/ready` | Kubernetes readiness probe |
| `GET /health/live` | Kubernetes liveness probe |
| `GET /health/metrics` | Prometheus metrics |

### Storage API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/storage/upload` | POST | Upload single file |
| `/api/storage/upload-multiple` | POST | Upload multiple files |
| `/api/storage/presigned-upload` | POST | Get presigned upload URL |
| `/api/storage/download/*` | GET | Download file |
| `/api/storage/presigned-download` | GET | Get presigned download URL |
| `/api/storage/list` | GET | List files in folder |
| `/api/storage/file` | DELETE | Delete file |
| `/api/storage/backup` | POST | Create project backup |
| `/api/storage/restore` | POST | Restore from backup |

---

## 🔒 Security

### IAM Policy for EC2

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::ai-friend-zone-storage",
        "arn:aws:s3:::ai-friend-zone-storage/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:ai-friend-zone/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/ai-friend-zone/*"
    }
  ]
}
```

### Security Best Practices

1. **Use IAM Roles** - Attach IAM role to EC2 instead of access keys
2. **Enable SSL** - Always use SSL for RDS connections
3. **Private Subnets** - Place RDS and Redis in private subnets
4. **Security Groups** - Restrict access to necessary ports only
5. **Secrets Manager** - Store sensitive data in AWS Secrets Manager
6. **Encryption** - Enable encryption at rest for S3 and RDS

---

## 📈 Monitoring

### CloudWatch Metrics

```bash
# Custom metrics namespace
AIFriendZone/Backend

# Metrics:
- RequestCount
- ResponseTime
- ErrorRate
- DatabaseLatency
- S3OperationLatency
```

### CloudWatch Alarms

```bash
# Set up alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "HighCPUUtilization" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy
        run: |
          cd server
          ./deploy-aws.sh production deploy
```

---

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check security group allows port 5432
   # Check RDS is in same VPC
   # Verify credentials
   ```

2. **S3 Access Denied**
   ```bash
   # Check IAM role/policy
   # Verify bucket policy
   # Check bucket region
   ```

3. **Health Check Failing**
   ```bash
   # Check application logs
   docker logs ai-friend-zone-backend
   
   # Test locally
   curl http://localhost:4000/health
   ```

---

## 📞 Support

For issues and questions:
- GitHub Issues: [github.com/your-repo/issues](https://github.com/your-repo/issues)
- Documentation: [docs.maula.dev](https://docs.maula.dev)
