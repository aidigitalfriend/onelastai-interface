/**
 * AWS EC2 Backend Server Entry Point
 * Production-ready Express server for AWS deployment
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server: SocketIO } = require('socket.io');
const morgan = require('morgan');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Import AWS services
const awsConfig = require('./config/aws.config');
const s3Storage = require('./services/s3-storage');
const rdsDatabase = require('./services/rds-database');

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const fileRoutes = require('./routes/files');
const aiRoutes = require('./routes/ai');
const deployRoutes = require('./routes/deploy');
const storageRoutes = require('./routes/storage');
const healthRoutes = require('./routes/health');

// ============== APP INITIALIZATION ==============

const app = express();
const httpServer = createServer(app);

// Trust proxy (for AWS ALB/ELB)
app.set('trust proxy', true);

// ============== CORS CONFIGURATION ==============

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://maula.dev',
  'https://app.maula.dev',
  'https://www.maula.dev',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Allow if in whitelist or matches pattern
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.maula.dev') ||
      origin.endsWith('.amazonaws.com')
    ) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
};

// ============== SOCKET.IO ==============

const io = new SocketIO(httpServer, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  socket.on('join:room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });
  
  socket.on('leave:room', (room) => {
    socket.leave(room);
    console.log(`Socket ${socket.id} left room: ${room}`);
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// ============== MIDDLEWARE ==============

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Customize as needed
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors(corsOptions));

// Compression
app.use(compression({
  threshold: 1024,
  level: 6,
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Request ID middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'],
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  message: { error: 'Too many login attempts, please try again later.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ============== HEALTH CHECKS ==============

// ALB/ELB Health Check (simple)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
  try {
    const [dbHealth, poolStats] = await Promise.all([
      rdsDatabase.checkHealth(),
      Promise.resolve(rdsDatabase.getPoolStats()),
    ]);
    
    res.json({
      status: dbHealth.status === 'healthy' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbHealth,
      connectionPool: poolStats,
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Readiness probe (for k8s/ECS)
app.get('/ready', async (req, res) => {
  try {
    await rdsDatabase.checkHealth();
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

// ============== API ROUTES ==============

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/deploy', deployRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/health', healthRoutes);

// ============== STATIC FILES (Production) ==============

if (process.env.NODE_ENV === 'production') {
  const staticPath = process.env.STATIC_PATH || path.join(__dirname, '../../dist');
  app.use(express.static(staticPath));
  
  // SPA fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// ============== ERROR HANDLING ==============

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`Error [${req.id}]:`, err);
  
  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS not allowed' });
  }
  
  // Validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.details,
    });
  }
  
  // Database error
  if (err.code && err.code.startsWith('23')) {
    return res.status(400).json({
      error: 'Database constraint error',
      code: err.code,
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    requestId: req.id,
  });
});

// ============== GRACEFUL SHUTDOWN ==============

const shutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Graceful shutdown...`);
  
  // Stop accepting new connections
  httpServer.close(async () => {
    console.log('HTTP server closed');
    
    // Close database connections
    await rdsDatabase.closeConnections();
    console.log('Database connections closed');
    
    // Close Socket.IO
    io.close(() => {
      console.log('Socket.IO closed');
    });
    
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ============== SERVER START ==============

const PORT = parseInt(process.env.PORT || '4000');
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  try {
    // Initialize database
    console.log('Initializing database connection...');
    rdsDatabase.initializePool();
    
    // Run migrations in development
    if (process.env.RUN_MIGRATIONS === 'true') {
      console.log('Running database migrations...');
      await rdsDatabase.runMigrations();
    }
    
    // Start server
    httpServer.listen(PORT, HOST, () => {
      console.log('================================================');
      console.log('🚀 AI Friend Zone Backend Server');
      console.log('================================================');
      console.log(`📡 Server running on http://${HOST}:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔌 WebSocket ready for connections`);
      console.log(`🗄️  Database: ${awsConfig.rds.host}:${awsConfig.rds.port}`);
      console.log(`📦 S3 Bucket: ${awsConfig.s3.bucket}`);
      console.log(`☁️  AWS Region: ${awsConfig.aws.region}`);
      console.log('================================================');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Export for testing
module.exports = { app, io, httpServer };
