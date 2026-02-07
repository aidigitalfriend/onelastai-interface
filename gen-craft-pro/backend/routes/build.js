/**
 * Build API Routes — /api/build
 * 
 * POST   /api/build              — Trigger build
 * GET    /api/build              — List builds for project
 * GET    /api/build/:id          — Get build status
 * DELETE /api/build/:id          — Cancel build
 * GET    /api/build/:id/logs     — Stream build logs (SSE)
 * GET    /api/build/config       — Get/detect build config
 * PUT    /api/build/config       — Update build config
 */

const express = require('express');
const router = express.Router();
const { buildOrchestrator } = require('../services/build/build-orchestrator');
const { streamBuildLogs, getBuildLogs } = require('../services/build/build-logger');
const { getCacheStats, clearCache } = require('../services/build/build-cache');

// Middleware: Require auth
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// ──────── POST /api/build ────────
// Trigger a new build
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      projectId,
      sandboxId,
      branch,
      commitHash,
      commitMessage,
      environment,
      triggeredBy,
      skipTests,
      skipLint,
      autoPromote,
    } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    if (!sandboxId) {
      return res.status(400).json({ error: 'sandboxId is required' });
    }

    const build = await buildOrchestrator.triggerBuild({
      projectId,
      userId: req.user.id,
      sandboxId,
      branch,
      commitHash,
      commitMessage,
      environment,
      triggeredBy: triggeredBy || 'manual',
      skipTests: skipTests || false,
      skipLint: skipLint || false,
      autoPromote: autoPromote || false,
    });

    res.status(201).json({ build });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── GET /api/build ────────
// List builds for a project
router.get('/', requireAuth, (req, res) => {
  try {
    const { projectId, limit } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId query parameter is required' });
    }

    const builds = buildOrchestrator.getProjectBuilds(
      projectId,
      parseInt(limit || '20', 10)
    );

    const metrics = buildOrchestrator.getProjectMetrics(projectId);

    res.json({ builds, metrics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── GET /api/build/config ────────
// Detect/get build configuration for a sandbox
router.get('/config', requireAuth, async (req, res) => {
  try {
    const { sandboxId } = req.query;
    if (!sandboxId) {
      return res.status(400).json({ error: 'sandboxId query parameter is required' });
    }

    const config = await buildOrchestrator.detectBuildConfig(sandboxId);
    res.json({ config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── GET /api/build/:id ────────
// Get build status & details
router.get('/:id', requireAuth, (req, res) => {
  try {
    const build = buildOrchestrator.getBuild(req.params.id);

    // Verify ownership
    if (build.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ build });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});

// ──────── DELETE /api/build/:id ────────
// Cancel a build
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const build = buildOrchestrator.getBuild(req.params.id);

    // Verify ownership
    if (build.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const cancelled = await buildOrchestrator.cancelBuild(req.params.id);
    res.json({ build: cancelled, message: 'Build cancelled' });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 
      : err.message.includes('already') ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
});

// ──────── GET /api/build/:id/logs ────────
// Stream build logs via SSE
router.get('/:id/logs', requireAuth, (req, res) => {
  try {
    const build = buildOrchestrator.getBuild(req.params.id);

    // Verify ownership
    if (build.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if client wants SSE or JSON
    const accept = req.headers.accept || '';
    if (accept.includes('text/event-stream')) {
      streamBuildLogs(req.params.id, req, res);
    } else {
      const logs = getBuildLogs(req.params.id);
      res.json({ logs, buildId: req.params.id });
    }
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    if (!res.headersSent) {
      res.status(status).json({ error: err.message });
    }
  }
});

// ──────── GET /api/build/cache/stats ────────
// Get build cache statistics
router.get('/cache/stats', requireAuth, (req, res) => {
  try {
    const stats = getCacheStats();
    res.json({ cache: stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── DELETE /api/build/cache/:projectId ────────
// Clear build cache for a project
router.delete('/cache/:projectId', requireAuth, async (req, res) => {
  try {
    await clearCache(req.params.projectId);
    res.json({ success: true, message: 'Cache cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
