/**
 * Sandbox Templates — Pre-built Docker image configurations
 * 
 * Each template defines:
 *   - Docker image to use
 *   - Internal port mapping
 *   - Startup command
 *   - Default environment variables
 *   - Initialization commands (run once on create)
 */

const sandboxTemplates = {
  // ── Node.js Runtime Templates ──
  'node-18': {
    name: 'Node.js 18',
    description: 'Node.js 18 LTS runtime',
    image: 'node:18-alpine',
    internalPort: 3000,
    startCmd: ['sh', '-c', 'tail -f /dev/null'],
    env: ['NODE_ENV=development'],
    initCommands: [],
    category: 'runtime',
  },

  'node-20': {
    name: 'Node.js 20',
    description: 'Node.js 20 LTS runtime',
    image: 'node:20-alpine',
    internalPort: 3000,
    startCmd: ['sh', '-c', 'tail -f /dev/null'],
    env: ['NODE_ENV=development'],
    initCommands: [],
    category: 'runtime',
  },

  'node-22': {
    name: 'Node.js 22',
    description: 'Node.js 22 (Current) runtime',
    image: 'node:22-alpine',
    internalPort: 3000,
    startCmd: ['sh', '-c', 'tail -f /dev/null'],
    env: ['NODE_ENV=development'],
    initCommands: [],
    category: 'runtime',
  },

  // ── Python Runtime Templates ──
  'python-3.11': {
    name: 'Python 3.11',
    description: 'Python 3.11 with pip',
    image: 'python:3.11-slim',
    internalPort: 8000,
    startCmd: ['sh', '-c', 'tail -f /dev/null'],
    env: ['PYTHONDONTWRITEBYTECODE=1', 'PYTHONUNBUFFERED=1'],
    initCommands: [],
    category: 'runtime',
  },

  'python-3.12': {
    name: 'Python 3.12',
    description: 'Python 3.12 (Latest) with pip',
    image: 'python:3.12-slim',
    internalPort: 8000,
    startCmd: ['sh', '-c', 'tail -f /dev/null'],
    env: ['PYTHONDONTWRITEBYTECODE=1', 'PYTHONUNBUFFERED=1'],
    initCommands: [],
    category: 'runtime',
  },

  // ── Framework Templates ──
  'next-app': {
    name: 'Next.js App',
    description: 'Next.js 14 with App Router',
    image: 'node:20-alpine',
    internalPort: 3000,
    startCmd: ['sh', '-c', 'cd /workspace && npm run dev -- -p 3000 || tail -f /dev/null'],
    env: ['NODE_ENV=development', 'NEXT_TELEMETRY_DISABLED=1'],
    initCommands: [
      'npx create-next-app@latest /workspace/app --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes',
      'cd /workspace/app && npm install',
    ],
    category: 'framework',
    setupTime: '30-60s',
  },

  'express-app': {
    name: 'Express.js Server',
    description: 'Express.js with TypeScript',
    image: 'node:20-alpine',
    internalPort: 3000,
    startCmd: ['sh', '-c', 'cd /workspace && npm start || tail -f /dev/null'],
    env: ['NODE_ENV=development', 'PORT=3000'],
    initCommands: [
      'npm init -y',
      'npm install express cors helmet morgan dotenv',
      'npm install -D typescript @types/node @types/express ts-node nodemon',
    ],
    category: 'framework',
    setupTime: '15-30s',
  },

  'vite-app': {
    name: 'Vite + React',
    description: 'Vite with React and TypeScript',
    image: 'node:20-alpine',
    internalPort: 5173,
    startCmd: ['sh', '-c', 'cd /workspace && npm run dev -- --host || tail -f /dev/null'],
    env: ['NODE_ENV=development'],
    initCommands: [
      'npm create vite@latest /workspace/app -- --template react-ts',
      'cd /workspace/app && npm install',
    ],
    category: 'framework',
    setupTime: '20-40s',
  },

  'react-app': {
    name: 'React (CRA)',
    description: 'Create React App with TypeScript',
    image: 'node:20-alpine',
    internalPort: 3000,
    startCmd: ['sh', '-c', 'cd /workspace && npm start || tail -f /dev/null'],
    env: ['NODE_ENV=development', 'BROWSER=none'],
    initCommands: [
      'npx create-react-app /workspace/app --template typescript',
      'cd /workspace/app && npm install',
    ],
    category: 'framework',
    setupTime: '30-60s',
  },

  'vue-app': {
    name: 'Vue 3 + Vite',
    description: 'Vue 3 with TypeScript and Vite',
    image: 'node:20-alpine',
    internalPort: 5173,
    startCmd: ['sh', '-c', 'cd /workspace && npm run dev -- --host || tail -f /dev/null'],
    env: ['NODE_ENV=development'],
    initCommands: [
      'npm create vue@latest /workspace/app -- --typescript --router --pinia',
      'cd /workspace/app && npm install',
    ],
    category: 'framework',
    setupTime: '20-40s',
  },

  'svelte-app': {
    name: 'SvelteKit',
    description: 'SvelteKit with TypeScript',
    image: 'node:20-alpine',
    internalPort: 5173,
    startCmd: ['sh', '-c', 'cd /workspace && npm run dev -- --host || tail -f /dev/null'],
    env: ['NODE_ENV=development'],
    initCommands: [
      'npm create svelte@latest /workspace/app -- --skeleton --typescript',
      'cd /workspace/app && npm install',
    ],
    category: 'framework',
    setupTime: '15-30s',
  },
};

/**
 * Get all available templates
 */
function getTemplates() {
  return Object.entries(sandboxTemplates).map(([id, config]) => ({
    id,
    name: config.name,
    description: config.description,
    category: config.category,
    setupTime: config.setupTime || '5-10s',
    internalPort: config.internalPort,
  }));
}

/**
 * Get templates by category
 */
function getTemplatesByCategory(category) {
  return Object.entries(sandboxTemplates)
    .filter(([, config]) => config.category === category)
    .map(([id, config]) => ({
      id,
      name: config.name,
      description: config.description,
      internalPort: config.internalPort,
    }));
}

module.exports = { sandboxTemplates, getTemplates, getTemplatesByCategory };
