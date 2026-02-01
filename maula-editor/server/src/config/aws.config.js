/**
 * AWS Configuration for EC2, RDS PostgreSQL, and S3
 * AI Digital Friend Zone - Production Backend
 */

const AWS = require('aws-sdk');
const dotenv = require('dotenv');

dotenv.config();

// ============== AWS CREDENTIALS ==============

const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

// Configure AWS SDK
AWS.config.update(awsConfig);

// ============== S3 CONFIGURATION ==============

const s3Config = {
  bucket: process.env.AWS_S3_BUCKET || 'ai-friend-zone-storage',
  region: process.env.AWS_S3_REGION || process.env.AWS_REGION || 'us-east-1',
  
  // Upload settings
  upload: {
    maxFileSize: parseInt(process.env.S3_MAX_FILE_SIZE || '104857600'), // 100MB
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf',
      'application/zip', 'application/x-tar', 'application/gzip',
      'text/plain', 'text/html', 'text/css', 'text/javascript',
      'application/json', 'application/javascript',
      'application/typescript', 'text/typescript',
    ],
    
    // Presigned URL expiry
    presignedUrlExpiry: parseInt(process.env.S3_PRESIGNED_EXPIRY || '3600'), // 1 hour
  },
  
  // Folders structure
  folders: {
    projects: 'projects/',
    assets: 'assets/',
    deployments: 'deployments/',
    backups: 'backups/',
    temp: 'temp/',
    userFiles: 'user-files/',
    extensions: 'extensions/',
    media: 'media/',
  },
  
  // CloudFront CDN (optional)
  cdn: {
    enabled: process.env.CLOUDFRONT_ENABLED === 'true',
    domain: process.env.CLOUDFRONT_DOMAIN,
    distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
  },
};

// ============== RDS POSTGRESQL CONFIGURATION ==============

const rdsConfig = {
  // Connection
  host: process.env.RDS_HOSTNAME || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.RDS_PORT || process.env.DB_PORT || '5432'),
  database: process.env.RDS_DB_NAME || process.env.DB_NAME || 'ai_friend_zone',
  username: process.env.RDS_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.RDS_PASSWORD || process.env.DB_PASSWORD,
  
  // SSL Configuration (required for RDS)
  ssl: {
    enabled: process.env.RDS_SSL_ENABLED !== 'false',
    rejectUnauthorized: process.env.RDS_SSL_REJECT_UNAUTHORIZED !== 'false',
    ca: process.env.RDS_SSL_CA_PATH, // Path to RDS CA certificate
  },
  
  // Connection Pool
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000'),
  },
  
  // Instance settings
  instance: {
    class: process.env.RDS_INSTANCE_CLASS || 'db.t3.medium',
    multiAZ: process.env.RDS_MULTI_AZ === 'true',
    storageType: process.env.RDS_STORAGE_TYPE || 'gp3',
    allocatedStorage: parseInt(process.env.RDS_STORAGE_GB || '100'),
    maxAllocatedStorage: parseInt(process.env.RDS_MAX_STORAGE_GB || '500'),
  },
  
  // Backup settings
  backup: {
    retentionPeriod: parseInt(process.env.RDS_BACKUP_RETENTION || '7'),
    preferredWindow: process.env.RDS_BACKUP_WINDOW || '03:00-04:00',
    snapshotIdentifier: process.env.RDS_SNAPSHOT_ID,
  },
};

// Build DATABASE_URL for Prisma
const buildDatabaseUrl = () => {
  const { host, port, database, username, password, ssl } = rdsConfig;
  let url = `postgresql://${username}:${encodeURIComponent(password || '')}@${host}:${port}/${database}`;
  
  const params = [];
  if (ssl.enabled) {
    params.push('sslmode=require');
  }
  params.push('connection_limit=20');
  params.push('pool_timeout=30');
  
  if (params.length > 0) {
    url += '?' + params.join('&');
  }
  
  return url;
};

// ============== EC2 CONFIGURATION ==============

