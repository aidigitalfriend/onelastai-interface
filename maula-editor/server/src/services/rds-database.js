/**
 * PostgreSQL RDS Database Service
 * Handles database connections, queries, and management for AWS RDS
 */

const { Pool, Client } = require('pg');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

// ============== CONFIGURATION ==============

const config = {
  host: process.env.RDS_HOSTNAME || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.RDS_PORT || process.env.DB_PORT || '5432'),
  database: process.env.RDS_DB_NAME || process.env.DB_NAME || 'ai_friend_zone',
  user: process.env.RDS_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.RDS_PASSWORD || process.env.DB_PASSWORD,
  
  // SSL for RDS (required in production)
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: process.env.RDS_CA_CERT,
  } : false,
  
  // Connection pool settings
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000'),
  
  // Statement timeout
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
};

// ============== CONNECTION POOL ==============

let pool = null;
let prisma = null;

/**
 * Initialize database connection pool
 */
const initializePool = () => {
  if (pool) return pool;
  
  pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl,
    max: config.max,
    min: config.min,
    idleTimeoutMillis: config.idleTimeoutMillis,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
  });
  
  // Pool error handling
  pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
  });
  
  pool.on('connect', (client) => {
    client.query(`SET statement_timeout = '${config.statement_timeout}'`);
    console.log('New client connected to PostgreSQL');
  });
  
  pool.on('remove', () => {
    console.log('Client removed from pool');
  });
  
  return pool;
};

/**
 * Initialize Prisma client
 */
const initializePrisma = () => {
  if (prisma) return prisma;
  
  const databaseUrl = buildDatabaseUrl();
  
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  });
  
  return prisma;
};

/**
 * Build DATABASE_URL for Prisma
 */
const buildDatabaseUrl = () => {
  const { host, port, database, user, password, ssl } = config;
  let url = `postgresql://${user}:${encodeURIComponent(password || '')}@${host}:${port}/${database}`;
  
  const params = [];
  if (ssl) {
    params.push('sslmode=require');
  }
  params.push(`connection_limit=${config.max}`);
  params.push(`pool_timeout=30`);
  
  if (params.length > 0) {
    url += '?' + params.join('&');
  }
  
  return url;
};

// ============== QUERY FUNCTIONS ==============

/**
 * Execute a query
 */
const query = async (text, params = []) => {
  const pool = initializePool();
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
};

/**
 * Execute a query and return single row
 */
const queryOne = async (text, params = []) => {
  const result = await query(text, params);
  return result.rows[0] || null;
};

/**
 * Execute a query and return all rows
 */
const queryAll = async (text, params = []) => {
  const result = await query(text, params);
  return result.rows;
};

/**
 * Execute query in transaction
 */
