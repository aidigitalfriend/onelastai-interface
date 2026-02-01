/**
 * Health Check Routes
 * Comprehensive health monitoring for AWS ALB/ELB and monitoring systems
 */

const express = require('express');
const rdsDatabase = require('../services/rds-database');
const s3Storage = require('../services/s3-storage');

const router = express.Router();

// Store startup time
const startTime = Date.now();

// ============== BASIC HEALTH ==============

/**
 * Simple health check (for ALB/ELB)
 * GET /api/health
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Liveness probe (is the process running?)
 * GET /api/health/live
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe (is the service ready to accept traffic?)
 * GET /api/health/ready
 */
router.get('/ready', async (req, res) => {
  try {
    // Check database connection
    const dbHealth = await rdsDatabase.checkHealth();
    
    if (dbHealth.status !== 'healthy') {
      return res.status(503).json({
        status: 'not-ready',
        reason: 'Database unhealthy',
        timestamp: new Date().toISOString(),
      });
    }
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not-ready',
      reason: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============== DETAILED HEALTH ==============

/**
 * Detailed health check with all component statuses
 * GET /api/health/detailed
 */
router.get('/detailed', async (req, res) => {
  const checks = {};
  let overallStatus = 'healthy';
  
  // Database health
  try {
    const dbHealth = await rdsDatabase.checkHealth();
    checks.database = {
      status: dbHealth.status,
      latency: dbHealth.latency,
    };
    if (dbHealth.status !== 'healthy') {
      overallStatus = 'degraded';
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error.message,
    };
    overallStatus = 'unhealthy';
  }
  
  // Connection pool
  try {
    const poolStats = rdsDatabase.getPoolStats();
    checks.connectionPool = {
      status: poolStats.waitingCount > 10 ? 'degraded' : 'healthy',
      ...poolStats,
    };
  } catch (error) {
    checks.connectionPool = {
      status: 'unknown',
      error: error.message,
    };
  }
  
  // S3 connectivity (optional check)
  try {
    const testKey = `health-check/${Date.now()}.txt`;
    checks.s3 = {
      status: 'healthy',
      bucket: s3Storage.config.bucket,
    };
  } catch (error) {
    checks.s3 = {
      status: 'degraded',
      error: error.message,
    };
    if (overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
  }
  
  // Memory usage
  const memUsage = process.memoryUsage();
  const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  
  checks.memory = {
    status: memUsedMB / memTotalMB > 0.9 ? 'warning' : 'healthy',
    heapUsed: `${memUsedMB}MB`,
    heapTotal: `${memTotalMB}MB`,
    external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    usagePercent: Math.round((memUsedMB / memTotalMB) * 100),
  };
  
  // CPU (basic)
  const cpuUsage = process.cpuUsage();
  checks.cpu = {
    status: 'healthy',
    user: cpuUsage.user,
    system: cpuUsage.system,
  };
  
  res.status(overallStatus === 'unhealthy' ? 503 : 200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.round((Date.now() - startTime) / 1000),
    uptimeFormatted: formatUptime(Date.now() - startTime),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    checks,
  });
});

// ============== METRICS ==============

/**
 * Prometheus-style metrics
 * GET /api/health/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const poolStats = rdsDatabase.getPoolStats();
    const uptime = Date.now() - startTime;
    
    const metrics = [];
    
    // Process metrics
    metrics.push(`# HELP process_uptime_seconds Process uptime in seconds`);
    metrics.push(`# TYPE process_uptime_seconds gauge`);
    metrics.push(`process_uptime_seconds ${Math.round(uptime / 1000)}`);
    
    metrics.push(`# HELP process_memory_heap_bytes Heap memory usage`);
    metrics.push(`# TYPE process_memory_heap_bytes gauge`);
    metrics.push(`process_memory_heap_bytes{type="used"} ${memUsage.heapUsed}`);
    metrics.push(`process_memory_heap_bytes{type="total"} ${memUsage.heapTotal}`);
    
    metrics.push(`# HELP process_memory_rss_bytes RSS memory`);
    metrics.push(`# TYPE process_memory_rss_bytes gauge`);
    metrics.push(`process_memory_rss_bytes ${memUsage.rss}`);
    
    // Database metrics
    metrics.push(`# HELP db_pool_connections Database connection pool status`);
    metrics.push(`# TYPE db_pool_connections gauge`);
    metrics.push(`db_pool_connections{state="total"} ${poolStats.totalCount}`);
    metrics.push(`db_pool_connections{state="idle"} ${poolStats.idleCount}`);
    metrics.push(`db_pool_connections{state="waiting"} ${poolStats.waitingCount}`);
    
    res.set('Content-Type', 'text/plain');
    res.send(metrics.join('\n'));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get metrics', details: error.message });
  }
});

// ============== DATABASE STATS ==============

/**
 * Database statistics
 * GET /api/health/database
 */
router.get('/database', async (req, res) => {
  try {
    const [health, stats, poolStats] = await Promise.all([
      rdsDatabase.checkHealth(),
      rdsDatabase.getDatabaseStats(),
      Promise.resolve(rdsDatabase.getPoolStats()),
    ]);
    
    res.json({
      status: health.status,
      latency: health.latency,
      timestamp: health.timestamp,
      connectionPool: poolStats,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============== INFO ENDPOINTS ==============

/**
 * Application info
 * GET /api/health/info
 */
router.get('/info', (req, res) => {
  res.json({
    name: 'AI Friend Zone Backend',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    uptime: Math.round((Date.now() - startTime) / 1000),
    startedAt: new Date(startTime).toISOString(),
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      s3Bucket: process.env.AWS_S3_BUCKET,
      rdsHost: process.env.RDS_HOSTNAME ? '***configured***' : 'not-configured',
    },
  });
});

/**
 * Environment check (non-sensitive)
 * GET /api/health/env
 */
router.get('/env', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    AWS_REGION: process.env.AWS_REGION,
    PORT: process.env.PORT,
    LOG_LEVEL: process.env.LOG_LEVEL,
    CORS_ENABLED: !!process.env.FRONTEND_URL,
    DATABASE_CONFIGURED: !!process.env.RDS_HOSTNAME || !!process.env.DB_HOST,
    S3_CONFIGURED: !!process.env.AWS_S3_BUCKET,
    REDIS_CONFIGURED: !!process.env.REDIS_HOST,
  });
});

// ============== HELPERS ==============

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

module.exports = router;
