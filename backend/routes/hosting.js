import express from 'express';
import crypto from 'crypto';
import * as jose from 'jose';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

const JWT_SECRET = process.env.NEURAL_LINK_JWT_SECRET || process.env.JWT_SECRET || 'neural-link-secret-key-2026';

// Auth middleware for hosting routes
const requireAuth = async (req, res, next) => {
  try {
    const sessionToken = req.cookies?.neural_link_session;
    const mainSessionId = req.cookies?.session_id || req.cookies?.sessionId;
    
    if (sessionToken) {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jose.jwtVerify(sessionToken, secret);
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (user) { req.user = user; return next(); }
    }
    
    if (mainSessionId) {
      const mainUser = await prisma.$queryRaw`SELECT id, email FROM "User" WHERE "sessionId" = ${mainSessionId} LIMIT 1`;
      if (mainUser?.length > 0) {
        let nlUser = await prisma.user.findUnique({ where: { onelastaiUserId: mainUser[0].id } });
        if (nlUser) { req.user = nlUser; return next(); }
      }
    }
    
    return res.status(401).json({ error: 'Authentication required', requiresLogin: true });
  } catch {
    return res.status(401).json({ error: 'Authentication failed', requiresLogin: true });
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a unique slug for the hosted app
 */
function generateSlug(name) {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
  
  const uniqueId = crypto.randomBytes(4).toString('hex');
  return `${cleanName}-${uniqueId}`;
}

/**
 * Generate HTML wrapper for different languages
 */
function generateHostedHtml(code, language, appName) {
  switch (language) {
    case 'html':
      // If it's already complete HTML, return as is
      if (code.includes('<!DOCTYPE') || code.includes('<html')) {
        return code;
      }
      // Wrap partial HTML in a complete document
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
${code}
</body>
</html>`;

    case 'react':
    case 'typescript':
    case 'tsx':
      // For React/TSX, we need to wrap in a React runtime
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react,typescript">
${code}

// Auto-render the App component
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  if (typeof App !== 'undefined') {
    root.render(React.createElement(App));
  } else if (typeof default_export !== 'undefined') {
    root.render(React.createElement(default_export));
  }
}
  </script>
</body>
</html>`;

    case 'javascript':
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
${code}
  </script>
</body>
</html>`;

    case 'python':
      // For Python, use Pyodide for browser execution
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
    #output { 
      background: #1a1a2e; 
      color: #0f0; 
      padding: 20px; 
      border-radius: 8px; 
      font-family: monospace;
      white-space: pre-wrap;
      min-height: 200px;
    }
    .loading { color: #888; }
  </style>
</head>
<body>
  <h1 class="text-2xl font-bold mb-4">${appName}</h1>
  <div id="output" class="loading">Loading Python runtime...</div>
  <script>
    async function runPython() {
      const output = document.getElementById('output');
      try {
        const pyodide = await loadPyodide();
        output.textContent = '';
        output.classList.remove('loading');
        
        // Capture print output
        pyodide.runPython(\`
import sys
from io import StringIO
sys.stdout = StringIO()
\`);
        
        // Run the user code
        pyodide.runPython(\`${code.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`);
        
        // Get the output
        const stdout = pyodide.runPython('sys.stdout.getvalue()');
        output.textContent = stdout || '(No output)';
      } catch (error) {
        output.textContent = 'Error: ' + error.message;
        output.style.color = '#f55';
      }
    }
    runPython();
  </script>
</body>
</html>`;

    default:
      // Fallback: show code in a pre block
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-gray-100 p-8">
  <h1 class="text-2xl font-bold mb-4">${appName}</h1>
  <pre class="bg-gray-800 p-4 rounded-lg overflow-auto"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
</body>
</html>`;
  }
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * GET /api/hosting/health
 * Health check endpoint for the hosting service
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'hosting',
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// BUILD PIPELINE
// =============================================================================

