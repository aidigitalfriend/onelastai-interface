/**
 * GenCraft Pro — Backend API Server
 * 
 * Express server that mounts all API routes for Phases 2-7:
 *   - /api/sandbox     — Sandbox management
 *   - /api/build       — Build pipeline
 *   - /api/deploy      — Deployment management
 *   - /api/project     — Project CRUD + Git + DB
 *   - /api/assets      — Asset pipeline
 *   - /api/monitoring  — Monitoring & alerts
 * 
 * Existing routes (in Next.js frontend):
 *   - /api/canvas/*    — AI generation, chat, apps, billing
 *   - /api/auth/*      — Authentication
 */

require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const { connectDB, disconnectDB, checkDBHealth } = require('./lib/db');
const { connectRedis, disconnectRedis } = require('./lib/redis');
const { sessionAuth } = require('./middleware/session-auth');
const { attachWebSocketServer } = require('./ws-server');

const app = express();
const server = http.createServer(app);
const PORT = process.env.BACKEND_PORT || 4000;

// ──────── MIDDLEWARE ────────

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: [
    'https://maula.ai',
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(morgan('short'));

// ──────── AUTH MIDDLEWARE ────────
// Real session verification against DB + Redis cache
app.use(sessionAuth);

// ──────── RATE LIMITING ────────
const { generalLimiter, aiLimiter, uploadLimiter, buildLimiter } = require('./middleware/rate-limiter');

// ──────── API ROUTES ────────

const sandboxRoutes = require('./routes/sandbox');
const buildRoutes = require('./routes/build');
const deployRoutes = require('./routes/deploy');
const projectRoutes = require('./routes/project');
const assetsRoutes = require('./routes/assets');
const monitoringRoutes = require('./routes/monitoring');
const aiRoutes = require('./routes/ai');
const databaseRoutes = require('./routes/database');

app.use('/api/sandbox', generalLimiter, sandboxRoutes);
app.use('/api/build', buildLimiter, buildRoutes);
app.use('/api/deploy', buildLimiter, deployRoutes);
app.use('/api/project', generalLimiter, projectRoutes);
app.use('/api/assets', uploadLimiter, assetsRoutes);
app.use('/api/monitoring', generalLimiter, monitoringRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/database', generalLimiter, databaseRoutes);

// ──────── HEALTH CHECK ────────

app.get('/health', async (req, res) => {
  const dbHealth = await checkDBHealth();
  res.json({
    status: dbHealth.status === 'healthy' ? 'ok' : 'degraded',
    service: 'gencraft-backend',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: dbHealth,
  });
});

// ──────── API DOCS (Dev only) ────────

app.get('/api', (req, res) => {
  res.json({
    name: 'GenCraft Pro API',
    version: '2.0.0',
    endpoints: {
      sandbox: {
        'POST /api/sandbox': 'Create sandbox',
        'GET /api/sandbox': 'List user sandboxes',
        'GET /api/sandbox/:id': 'Sandbox status',
        'DELETE /api/sandbox/:id': 'Destroy sandbox',
        'POST /api/sandbox/:id/exec': 'Execute command',
        'GET /api/sandbox/:id/logs': 'Stream logs (SSE)',
        'GET /api/sandbox/templates': 'List templates',
      },
      build: {
        'POST /api/build': 'Trigger build',
        'GET /api/build?projectId=': 'List builds',
        'GET /api/build/:id': 'Build status',
        'DELETE /api/build/:id': 'Cancel build',
        'GET /api/build/:id/logs': 'Build logs (SSE/JSON)',
        'GET /api/build/config?sandboxId=': 'Detect build config',
      },
      deploy: {
        'POST /api/deploy': 'Deploy project',
        'GET /api/deploy?projectId=': 'List deployments',
        'GET /api/deploy/:id': 'Deployment status',
        'DELETE /api/deploy/:id': 'Remove deployment',
        'POST /api/deploy/:id/rollback': 'Rollback',
        'GET /api/deploy/domains': 'List domains',
        'POST /api/deploy/domains': 'Add domain',
        'POST /api/deploy/domains/:id/verify': 'Verify domain',
        'DELETE /api/deploy/domains/:id': 'Remove domain',
      },
      project: {
        'POST /api/project': 'Create project',
        'GET /api/project': 'List projects',
        'GET /api/project/:id': 'Get project',
        'PUT /api/project/:id': 'Update project',
        'DELETE /api/project/:id': 'Delete project',
        'GET /api/project/:id/files': 'List files',
        'POST /api/project/:id/files': 'Create/update file',
        'GET /api/project/:id/env': 'Get env vars',
        'PUT /api/project/:id/env': 'Update env vars',
        'GET /api/project/:id/git': 'Git status',
        'POST /api/project/:id/git/commit': 'Commit',
        'GET /api/project/:id/git/branches': 'List branches',
        'POST /api/project/:id/git/push': 'Push',
        'POST /api/project/:id/git/pull': 'Pull',
      },
      assets: {
        'POST /api/assets/upload': 'Upload asset',
        'GET /api/assets': 'List assets',
        'GET /api/assets/:id': 'Get asset',
        'DELETE /api/assets/:id': 'Delete asset',
        'POST /api/assets/optimize': 'Optimize asset',
      },
      monitoring: {
        'GET /api/monitoring': 'Dashboard metrics',
        'GET /api/monitoring/logs': 'App logs (SSE/JSON)',
        'GET /api/monitoring/errors': 'Error tracking',
        'GET /api/monitoring/alerts': 'List alerts',
        'POST /api/monitoring/alerts': 'Create alert',
        'PUT /api/monitoring/alerts/:id': 'Update alert',
        'DELETE /api/monitoring/alerts/:id': 'Delete alert',
      },
      ai: {
        'POST /api/ai/session': 'Create AI session',
        'POST /api/ai/session/:id/chat': 'Chat with agent',
        'POST /api/ai/session/:id/apply': 'Apply code changes',
        'DELETE /api/ai/session/:id': 'End session',
        'GET /api/ai/sessions': 'List sessions',
        'GET /api/ai/usage': 'Usage stats',
      },
      database: {
        'POST /api/database': 'Provision database',
        'GET /api/database': 'List databases',
        'GET /api/database/:id': 'Database info',
        'DELETE /api/database/:id': 'Delete database',
        'POST /api/database/:id/backup': 'Create backup',
        'GET /api/database/:id/backups': 'List backups',
        'POST /api/database/:id/migrate': 'Run migrations',
        'GET /api/database/engines': 'Available engines',
      },
    },
  });
});

// ──────── ERROR HANDLER ────────

app.use((err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ──────── 404 HANDLER ────────

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
  });
});

