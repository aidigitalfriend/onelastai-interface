/**
 * Build Detector — Auto-detect project framework and build configuration
 * 
 * Analyzes package.json, config files, and directory structure
 * to determine the correct build commands and output directories.
 */

const { sandboxManager } = require('../sandbox/sandbox-manager');

// Framework detection patterns
const FRAMEWORKS = {
  nextjs: {
    name: 'Next.js',
    detect: (pkg, files) => 
      pkg.dependencies?.next || pkg.devDependencies?.next || files.includes('next.config'),
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    devCommand: 'npm run dev',
    outputDir: '.next',
    type: 'fullstack',
  },
  vite: {
    name: 'Vite',
    detect: (pkg, files) => 
      pkg.devDependencies?.vite || files.includes('vite.config'),
    buildCommand: 'npm run build',
    startCommand: 'npm run preview',
    devCommand: 'npm run dev',
    outputDir: 'dist',
    type: 'static',
  },
  cra: {
    name: 'Create React App',
    detect: (pkg) => 
      pkg.dependencies?.['react-scripts'] || pkg.devDependencies?.['react-scripts'],
    buildCommand: 'npm run build',
    startCommand: 'npx serve -s build',
    devCommand: 'npm start',
    outputDir: 'build',
    type: 'static',
  },
  remix: {
    name: 'Remix',
    detect: (pkg) => 
      pkg.dependencies?.['@remix-run/react'] || pkg.devDependencies?.['@remix-run/dev'],
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    devCommand: 'npm run dev',
    outputDir: 'build',
    type: 'fullstack',
  },
  astro: {
    name: 'Astro',
    detect: (pkg, files) => 
      pkg.dependencies?.astro || pkg.devDependencies?.astro || files.includes('astro.config'),
    buildCommand: 'npm run build',
    startCommand: 'npm run preview',
    devCommand: 'npm run dev',
    outputDir: 'dist',
    type: 'static',
  },
  svelte: {
    name: 'SvelteKit',
    detect: (pkg) => 
      pkg.devDependencies?.['@sveltejs/kit'],
    buildCommand: 'npm run build',
    startCommand: 'npm run preview',
    devCommand: 'npm run dev',
    outputDir: 'build',
    type: 'fullstack',
  },
  nuxt: {
    name: 'Nuxt',
    detect: (pkg, files) => 
      pkg.dependencies?.nuxt || pkg.devDependencies?.nuxt || files.includes('nuxt.config'),
    buildCommand: 'npm run build',
    startCommand: 'npm run start',
    devCommand: 'npm run dev',
    outputDir: '.output',
    type: 'fullstack',
  },
  express: {
    name: 'Express.js',
    detect: (pkg) => 
      pkg.dependencies?.express && !pkg.dependencies?.next && !pkg.dependencies?.nuxt,
    buildCommand: 'npm run build 2>/dev/null || echo "No build step"',
    startCommand: 'npm start',
    devCommand: 'npm run dev',
    outputDir: null,
    type: 'server',
  },
  gatsby: {
    name: 'Gatsby',
    detect: (pkg) => 
      pkg.dependencies?.gatsby || pkg.devDependencies?.gatsby,
    buildCommand: 'npm run build',
    startCommand: 'npx serve public',
    devCommand: 'npm run develop',
    outputDir: 'public',
    type: 'static',
  },
  angular: {
    name: 'Angular',
    detect: (pkg, files) => 
      pkg.dependencies?.['@angular/core'] || files.includes('angular.json'),
    buildCommand: 'npm run build',
    startCommand: 'npx serve dist',
    devCommand: 'npm start',
    outputDir: 'dist',
    type: 'static',
  },
  vue: {
    name: 'Vue.js',
    detect: (pkg) => 
      pkg.dependencies?.vue && !pkg.devDependencies?.nuxt,
    buildCommand: 'npm run build',
    startCommand: 'npm run preview',
    devCommand: 'npm run dev',
    outputDir: 'dist',
    type: 'static',
  },
};

/**
 * Detect project framework from sandbox contents
 * 
 * @param {string} sandboxId - Sandbox to inspect
 * @returns {Object} Framework configuration
 */
async function detectFramework(sandboxId) {
  let pkg = {};
  let files = [];

  try {
    // Read package.json
    const pkgResult = await sandboxManager.exec(sandboxId, 'cat package.json 2>/dev/null', {
      timeout: 5000,
    });
    if (pkgResult.exitCode === 0 && pkgResult.stdout) {
      pkg = JSON.parse(pkgResult.stdout);
    }
  } catch {}

  try {
    // List root files for config detection
    const lsResult = await sandboxManager.exec(sandboxId, 'ls -1 2>/dev/null', {
      timeout: 5000,
    });
    if (lsResult.exitCode === 0) {
      files = lsResult.stdout.split('\n').filter(Boolean);
    }
  } catch {}

  // Check each framework in priority order
  for (const [key, framework] of Object.entries(FRAMEWORKS)) {
    try {
      if (framework.detect(pkg, files)) {
        console.log(`[BuildDetector] Detected framework: ${framework.name}`);
        return {
          framework: key,
          name: framework.name,
          buildCommand: framework.buildCommand,
          startCommand: framework.startCommand,
          devCommand: framework.devCommand,
          outputDir: framework.outputDir,
          type: framework.type,
          packageName: pkg.name || 'project',
          nodeVersion: pkg.engines?.node || null,
        };
      }
    } catch {}
  }

  // Fallback: generic Node.js project
  console.log('[BuildDetector] No framework detected — using defaults');
  return {
    framework: 'node',
    name: 'Node.js',
    buildCommand: pkg.scripts?.build ? 'npm run build' : 'echo "No build step"',
    startCommand: pkg.scripts?.start ? 'npm start' : 'node index.js',
    devCommand: pkg.scripts?.dev ? 'npm run dev' : 'node index.js',
    outputDir: 'dist',
    type: pkg.scripts?.start ? 'server' : 'unknown',
    packageName: pkg.name || 'project',
    nodeVersion: pkg.engines?.node || null,
  };
}

/**
 * Detect project language
 */
async function detectLanguage(sandboxId) {
  try {
    const result = await sandboxManager.exec(sandboxId, 
      'ls tsconfig.json tsconfig*.json .ts 2>/dev/null | head -1', 
      { timeout: 5000 }
    );
    if (result.exitCode === 0 && result.stdout.includes('tsconfig')) {
      return 'typescript';
    }
  } catch {}

  return 'javascript';
}

module.exports = { detectFramework, detectLanguage, FRAMEWORKS };
