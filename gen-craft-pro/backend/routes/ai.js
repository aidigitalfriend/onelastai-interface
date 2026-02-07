/**
 * GenCraft Pro — AI Agent API Routes
 * Phase 7: AI-Powered Development
 * 
 * POST /api/ai/session           — Create AI session
 * POST /api/ai/session/:id/chat  — Send message to agent
 * POST /api/ai/session/:id/apply — Apply code changes
 * DELETE /api/ai/session/:id     — End session
 * GET /api/ai/sessions           — List user sessions
 * GET /api/ai/usage              — Usage stats
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

const { aiAgent } = require('../services/ai/ai-agent');

// All routes require auth
router.use(requireAuth);

/**
 * POST /api/ai/session — Create new AI session
 */
router.post('/session', async (req, res) => {
  try {
    const { projectId, model, scenario, context } = req.body;

    const session = aiAgent.createSession(req.user.id, {
      projectId,
      plan: req.user.plan || 'monthly',
      model: model || 'standard',
      scenario: scenario || 'generate',
      context: context || {},
    });

    res.status(201).json({
      id: session.id,
      scenario: session.scenario,
      model: session.model.name,
      maxTokens: session.maxTokens,
      status: session.status,
    });
  } catch (err) {
    const status = err.message.includes('not available') || err.message.includes('limit') ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/ai/session/:id/chat — Send message to agent
 */
router.post('/session/:id/chat', async (req, res) => {
  try {
    const { message, files, executeTools } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await aiAgent.chat(req.params.id, message, {
      includeFiles: files || [],
      executeTools: executeTools !== false,
    });

    res.json(response);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/ai/session/:id/apply — Apply generated changes
 */
router.post('/session/:id/apply', async (req, res) => {
  try {
    const { changes } = req.body;

    if (!changes || !Array.isArray(changes)) {
      return res.status(400).json({ error: 'Changes array is required' });
    }

    const result = await aiAgent.applyChanges(req.params.id, changes);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/ai/session/:id — End session
 */
router.delete('/session/:id', (req, res) => {
  const summary = aiAgent.endSession(req.params.id);

  if (!summary) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json(summary);
});

/**
 * GET /api/ai/sessions — List user sessions
 */
router.get('/sessions', (req, res) => {
  const { status = 'all' } = req.query;
  const sessions = aiAgent.listSessions(req.user.id, { status });
  res.json(sessions);
});

/**
 * GET /api/ai/usage — Usage stats
 */
router.get('/usage', (req, res) => {
  const stats = aiAgent.getUsageStats(req.user.id);
  res.json(stats);
});

module.exports = router;
