/**
 * Deploy API Routes — /api/deploy
 * 
 * POST   /api/deploy              — Deploy a project
 * GET    /api/deploy              — List deployments
 * GET    /api/deploy/:id          — Get deployment status
 * DELETE /api/deploy/:id          — Remove deployment
 * POST   /api/deploy/:id/rollback — Rollback to this version
 * 
 * Domain management:
 * GET    /api/deploy/domains          — List user's custom domains
 * POST   /api/deploy/domains          — Add custom domain
 * POST   /api/deploy/domains/:id/verify — Verify domain DNS
 * PUT    /api/deploy/domains/:id      — Update domain
 * DELETE /api/deploy/domains/:id      — Remove domain
 */

const express = require('express');
const router = express.Router();
const { deployOrchestrator } = require('../services/deploy/deploy-orchestrator');
const { getRollbackCandidates, executeRollback } = require('../services/deploy/deploy-rollback');
const { 
  registerDomain, verifyDomain, getDomain, 
  getUserDomains, removeDomain, updateDomainTarget 
} = require('../services/deploy/deploy-domain');

function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// ──────── POST /api/deploy ────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { projectId, buildId, environment, domain } = req.body;

    if (!projectId) return res.status(400).json({ error: 'projectId is required' });
    if (!buildId) return res.status(400).json({ error: 'buildId is required' });

    const deployment = await deployOrchestrator.deploy({
      projectId,
      userId: req.user.id,
      buildId,
      environment: environment || 'preview',
      domain,
    });

    res.status(201).json({ deployment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── GET /api/deploy ────────
router.get('/', requireAuth, (req, res) => {
  try {
    const { projectId, limit } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId query is required' });

    const deployments = deployOrchestrator.getProjectDeployments(
      projectId,
      parseInt(limit || '20', 10)
    );

    res.json({ deployments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── GET /api/deploy/:id ────────
router.get('/:id', requireAuth, (req, res) => {
  try {
    const deployment = deployOrchestrator.getDeployment(req.params.id);
    if (deployment.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json({ deployment });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});

// ──────── DELETE /api/deploy/:id ────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deployment = deployOrchestrator.getDeployment(req.params.id);
    if (deployment.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const removed = await deployOrchestrator.removeDeployment(req.params.id);
    res.json({ deployment: removed, message: 'Deployment removed' });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});

// ──────── POST /api/deploy/:id/rollback ────────
router.post('/:id/rollback', requireAuth, async (req, res) => {
  try {
    const deployment = deployOrchestrator.getDeployment(req.params.id);
    if (deployment.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { reason } = req.body;
    const rollback = await executeRollback(
      deployment.projectId,
      req.params.id,
      req.user.id,
      reason
    );

    res.status(201).json({ deployment: rollback, message: 'Rollback successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── GET /api/deploy/:projectId/rollback-candidates ────────
router.get('/:projectId/rollback-candidates', requireAuth, (req, res) => {
  try {
    const { environment } = req.query;
    const candidates = getRollbackCandidates(
      req.params.projectId,
      environment || 'production'
    );
    res.json({ candidates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── DOMAIN MANAGEMENT ────────

// GET /api/deploy/domains
router.get('/domains', requireAuth, (req, res) => {
  try {
    const domainsArr = getUserDomains(req.user.id);
    res.json({ domains: domainsArr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/deploy/domains
router.post('/domains', requireAuth, async (req, res) => {
  try {
    const { deploymentId, domain: domainName } = req.body;

    if (!deploymentId) return res.status(400).json({ error: 'deploymentId is required' });
    if (!domainName) return res.status(400).json({ error: 'domain is required' });

    const domain = await registerDomain({
      userId: req.user.id,
      deploymentId,
      domain: domainName,
    });

    res.status(201).json({ domain });
  } catch (err) {
    const status = err.message.includes('already registered') ? 409
      : err.message.includes('Invalid') ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

// POST /api/deploy/domains/:id/verify
router.post('/domains/:id/verify', requireAuth, async (req, res) => {
  try {
    const domain = getDomain(req.params.id);
    if (domain.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const verified = await verifyDomain(req.params.id);
    res.json({ domain: verified });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});

// PUT /api/deploy/domains/:id
router.put('/domains/:id', requireAuth, async (req, res) => {
  try {
    const domain = getDomain(req.params.id);
    if (domain.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { deploymentId } = req.body;
    if (deploymentId) {
      const updated = await updateDomainTarget(req.params.id, deploymentId);
      return res.json({ domain: updated });
    }

    res.json({ domain });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});

// DELETE /api/deploy/domains/:id
router.delete('/domains/:id', requireAuth, async (req, res) => {
  try {
    const domain = getDomain(req.params.id);
    if (domain.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await removeDomain(req.params.id);
    res.json({ success: true, message: 'Domain removed' });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