const ec2Config = {
  // Instance settings
  instanceType: process.env.EC2_INSTANCE_TYPE || 't3.medium',
  amiId: process.env.EC2_AMI_ID, // Amazon Linux 2023 or Ubuntu
  keyPairName: process.env.EC2_KEY_PAIR_NAME,
  
  // Networking
  vpcId: process.env.EC2_VPC_ID,
  subnetId: process.env.EC2_SUBNET_ID,
  securityGroupIds: (process.env.EC2_SECURITY_GROUP_IDS || '').split(',').filter(Boolean),
  
  // Auto Scaling
  autoScaling: {
    enabled: process.env.EC2_AUTO_SCALING === 'true',
    minInstances: parseInt(process.env.EC2_MIN_INSTANCES || '1'),
    maxInstances: parseInt(process.env.EC2_MAX_INSTANCES || '4'),
    desiredCapacity: parseInt(process.env.EC2_DESIRED_CAPACITY || '2'),
    targetCPUUtilization: parseInt(process.env.EC2_TARGET_CPU || '70'),
  },
  
  // Load Balancer
  loadBalancer: {
    enabled: process.env.ALB_ENABLED === 'true',
    arn: process.env.ALB_ARN,
    targetGroupArn: process.env.ALB_TARGET_GROUP_ARN,
    healthCheckPath: process.env.ALB_HEALTH_CHECK_PATH || '/health',
  },
  
  // Elastic IP
  elasticIp: process.env.EC2_ELASTIC_IP,
  
  // Tags
  tags: {
    Environment: process.env.NODE_ENV || 'development',
    Project: 'AI-Friend-Zone',
    ManagedBy: 'terraform',
  },
};

// ============== CLOUDWATCH CONFIGURATION ==============

const cloudWatchConfig = {
  enabled: process.env.CLOUDWATCH_ENABLED !== 'false',
  logGroupName: process.env.CLOUDWATCH_LOG_GROUP || '/ai-friend-zone/backend',
  logStreamPrefix: process.env.CLOUDWATCH_LOG_STREAM_PREFIX || 'server',
  retentionDays: parseInt(process.env.CLOUDWATCH_RETENTION_DAYS || '30'),
  
  // Metrics
  metrics: {
    namespace: 'AIFriendZone',
    enabled: process.env.CLOUDWATCH_METRICS_ENABLED !== 'false',
  },
  
  // Alarms
  alarms: {
    cpuThreshold: parseInt(process.env.ALARM_CPU_THRESHOLD || '80'),
    memoryThreshold: parseInt(process.env.ALARM_MEMORY_THRESHOLD || '80'),
    errorRateThreshold: parseInt(process.env.ALARM_ERROR_RATE || '5'),
    snsTopicArn: process.env.SNS_ALARM_TOPIC_ARN,
  },
};

// ============== SECRETS MANAGER ==============

const secretsConfig = {
  enabled: process.env.USE_SECRETS_MANAGER === 'true',
  secretId: process.env.SECRETS_MANAGER_ID || 'ai-friend-zone/production',
  region: process.env.SECRETS_MANAGER_REGION || process.env.AWS_REGION,
};

// ============== ELASTICACHE REDIS ==============

const redisConfig = {
  enabled: process.env.ELASTICACHE_ENABLED === 'true',
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true',
  
  // Cluster mode
  cluster: {
    enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
    nodes: (process.env.REDIS_CLUSTER_NODES || '').split(',').filter(Boolean),
  },
};

// ============== SQS QUEUE ==============

const sqsConfig = {
  enabled: process.env.SQS_ENABLED === 'true',
  queues: {
    deploy: process.env.SQS_DEPLOY_QUEUE_URL,
    email: process.env.SQS_EMAIL_QUEUE_URL,
    analytics: process.env.SQS_ANALYTICS_QUEUE_URL,
  },
  messageRetention: parseInt(process.env.SQS_MESSAGE_RETENTION || '345600'), // 4 days
  visibilityTimeout: parseInt(process.env.SQS_VISIBILITY_TIMEOUT || '300'), // 5 minutes
};

// ============== EXPORT ==============

module.exports = {
  aws: awsConfig,
  s3: s3Config,
  rds: rdsConfig,
  ec2: ec2Config,
  cloudWatch: cloudWatchConfig,
  secrets: secretsConfig,
  redis: redisConfig,
  sqs: sqsConfig,
  
  // Helper functions
  buildDatabaseUrl,
  
  // AWS SDK instances
  getS3Client: () => new AWS.S3({ region: s3Config.region }),
  getEC2Client: () => new AWS.EC2({ region: awsConfig.region }),
  getRDSClient: () => new AWS.RDS({ region: awsConfig.region }),
  getCloudWatchClient: () => new AWS.CloudWatch({ region: awsConfig.region }),
  getSecretsManagerClient: () => new AWS.SecretsManager({ region: secretsConfig.region }),
  getSQSClient: () => new AWS.SQS({ region: awsConfig.region }),
};
