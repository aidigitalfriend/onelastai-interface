/**
 * GenCraft Pro — Database API Routes
 * Phase 5: Managed Database
 * 
 * POST /api/database                    — Provision database
 * GET /api/database                     — List user databases
 * GET /api/database/:id                 — Database info
 * DELETE /api/database/:id              — Delete database
 * POST /api/database/:id/reset          — Reset database
 * POST /api/database/:id/rotate         — Rotate credentials
 * GET /api/database/:id/connection      — Get connection string
 * GET /api/database/:id/metrics         — Database metrics
 * GET /api/database/:id/pool            — Pool status
 * POST /api/database/:id/backup         — Create backup
 * GET /api/database/:id/backups         — List backups
 * POST /api/database/:id/restore/:bakId — Restore backup
 * GET /api/database/:id/migrations      — Migration status
 * POST /api/database/:id/migrate        — Run migrations
 * POST /api/database/:id/rollback       — Rollback migrations
 * POST /api/database/:id/seed           — Seed database
 * GET /api/database/engines             — Available engines
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requirePlan } = require('../middleware/auth');

const { dbProvisioner } = require('../services/database/db-provisioner');
const { dbMigrator } = require('../services/database/db-migrator');
const { dbBackup } = require('../services/database/db-backup');
const { dbScaler } = require('../services/database/db-scaler');

// All routes require auth
router.use(requireAuth);

/**
 * GET /api/database/engines — List available engines
 */
router.get('/engines', (req, res) => {
  const engines = dbProvisioner.getSupportedEngines(req.user.plan || 'monthly');
  res.json(engines);
});

/**
 * POST /api/database — Provision new database
 */
router.post('/', async (req, res) => {
  try {
    const { projectId, engine, version, name } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const database = await dbProvisioner.provision(projectId, {
      engine: engine || 'postgresql',
      version,
      name,
      plan: req.user.plan || 'monthly',
    });

    // Configure connection pool
    dbScaler.configurePool(database.id, { plan: req.user.plan || 'monthly' });

    // Set up auto-backup
    if (database.backupsEnabled) {
      dbBackup.setupSchedule(database.id, { intervalHours: 24 });
    }

    res.status(201).json({
      ...database,
      password: '••••••••', // Mask password in response
    });
  } catch (err) {
    const status = err.message.includes('limit') || err.message.includes('not available') ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/database — List databases for user
 */
router.get('/', (req, res) => {
  const { projectId } = req.query;

  if (!projectId) {
    return res.status(400).json({ error: 'projectId query param required' });
  }

  const databases = dbProvisioner.listDatabases(projectId).map(db => ({
    ...db,
    password: '••••••••',
    connectionString: db.connectionString.replace(db.password, '••••••••'),
  }));

  res.json(databases);
});

/**
 * GET /api/database/:id — Database info
 */
router.get('/:id', (req, res) => {
  const db = dbProvisioner.getDatabase(req.params.id);
  if (!db) return res.status(404).json({ error: 'Database not found' });

  res.json({
    ...db,
    password: '••••••••',
    connectionString: db.connectionString.replace(db.password, '••••••••'),
  });
});

/**
 * DELETE /api/database/:id — Delete database
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await dbProvisioner.deprovision(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

/**
 * POST /api/database/:id/reset — Reset database
 */
router.post('/:id/reset', async (req, res) => {
  try {
    const result = await dbProvisioner.reset(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

/**
 * POST /api/database/:id/rotate — Rotate credentials
 */
router.post('/:id/rotate', async (req, res) => {
  try {
    const result = await dbProvisioner.rotateCredentials(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

/**
 * GET /api/database/:id/connection — Get connection string
 */
router.get('/:id/connection', (req, res) => {
  try {
    const { reveal } = req.query;
    const connStr = dbProvisioner.getConnectionString(req.params.id, {
      masked: reveal !== 'true',
    });
    res.json({ connectionString: connStr });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

/**
 * GET /api/database/:id/metrics — Database metrics
 */
router.get('/:id/metrics', (req, res) => {
  try {
    const metrics = dbProvisioner.getMetrics(req.params.id);
    res.json(metrics);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

/**
 * GET /api/database/:id/pool — Pool status
 */
router.get('/:id/pool', (req, res) => {
  const pool = dbScaler.getPoolStatus(req.params.id);
  if (!pool) return res.status(404).json({ error: 'Pool not configured' });
  res.json(pool);
});

// ── Backups ──

/**
 * POST /api/database/:id/backup — Create backup
 */
router.post('/:id/backup', requirePlan('monthly', 'yearly'), async (req, res) => {
  try {
    const { type, label } = req.body;
    const backup = await dbBackup.createBackup(req.params.id, {
      type: type || 'full',
      label,
      plan: req.user.plan,
    });
    res.status(201).json(backup);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/database/:id/backups — List backups
 */
router.get('/:id/backups', (req, res) => {
  const backups = dbBackup.listBackups(req.params.id);
  res.json(backups);
});

/**
 * POST /api/database/:id/restore/:backupId — Restore from backup
 */
router.post('/:id/restore/:backupId', async (req, res) => {
  try {
    const result = await dbBackup.restore(req.params.id, req.params.backupId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Migrations ──

/**
 * GET /api/database/:id/migrations — Migration status
 */
router.get('/:id/migrations', (req, res) => {
  const status = dbMigrator.getStatus(req.params.id);
  res.json(status);
});

/**
 * POST /api/database/:id/migrate — Run migrations
 */
router.post('/:id/migrate', async (req, res) => {
  try {
    const { sql, name, target, dryRun } = req.body;

    // Create migration if SQL provided
    if (sql) {
      await dbMigrator.createMigration(req.params.id, { sql, name: name || 'migration' });
    }

    const result = await dbMigrator.migrate(req.params.id, {
      target: target || 'latest',
      dryRun: dryRun === true,
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/database/:id/rollback — Rollback migrations
 */
router.post('/:id/rollback', async (req, res) => {
  try {
    const { steps } = req.body;
    const result = await dbMigrator.rollback(req.params.id, { steps: steps || 1 });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/database/:id/seed — Seed database
 */
router.post('/:id/seed', async (req, res) => {
  try {
    const result = await dbMigrator.seed(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
