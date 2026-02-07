/**
 * Sandbox API Routes — /api/sandbox
 * 
 * POST   /api/sandbox              — Create sandbox
 * GET    /api/sandbox              — List user's active sandboxes
 * GET    /api/sandbox/:id          — Get sandbox status
 * DELETE /api/sandbox/:id          — Destroy sandbox
 * POST   /api/sandbox/:id/exec     — Execute command
 * GET    /api/sandbox/:id/logs     — Stream logs (SSE)
 * GET    /api/sandbox/templates    — List available templates
 */

const express = require('express');
const router = express.Router();
const { sandboxManager, PLAN_LIMITS } = require('../services/sandbox/sandbox-manager');
const { getTemplates, getTemplatesByCategory } = require('../services/sandbox/sandbox-templates');

// Middleware: Require authentication
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Middleware: Require active plan
function requirePlan(req, res, next) {
  const plan = req.user?.plan;
  if (!plan || !PLAN_LIMITS[plan]) {
    return res.status(403).json({ 
      error: 'Active plan required', 
      message: 'Sandbox feature requires a GenCraft Pro subscription.',
      upgrade: true,
    });
  }
  next();
}

// ──────── GET /api/sandbox/templates ────────
router.get('/templates', requireAuth, (req, res) => {
  try {
    const { category } = req.query;
    const templates = category 
      ? getTemplatesByCategory(category)
      : getTemplates();
    
    res.json({ templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── POST /api/sandbox ────────
// Create a new sandbox
router.post('/', requireAuth, requirePlan, async (req, res) => {
  try {
    const { projectId, template, envVars } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    if (!template) {
      return res.status(400).json({ error: 'template is required' });
    }

    const sandbox = await sandboxManager.createSandbox({
      projectId,
      userId: req.user.id,
      template,
      plan: req.user.plan,
      envVars: envVars || {},
    });

    res.status(201).json({
      sandbox: {
        id: sandbox.id,
        projectId: sandbox.projectId,
        status: sandbox.status,
        port: sandbox.port,
        previewUrl: sandbox.previewUrl,
        template: sandbox.template,
        resources: sandbox.resources,
        createdAt: sandbox.createdAt,
        expiresAt: sandbox.expiresAt,
      },
    });
  } catch (err) {
    const status = err.message.includes('limit reached') ? 429 : 500;
    res.status(status).json({ error: err.message });
  }
});

// ──────── GET /api/sandbox ────────
// List user's sandboxes
router.get('/', requireAuth, (req, res) => {
  try {
    const sandboxes = sandboxManager.getUserSandboxes(req.user.id);
    
    res.json({
      sandboxes: sandboxes.map(s => ({
        id: s.id,
        projectId: s.projectId,
        status: s.status,
        template: s.template,
        port: s.port,
        previewUrl: s.previewUrl,
        resources: s.resources,
        lastActivity: s.lastActivity,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
      })),
      limits: PLAN_LIMITS[req.user?.plan] || PLAN_LIMITS.weekly,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── GET /api/sandbox/:id ────────
// Get sandbox status with live metrics
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const sandbox = await sandboxManager.getSandboxStatus(req.params.id);

    // Verify ownership
    if (sandbox.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ sandbox });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});

// ──────── DELETE /api/sandbox/:id ────────
// Destroy a sandbox
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Verify ownership
    const sandbox = await sandboxManager.getSandboxStatus(req.params.id);
    if (sandbox.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await sandboxManager.destroySandbox(req.params.id);
    res.json({ success: true, message: 'Sandbox destroyed' });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});

// ──────── POST /api/sandbox/:id/exec ────────
// Execute a command inside the sandbox
router.post('/:id/exec', requireAuth, requirePlan, async (req, res) => {
  try {
    const { command, timeout, workingDir } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'command is required' });
    }

    // Verify ownership
    const status = await sandboxManager.getSandboxStatus(req.params.id);
    if (status.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Block dangerous commands
    const blockedPatterns = [
      /\brm\s+-rf\s+\//,       // rm -rf /
      /\bdd\s+if=/,             // dd if=
      /\b:(){ :|:& };:/,        // fork bomb
      /\bcurl\s+.*\|\s*sh/,     // curl pipe to sh
      /\bwget\s+.*\|\s*sh/,     // wget pipe to sh
      /\bmkfs/,                 // mkfs
      /\bfdisk/,                // fdisk
    ];

    if (blockedPatterns.some(p => p.test(command))) {
      return res.status(400).json({ error: 'Command blocked for security reasons' });
    }

    const result = await sandboxManager.exec(req.params.id, command, {
      timeout: Math.min(timeout || 30000, 120000), // Max 2 minutes
      workingDir,
    });

    res.json({ result });
  } catch (err) {
    const statusCode = err.message.includes('not running') ? 409 : 500;
    res.status(statusCode).json({ error: err.message });
  }
});

// ──────── GET /api/sandbox/:id/logs ────────
// Stream container logs via SSE
router.get('/:id/logs', requireAuth, async (req, res) => {
  try {
    const sandbox = await sandboxManager.getSandboxStatus(req.params.id);
    if (sandbox.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await sandboxManager.streamLogs(req.params.id, res);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    if (!res.headersSent) {
      res.status(status).json({ error: err.message });
    }
  }
});

module.exports = router;
