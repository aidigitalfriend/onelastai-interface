/**
 * GenCraft Pro — Database Provisioner
 * Phase 5: Managed Database
 * 
 * Provisions PostgreSQL/MySQL/SQLite databases for user projects.
 * Manages credentials, connection strings, and lifecycle.
 */

const crypto = require('crypto');

class DatabaseProvisioner {
  constructor() {
    // In-memory database registry (production: managed DB service + Kubernetes)
    this.databases = new Map();
    
    this.supportedEngines = {
      postgresql: {
        name: 'PostgreSQL',
        defaultVersion: '16',
        versions: ['14', '15', '16'],
        defaultPort: 5432,
        image: 'postgres',
      },
      mysql: {
        name: 'MySQL',
        defaultVersion: '8.0',
        versions: ['5.7', '8.0'],
        defaultPort: 3306,
        image: 'mysql',
      },
      sqlite: {
        name: 'SQLite',
        defaultVersion: '3',
        versions: ['3'],
        defaultPort: null,
        image: null, // File-based, no container needed
      },
    };

    // Plan limits
    this.planLimits = {
      weekly: {
        maxDatabases: 1,
        maxSizeMB: 100,
        engines: ['sqlite'],
        backups: false,
        readReplicas: 0,
      },
      monthly: {
        maxDatabases: 3,
        maxSizeMB: 1024,         // 1 GB
        engines: ['sqlite', 'postgresql'],
        backups: true,
        readReplicas: 0,
      },
      yearly: {
        maxDatabases: 10,
        maxSizeMB: 10240,        // 10 GB
        engines: ['sqlite', 'postgresql', 'mysql'],
        backups: true,
        readReplicas: 2,
      },
    };
  }

