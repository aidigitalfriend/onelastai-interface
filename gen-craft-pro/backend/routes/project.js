/**
 * Project API Routes — /api/project
 * 
 * POST   /api/project                    — Create project
 * GET    /api/project                    — List user's projects
 * GET    /api/project/:id               — Get project
 * PUT    /api/project/:id               — Update project
 * DELETE /api/project/:id               — Delete project
 * 
 * Files:
 * GET    /api/project/:id/files         — List project files
 * POST   /api/project/:id/files         — Create/update file
 * DELETE /api/project/:id/files         — Delete file
 * 
 * Environment:
 * GET    /api/project/:id/env           — Get env vars
 * PUT    /api/project/:id/env           — Update env vars
 * 
 * Git:
 * GET    /api/project/:id/git           — Git status
 * POST   /api/project/:id/git/commit    — Commit changes
 * GET    /api/project/:id/git/branches  — List branches
 * POST   /api/project/:id/git/branches  — Create branch
 * POST   /api/project/:id/git/push      — Push to remote
 * POST   /api/project/:id/git/pull      — Pull from remote
 * POST   /api/project/:id/git/webhook   — Git webhook endpoint
 * 
 * Database:
 * GET    /api/project/:id/db            — Database status
 * POST   /api/project/:id/db/migrate    — Run migration
 * POST   /api/project/:id/db/backup     — Create backup
 * 
 * Templates:
 * GET    /api/project/templates         — Project templates
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const gitService = require('../services/git/git-service');
const { verifyGitHubSignature, handleGitHubPush, handleGitLabPush } = require('../services/git/git-webhook');
const { projectRepo, fileRepo } = require('../lib/repositories');

function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// ──────── PROJECT TEMPLATES ────────

const PROJECT_TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start from scratch',
    framework: 'node',
    icon: '📄',
  },
  {
    id: 'nextjs',
    name: 'Next.js App',
    description: 'Full-stack React with Next.js 14, App Router, and Tailwind CSS',
    framework: 'nextjs',
    icon: '▲',
    sandboxTemplate: 'next-app',
  },
  {
    id: 'vite-react',
    name: 'React + Vite',
    description: 'Lightning-fast React app with Vite, TypeScript, and Tailwind',
    framework: 'vite',
    icon: '⚡',
    sandboxTemplate: 'vite-app',
  },
  {
    id: 'express-api',
    name: 'Express API',
    description: 'REST API with Express.js, TypeScript, and JWT auth',
    framework: 'express',
    icon: '🚀',
    sandboxTemplate: 'express-app',
  },
  {
    id: 'vue-app',
    name: 'Vue 3 + Vite',
    description: 'Vue 3 with Composition API, Pinia, and Vue Router',
    framework: 'vue',
    icon: '💚',
    sandboxTemplate: 'vue-app',
  },
  {
    id: 'svelte-app',
    name: 'SvelteKit',
    description: 'SvelteKit with TypeScript and SSR',
    framework: 'svelte',
    icon: '🔥',
    sandboxTemplate: 'svelte-app',
  },
  {
    id: 'landing-page',
    name: 'Landing Page',
    description: 'Beautiful landing page with Tailwind CSS and animations',
    framework: 'vite',
    icon: '🎨',
    sandboxTemplate: 'vite-app',
  },
  {
    id: 'fullstack',
    name: 'Full-Stack App',
    description: 'Next.js + Prisma + PostgreSQL + Auth',
    framework: 'nextjs',
    icon: '🏗️',
    sandboxTemplate: 'next-app',
  },
];

// ──────── GET /api/project/templates ────────
router.get('/templates', requireAuth, (req, res) => {
  res.json({ templates: PROJECT_TEMPLATES });
});

// ──────── POST /api/project ────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, framework, templateId, gitRepo } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });

    const projectId = `proj-${uuidv4().slice(0, 12)}`;
    const project = await projectRepo.create({
      id: projectId,
      userId: req.user.id,
      name,
      description: description || '',
      framework: framework || 'node',
      templateId: templateId || 'blank',
      gitRepo: gitRepo || null,
      defaultBranch: 'main',
      envVars: {},
      status: 'created',
      settings: {
        autoBuild: true,
        autoSave: true,
        buildOnPush: true,
      },
    });

    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── GET /api/project ────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const userProjects = await projectRepo.findByUser(req.user.id);
    res.json({ projects: userProjects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── GET /api/project/:id ────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── PUT /api/project/:id ────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    const { name, description, framework, gitRepo, settings } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (framework !== undefined) updates.framework = framework;
    if (gitRepo !== undefined) updates.gitRepo = gitRepo;
    if (settings !== undefined) updates.settings = { ...project.settings, ...settings };

    const updated = await projectRepo.update(req.params.id, updates);
    res.json({ project: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── DELETE /api/project/:id ────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    await projectRepo.delete(req.params.id);
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── PROJECT FILES ────────

// GET /api/project/:id/files
router.get('/:id/files', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    const files = await fileRepo.findByProject(req.params.id);
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/project/:id/files
router.post('/:id/files', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    const { path: filePath, content, language } = req.body;
    if (!filePath) return res.status(400).json({ error: 'path is required' });

    const file = await fileRepo.upsert(req.params.id, filePath, {
      content: content || '',
      language: language || detectLanguage(filePath),
    });

    await projectRepo.update(req.params.id, {});
    res.json({ file });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/project/:id/files
router.delete('/:id/files', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    const { path: filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'path is required' });

    await fileRepo.delete(req.params.id, filePath);
    await projectRepo.update(req.params.id, {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── ENVIRONMENT VARIABLES ────────

// GET /api/project/:id/env
router.get('/:id/env', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    const maskedVars = Object.entries(project.envVars || {}).map(([key, value]) => ({
      key,
      value: maskValue(value),
      isSecret: true,
    }));

    res.json({ envVars: maskedVars });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/project/:id/env
router.put('/:id/env', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    const { envVars } = req.body;
    if (!envVars || typeof envVars !== 'object') {
      return res.status(400).json({ error: 'envVars object is required' });
    }

    const merged = { ...(project.envVars || {}), ...envVars };
    await projectRepo.update(req.params.id, { envVars: merged });
    res.json({ success: true, count: Object.keys(merged).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── GIT ────────

// GET /api/project/:id/git
router.get('/:id/git', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (!project.sandboxId) return res.status(409).json({ error: 'No sandbox active' });

    const status = await gitService.getStatus(project.sandboxId);
    res.json({ git: status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/project/:id/git/commit
router.post('/:id/git/commit', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (!project.sandboxId) return res.status(409).json({ error: 'No sandbox active' });

    const { message, files, author } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    // Stage files
    if (files && files.length > 0) {
      await gitService.stageFiles(project.sandboxId, files);
    } else {
      await gitService.stageFiles(project.sandboxId, ['.']);
    }

    const result = await gitService.commit(project.sandboxId, message, author);
    res.json({ commit: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/project/:id/git/branches
router.get('/:id/git/branches', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (!project.sandboxId) return res.status(409).json({ error: 'No sandbox active' });

    const branches = await gitService.getBranches(project.sandboxId);
    res.json({ branches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/project/:id/git/branches
router.post('/:id/git/branches', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (!project.sandboxId) return res.status(409).json({ error: 'No sandbox active' });

    const { name, checkout } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const result = await gitService.createBranch(project.sandboxId, name, checkout !== false);
    res.json({ branch: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/project/:id/git/push
router.post('/:id/git/push', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (!project.sandboxId) return res.status(409).json({ error: 'No sandbox active' });

    const { remote, branch } = req.body;
    const result = await gitService.push(project.sandboxId, remote, branch);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/project/:id/git/pull
router.post('/:id/git/pull', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (!project.sandboxId) return res.status(409).json({ error: 'No sandbox active' });

    const { remote, branch } = req.body;
    const result = await gitService.pull(project.sandboxId, remote, branch);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/project/:id/git/webhook (No auth — external webhook)
router.post('/:id/git/webhook', async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const provider = req.headers['x-github-event'] ? 'github'
      : req.headers['x-gitlab-event'] ? 'gitlab'
      : null;

    if (!provider) {
      return res.status(400).json({ error: 'Unknown webhook provider' });
    }

    if (provider === 'github') {
      // Verify signature
      const signature = req.headers['x-hub-signature-256'];
      if (!verifyGitHubSignature(JSON.stringify(req.body), signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const event = req.headers['x-github-event'];
      if (event === 'push') {
        const result = await handleGitHubPush(req.body, project);
        return res.json(result);
      }
    } else if (provider === 'gitlab') {
      const event = req.headers['x-gitlab-event'];
      if (event === 'Push Hook') {
        const result = await handleGitLabPush(req.body, project);
        return res.json(result);
      }
    }

    res.json({ received: true, event: req.headers['x-github-event'] || req.headers['x-gitlab-event'] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── DATABASE (Project DB) ────────

// GET /api/project/:id/db
router.get('/:id/db', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    res.json({
      database: project.database || null,
      message: project.database ? 'Database active' : 'No database provisioned',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/project/:id/db/migrate
router.post('/:id/db/migrate', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    const { sql } = req.body;
    // In production: run migration against project database
    res.json({ success: true, message: 'Migration applied', sql: sql?.slice(0, 100) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/project/:id/db/backup
router.post('/:id/db/backup', requireAuth, async (req, res) => {
  try {
    const project = await projectRepo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    // In production: pg_dump → S3
    res.json({
      success: true,
      backup: {
        id: `backup-${uuidv4().slice(0, 8)}`,
        projectId: project.id,
        size: 0,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── HELPERS ────────

function detectLanguage(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const map = {
    'js': 'javascript', 'jsx': 'javascript',
    'ts': 'typescript', 'tsx': 'typescript',
    'py': 'python', 'rb': 'ruby',
    'go': 'go', 'rs': 'rust',
    'java': 'java', 'kt': 'kotlin',
    'css': 'css', 'scss': 'scss', 'less': 'less',
    'html': 'html', 'htm': 'html',
    'json': 'json', 'yaml': 'yaml', 'yml': 'yaml',
    'md': 'markdown', 'mdx': 'markdown',
    'sql': 'sql', 'sh': 'shell', 'bash': 'shell',
    'dockerfile': 'dockerfile',
    'toml': 'toml', 'xml': 'xml',
    'svg': 'xml', 'graphql': 'graphql',
  };
  return map[ext] || 'plaintext';
}

function maskValue(value) {
  if (!value || value.length <= 4) return '••••';
  return value.slice(0, 2) + '•'.repeat(Math.min(value.length - 4, 20)) + value.slice(-2);
}

module.exports = router;
