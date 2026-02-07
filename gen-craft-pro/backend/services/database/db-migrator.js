/**
 * GenCraft Pro — Database Migrator
 * Phase 5: Managed Database
 * 
 * Manages database schema migrations for user projects.
 * Supports Prisma-style migrations with up/down tracking.
 */

const crypto = require('crypto');

class DatabaseMigrator {
  constructor() {
    // In-memory migration history (production: _migrations table in user's DB)
    this.migrations = new Map();  // projectId -> migration[]
    this.migrationQueue = [];
    this.isProcessing = false;
  }

  /**
   * Create a new migration
   */
  async createMigration(projectId, options = {}) {
    const {
      name = 'migration',
      sql = '',
      schema = null,    // Prisma schema string for auto-generation
      type = 'manual',  // manual | auto | prisma
    } = options;

    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const migrationId = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}`;

    const migration = {
      id: migrationId,
      projectId,
      name,
      type,
      status: 'pending',
      sql: {
        up: sql || this._generateMigrationSQL(schema, 'up'),
        down: this._generateRollbackSQL(schema),
      },
      checksum: crypto.createHash('md5').update(sql || '').digest('hex'),
      createdAt: new Date().toISOString(),
      appliedAt: null,
      rolledBackAt: null,
    };

    const projectMigrations = this.migrations.get(projectId) || [];
    projectMigrations.push(migration);
    this.migrations.set(projectId, projectMigrations);

    console.log(`[DBMigrator] Created migration ${migrationId} for project ${projectId}`);
    return migration;
  }

  /**
   * Run pending migrations
   */
  async migrate(projectId, options = {}) {
    const { target = 'latest', dryRun = false } = options;

    const projectMigrations = this.migrations.get(projectId) || [];
    const pending = projectMigrations.filter(m => m.status === 'pending');

    if (!pending.length) {
      return { applied: 0, message: 'No pending migrations' };
    }

    const toApply = target === 'latest'
      ? pending
      : pending.slice(0, parseInt(target, 10));

    if (dryRun) {
      return {
        dryRun: true,
        wouldApply: toApply.map(m => ({
          id: m.id,
          name: m.name,
          sql: m.sql.up,
        })),
      };
    }

    const results = [];

    for (const migration of toApply) {
      try {
        // In production: execute SQL against user's database
        // const pool = await getProjectPool(projectId);
        // await pool.query('BEGIN');
        // await pool.query(migration.sql.up);
        // await pool.query('INSERT INTO _migrations (id, checksum, applied_at) VALUES ($1, $2, NOW())', [migration.id, migration.checksum]);
        // await pool.query('COMMIT');

        migration.status = 'applied';
        migration.appliedAt = new Date().toISOString();
        results.push({ id: migration.id, status: 'applied' });

        console.log(`[DBMigrator] Applied migration ${migration.id}`);
      } catch (err) {
        migration.status = 'failed';
        migration.error = err.message;
        results.push({ id: migration.id, status: 'failed', error: err.message });

        // Stop on first failure
        break;
      }
    }

    return {
      applied: results.filter(r => r.status === 'applied').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    };
  }

  /**
   * Rollback last N migrations
   */
  async rollback(projectId, options = {}) {
    const { steps = 1 } = options;

    const projectMigrations = this.migrations.get(projectId) || [];
    const applied = projectMigrations
      .filter(m => m.status === 'applied')
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));

    const toRollback = applied.slice(0, steps);

    if (!toRollback.length) {
      return { rolledBack: 0, message: 'No migrations to rollback' };
    }

    const results = [];

    for (const migration of toRollback) {
      try {
        // In production: execute rollback SQL
        // const pool = await getProjectPool(projectId);
        // await pool.query('BEGIN');
        // await pool.query(migration.sql.down);
        // await pool.query('DELETE FROM _migrations WHERE id = $1', [migration.id]);
        // await pool.query('COMMIT');

        migration.status = 'rolled_back';
        migration.rolledBackAt = new Date().toISOString();
        results.push({ id: migration.id, status: 'rolled_back' });

        console.log(`[DBMigrator] Rolled back migration ${migration.id}`);
      } catch (err) {
        results.push({ id: migration.id, status: 'failed', error: err.message });
        break;
      }
    }

    return {
      rolledBack: results.filter(r => r.status === 'rolled_back').length,
      results,
    };
  }

  /**
   * Get migration status for project
   */
  getStatus(projectId) {
    const projectMigrations = this.migrations.get(projectId) || [];

    return {
      total: projectMigrations.length,
      applied: projectMigrations.filter(m => m.status === 'applied').length,
      pending: projectMigrations.filter(m => m.status === 'pending').length,
      failed: projectMigrations.filter(m => m.status === 'failed').length,
      rolledBack: projectMigrations.filter(m => m.status === 'rolled_back').length,
      migrations: projectMigrations.map(m => ({
        id: m.id,
        name: m.name,
        type: m.type,
        status: m.status,
        appliedAt: m.appliedAt,
      })),
    };
  }

  /**
   * Get migration history
   */
  getHistory(projectId) {
    return this.migrations.get(projectId) || [];
  }

  /**
   * Generate migration from Prisma schema diff
   */
  async generateFromSchema(projectId, newSchema, oldSchema = '') {
    // In production: use Prisma Migrate engine
    // const diff = await prismaInternals.getDiff(oldSchema, newSchema);

    const migration = await this.createMigration(projectId, {
      name: 'schema_update',
      schema: newSchema,
      type: 'prisma',
    });

    return migration;
  }

  /**
   * Seed database with initial data
   */
  async seed(projectId, seedData) {
    const { tables = {} } = seedData;

    const results = [];

    for (const [table, rows] of Object.entries(tables)) {
      // In production: INSERT INTO table ... VALUES ...
      results.push({
        table,
        inserted: Array.isArray(rows) ? rows.length : 0,
      });
    }

    console.log(`[DBMigrator] Seeded ${results.length} tables for project ${projectId}`);
    return { seeded: results };
  }

  // ── Private ──

  _generateMigrationSQL(schema, direction) {
    if (!schema) return '-- Empty migration\n';

    // Simplified SQL generation from schema description
    // In production: use Prisma Migrate engine or custom parser
    return `-- Auto-generated migration (${direction})\n-- Schema: ${schema?.substring(0, 100) || 'unknown'}\n`;
  }

  _generateRollbackSQL(schema) {
    if (!schema) return '-- Rollback: no changes\n';
    return '-- Auto-generated rollback\n';
  }
}

const dbMigrator = new DatabaseMigrator();
module.exports = { dbMigrator, DatabaseMigrator };