/**
 * POST /api/hosting/build
 * Build/bundle a project before deployment
 * Handles multi-file projects and prepares them for hosting
 */
router.post('/build', requireAuth, async (req, res) => {
  try {
    const {
      files,           // Array of {path, content, language}
      projectType = 'STATIC',  // STATIC, SPA, FULLSTACK
      mainFile,        // Entry point file
      buildCommand,    // Optional custom build command
      framework,       // react, vue, html, etc.
    } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Files array is required' });
    }

    console.log(`[Build] Starting build for ${projectType} project with ${files.length} files`);

    const buildResult = {
      success: true,
      projectType,
      files: [],
      mainFile: mainFile || files[0]?.path,
      buildTime: 0,
      warnings: [],
    };

    const startTime = Date.now();

    // Process files based on project type
    for (const file of files) {
      const { path: filePath, content, language } = file;
      
      // Basic validation
      if (!filePath || content === undefined) {
        buildResult.warnings.push(`Skipping invalid file entry`);
        continue;
      }

      // Process file based on type
      let processedContent = content;
      let processedPath = filePath;

      // For React/TSX files, we need to transpile (in a real system, use esbuild/babel)
      if (language === 'typescript' || filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        // In production, transpile TypeScript here
        // For now, we'll handle it in the hosting render
        buildResult.files.push({
          path: processedPath,
          content: processedContent,
          language: 'typescript',
          size: Buffer.byteLength(processedContent, 'utf8'),
        });
      } else if (language === 'javascript' || filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
        buildResult.files.push({
          path: processedPath,
          content: processedContent,
          language: 'javascript',
          size: Buffer.byteLength(processedContent, 'utf8'),
        });
      } else {
        // HTML, CSS, JSON, etc. - pass through
        buildResult.files.push({
          path: processedPath,
          content: processedContent,
          language: language || 'text',
          size: Buffer.byteLength(processedContent, 'utf8'),
        });
      }
    }

    buildResult.buildTime = Date.now() - startTime;
    buildResult.totalSize = buildResult.files.reduce((sum, f) => sum + f.size, 0);

    console.log(`[Build] Completed in ${buildResult.buildTime}ms, ${buildResult.files.length} files, ${buildResult.totalSize} bytes`);

    res.json(buildResult);

  } catch (error) {
    console.error('[Build] Error:', error);
    res.status(500).json({ 
      error: 'Build failed', 
      details: error.message 
    });
  }
});

/**
 * POST /api/hosting/deploy-project
 * Deploy a multi-file project (build + deploy in one step)
 */