const transaction = async (callback) => {
  const pool = initializePool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============== USER OPERATIONS ==============

const UserService = {
  /**
   * Create user
   */
  async create(data) {
    const { email, password, name, avatar, plan = 'FREE' } = data;
    const id = crypto.randomUUID();
    const now = new Date();
    
    const result = await query(
      `INSERT INTO "User" (id, email, password, name, avatar, plan, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, email, password, name, avatar, plan, now, now]
    );
    
    return result.rows[0];
  },
  
  /**
   * Find user by ID
   */
  async findById(id) {
    return queryOne('SELECT * FROM "User" WHERE id = $1', [id]);
  },
  
  /**
   * Find user by email
   */
  async findByEmail(email) {
    return queryOne('SELECT * FROM "User" WHERE email = $1', [email]);
  },
  
  /**
   * Update user
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`"${key}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    fields.push(`"updatedAt" = $${paramIndex}`);
    values.push(new Date());
    values.push(id);
    
    const result = await query(
      `UPDATE "User" SET ${fields.join(', ')} WHERE id = $${paramIndex + 1} RETURNING *`,
      values
    );
    
    return result.rows[0];
  },
  
  /**
   * Delete user
   */
  async delete(id) {
    await query('DELETE FROM "User" WHERE id = $1', [id]);
    return true;
  },
  
  /**
   * List users with pagination
   */
  async list(options = {}) {
    const { page = 1, limit = 20, orderBy = 'createdAt', order = 'DESC' } = options;
    const offset = (page - 1) * limit;
    
    const [rows, countResult] = await Promise.all([
      queryAll(
        `SELECT * FROM "User" ORDER BY "${orderBy}" ${order} LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      queryOne('SELECT COUNT(*) as count FROM "User"'),
    ]);
    
    return {
      users: rows,
      total: parseInt(countResult.count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.count) / limit),
    };
  },
};

// ============== PROJECT OPERATIONS ==============

const ProjectService = {
  /**
   * Create project
   */
  async create(data) {
    const { name, description, userId, template, framework, isPublic = false } = data;
    const id = crypto.randomUUID();
    const now = new Date();
    
    const result = await query(
      `INSERT INTO "Project" (id, name, description, "userId", template, framework, "isPublic", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, name, description, userId, template, framework, isPublic, now, now]
    );
    
    return result.rows[0];
  },
  
  /**
   * Find project by ID
   */
  async findById(id) {
    return queryOne('SELECT * FROM "Project" WHERE id = $1', [id]);
  },
  
  /**
   * Find projects by user
   */
  async findByUserId(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    
    return queryAll(
      `SELECT * FROM "Project" WHERE "userId" = $1 
       ORDER BY "updatedAt" DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  },
  
  /**
   * Update project
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && key !== 'id' && key !== 'userId') {
        fields.push(`"${key}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    fields.push(`"updatedAt" = $${paramIndex}`);
    values.push(new Date());
    values.push(id);
    
    const result = await query(
      `UPDATE "Project" SET ${fields.join(', ')} WHERE id = $${paramIndex + 1} RETURNING *`,
      values
    );
    
    return result.rows[0];
  },
  
  /**
   * Delete project
   */
  async delete(id) {
    await query('DELETE FROM "Project" WHERE id = $1', [id]);
    return true;
  },
  
  /**
   * Search projects
   */
  async search(searchTerm, options = {}) {
    const { page = 1, limit = 20, userId = null } = options;
    const offset = (page - 1) * limit;
    
    let whereClause = `(name ILIKE $1 OR description ILIKE $1)`;
    const params = [`%${searchTerm}%`, limit, offset];
    
    if (userId) {
      whereClause += ` AND ("userId" = $4 OR "isPublic" = true)`;
      params.push(userId);
    } else {
      whereClause += ` AND "isPublic" = true`;
    }
    
    return queryAll(
      `SELECT * FROM "Project" WHERE ${whereClause}
       ORDER BY "updatedAt" DESC LIMIT $2 OFFSET $3`,
      params
    );
  },
};

// ============== FILE OPERATIONS ==============

const FileService = {
  /**
   * Create file record
   */
  async create(data) {
    const { name, path, projectId, content, size, mimeType } = data;
    const id = crypto.randomUUID();
    const now = new Date();
    
    const result = await query(
      `INSERT INTO "File" (id, name, path, "projectId", content, size, "mimeType", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, name, path, projectId, content, size, mimeType, now, now]
    );
    
    return result.rows[0];
  },
  
  /**
   * Find file by ID
   */
  async findById(id) {
    return queryOne('SELECT * FROM "File" WHERE id = $1', [id]);
  },
  
  /**
   * Find files by project
   */
  async findByProjectId(projectId) {
    return queryAll(
      'SELECT * FROM "File" WHERE "projectId" = $1 ORDER BY path',
      [projectId]
    );
  },
  
  /**
   * Update file
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && key !== 'id' && key !== 'projectId') {
        fields.push(`"${key}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    fields.push(`"updatedAt" = $${paramIndex}`);
    values.push(new Date());
    values.push(id);
    
    const result = await query(
      `UPDATE "File" SET ${fields.join(', ')} WHERE id = $${paramIndex + 1} RETURNING *`,
      values
    );
    
    return result.rows[0];
  },
  
  /**
   * Delete file
   */
  async delete(id) {
    await query('DELETE FROM "File" WHERE id = $1', [id]);
    return true;
  },
  
  /**
   * Bulk upsert files
   */
  async bulkUpsert(projectId, files) {
    return transaction(async (client) => {
      const results = [];
      
      for (const file of files) {
        const existingFile = await client.query(
          'SELECT id FROM "File" WHERE "projectId" = $1 AND path = $2',
          [projectId, file.path]
        );
        
        const now = new Date();
        
        if (existingFile.rows.length > 0) {
          // Update
          const result = await client.query(
            `UPDATE "File" SET content = $1, size = $2, "mimeType" = $3, "updatedAt" = $4
             WHERE id = $5 RETURNING *`,
            [file.content, file.size, file.mimeType, now, existingFile.rows[0].id]
          );
          results.push(result.rows[0]);
        } else {
          // Insert
          const id = crypto.randomUUID();
          const result = await client.query(
            `INSERT INTO "File" (id, name, path, "projectId", content, size, "mimeType", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [id, file.name, file.path, projectId, file.content, file.size, file.mimeType, now, now]
          );
          results.push(result.rows[0]);
        }
      }
      
      return results;
    });
  },
};

// ============== SESSION OPERATIONS ==============

const SessionService = {
  /**
   * Create session
   */
  async create(userId, expiresIn = 7 * 24 * 60 * 60 * 1000) { // 7 days default
    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresIn);
    const now = new Date();
    
    const result = await query(
      `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, token, userId, expiresAt, now]
    );
    
    return result.rows[0];
  },
  
  /**
   * Find session by token
   */
  async findByToken(token) {
    const session = await queryOne(
      `SELECT s.*, u.* FROM "Session" s
       JOIN "User" u ON s."userId" = u.id
       WHERE s.token = $1 AND s."expiresAt" > NOW()`,
      [token]
    );
    
    return session;
  },
  
  /**
   * Delete session
   */
  async delete(token) {
    await query('DELETE FROM "Session" WHERE token = $1', [token]);
    return true;
  },
  
  /**
   * Delete all user sessions
   */
  async deleteAllForUser(userId) {
    await query('DELETE FROM "Session" WHERE "userId" = $1', [userId]);
    return true;
  },
  
  /**
   * Cleanup expired sessions
   */
  async cleanupExpired() {
    const result = await query('DELETE FROM "Session" WHERE "expiresAt" < NOW()');
    return result.rowCount;
  },
};

// ============== DEPLOYMENT OPERATIONS ==============

const DeploymentService = {
  /**
   * Create deployment
   */
  async create(data) {
    const { 
      projectId, userId, provider, status = 'PENDING',
      url, buildLogs, environment = 'production'
    } = data;
    const id = crypto.randomUUID();
    const now = new Date();
    
    const result = await query(
      `INSERT INTO "Deployment" (id, "projectId", "userId", provider, status, url, "buildLogs", environment, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, projectId, userId, provider, status, url, buildLogs, environment, now, now]
    );
    
    return result.rows[0];
  },
  
  /**
   * Update deployment status
   */
  async updateStatus(id, status, data = {}) {
    const fields = ['status = $1', '"updatedAt" = $2'];
    const values = [status, new Date()];
    let paramIndex = 3;
    
    if (data.url) {
      fields.push(`url = $${paramIndex++}`);
      values.push(data.url);
    }
    if (data.buildLogs) {
      fields.push(`"buildLogs" = $${paramIndex++}`);
      values.push(data.buildLogs);
    }
    if (data.errorMessage) {
      fields.push(`"errorMessage" = $${paramIndex++}`);
      values.push(data.errorMessage);
    }
    
    values.push(id);
    
    const result = await query(
      `UPDATE "Deployment" SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    return result.rows[0];
  },
  
  /**
   * Find deployments by project
   */
  async findByProjectId(projectId, limit = 10) {
    return queryAll(
      `SELECT * FROM "Deployment" WHERE "projectId" = $1 
       ORDER BY "createdAt" DESC LIMIT $2`,
      [projectId, limit]
    );
  },
  
  /**
   * Find deployments by user
   */
  async findByUserId(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    
    return queryAll(
      `SELECT d.*, p.name as "projectName" FROM "Deployment" d
       JOIN "Project" p ON d."projectId" = p.id
       WHERE d."userId" = $1
       ORDER BY d."createdAt" DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  },
};

// ============== HEALTH & METRICS ==============

/**
 * Check database health
 */
const checkHealth = async () => {
  try {
    const start = Date.now();
    const result = await queryOne('SELECT 1 as health');
    const latency = Date.now() - start;
    
    return {
      status: 'healthy',
      latency,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Get connection pool stats
 */
const getPoolStats = () => {
  const pool = initializePool();
  
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
};

/**
 * Get database stats
 */
const getDatabaseStats = async () => {
  const stats = await queryOne(`
    SELECT 
      pg_database_size(current_database()) as database_size,
      (SELECT count(*) FROM "User") as users_count,
      (SELECT count(*) FROM "Project") as projects_count,
      (SELECT count(*) FROM "File") as files_count,
      (SELECT count(*) FROM "Deployment") as deployments_count,
      (SELECT count(*) FROM "Session") as active_sessions
  `);
  
  return {
    databaseSize: parseInt(stats.database_size),
    databaseSizeFormatted: formatBytes(parseInt(stats.database_size)),
    usersCount: parseInt(stats.users_count),
    projectsCount: parseInt(stats.projects_count),
    filesCount: parseInt(stats.files_count),
    deploymentsCount: parseInt(stats.deployments_count),
    activeSessions: parseInt(stats.active_sessions),
  };
};

/**
 * Format bytes to human readable
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ============== MIGRATIONS ==============

/**
 * Run migrations
 */
const runMigrations = async () => {
  const pool = initializePool();
  const client = await pool.connect();
  
  try {
    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_migrations" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check which migrations have been run
    const executed = await client.query('SELECT name FROM "_migrations"');
    const executedNames = new Set(executed.rows.map(r => r.name));
    
    // Define migrations
    const migrations = [
      {
        name: '001_create_extensions',
        sql: `
          CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
          CREATE EXTENSION IF NOT EXISTS "pg_trgm";
        `,
      },
      {
        name: '002_create_users',
        sql: `
          CREATE TABLE IF NOT EXISTS "User" (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            avatar TEXT,
            plan VARCHAR(50) DEFAULT 'FREE',
            "stripeId" VARCHAR(255) UNIQUE,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
        `,
      },
      {
        name: '003_create_projects',
        sql: `
          CREATE TABLE IF NOT EXISTS "Project" (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            "userId" UUID REFERENCES "User"(id) ON DELETE CASCADE,
            template VARCHAR(100),
            framework VARCHAR(100),
            "isPublic" BOOLEAN DEFAULT false,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_project_user ON "Project"("userId");
        `,
      },
      {
        name: '004_create_files',
        sql: `
          CREATE TABLE IF NOT EXISTS "File" (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            path TEXT NOT NULL,
            "projectId" UUID REFERENCES "Project"(id) ON DELETE CASCADE,
            content TEXT,
            size INTEGER,
            "mimeType" VARCHAR(100),
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_file_project ON "File"("projectId");
          CREATE INDEX IF NOT EXISTS idx_file_path ON "File"("projectId", path);
        `,
      },
      {
        name: '005_create_sessions',
        sql: `
          CREATE TABLE IF NOT EXISTS "Session" (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            token VARCHAR(255) UNIQUE NOT NULL,
            "userId" UUID REFERENCES "User"(id) ON DELETE CASCADE,
            "expiresAt" TIMESTAMP NOT NULL,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_session_token ON "Session"(token);
          CREATE INDEX IF NOT EXISTS idx_session_user ON "Session"("userId");
        `,
      },
      {
        name: '006_create_deployments',
        sql: `
          CREATE TABLE IF NOT EXISTS "Deployment" (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            "projectId" UUID REFERENCES "Project"(id) ON DELETE CASCADE,
            "userId" UUID REFERENCES "User"(id) ON DELETE CASCADE,
            provider VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'PENDING',
            url TEXT,
            "buildLogs" TEXT,
            "errorMessage" TEXT,
            environment VARCHAR(50) DEFAULT 'production',
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_deployment_project ON "Deployment"("projectId");
          CREATE INDEX IF NOT EXISTS idx_deployment_user ON "Deployment"("userId");
        `,
      },
    ];
    
    // Run pending migrations
    for (const migration of migrations) {
      if (!executedNames.has(migration.name)) {
        console.log(`Running migration: ${migration.name}`);
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO "_migrations" (name) VALUES ($1)',
          [migration.name]
        );
        console.log(`Migration ${migration.name} completed`);
      }
    }
    
    console.log('All migrations completed');
  } finally {
    client.release();
  }
};

// ============== CLEANUP ==============

/**
 * Close all connections
 */
const closeConnections = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
  console.log('Database connections closed');
};

// ============== EXPORT ==============

module.exports = {
  // Config
  config,
  buildDatabaseUrl,
  
  // Initialization
  initializePool,
  initializePrisma,
  
  // Query
  query,
  queryOne,
  queryAll,
  transaction,
  
  // Services
  UserService,
  ProjectService,
  FileService,
  SessionService,
  DeploymentService,
  
  // Health & Metrics
  checkHealth,
  getPoolStats,
  getDatabaseStats,
  
  // Migrations
  runMigrations,
  
  // Cleanup
  closeConnections,
  
  // Helpers
  formatBytes,
};