  /**
   * Provision a new database for a project
   */
  async provision(projectId, options = {}) {
    const {
      engine = 'postgresql',
      version = null,
      name = null,
      plan = 'monthly',
    } = options;

    const limits = this.planLimits[plan] || this.planLimits.monthly;

    // Validate engine for plan
    if (!limits.engines.includes(engine)) {
      throw new Error(`Engine '${engine}' not available on ${plan} plan. Available: ${limits.engines.join(', ')}`);
    }

    const engineConfig = this.supportedEngines[engine];
    if (!engineConfig) throw new Error(`Unsupported engine: ${engine}`);

    // Check database count limit
    const userDbs = [...this.databases.values()].filter(d => d.projectId === projectId);
    if (userDbs.length >= limits.maxDatabases) {
      throw new Error(`Database limit reached (${limits.maxDatabases}) for ${plan} plan`);
    }

    const dbId = `db-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const dbVersion = version || engineConfig.defaultVersion;
    const dbName = name || `gencraft_${projectId.replace(/[^a-z0-9]/gi, '_')}`;
    const dbUser = `gc_${crypto.randomBytes(4).toString('hex')}`;
    const dbPassword = crypto.randomBytes(16).toString('base64url');

    const database = {
      id: dbId,
      projectId,
      engine,
      version: dbVersion,
      name: dbName,
      user: dbUser,
      password: dbPassword,
      host: engine === 'sqlite' ? null : `db-${dbId}.internal.maula.ai`,
      port: engineConfig.defaultPort,
      maxSizeMB: limits.maxSizeMB,
      status: 'provisioning',
      connectionString: this._buildConnectionString(engine, {
        user: dbUser,
        password: dbPassword,
        host: `db-${dbId}.internal.maula.ai`,
        port: engineConfig.defaultPort,
        database: dbName,
      }),
      sslEnabled: engine !== 'sqlite',
      backupsEnabled: limits.backups,
      readReplicas: [],
      createdAt: new Date().toISOString(),
      metrics: {
        sizeMB: 0,
        connections: 0,
        queriesPerMinute: 0,
      },
    };

    this.databases.set(dbId, database);

    // In production: spin up Docker container or provision managed DB
    // For PostgreSQL/MySQL:
    //   - Create Docker container with appropriate image
    //   - Create database and user with credentials
    //   - Configure connection pooling (PgBouncer / ProxySQL)
    //   - Set up SSL certificates
    //   - Warm up connection pool

    // Simulate provisioning
    setTimeout(() => {
      const db = this.databases.get(dbId);
      if (db) db.status = 'ready';
    }, 2000);

    console.log(`[DBProvisioner] Provisioning ${engine} ${dbVersion} for project ${projectId}`);
    return database;
  }

  /**
   * Get database info
   */
  getDatabase(dbId) {
    return this.databases.get(dbId);
  }

  /**
   * List databases for a project
   */
  listDatabases(projectId) {
    return [...this.databases.values()].filter(d => d.projectId === projectId);
  }

  /**
   * Delete a database
   */
  async deprovision(dbId) {
    const db = this.databases.get(dbId);
    if (!db) throw new Error('Database not found');

    db.status = 'deleting';

    // In production: destroy Docker container, delete volumes, remove DNS
    // await docker.getContainer(dbId).remove({ force: true, v: true });

    this.databases.delete(dbId);
    console.log(`[DBProvisioner] Deprovisioned database ${dbId}`);
    return { deleted: true, id: dbId };
  }

  /**
   * Reset database (drop all tables)
   */
  async reset(dbId) {
    const db = this.databases.get(dbId);
    if (!db) throw new Error('Database not found');

    // In production: connect and drop/recreate schema
    // await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

    db.metrics.sizeMB = 0;
    console.log(`[DBProvisioner] Reset database ${dbId}`);
    return { reset: true, id: dbId };
  }

  /**
   * Get connection string (masked password by default)
   */
  getConnectionString(dbId, options = {}) {
    const { masked = true } = options;
    const db = this.databases.get(dbId);
    if (!db) throw new Error('Database not found');

    if (masked) {
      return db.connectionString.replace(db.password, '••••••••');
    }
    return db.connectionString;
  }

  /**
   * Rotate database credentials
   */
  async rotateCredentials(dbId) {
    const db = this.databases.get(dbId);
    if (!db) throw new Error('Database not found');

    const newPassword = crypto.randomBytes(16).toString('base64url');

    // In production: ALTER USER ... PASSWORD ...
    db.password = newPassword;
    db.connectionString = this._buildConnectionString(db.engine, {
      user: db.user,
      password: newPassword,
      host: db.host,
      port: db.port,
      database: db.name,
    });

    console.log(`[DBProvisioner] Rotated credentials for ${dbId}`);
    return {
      id: dbId,
      connectionString: db.connectionString.replace(newPassword, '••••••••'),
      rotatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get database metrics
   */
  getMetrics(dbId) {
    const db = this.databases.get(dbId);
    if (!db) throw new Error('Database not found');

    // In production: query pg_stat_database or SHOW STATUS
    return {
      id: dbId,
      engine: db.engine,
      status: db.status,
      ...db.metrics,
      maxSizeMB: db.maxSizeMB,
      usagePercent: db.metrics.sizeMB / db.maxSizeMB * 100,
    };
  }

  /**
   * List supported engines
   */
  getSupportedEngines(plan = 'monthly') {
    const limits = this.planLimits[plan] || this.planLimits.monthly;
    return limits.engines.map(e => ({
      id: e,
      ...this.supportedEngines[e],
      available: true,
    }));
  }

  // ── Private ──

  _buildConnectionString(engine, { user, password, host, port, database }) {
    switch (engine) {
      case 'postgresql':
        return `postgresql://${user}:${password}@${host}:${port}/${database}?sslmode=require`;
      case 'mysql':
        return `mysql://${user}:${password}@${host}:${port}/${database}?ssl=true`;
      case 'sqlite':
        return `file:./data/${database}.db`;
      default:
        return '';
    }
  }
}

const dbProvisioner = new DatabaseProvisioner();
module.exports = { dbProvisioner, DatabaseProvisioner };