router.post('/deploy-project', requireAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      files,            // Array of {path, content, language}
      projectType = 'STATIC',
      mainFile,
      framework,
      isPublic = true,
      userId,
      originalPrompt,
      aiModel,
      aiProvider,
      buildCommand,
      startCommand,
      envVars,
      hasBackend = false,
      backendType,
      hasDatabase = false,
      databaseType,
    } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Files array is required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'App name is required' });
    }

    console.log(`[Deploy Project] Starting deploy for "${name}" with ${files.length} files`);

    // Generate unique slug
    const slug = generateSlug(name);

    // For single-file or simple projects, combine into main code
    // For multi-file, store as JSON
    let mainCode = '';
    const mainFilePath = mainFile || files[0]?.path;
    const mainFileData = files.find(f => f.path === mainFilePath);
    
    if (mainFileData) {
      mainCode = mainFileData.content;
    }

    // Detect language from main file
    let detectedLanguage = 'html';
    if (mainFilePath) {
      if (mainFilePath.endsWith('.tsx') || mainFilePath.endsWith('.ts')) {
        detectedLanguage = 'typescript';
      } else if (mainFilePath.endsWith('.jsx') || mainFilePath.endsWith('.js')) {
        detectedLanguage = 'javascript';
      } else if (mainFilePath.endsWith('.py')) {
        detectedLanguage = 'python';
      } else if (mainFilePath.includes('App.tsx') || mainFilePath.includes('App.jsx')) {
        detectedLanguage = 'react';
      }
    }

    // Create the hosted app with project structure
    const hostedApp = await prisma.hostedApp.create({
      data: {
        slug,
        name,
        description,
        code: mainCode,              // Main file content for quick render
        language: detectedLanguage,
        framework,
        isPublic,
        userId: userId || null,
        originalPrompt,
        aiModel,
        aiProvider,
        publishedAt: new Date(),
        status: 'ACTIVE',
        // Store full project structure as JSON (if schema supports it)
        // files: files, // Uncomment when schema is updated
      }
    });

    // Create first version
    await prisma.hostedAppVersion.create({
      data: {
        appId: hostedApp.id,
        version: 1,
        code: mainCode,
        changeNote: 'Initial deployment'
      }
    });

    // Generate the public URL
    const baseUrl = process.env.HOSTED_APPS_URL || 'https://maula.onelastai.co';
    const publicUrl = `${baseUrl}/app/${slug}`;

    console.log(`[Deploy Project] Success! URL: ${publicUrl}`);

    res.json({
      success: true,
      app: {
        id: hostedApp.id,
        slug: hostedApp.slug,
        name: hostedApp.name,
        url: publicUrl,
        renderUrl: `${baseUrl}/api/hosting/render/${slug}`,
        language: detectedLanguage,
        framework,
        projectType,
        fileCount: files.length,
        createdAt: hostedApp.createdAt
      }
    });

  } catch (error) {
    console.error('[Deploy Project] Error:', error);
    res.status(500).json({ 
      error: 'Failed to deploy project', 
      details: error.message 
    });
  }
});

// =============================================================================
// DEPLOY / PUBLISH APP
// =============================================================================

/**
 * POST /api/hosting/deploy
 * Deploy/publish an app to get a shareable URL
 */
router.post('/deploy', requireAuth, async (req, res) => {
  try {
    const { 
      code, 
      name, 
      description, 
      language = 'html',
      isPublic = true,
      userId,
      originalPrompt,
      aiModel,
      aiProvider
    } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'App name is required' });
    }

    // Generate unique slug
    const slug = generateSlug(name);

    // Create the hosted app
    const hostedApp = await prisma.hostedApp.create({
      data: {
        slug,
        name,
        description,
        code,
        language,
        isPublic,
        userId: userId || null,
        originalPrompt,
        aiModel,
        aiProvider,
        publishedAt: new Date(),
        status: 'ACTIVE'
      }
    });

    // Also create first version
    await prisma.hostedAppVersion.create({
      data: {
        appId: hostedApp.id,
        version: 1,
        code,
        changeNote: 'Initial deployment'
      }
    });

    // Generate the public URL
    const baseUrl = process.env.HOSTED_APPS_URL || 'https://maula.onelastai.co';
    const publicUrl = `${baseUrl}/app/${slug}`;

    res.json({
      success: true,
      app: {
        id: hostedApp.id,
        slug: hostedApp.slug,
        name: hostedApp.name,
        url: publicUrl,
        language: hostedApp.language,
        createdAt: hostedApp.createdAt
      }
    });

  } catch (error) {
    console.error('Deploy error:', error);
    res.status(500).json({ error: 'Failed to deploy app', details: error.message });
  }
});

// =============================================================================
// GET HOSTED APP (Public View)
// =============================================================================

/**
 * GET /api/hosting/app/:slug
 * Get app by slug for public viewing
 */
router.get('/app/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const app = await prisma.hostedApp.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        code: true,
        language: true,
        isPublic: true,
        status: true,
        viewCount: true,
        createdAt: true,
        publishedAt: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    if (app.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'App is not available' });
    }

    if (!app.isPublic) {
      // TODO: Add auth check for private apps
      return res.status(403).json({ error: 'This app is private' });
    }

    // Increment view count (fire and forget)
    prisma.hostedApp.update({
      where: { id: app.id },
      data: { 
        viewCount: { increment: 1 },
        lastViewedAt: new Date()
      }
    }).catch(err => console.error('Failed to update view count:', err));

    res.json({ app });

  } catch (error) {
    console.error('Get app error:', error);
    res.status(500).json({ error: 'Failed to get app', details: error.message });
  }
});

