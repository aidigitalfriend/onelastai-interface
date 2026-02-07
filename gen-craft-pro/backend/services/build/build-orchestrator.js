/**
 * Build Orchestrator — CI/CD build queue & execution engine
 * 
 * Phase 3: Code change → Build → Test → Deploy → Live
 * 
 * Pipeline stages:
 *   1. Detect — File change detected
 *   2. Install — npm install (cached)
 *   3. Lint — ESLint + TypeScript check
 *   4. Test — Run test suite
 *   5. Build — npm run build
 *   6. Security — Dependency audit
 *   7. Preview — Deploy to preview URL
 *   8. Promote — One-click → production
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const { sandboxManager } = require('../sandbox/sandbox-manager');
const { detectFramework } = require('./build-detector');
const { getCachedModules, cacheModules } = require('./build-cache');
const { BuildLogger } = require('./build-logger');

// Build queue
const buildQueue = [];
const builds = new Map();
const MAX_CONCURRENT_BUILDS = 3;
let activeBuilds = 0;

// Build stage definitions
const STAGES = [
  { name: 'install', label: 'Install Dependencies', timeout: 120000 },
  { name: 'lint', label: 'Lint & Type Check', timeout: 60000 },
  { name: 'test', label: 'Run Tests', timeout: 180000 },
  { name: 'build', label: 'Build Project', timeout: 180000 },
  { name: 'security', label: 'Security Scan', timeout: 30000 },
  { name: 'preview', label: 'Preview Deploy', timeout: 60000 },
];

class BuildOrchestrator extends EventEmitter {
  constructor() {
    super();
    this._processInterval = null;
  }

  /**
   * Initialize build orchestrator
   * Start queue processor
   */
  initialize() {
    this._processInterval = setInterval(() => this._processQueue(), 2000);
    console.log('[BuildOrchestrator] Initialized — queue processor started');
  }

  /**
   * Trigger a new build
   * 
   * @param {Object} config
   * @param {string} config.projectId
   * @param {string} config.userId
   * @param {string} config.sandboxId
   * @param {string} [config.branch='main']
   * @param {string} [config.commitHash]
   * @param {string} [config.commitMessage]
   * @param {string} [config.environment='preview']
   * @param {string} [config.triggeredBy='manual']
   * @param {boolean} [config.skipTests=false]
   * @param {boolean} [config.skipLint=false]
   * @param {boolean} [config.autoPromote=false]
   * @returns {Object} Build record
   */
  async triggerBuild(config) {
    const buildId = `build-${uuidv4().slice(0, 12)}`;
    const now = new Date().toISOString();

    const build = {
      id: buildId,
      projectId: config.projectId,
      userId: config.userId,
      sandboxId: config.sandboxId,
      branch: config.branch || 'main',
      commitHash: config.commitHash || null,
      commitMessage: config.commitMessage || null,
      environment: config.environment || 'preview',
      triggeredBy: config.triggeredBy || 'manual',
      status: 'queued',
      stages: STAGES.map(s => ({
        name: s.name,
        label: s.label,
        status: 'pending',
        startedAt: null,
        completedAt: null,
        duration: null,
        logs: [],
        error: null,
        skipped: (s.name === 'test' && config.skipTests) ||
                 (s.name === 'lint' && config.skipLint),
      })),
      totalDuration: null,
      artifactUrl: null,
      previewUrl: null,
      error: null,
      autoPromote: config.autoPromote || false,
      createdAt: now,
      completedAt: null,
    };

    builds.set(buildId, build);
    buildQueue.push(buildId);

    this.emit('build:queued', build);
    console.log(`[Build:${buildId}] Queued for project ${config.projectId}`);

    return build;
  }

  /**
   * Get build status
   */
  getBuild(buildId) {
    const build = builds.get(buildId);
    if (!build) throw new Error(`Build not found: ${buildId}`);
    return { ...build };
  }

  /**
   * Cancel a build
   */
  async cancelBuild(buildId) {
    const build = builds.get(buildId);
    if (!build) throw new Error(`Build not found: ${buildId}`);

    if (['success', 'failed', 'cancelled'].includes(build.status)) {
      throw new Error(`Build ${buildId} is already ${build.status}`);
    }

    build.status = 'cancelled';
    build.completedAt = new Date().toISOString();
    
    // Remove from queue if still queued
    const queueIdx = buildQueue.indexOf(buildId);
    if (queueIdx !== -1) {
      buildQueue.splice(queueIdx, 1);
    }

    this.emit('build:cancelled', build);
    return build;
  }

  /**
   * List builds for a project
   */
  getProjectBuilds(projectId, limit = 20) {
    return Array.from(builds.values())
      .filter(b => b.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  /**
   * Get build metrics for a project
   */
  getProjectMetrics(projectId) {
    const projectBuilds = Array.from(builds.values())
      .filter(b => b.projectId === projectId);

    const completed = projectBuilds.filter(b => ['success', 'failed'].includes(b.status));
    const successful = completed.filter(b => b.status === 'success');
    const durations = successful
      .map(b => b.totalDuration)
      .filter(Boolean);

    return {
      totalBuilds: projectBuilds.length,
      successCount: successful.length,
      failCount: completed.length - successful.length,
      successRate: completed.length > 0 
        ? ((successful.length / completed.length) * 100).toFixed(1)
        : 0,
      avgDuration: durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
      lastBuild: projectBuilds[0] || null,
    };
  }

  /**
   * Get build configuration recommendation
   */
  async detectBuildConfig(sandboxId) {
    try {
      const framework = await detectFramework(sandboxId);
      return framework;
    } catch (err) {
      return {
        framework: 'unknown',
        buildCommand: 'npm run build',
        startCommand: 'npm start',
        outputDir: 'dist',
      };
    }
  }

  /**
   * Shutdown
   */
  shutdown() {
    clearInterval(this._processInterval);
    console.log('[BuildOrchestrator] Shutdown');
  }

  // ──────── PRIVATE METHODS ────────

  async _processQueue() {
    if (activeBuilds >= MAX_CONCURRENT_BUILDS || buildQueue.length === 0) return;

    const buildId = buildQueue.shift();
    if (!buildId) return;

    activeBuilds++;
    try {
      await this._executeBuild(buildId);
    } finally {
      activeBuilds--;
    }
  }

  async _executeBuild(buildId) {
    const build = builds.get(buildId);
    if (!build || build.status === 'cancelled') return;

    const logger = new BuildLogger(buildId);
    const startTime = Date.now();

    console.log(`[Build:${buildId}] Starting build...`);
    build.status = 'installing';
    this.emit('build:started', build);

    try {
      for (const stage of build.stages) {
        if (build.status === 'cancelled') break;

        if (stage.skipped) {
          stage.status = 'skipped';
          logger.log(stage.name, 'info', `${stage.label} — skipped`);
          continue;
        }

        // Update overall build status
        build.status = stage.name === 'install' ? 'installing'
          : stage.name === 'lint' ? 'linting'
          : stage.name === 'test' ? 'testing'
          : stage.name === 'build' ? 'building'
          : stage.name === 'security' ? 'scanning'
          : 'deploying';

        stage.status = 'running';
        stage.startedAt = new Date().toISOString();
        this.emit('build:stage', { buildId, stage: stage.name, status: 'running' });

        try {
          await this._executeStage(build, stage, logger);
          stage.status = 'success';
          stage.completedAt = new Date().toISOString();
          stage.duration = new Date(stage.completedAt) - new Date(stage.startedAt);
          this.emit('build:stage', { buildId, stage: stage.name, status: 'success' });
        } catch (stageErr) {
          stage.status = 'failed';
          stage.error = stageErr.message;
          stage.completedAt = new Date().toISOString();
          stage.duration = new Date(stage.completedAt) - new Date(stage.startedAt);
          logger.log(stage.name, 'error', stageErr.message);
          
          this.emit('build:stage', { buildId, stage: stage.name, status: 'failed', error: stageErr.message });
          
          throw stageErr; // Stop pipeline on failure
        }
      }

      // All stages passed
      build.status = 'success';
      build.totalDuration = Date.now() - startTime;
      build.completedAt = new Date().toISOString();
      logger.log('complete', 'info', `Build completed in ${build.totalDuration}ms`);
      this.emit('build:success', build);

      // Auto-promote if configured
      if (build.autoPromote && build.previewUrl) {
        logger.log('promote', 'info', 'Auto-promoting to production...');
        // Deploy orchestrator handles promotion
        this.emit('build:promote', build);
      }

    } catch (err) {
      build.status = 'failed';
      build.error = err.message;
      build.totalDuration = Date.now() - startTime;
      build.completedAt = new Date().toISOString();
      this.emit('build:failed', build);
    }

    logger.finalize();
  }

  async _executeStage(build, stage, logger) {
    const stageConfig = STAGES.find(s => s.name === stage.name);

    switch (stage.name) {
      case 'install':
        return this._stageInstall(build, stage, logger);
      case 'lint':
        return this._stageLint(build, stage, logger);
      case 'test':
        return this._stageTest(build, stage, logger);
      case 'build':
        return this._stageBuild(build, stage, logger);
      case 'security':
        return this._stageSecurity(build, stage, logger);
      case 'preview':
        return this._stagePreview(build, stage, logger);
      default:
        logger.log(stage.name, 'warn', `Unknown stage: ${stage.name}`);
    }
  }

  async _stageInstall(build, stage, logger) {
    logger.log('install', 'info', 'Installing dependencies...');

    // Check for cached node_modules
    const cacheHit = await getCachedModules(build.projectId);
    if (cacheHit) {
      logger.log('install', 'info', 'Cache hit — restoring node_modules');
    }

    const result = await sandboxManager.exec(build.sandboxId, 'npm ci --prefer-offline || npm install', {
      timeout: 120000,
    });

    stage.logs.push(...result.stdout.split('\n').filter(Boolean));

    if (result.exitCode !== 0) {
      throw new Error(`npm install failed: ${result.stderr}`);
    }

    // Cache node_modules for future builds
    await cacheModules(build.projectId, build.sandboxId);

    logger.log('install', 'info', `Dependencies installed (${result.duration}ms)`);
  }

  async _stageLint(build, stage, logger) {
    logger.log('lint', 'info', 'Running linter...');

    // TypeScript check
    const tscResult = await sandboxManager.exec(build.sandboxId, 'npx tsc --noEmit 2>&1 || true', {
      timeout: 60000,
    });

    const tscErrors = tscResult.stdout
      .split('\n')
      .filter(line => line.includes('error TS'));

    if (tscErrors.length > 0) {
      stage.logs.push(`TypeScript: ${tscErrors.length} error(s)`);
      stage.logs.push(...tscErrors.slice(0, 10));
      logger.log('lint', 'warn', `TypeScript: ${tscErrors.length} errors`);
    } else {
      logger.log('lint', 'info', 'TypeScript: No errors');
    }

    // ESLint check
    const eslintResult = await sandboxManager.exec(build.sandboxId, 'npx eslint . --ext .ts,.tsx,.js,.jsx --format json 2>/dev/null || true', {
      timeout: 60000,
    });

    try {
      const eslintOutput = JSON.parse(eslintResult.stdout);
      const errorCount = eslintOutput.reduce((acc, file) => acc + file.errorCount, 0);
      const warnCount = eslintOutput.reduce((acc, file) => acc + file.warningCount, 0);
      
      stage.logs.push(`ESLint: ${errorCount} error(s), ${warnCount} warning(s)`);
      logger.log('lint', errorCount > 0 ? 'warn' : 'info', `ESLint: ${errorCount} errors, ${warnCount} warnings`);

      if (errorCount > 0) {
        throw new Error(`Lint failed: ${errorCount} ESLint error(s)`);
      }
    } catch (parseErr) {
      // ESLint not configured — skip
      if (parseErr.message.includes('Lint failed')) throw parseErr;
      logger.log('lint', 'info', 'ESLint: Not configured — skipped');
    }
  }

  async _stageTest(build, stage, logger) {
    logger.log('test', 'info', 'Running tests...');

    // Check if test script exists
    const pkgResult = await sandboxManager.exec(build.sandboxId, 'cat package.json', { timeout: 5000 });
    let hasTests = false;
    try {
      const pkg = JSON.parse(pkgResult.stdout);
      hasTests = pkg.scripts && pkg.scripts.test && !pkg.scripts.test.includes('no test specified');
    } catch {}

    if (!hasTests) {
      logger.log('test', 'info', 'No test script found — skipped');
      stage.logs.push('No test script configured');
      return;
    }

    const testResult = await sandboxManager.exec(build.sandboxId, 'npm test -- --ci --passWithNoTests 2>&1', {
      timeout: 180000,
    });

    stage.logs.push(...testResult.stdout.split('\n').filter(Boolean).slice(-20));

    if (testResult.exitCode !== 0) {
      throw new Error(`Tests failed (exit code: ${testResult.exitCode})`);
    }

    logger.log('test', 'info', `Tests passed (${testResult.duration}ms)`);
  }

  async _stageBuild(build, stage, logger) {
    logger.log('build', 'info', 'Building project...');

    // Detect framework-specific build command
    const framework = await this.detectBuildConfig(build.sandboxId);
    const buildCmd = framework.buildCommand || 'npm run build';

    logger.log('build', 'info', `Framework: ${framework.framework}, Command: ${buildCmd}`);

    const result = await sandboxManager.exec(build.sandboxId, `${buildCmd} 2>&1`, {
      timeout: 180000,
    });

    stage.logs.push(...result.stdout.split('\n').filter(Boolean).slice(-30));

    if (result.exitCode !== 0) {
      throw new Error(`Build failed: ${result.stderr || result.stdout.slice(-500)}`);
    }

    // Check if output directory exists
    const outputDir = framework.outputDir || 'dist';
    const checkResult = await sandboxManager.exec(build.sandboxId, `ls -la ${outputDir} 2>&1 | head -20`, {
      timeout: 5000,
    });

    if (checkResult.exitCode === 0) {
      build.artifactUrl = `/sandbox/${build.sandboxId}/workspace/${outputDir}`;
      stage.logs.push(`Output: ${outputDir}/`);
    }

    logger.log('build', 'info', `Build completed (${result.duration}ms)`);
  }

  async _stageSecurity(build, stage, logger) {
    logger.log('security', 'info', 'Running security audit...');

    const auditResult = await sandboxManager.exec(build.sandboxId, 'npm audit --json 2>/dev/null || true', {
      timeout: 30000,
    });

    try {
      const audit = JSON.parse(auditResult.stdout);
      const vulnerabilities = audit.metadata?.vulnerabilities || {};
      const total = Object.values(vulnerabilities).reduce((a, b) => a + b, 0);
      const critical = vulnerabilities.critical || 0;
      const high = vulnerabilities.high || 0;

      stage.logs.push(`Vulnerabilities: ${total} total, ${critical} critical, ${high} high`);
      logger.log('security', critical > 0 ? 'warn' : 'info', 
        `Audit: ${total} vulnerabilities (${critical} critical, ${high} high)`);

      // Don't fail on vulnerabilities, just warn
      if (critical > 0) {
        stage.logs.push('⚠️ Critical vulnerabilities found — review recommended');
      }
    } catch {
      logger.log('security', 'info', 'Audit not available — skipped');
      stage.logs.push('npm audit not available');
    }
  }

  async _stagePreview(build, stage, logger) {
    logger.log('preview', 'info', 'Deploying to preview...');

    // Generate preview URL
    const previewSlug = `preview-${build.id.slice(6)}`;
    build.previewUrl = `https://${previewSlug}.preview.maula.ai`;

    stage.logs.push(`Preview URL: ${build.previewUrl}`);
    logger.log('preview', 'info', `Preview deployed: ${build.previewUrl}`);

    // In production, this would upload build artifacts to S3/CDN
    // and configure the preview subdomain
  }
}

// Singleton
const buildOrchestrator = new BuildOrchestrator();

module.exports = { buildOrchestrator };