// ──────── STARTUP ────────

async function start() {
  try {
    // Connect database
    const db = await connectDB();
    if (db) {
      console.log('✅ Database connected');
    } else {
      console.warn('⚠️  Database unavailable — running with limited functionality');
    }

    // Connect Redis
    await connectRedis();

    // Initialize services
    const { sandboxManager } = require('./services/sandbox/sandbox-manager');
    const { initializeNetwork } = require('./services/sandbox/sandbox-network');
    const { buildOrchestrator } = require('./services/build/build-orchestrator');
    const { initCache } = require('./services/build/build-cache');

    // Initialize sandbox network (Docker)
    try {
      await initializeNetwork();
      await sandboxManager.initialize();
      console.log('✅ Sandbox manager initialized');
    } catch (err) {
      console.warn(`⚠️  Sandbox manager unavailable: ${err.message}`);
      console.warn('   Docker may not be running. Sandbox features disabled.');
    }

    // Initialize build pipeline
    buildOrchestrator.initialize();
    await initCache();
    console.log('✅ Build orchestrator initialized');

    // Attach WebSocket server for terminal connections
    attachWebSocketServer(server);

    // Start server
    server.listen(PORT, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════╗');
      console.log('║       GenCraft Pro — Backend API Server      ║');
      console.log('╠══════════════════════════════════════════════╣');
      console.log(`║  🌐 http://localhost:${PORT}                    ║`);
      console.log(`║  📋 http://localhost:${PORT}/api                ║`);
      console.log(`║  💚 http://localhost:${PORT}/health             ║`);
      console.log(`║  🔌 ws://localhost:${PORT} (terminal)          ║`);
      console.log('╚══════════════════════════════════════════════╝');
      console.log('');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('\n[Server] SIGTERM received — shutting down...');
      server.close();
      await sandboxManager.shutdown();
      buildOrchestrator.shutdown();
      await disconnectDB();
      await disconnectRedis();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('\n[Server] SIGINT received — shutting down...');
      server.close();
      await sandboxManager.shutdown();
      buildOrchestrator.shutdown();
      await disconnectDB();
      await disconnectRedis();
      process.exit(0);
    });

  } catch (err) {
    console.error('[Server] Fatal error during startup:', err);
    process.exit(1);
  }
}

// Run
start();

module.exports = { app, server };