/**
 * GET /api/hosting/render/:slug
 * Render the app as HTML for iframe/direct viewing
 */
router.get('/render/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const app = await prisma.hostedApp.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        code: true,
        language: true,
        isPublic: true,
        status: true
      }
    });

    if (!app) {
      return res.status(404).send(`
        <html>
          <head><title>Not Found</title></head>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #1a1a2e; color: white;">
            <div style="text-align: center;">
              <h1>404 - App Not Found</h1>
              <p>The app you're looking for doesn't exist.</p>
            </div>
          </body>
        </html>
      `);
    }

    if (app.status !== 'ACTIVE' || !app.isPublic) {
      return res.status(403).send(`
        <html>
          <head><title>Access Denied</title></head>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #1a1a2e; color: white;">
            <div style="text-align: center;">
              <h1>Access Denied</h1>
              <p>This app is not available.</p>
            </div>
          </body>
        </html>
      `);
    }

    // Increment view count (fire and forget)
    prisma.hostedApp.update({
      where: { id: app.id },
      data: { 
        viewCount: { increment: 1 },
        lastViewedAt: new Date()
      }
    }).catch(err => console.error('Failed to update view count:', err));

    // Generate and return HTML
    const html = generateHostedHtml(app.code, app.language, app.name);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Render error:', error);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #1a1a2e; color: white;">
          <div style="text-align: center;">
            <h1>Error</h1>
            <p>Failed to render app: ${error.message}</p>
          </div>
        </body>
      </html>
    `);
  }
});

// =============================================================================
// USER'S HOSTED APPS
// =============================================================================

/**
 * GET /api/hosting/my-apps
 * Get all apps for authenticated user
 */
router.get('/my-apps', requireAuth, async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const apps = await prisma.hostedApp.findMany({
      where: { 
        userId,
        status: { not: 'DELETED' }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        language: true,
        isPublic: true,
        viewCount: true,
        status: true,
        createdAt: true,
        publishedAt: true,
        customDomain: true
      }
    });

    const baseUrl = process.env.HOSTED_APPS_URL || 'https://maula.onelastai.co';
    
    // Add URLs to each app
    const appsWithUrls = apps.map(app => ({
      ...app,
      url: `${baseUrl}/app/${app.slug}`,
      embedUrl: `${baseUrl}/api/hosting/render/${app.slug}`
    }));

    res.json({ apps: appsWithUrls });

  } catch (error) {
    console.error('Get my apps error:', error);
    res.status(500).json({ error: 'Failed to get apps', details: error.message });
  }
});

// =============================================================================
// UPDATE APP
// =============================================================================

/**
 * PUT /api/hosting/app/:id
 * Update an existing hosted app
 */
router.put('/app/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, description, isPublic, userId } = req.body;

    // Get existing app
    const existingApp = await prisma.hostedApp.findUnique({
      where: { id },
      select: { id: true, userId: true, code: true }
    });

    if (!existingApp) {
      return res.status(404).json({ error: 'App not found' });
    }

    // Check ownership
    if (existingApp.userId && existingApp.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this app' });
    }

    // Get latest version number
    const latestVersion = await prisma.hostedAppVersion.findFirst({
      where: { appId: id },
      orderBy: { version: 'desc' },
      select: { version: true }
    });

    const newVersionNumber = (latestVersion?.version || 0) + 1;

    // Update app and create new version
    const [updatedApp] = await prisma.$transaction([
      prisma.hostedApp.update({
        where: { id },
        data: {
          ...(code && { code }),
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(isPublic !== undefined && { isPublic })
        }
      }),
      ...(code && code !== existingApp.code ? [
        prisma.hostedAppVersion.create({
          data: {
            appId: id,
            version: newVersionNumber,
            code,
            changeNote: 'Code updated'
          }
        })
      ] : [])
    ]);

    const baseUrl = process.env.HOSTED_APPS_URL || 'https://maula.onelastai.co';

    res.json({
      success: true,
      app: {
        id: updatedApp.id,
        slug: updatedApp.slug,
        name: updatedApp.name,
        url: `${baseUrl}/app/${updatedApp.slug}`,
        version: newVersionNumber
      }
    });

  } catch (error) {
    console.error('Update app error:', error);
    res.status(500).json({ error: 'Failed to update app', details: error.message });
  }
});

// =============================================================================
// DELETE APP
// =============================================================================

/**
 * DELETE /api/hosting/app/:id
 * Soft delete an app
 */
router.delete('/app/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    const app = await prisma.hostedApp.findUnique({
      where: { id },
      select: { id: true, userId: true }
    });

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    // Check ownership
    if (app.userId && app.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this app' });
    }

    // Soft delete
    await prisma.hostedApp.update({
      where: { id },
      data: { status: 'DELETED' }
    });

    res.json({ success: true, message: 'App deleted' });

  } catch (error) {
    console.error('Delete app error:', error);
    res.status(500).json({ error: 'Failed to delete app', details: error.message });
  }
});

// =============================================================================
// CUSTOM DOMAIN
// =============================================================================

/**
 * POST /api/hosting/app/:id/domain
 * Set custom domain for an app
 */
router.post('/app/:id/domain', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { domain, userId } = req.body;

    const app = await prisma.hostedApp.findUnique({
      where: { id },
      select: { id: true, userId: true }
    });

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    // Check ownership
    if (app.userId && app.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Validate domain format
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    // Check if domain is already in use
    const existingDomain = await prisma.hostedApp.findFirst({
      where: { 
        customDomain: domain,
        id: { not: id }
      }
    });

    if (existingDomain) {
      return res.status(400).json({ error: 'Domain is already in use' });
    }

    // Update app with custom domain
    const updatedApp = await prisma.hostedApp.update({
      where: { id },
      data: { customDomain: domain }
    });

    res.json({
      success: true,
      domain,
      message: 'Custom domain set. Please add CNAME record pointing to canvas.onelast.ai',
      dnsInstructions: {
        type: 'CNAME',
        name: domain.split('.')[0],
        value: 'canvas.onelast.ai'
      }
    });

  } catch (error) {
    console.error('Set domain error:', error);
    res.status(500).json({ error: 'Failed to set domain', details: error.message });
  }
});

// =============================================================================
// APP VERSIONS
// =============================================================================

/**
 * GET /api/hosting/app/:id/versions
 * Get all versions of an app
 */
router.get('/app/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;

    const versions = await prisma.hostedAppVersion.findMany({
      where: { appId: id },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        changeNote: true,
        createdAt: true
      }
    });

    res.json({ versions });

  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ error: 'Failed to get versions', details: error.message });
  }
});

/**
 * POST /api/hosting/app/:id/rollback/:version
 * Rollback to a specific version
 */
router.post('/app/:id/rollback/:version', requireAuth, async (req, res) => {
  try {
    const { id, version } = req.params;
    const { userId } = req.body;

    const app = await prisma.hostedApp.findUnique({
      where: { id },
      select: { id: true, userId: true }
    });

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    if (app.userId && app.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const targetVersion = await prisma.hostedAppVersion.findFirst({
      where: { 
        appId: id,
        version: parseInt(version)
      }
    });

    if (!targetVersion) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Update app with the old version's code
    await prisma.hostedApp.update({
      where: { id },
      data: { code: targetVersion.code }
    });

    res.json({ 
      success: true, 
      message: `Rolled back to version ${version}` 
    });

  } catch (error) {
    console.error('Rollback error:', error);
    res.status(500).json({ error: 'Failed to rollback', details: error.message });
  }
});

export default router;
