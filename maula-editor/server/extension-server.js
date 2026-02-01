/**
 * Extension Marketplace Server
 * Handles extension registry, installation, updates, and sandboxed execution
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
const vm = require('vm');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Socket.IO for real-time extension updates
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173', /\.github\.dev$/, /\.app\.github\.dev$/],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============== EXTENSION REGISTRY ==============
// In-memory store (would be database in production)
const extensionRegistry = new Map();
const userExtensions = new Map(); // userId -> Set<extensionId>
const projectExtensions = new Map(); // projectId -> Set<extensionId>
const extensionSandboxes = new Map(); // extensionId -> sandbox context

// Seed with built-in extensions
const builtInExtensions = [
  {
    id: 'prettier',
    slug: 'prettier',
    name: 'Prettier - Code Formatter',
    description: 'Code formatter using Prettier with support for JavaScript, TypeScript, CSS, HTML, JSON, and more',
    version: '10.4.0',
    author: 'Prettier',
    icon: '✨',
    category: 'Formatters',
    downloads: 45000000,
    rating: 4.8,
    verified: true,
    tags: ['formatter', 'beautify', 'code-style'],
    permissions: ['files:read', 'files:write', 'editor:format'],
    config: { tabWidth: 2, semi: true, singleQuote: true },
    main: `
      module.exports = {
        activate(context) {
          context.registerCommand('prettier.format', () => {
            const editor = context.api.editor;
            const content = editor.getContent();
            // Format logic here
            context.api.ui.showNotification('Code formatted!', 'success');
          });
        },
        deactivate() {}
      };
    `
  },
  {
    id: 'eslint',
    slug: 'eslint',
    name: 'ESLint',
    description: 'Integrates ESLint JavaScript linting into VS Code',
    version: '3.0.5',
    author: 'Microsoft',
    icon: '🔍',
    category: 'Linters',
    downloads: 32000000,
    rating: 4.7,
    verified: true,
    tags: ['linter', 'javascript', 'typescript'],
    permissions: ['files:read', 'editor:diagnostics'],
    config: { rules: {} },
    main: `
      module.exports = {
        activate(context) {
          context.registerCommand('eslint.lint', () => {
            context.api.ui.showNotification('Linting complete!', 'info');
          });
        },
        deactivate() {}
      };
    `
  },
  {
    id: 'git-lens',
    slug: 'gitlens',
    name: 'GitLens — Git supercharged',
    description: 'Supercharge Git with blame annotations, code lens, and more',
    version: '15.0.4',
    author: 'GitKraken',
    icon: '🔀',
    category: 'SCM',
    downloads: 28000000,
    rating: 4.9,
    verified: true,
    tags: ['git', 'blame', 'history'],
    permissions: ['files:read', 'git:read'],
    config: {},
    main: `
      module.exports = {
        activate(context) {
          context.registerCommand('gitlens.blame', () => {
            context.api.ui.showNotification('Git blame activated', 'info');
          });
        },
        deactivate() {}
      };
    `
  },
  {
    id: 'auto-rename-tag',
    slug: 'auto-rename-tag',
    name: 'Auto Rename Tag',
    description: 'Automatically rename paired HTML/XML tags',
    version: '0.1.10',
    author: 'Jun Han',
    icon: '🏷️',
    category: 'Languages',
    downloads: 15000000,
    rating: 4.5,
    verified: true,
    tags: ['html', 'xml', 'tags'],
    permissions: ['editor:edit'],
    config: {},
    main: `
      module.exports = {
        activate(context) {
          console.log('Auto Rename Tag activated');
        },
        deactivate() {}
      };
    `
  },
  {
    id: 'bracket-pair-colorizer',
    slug: 'bracket-pair-colorizer',
    name: 'Bracket Pair Colorizer',
    description: 'Colorizes matching brackets for better code readability',
    version: '2.0.2',
    author: 'CoenraadS',
    icon: '🌈',
    category: 'Visual',
    downloads: 12000000,
    rating: 4.6,
    verified: true,
    tags: ['brackets', 'colors', 'visual'],
    permissions: ['editor:decorate'],
    config: { colors: ['#ffd700', '#da70d6', '#87ceeb'] },
    main: `
      module.exports = {
        activate(context) {
          console.log('Bracket colorizer activated');
        },
        deactivate() {}
      };
    `
  },
  {
    id: 'live-server',
    slug: 'live-server',
    name: 'Live Server',
    description: 'Launch a development local server with live reload',
    version: '5.7.9',
    author: 'Ritwick Dey',
    icon: '📡',
    category: 'Tools',
    downloads: 42000000,
    rating: 4.7,
    verified: true,
    tags: ['server', 'live-reload', 'preview'],
    permissions: ['terminal:execute', 'files:read'],
    config: { port: 5500 },
    main: `
      module.exports = {
        activate(context) {
          context.registerCommand('liveServer.start', () => {
            context.api.terminal.execute('npx serve .');
            context.api.ui.showNotification('Live server started on port 5500', 'success');
          });
        },
        deactivate() {}
      };
    `
  },
  {
    id: 'path-intellisense',
    slug: 'path-intellisense',
    name: 'Path Intellisense',
    description: 'Autocompletes filenames in your code',
    version: '2.8.5',
    author: 'Christian Kohler',
    icon: '📁',
    category: 'Languages',
    downloads: 11000000,
    rating: 4.4,
    verified: true,
    tags: ['autocomplete', 'path', 'intellisense'],
    permissions: ['files:list', 'editor:complete'],
    config: {},
    main: `
      module.exports = {
        activate(context) {
          console.log('Path Intellisense activated');
        },
        deactivate() {}
      };
    `
  },
  {
    id: 'material-icon-theme',
    slug: 'material-icon-theme',
    name: 'Material Icon Theme',
    description: 'Material Design icons for your files and folders',
    version: '5.0.0',
    author: 'Philipp Kief',
    icon: '🎨',
    category: 'Themes',
    downloads: 20000000,
    rating: 4.9,
    verified: true,
    tags: ['icons', 'theme', 'material'],
    permissions: ['ui:icons'],
    config: {},
    main: `
      module.exports = {
        activate(context) {
          console.log('Material icons activated');
        },
        deactivate() {}
      };
    `
  },
  {
    id: 'github-copilot',
    slug: 'github-copilot',
    name: 'GitHub Copilot',
    description: 'AI pair programmer that suggests code completions',
    version: '1.150.0',
    author: 'GitHub',
    icon: '🤖',
    category: 'AI',
    downloads: 15000000,
    rating: 4.8,
    verified: true,
    tags: ['ai', 'copilot', 'autocomplete'],
    permissions: ['editor:complete', 'ai:suggest'],
    config: {},
    main: `
      module.exports = {
        activate(context) {
          context.api.ui.showNotification('GitHub Copilot ready!', 'success');
        },
        deactivate() {}
      };
    `
  },
  {
    id: 'tailwind-intellisense',
    slug: 'tailwindcss-intellisense',
    name: 'Tailwind CSS IntelliSense',
    description: 'Intelligent Tailwind CSS tooling for VS Code',
    version: '0.12.0',
    author: 'Tailwind Labs',
    icon: '💨',
    category: 'Languages',
    downloads: 9000000,
    rating: 4.8,
    verified: true,
    tags: ['tailwind', 'css', 'intellisense'],
    permissions: ['editor:complete', 'files:read'],
    config: {},
    main: `
      module.exports = {
        activate(context) {
          console.log('Tailwind IntelliSense activated');
        },
        deactivate() {}
      };
    `
  },
  {
    id: 'docker',
    slug: 'docker',
    name: 'Docker',
    description: 'Makes it easy to build, manage, and deploy containerized applications',
    version: '1.28.0',
    author: 'Microsoft',
    icon: '🐳',
    category: 'Tools',
    downloads: 25000000,
    rating: 4.6,
    verified: true,
    tags: ['docker', 'containers', 'devops'],
    permissions: ['terminal:execute', 'files:read'],
    config: {},
    main: `
      module.exports = {
        activate(context) {
          context.registerCommand('docker.build', () => {
            context.api.terminal.execute('docker build .');
          });
        },
        deactivate() {}
      };
    `
  },
  {
    id: 'python',
    slug: 'python',
    name: 'Python',
    description: 'Rich Python language support with IntelliSense, linting, debugging',
    version: '2024.2.1',
    author: 'Microsoft',
    icon: '🐍',
    category: 'Languages',
    downloads: 95000000,
    rating: 4.7,
    verified: true,
    tags: ['python', 'intellisense', 'debug'],
    permissions: ['editor:complete', 'terminal:execute', 'debug:start'],
    config: {},
    main: `
      module.exports = {
        activate(context) {
          console.log('Python extension activated');
        },
        deactivate() {}
      };
    `
  },
  {
    id: 'thunder-client',
    slug: 'thunder-client',
    name: 'Thunder Client',
    description: 'Lightweight REST API Client for VS Code',
    version: '2.17.0',
    author: 'Thunder Client',
    icon: '⚡',
    category: 'API',
    downloads: 7000000,
    rating: 4.9,
    verified: true,
    tags: ['api', 'rest', 'http'],
    permissions: ['network:fetch'],
    config: {},
    main: `
      module.exports = {
        activate(context) {
          context.registerCommand('thunder.newRequest', () => {
            context.api.ui.showNotification('Thunder Client ready!', 'info');
          });
        },
        deactivate() {}
      };
    `
  },
  {
    id: 'code-spell-checker',
    slug: 'code-spell-checker',
    name: 'Code Spell Checker',
    description: 'Spelling checker for source code',
    version: '3.0.1',
    author: 'Street Side Software',
    icon: '📝',
    category: 'Linters',
    downloads: 8000000,
    rating: 4.5,
    verified: true,
    tags: ['spell', 'checker', 'typo'],
    permissions: ['editor:diagnostics'],
    config: { language: 'en' },
    main: `
      module.exports = {
        activate(context) {
          console.log('Spell checker activated');
        },
        deactivate() {}
      };
    `
  },
  {
    id: 'import-cost',
    slug: 'import-cost',
    name: 'Import Cost',
    description: 'Display import/require package size inline',
    version: '3.3.0',
    author: 'Wix',
    icon: '📦',
    category: 'Tools',
    downloads: 4000000,
    rating: 4.3,
    verified: true,
    tags: ['import', 'bundle', 'size'],
    permissions: ['editor:decorate', 'files:read'],
    config: {},
    main: `
      module.exports = {
        activate(context) {
          console.log('Import Cost activated');
        },
        deactivate() {}
      };
    `
  }
];

// Initialize registry
builtInExtensions.forEach(ext => {
  extensionRegistry.set(ext.id, {
    ...ext,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
});

// ============== SECURITY SANDBOX ==============
function createSandbox(extensionId, permissions) {
  const sandbox = {
    console: {
      log: (...args) => console.log(`[${extensionId}]`, ...args),
      warn: (...args) => console.warn(`[${extensionId}]`, ...args),
      error: (...args) => console.error(`[${extensionId}]`, ...args),
    },
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    Promise,
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Map,
    Set,
    // Sandboxed module system
    module: { exports: {} },
    exports: {},
    require: (name) => {
      // Whitelist allowed modules
      const allowed = ['lodash', 'dayjs', 'uuid'];
      if (allowed.includes(name)) {
        return require(name);
      }
      throw new Error(`Module '${name}' is not allowed in extensions`);
    }
  };

  return vm.createContext(sandbox);
}

function executeExtension(extensionId, code, context) {
  const extension = extensionRegistry.get(extensionId);
  if (!extension) throw new Error('Extension not found');

  const sandbox = createSandbox(extensionId, extension.permissions || []);
  
  try {
    const script = new vm.Script(code, {
      filename: `${extensionId}.js`,
      timeout: 5000 // 5 second timeout
    });
    
    script.runInContext(sandbox);
    
    // Call activate if exists
    if (sandbox.module.exports.activate) {
      sandbox.module.exports.activate(context);
    }
    
    extensionSandboxes.set(extensionId, sandbox);
    return { success: true };
  } catch (error) {
    console.error(`Extension ${extensionId} error:`, error.message);
    return { success: false, error: error.message };
  }
}

// ============== REST API ==============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', extensions: extensionRegistry.size });
});

// Get all extensions (marketplace)
app.get('/api/extensions', (req, res) => {
  const { category, search, sort = 'downloads' } = req.query;
  
  let extensions = Array.from(extensionRegistry.values());
  
  // Filter by category
  if (category && category !== 'all') {
    extensions = extensions.filter(e => e.category.toLowerCase() === category.toLowerCase());
  }
  
  // Search
  if (search) {
    const q = search.toLowerCase();
    extensions = extensions.filter(e => 
      e.name.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.tags?.some(t => t.toLowerCase().includes(q))
    );
  }
  
  // Sort
  if (sort === 'downloads') {
    extensions.sort((a, b) => b.downloads - a.downloads);
  } else if (sort === 'rating') {
    extensions.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'name') {
    extensions.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  res.json({ 
    extensions,
    total: extensions.length,
    categories: [...new Set(Array.from(extensionRegistry.values()).map(e => e.category))]
  });
});

// Get single extension
app.get('/api/extensions/:id', (req, res) => {
  const extension = extensionRegistry.get(req.params.id);
  if (!extension) {
    return res.status(404).json({ error: 'Extension not found' });
  }
  res.json({ extension });
});

// Get extension recommendations based on project type
app.get('/api/extensions/recommendations/:projectType', (req, res) => {
  const { projectType } = req.params;
  
  const recommendations = {
    'javascript': ['prettier', 'eslint', 'path-intellisense', 'import-cost'],
    'typescript': ['prettier', 'eslint', 'path-intellisense', 'import-cost'],
    'react': ['prettier', 'eslint', 'tailwind-intellisense', 'auto-rename-tag'],
    'python': ['python', 'code-spell-checker'],
    'html': ['auto-rename-tag', 'live-server', 'prettier'],
    'css': ['tailwind-intellisense', 'prettier'],
    'docker': ['docker'],
    'git': ['git-lens'],
    'api': ['thunder-client'],
    'default': ['prettier', 'eslint', 'git-lens', 'bracket-pair-colorizer']
  };
  
  const recommendedIds = recommendations[projectType] || recommendations['default'];
  const recommendedExtensions = recommendedIds
    .map(id => extensionRegistry.get(id))
    .filter(Boolean);
  
  res.json({ recommendations: recommendedExtensions, projectType });
});

// Install extension for user
app.post('/api/extensions/install', (req, res) => {
  const { userId, extensionId } = req.body;
  
  if (!extensionRegistry.has(extensionId)) {
    return res.status(404).json({ error: 'Extension not found' });
  }
  
  if (!userExtensions.has(userId)) {
    userExtensions.set(userId, new Set());
  }
  
  userExtensions.get(userId).add(extensionId);
  
  // Increment download count
  const ext = extensionRegistry.get(extensionId);
  ext.downloads = (ext.downloads || 0) + 1;
  
  res.json({ 
    success: true, 
    message: `Extension ${extensionId} installed`,
    extension: ext
  });
});

// Uninstall extension
app.post('/api/extensions/uninstall', (req, res) => {
  const { userId, extensionId } = req.body;
  
  if (userExtensions.has(userId)) {
    userExtensions.get(userId).delete(extensionId);
  }
  
  res.json({ success: true, message: `Extension ${extensionId} uninstalled` });
});

// Get user's installed extensions
app.get('/api/extensions/user/:userId', (req, res) => {
  const { userId } = req.params;
  const installedIds = userExtensions.get(userId) || new Set();
  
  const installed = Array.from(installedIds)
    .map(id => extensionRegistry.get(id))
    .filter(Boolean);
  
  res.json({ installed, count: installed.length });
});

// Enable/disable extension for project
app.post('/api/extensions/project/:projectId', (req, res) => {
  const { projectId } = req.params;
  const { extensionId, enabled } = req.body;
  
  if (!projectExtensions.has(projectId)) {
    projectExtensions.set(projectId, new Map());
  }
  
  projectExtensions.get(projectId).set(extensionId, enabled);
  
  res.json({ success: true, projectId, extensionId, enabled });
});

// Get project extensions
app.get('/api/extensions/project/:projectId', (req, res) => {
  const { projectId } = req.params;
  const settings = projectExtensions.get(projectId) || new Map();
  
  res.json({ 
    projectId, 
    extensions: Object.fromEntries(settings)
  });
});

// Publish new extension (for extension developers)
app.post('/api/extensions/publish', (req, res) => {
  const { id, name, description, version, author, icon, category, tags, main, permissions } = req.body;
  
  if (!id || !name || !main) {
    return res.status(400).json({ error: 'Missing required fields: id, name, main' });
  }
  
  const extension = {
    id,
    slug: id.toLowerCase().replace(/\s+/g, '-'),
    name,
    description: description || '',
    version: version || '1.0.0',
    author: author || 'Unknown',
    icon: icon || '📦',
    category: category || 'Other',
    downloads: 0,
    rating: 0,
    verified: false,
    tags: tags || [],
    permissions: permissions || [],
    main,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  extensionRegistry.set(id, extension);
  
  res.status(201).json({ success: true, extension });
});

// ============== WEBSOCKET ==============
io.on('connection', (socket) => {
  console.log(`✅ Extension client connected: ${socket.id}`);
  
  let currentUserId = null;
  
  // Auth
  socket.on('extension:auth', ({ userId }) => {
    currentUserId = userId;
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined extension room`);
  });
  
  // Get marketplace
  socket.on('extension:marketplace', ({ category, search, sort }) => {
    let extensions = Array.from(extensionRegistry.values());
    
    if (category && category !== 'all') {
      extensions = extensions.filter(e => e.category.toLowerCase() === category.toLowerCase());
    }
    
    if (search) {
      const q = search.toLowerCase();
      extensions = extensions.filter(e => 
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      );
    }
    
    if (sort === 'downloads') extensions.sort((a, b) => b.downloads - a.downloads);
    else if (sort === 'rating') extensions.sort((a, b) => b.rating - a.rating);
    
    socket.emit('extension:marketplace:response', { extensions });
  });
  
  // Install
  socket.on('extension:install', ({ extensionId }) => {
    if (!currentUserId) {
      socket.emit('extension:error', { error: 'Not authenticated' });
      return;
    }
    
    const ext = extensionRegistry.get(extensionId);
    if (!ext) {
      socket.emit('extension:error', { error: 'Extension not found' });
      return;
    }
    
    if (!userExtensions.has(currentUserId)) {
      userExtensions.set(currentUserId, new Set());
    }
    
    userExtensions.get(currentUserId).add(extensionId);
    ext.downloads++;
    
    socket.emit('extension:installed', { extension: ext });
    io.to(`user:${currentUserId}`).emit('extension:sync', {
      installed: Array.from(userExtensions.get(currentUserId))
    });
  });
  
  // Uninstall
  socket.on('extension:uninstall', ({ extensionId }) => {
    if (currentUserId && userExtensions.has(currentUserId)) {
      userExtensions.get(currentUserId).delete(extensionId);
      socket.emit('extension:uninstalled', { extensionId });
    }
  });
  
  // Execute extension
  socket.on('extension:execute', ({ extensionId }) => {
    const ext = extensionRegistry.get(extensionId);
    if (!ext) {
      socket.emit('extension:error', { error: 'Extension not found' });
      return;
    }
    
    // Create context that communicates back via socket
    const context = {
      api: {
        ui: {
          showNotification: (msg, type) => {
            socket.emit('extension:notification', { extensionId, message: msg, type });
          }
        },
        terminal: {
          execute: (cmd) => {
            socket.emit('extension:terminal', { command: cmd });
          }
        }
      },
      registerCommand: (id, handler) => {
        console.log(`[${extensionId}] Registered command: ${id}`);
      }
    };
    
    const result = executeExtension(extensionId, ext.main, context);
    socket.emit('extension:executed', { extensionId, ...result });
  });
  
  // Get recommendations
  socket.on('extension:recommendations', ({ projectType }) => {
    const recommendations = {
      'javascript': ['prettier', 'eslint', 'path-intellisense'],
      'react': ['prettier', 'eslint', 'tailwind-intellisense', 'auto-rename-tag'],
      'python': ['python', 'code-spell-checker'],
      'default': ['prettier', 'eslint', 'git-lens']
    };
    
    const ids = recommendations[projectType] || recommendations['default'];
    const exts = ids.map(id => extensionRegistry.get(id)).filter(Boolean);
    
    socket.emit('extension:recommendations:response', { recommendations: exts });
  });
  
  socket.on('disconnect', () => {
    console.log(`❌ Extension client disconnected: ${socket.id}`);
  });
});

// ============== START SERVER ==============
const PORT = process.env.EXTENSION_PORT || 4001;

server.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   📦 Extension Marketplace Server                      ║');
  console.log(`║   📡 Port: ${PORT}                                        ║`);
  console.log(`║   🧩 Extensions: ${extensionRegistry.size} loaded                          ║`);
  console.log('║   🔒 Sandbox: Enabled                                  ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
});
