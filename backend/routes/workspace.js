/**
 * WORKSPACE ROUTES - Project Persistence for Canvas Studio
 * Real-time auto-save and workspace storage
 */

import express from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique slug for the project
 */
function generateSlug(name) {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
  
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  return `${cleanName || 'project'}-${randomSuffix}`;
}

/**
 * Detect language from file path
 */
function detectLanguage(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const langMap = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'go': 'go',
    'rs': 'rust',
    'cpp': 'cpp',
    'c': 'c',
    'rb': 'ruby',
    'php': 'php',
    'sql': 'sql',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'sh': 'shell',
    'bash': 'shell',
  };
  return langMap[ext] || 'text';
}

/**
 * Optional auth middleware - allows anonymous users
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (token) {
      const { payload } = await import('jose').then(jose => 
        jose.jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET || 'neural-link-secret-key-2026'))
      );
      
      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      });
      
      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    // Silent fail - user is anonymous
  }
  next();
}

/**
 * Required auth middleware
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { payload } = await import('jose').then(jose => 
      jose.jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET || 'neural-link-secret-key-2026'))
    );
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ============================================================================
// PROJECT CRUD
// ============================================================================

/**
 * GET /api/workspace/projects - List user's projects
 */
router.get('/projects', requireAuth, async (req, res) => {
  try {
    const { limit = 20, offset = 0, archived = false } = req.query;
    
    const projects = await prisma.project.findMany({
      where: {
        userId: req.user.id,
        isArchived: archived === 'true',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        thumbnail: true,
        language: true,
        framework: true,
        projectType: true,
        mainFile: true,
        isPublic: true,
        lastSavedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { files: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });
    
    res.json({
      success: true,
      projects: projects.map(p => ({
        ...p,
        fileCount: p._count.files,
      })),
    });
  } catch (error) {
    console.error('[Workspace] List projects error:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

/**
 * POST /api/workspace/projects - Create new project
 */
router.post('/projects', optionalAuth, async (req, res) => {
  try {
    const {
      name = 'Untitled Project',
      description,
      language = 'html',
      framework,
      projectType = 'STATIC',
      mainFile = 'index.html',
      files = [],
      editorState,
      originalPrompt,
    } = req.body;
    
    const slug = generateSlug(name);
    
    const project = await prisma.project.create({
      data: {
        userId: req.user?.id || null,
        name,
        slug,
        description,
        language,
        framework,
        projectType,
        mainFile,
        editorState,
        originalPrompt,
        lastSavedAt: new Date(),
        files: {
          create: files.map(file => ({
            path: file.path,
            content: file.content || '',
            language: file.language || detectLanguage(file.path),
            size: file.content?.length || 0,
            isMain: file.path === mainFile,
            isOpen: file.isOpen || false,
          })),
        },
      },
      include: {
        files: true,
      },
    });
    
    console.log(`[Workspace] Created project: ${project.slug} (${project.files.length} files)`);
    
    res.json({
      success: true,
      project: {
        id: project.id,
        slug: project.slug,
        name: project.name,
        files: project.files,
      },
    });
  } catch (error) {
    console.error('[Workspace] Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * GET /api/workspace/projects/:slug - Get project with files
 */
router.get('/projects/:slug', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    
    const project = await prisma.project.findUnique({
      where: { slug },
      include: {
        files: {
          orderBy: { path: 'asc' },
        },
      },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check access - private projects only accessible by owner
    if (!project.isPublic && project.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('[Workspace] Get project error:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

/**
 * PUT /api/workspace/projects/:slug - Update project metadata
 */
router.put('/projects/:slug', requireAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, description, language, framework, mainFile, isPublic, isArchived } = req.body;
    
    const project = await prisma.project.findUnique({
      where: { slug },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updated = await prisma.project.update({
      where: { slug },
      data: {
        name: name ?? project.name,
        description: description ?? project.description,
        language: language ?? project.language,
        framework: framework ?? project.framework,
        mainFile: mainFile ?? project.mainFile,
        isPublic: isPublic ?? project.isPublic,
        isArchived: isArchived ?? project.isArchived,
      },
    });
    
    res.json({ success: true, project: updated });
  } catch (error) {
    console.error('[Workspace] Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

/**
 * DELETE /api/workspace/projects/:slug - Delete project
 */
router.delete('/projects/:slug', requireAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    
    const project = await prisma.project.findUnique({
      where: { slug },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await prisma.project.delete({
      where: { slug },
    });
    
    console.log(`[Workspace] Deleted project: ${slug}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Workspace] Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ============================================================================
// AUTO-SAVE & FILE SYNC
// ============================================================================

/**
 * POST /api/workspace/projects/:slug/save - Auto-save all files
 * This is the main auto-save endpoint called by the frontend
 */
router.post('/projects/:slug/save', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const { files, editorState, mainFile } = req.body;
    
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array required' });
    }
    
    // Find or create project
    let project = await prisma.project.findUnique({
      where: { slug },
      include: { files: true },
    });
    
    if (!project) {
      // Create new project for this slug
      project = await prisma.project.create({
        data: {
          slug,
          name: slug.replace(/-[a-f0-9]+$/, '').replace(/-/g, ' '),
          userId: req.user?.id || null,
          mainFile: mainFile || files[0]?.path || 'index.html',
          editorState,
          lastSavedAt: new Date(),
        },
        include: { files: true },
      });
    } else if (project.userId && project.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get existing file paths
    const existingPaths = new Set(project.files.map(f => f.path));
    const newPaths = new Set(files.map(f => f.path));
    
    // Delete removed files
    const toDelete = [...existingPaths].filter(p => !newPaths.has(p));
    if (toDelete.length > 0) {
      await prisma.projectFile.deleteMany({
        where: {
          projectId: project.id,
          path: { in: toDelete },
        },
      });
    }
    
    // Upsert all files
    for (const file of files) {
      await prisma.projectFile.upsert({
        where: {
          projectId_path: {
            projectId: project.id,
            path: file.path,
          },
        },
        update: {
          content: file.content || '',
          language: file.language || detectLanguage(file.path),
          size: file.content?.length || 0,
          isMain: file.path === (mainFile || project.mainFile),
          isOpen: file.isOpen || false,
        },
        create: {
          projectId: project.id,
          path: file.path,
          content: file.content || '',
          language: file.language || detectLanguage(file.path),
          size: file.content?.length || 0,
          isMain: file.path === (mainFile || project.mainFile),
          isOpen: file.isOpen || false,
        },
      });
    }
    
    // Update project metadata
    await prisma.project.update({
      where: { id: project.id },
      data: {
        editorState,
        mainFile: mainFile || project.mainFile,
        lastSavedAt: new Date(),
        userId: req.user?.id || project.userId, // Claim project if logged in
      },
    });
    
    console.log(`[Workspace] Auto-saved project: ${slug} (${files.length} files)`);
    
    res.json({
      success: true,
      savedAt: new Date().toISOString(),
      fileCount: files.length,
    });
  } catch (error) {
    console.error('[Workspace] Auto-save error:', error);
    res.status(500).json({ error: 'Failed to save project' });
  }
});

/**
 * POST /api/workspace/projects/:slug/file - Save single file
 */
router.post('/projects/:slug/file', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const { path, content, language, isOpen } = req.body;
    
    if (!path) {
      return res.status(400).json({ error: 'File path required' });
    }
    
    const project = await prisma.project.findUnique({
      where: { slug },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.userId && project.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const file = await prisma.projectFile.upsert({
      where: {
        projectId_path: {
          projectId: project.id,
          path,
        },
      },
      update: {
        content: content || '',
        language: language || detectLanguage(path),
        size: content?.length || 0,
        isOpen: isOpen ?? true,
      },
      create: {
        projectId: project.id,
        path,
        content: content || '',
        language: language || detectLanguage(path),
        size: content?.length || 0,
        isOpen: isOpen ?? true,
      },
    });
    
    // Update project lastSavedAt
    await prisma.project.update({
      where: { id: project.id },
      data: { lastSavedAt: new Date() },
    });
    
    res.json({ success: true, file });
  } catch (error) {
    console.error('[Workspace] Save file error:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

/**
 * DELETE /api/workspace/projects/:slug/file - Delete single file
 */
router.delete('/projects/:slug/file', requireAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const { path } = req.body;
    
    if (!path) {
      return res.status(400).json({ error: 'File path required' });
    }
    
    const project = await prisma.project.findUnique({
      where: { slug },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await prisma.projectFile.deleteMany({
      where: {
        projectId: project.id,
        path,
      },
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Workspace] Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ============================================================================
// VERSIONING
// ============================================================================

/**
 * POST /api/workspace/projects/:slug/version - Create version snapshot
 */
router.post('/projects/:slug/version', requireAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const { name } = req.body;
    
    const project = await prisma.project.findUnique({
      where: { slug },
      include: { files: true, versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const nextVersion = (project.versions[0]?.version || 0) + 1;
    
    const version = await prisma.projectVersion.create({
      data: {
        projectId: project.id,
        version: nextVersion,
        name: name || `Version ${nextVersion}`,
        filesSnapshot: project.files.map(f => ({
          path: f.path,
          content: f.content,
          language: f.language,
        })),
        editorState: project.editorState,
      },
    });
    
    console.log(`[Workspace] Created version ${nextVersion} for ${slug}`);
    
    res.json({ success: true, version });
  } catch (error) {
    console.error('[Workspace] Create version error:', error);
    res.status(500).json({ error: 'Failed to create version' });
  }
});

/**
 * GET /api/workspace/projects/:slug/versions - List versions
 */
router.get('/projects/:slug/versions', requireAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    
    const project = await prisma.project.findUnique({
      where: { slug },
      include: {
        versions: {
          select: {
            id: true,
            version: true,
            name: true,
            createdAt: true,
          },
          orderBy: { version: 'desc' },
        },
      },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ success: true, versions: project.versions });
  } catch (error) {
    console.error('[Workspace] List versions error:', error);
    res.status(500).json({ error: 'Failed to list versions' });
  }
});

/**
 * POST /api/workspace/projects/:slug/restore/:version - Restore version
 */
router.post('/projects/:slug/restore/:version', requireAuth, async (req, res) => {
  try {
    const { slug, version } = req.params;
    
    const project = await prisma.project.findUnique({
      where: { slug },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const versionData = await prisma.projectVersion.findFirst({
      where: {
        projectId: project.id,
        version: parseInt(version),
      },
    });
    
    if (!versionData) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    // Delete current files and restore from snapshot
    await prisma.projectFile.deleteMany({
      where: { projectId: project.id },
    });
    
    const files = versionData.filesSnapshot;
    for (const file of files) {
      await prisma.projectFile.create({
        data: {
          projectId: project.id,
          path: file.path,
          content: file.content || '',
          language: file.language || detectLanguage(file.path),
          size: file.content?.length || 0,
        },
      });
    }
    
    // Update editor state
    await prisma.project.update({
      where: { id: project.id },
      data: {
        editorState: versionData.editorState,
        lastSavedAt: new Date(),
      },
    });
    
    console.log(`[Workspace] Restored version ${version} for ${slug}`);
    
    res.json({ success: true, restoredVersion: parseInt(version) });
  } catch (error) {
    console.error('[Workspace] Restore version error:', error);
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

// ============================================================================
// QUICK SAVE (For anonymous users - generates new slug)
// ============================================================================

/**
 * POST /api/workspace/quick-save - Save project and get shareable slug
 */
router.post('/quick-save', optionalAuth, async (req, res) => {
  try {
    const { name, files, editorState, mainFile, language, framework, originalPrompt } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'At least one file is required' });
    }
    
    const slug = generateSlug(name || 'untitled');
    
    const project = await prisma.project.create({
      data: {
        userId: req.user?.id || null,
        name: name || 'Untitled Project',
        slug,
        language: language || 'html',
        framework,
        mainFile: mainFile || files[0]?.path || 'index.html',
        editorState,
        originalPrompt,
        lastSavedAt: new Date(),
        files: {
          create: files.map(file => ({
            path: file.path,
            content: file.content || '',
            language: file.language || detectLanguage(file.path),
            size: file.content?.length || 0,
            isMain: file.path === (mainFile || files[0]?.path),
            isOpen: file.isOpen || false,
          })),
        },
      },
    });
    
    console.log(`[Workspace] Quick-saved project: ${slug}`);
    
    res.json({
      success: true,
      slug: project.slug,
      projectId: project.id,
      url: `/canvas-studio?project=${project.slug}`,
    });
  } catch (error) {
    console.error('[Workspace] Quick-save error:', error);
    res.status(500).json({ error: 'Failed to save project' });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

router.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'workspace' });
});

export default router;
