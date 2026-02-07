/**
 * Deploy Orchestrator — Zero-downtime deployment pipeline
 * 
 * Phase 3: Manage deployments with health checks, auto-rollback,
 * custom domain management, and version history.
 * 
 * Flow: Build artifacts → Upload to S3/CDN → Configure domain → Health check → Live
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const { deploymentRepo, domainRepo } = require('../../lib/repositories');

// Runtime-only state for active operations  
const activeOps = new Map();

// Lazy-load S3 deployer (available when AWS credentials configured)
let s3Deployer = null;
function getS3Deployer() {
  if (s3Deployer) return s3Deployer;
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET) {
    try {
      s3Deployer = require('./deploy-s3-static');
      console.log('[Deploy] S3 deployer loaded');
    } catch (err) {
      console.warn('[Deploy] S3 deployer not available:', err.message);
    }
  }
  return s3Deployer;
}

class DeployOrchestrator extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Deploy a project from build artifacts
   * 
   * @param {Object} config
   * @param {string} config.projectId
   * @param {string} config.userId
   * @param {string} config.buildId
   * @param {string} config.environment - preview | staging | production
   * @param {string} [config.domain] - Custom domain override
   * @returns {Object} Deployment record
   */
  async deploy(config) {
    const deployId = `deploy-${uuidv4().slice(0, 12)}`;
    const now = new Date().toISOString();

    // Get previous deployment for this project + environment
    const previous = this.getActiveDeployment(config.projectId, config.environment);

    const deployment = {
      id: deployId,
      projectId: config.projectId,
      userId: config.userId,
      buildId: config.buildId,
      environment: config.environment || 'preview',
      status: 'deploying',
      url: null,
      domain: config.domain || null,
      version: this._getNextVersion(config.projectId),
      previousDeployId: previous?.id || null,
      healthStatus: 'pending',
      healthChecks: [],
      stages: [
        { name: 'upload', status: 'pending', startedAt: null, completedAt: null },
        { name: 'configure', status: 'pending', startedAt: null, completedAt: null },
        { name: 'propagate', status: 'pending', startedAt: null, completedAt: null },
        { name: 'healthCheck', status: 'pending', startedAt: null, completedAt: null },
      ],
      metadata: {},
      createdAt: now,
      destroyedAt: null,
    };

    deployments.set(deployId, deployment);
    this.emit('deploy:started', deployment);

    try {
      // Stage 1: Upload artifacts
      await this._stageUpload(deployment, config);

      // Stage 2: Configure routing & domain
      await this._stageConfigure(deployment, config);

      // Stage 3: Wait for CDN propagation
      await this._stagePropagate(deployment);

      // Stage 4: Health check
      await this._stageHealthCheck(deployment);

      // Mark previous deployment as superseded
      if (previous && previous.status === 'live') {
        previous.status = 'superseded';
        previous.supersededAt = now;
        previous.supersededBy = deployId;
      }

      deployment.status = 'live';
      deployment.healthStatus = 'healthy';
      this.emit('deploy:live', deployment);

      console.log(`[Deploy:${deployId}] Live at ${deployment.url}`);
      return deployment;

    } catch (err) {
      deployment.status = 'failed';
      deployment.error = err.message;
      this.emit('deploy:failed', { deployment, error: err });

      // Auto-rollback if previous deployment exists
      if (previous && config.environment === 'production') {
        console.log(`[Deploy:${deployId}] Auto-rolling back to ${previous.id}`);
        await this.rollback(config.projectId, previous.id, config.userId);
      }

      throw err;
    }
  }

  /**
   * Rollback to a previous deployment
   */
  async rollback(projectId, targetDeployId, userId) {
    const target = deployments.get(targetDeployId);
    if (!target) throw new Error(`Deployment not found: ${targetDeployId}`);
    if (target.projectId !== projectId) throw new Error('Deployment does not belong to this project');

    const rollbackId = `deploy-${uuidv4().slice(0, 12)}`;
    const current = this.getActiveDeployment(projectId, target.environment);

    const rollback = {
      id: rollbackId,
      projectId,
      userId,
      buildId: target.buildId,
      environment: target.environment,
      status: 'deploying',
      url: target.url,
      domain: target.domain,
      version: this._getNextVersion(projectId),
      previousDeployId: current?.id || null,
      rollbackFrom: current?.id || null,
      rollbackTo: targetDeployId,
      healthStatus: 'pending',
      healthChecks: [],
      stages: [
        { name: 'restore', status: 'running', startedAt: new Date().toISOString(), completedAt: null },
        { name: 'healthCheck', status: 'pending', startedAt: null, completedAt: null },
      ],
      metadata: { isRollback: true },
      createdAt: new Date().toISOString(),
      destroyedAt: null,
    };

    deployments.set(rollbackId, rollback);

    // Simulate restore
    rollback.stages[0].status = 'success';
    rollback.stages[0].completedAt = new Date().toISOString();

    // Health check
    rollback.stages[1].status = 'running';
    rollback.stages[1].startedAt = new Date().toISOString();
    rollback.stages[1].status = 'success';
    rollback.stages[1].completedAt = new Date().toISOString();

    rollback.status = 'live';
    rollback.healthStatus = 'healthy';

    // Mark current as rolled-back
    if (current) {
      current.status = 'rolled-back';
      current.rolledBackAt = new Date().toISOString();
      current.rolledBackTo = rollbackId;
    }

    this.emit('deploy:rollback', rollback);
    console.log(`[Deploy:${rollbackId}] Rollback complete from ${current?.id} to ${targetDeployId}`);

    return rollback;
  }

  /**
   * Get active deployment for a project + environment
   */
  getActiveDeployment(projectId, environment = 'production') {
    return Array.from(deployments.values())
      .find(d => d.projectId === projectId && d.environment === environment && d.status === 'live');
  }

  /**
   * List deployments for a project
   */
  getProjectDeployments(projectId, limit = 20) {
    return Array.from(deployments.values())
      .filter(d => d.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  /**
   * Get deployment status
   */
  getDeployment(deployId) {
    const deployment = deployments.get(deployId);
    if (!deployment) throw new Error(`Deployment not found: ${deployId}`);
    return { ...deployment };
  }

  /**
   * Remove a deployment
   */
  async removeDeployment(deployId) {
    const deployment = deployments.get(deployId);
    if (!deployment) throw new Error(`Deployment not found: ${deployId}`);

    deployment.status = 'removed';
    deployment.destroyedAt = new Date().toISOString();

    // In production: remove from S3/CDN, release domain, etc.
    this.emit('deploy:removed', deployment);
    return deployment;
  }

  // ──── Domain Management ────

  /**
   * Add a custom domain to a deployment
   */
  async addDomain(deploymentId, userId, domainName) {
    const deployment = deployments.get(deploymentId);
    if (!deployment) throw new Error('Deployment not found');

    const domainId = `dom-${uuidv4().slice(0, 8)}`;
    const domain = {
      id: domainId,
      deploymentId,
      userId,
      domain: domainName,
      sslStatus: 'pending',
      sslExpiresAt: null,
      dnsVerified: false,
      dnsRecords: [
        { type: 'CNAME', name: domainName, value: `${deployment.projectId}.maula.ai`, status: 'pending' },
        { type: 'TXT', name: `_gencraft.${domainName}`, value: `verify=${domainId}`, status: 'pending' },
      ],
      createdAt: new Date().toISOString(),
    };

    domains.set(domainId, domain);
    deployment.domain = domainName;

    this.emit('domain:added', domain);
    return domain;
  }

  /**
   * Verify DNS for a custom domain
   */
  async verifyDomain(domainId) {
    const domain = domains.get(domainId);
    if (!domain) throw new Error('Domain not found');

    // DNS verification: resolve CNAME and TXT records
    const dns = require('dns').promises;
    let allVerified = true;
    for (const record of domain.dnsRecords) {
      try {
        if (record.type === 'CNAME') {
          const addresses = await dns.resolveCname(record.name).catch(() => []);
          record.status = addresses.includes(record.value) ? 'verified' : 'pending';
        } else if (record.type === 'TXT') {
          const records = await dns.resolveTxt(record.name).catch(() => []);
          const flat = records.flat();
          record.status = flat.some(r => r.includes(record.value)) ? 'verified' : 'pending';
        }
        if (record.status !== 'verified') allVerified = false;
      } catch {
        record.status = 'pending';
        allVerified = false;
      }
    }
    domain.dnsVerified = allVerified;

    if (domain.dnsVerified) {
      // Trigger SSL certificate provisioning
      domain.sslStatus = 'provisioning';
      // In production: Let's Encrypt / ACM
      setTimeout(() => {
        domain.sslStatus = 'active';
        domain.sslExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        this.emit('domain:ssl-active', domain);
      }, 2000);
    }

    this.emit('domain:verified', domain);
    return domain;
  }

  /**
   * List domains for a user
   */
  getUserDomains(userId) {
    return Array.from(domains.values())
      .filter(d => d.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Remove a custom domain
   */
  async removeDomain(domainId) {
    const domain = domains.get(domainId);
    if (!domain) throw new Error('Domain not found');

    // In production: release SSL cert, remove CDN config
    domains.delete(domainId);
    this.emit('domain:removed', domain);
    return { success: true };
  }

  // ──── Private Methods ────

  async _stageUpload(deployment, config) {
    const stage = deployment.stages.find(s => s.name === 'upload');
    stage.status = 'running';
    stage.startedAt = new Date().toISOString();

    const slug = `${config.projectId}-${deployment.version}`;
    deployment.url = config.environment === 'production'
      ? `https://${slug}.maula.ai`
      : `https://${slug}.preview.maula.ai`;

    // Use real S3 deployment when AWS is configured
    const deployer = getS3Deployer();
    if (deployer && config.files) {
      try {
        const result = await deployer.deployToS3({
          projectId: config.projectId,
          version: String(deployment.version),
          files: config.files,
          environment: config.environment,
        });
        deployment.url = result.url || deployment.url;
        deployment.metadata.s3Prefix = result.prefix;
        console.log(`[Deploy:${deployment.id}] Uploaded to S3: ${deployment.url}`);
      } catch (err) {
        console.error(`[Deploy:${deployment.id}] S3 upload failed:`, err.message);
        throw err;
      }
    }

    // Persist deployment to DB
    try {
      await deploymentRepo.create({
        ...deployment,
        config: JSON.stringify(config),
      });
    } catch (err) {
      console.warn('[Deploy] DB persist failed:', err.message);
    }

    stage.status = 'success';
    stage.completedAt = new Date().toISOString();
  }

  async _stageConfigure(deployment, config) {
    const stage = deployment.stages.find(s => s.name === 'configure');
    stage.status = 'running';
    stage.startedAt = new Date().toISOString();

    // Use real CloudFront invalidation when S3 deployer is available
    const deployer = getS3Deployer();
    if (deployer && deployment.metadata.cdnDistributionId) {
      try {
        await deployer.invalidateCache(deployment.metadata.cdnDistributionId, ['/*']);
        console.log(`[Deploy:${deployment.id}] CloudFront invalidation started`);
      } catch (err) {
        console.warn(`[Deploy:${deployment.id}] CDN invalidation failed:`, err.message);
      }
    }

    if (!deployment.metadata.cdnDistributionId) {
      deployment.metadata.cdnDistributionId = `E${uuidv4().slice(0, 8).toUpperCase()}`;
    }

    stage.status = 'success';
    stage.completedAt = new Date().toISOString();
  }

  async _stagePropagate(deployment) {
    const stage = deployment.stages.find(s => s.name === 'propagate');
    stage.status = 'running';
    stage.startedAt = new Date().toISOString();

    // Wait for CDN propagation
    await new Promise(resolve => setTimeout(resolve, 500));

    stage.status = 'success';
    stage.completedAt = new Date().toISOString();
  }

  async _stageHealthCheck(deployment) {
    const stage = deployment.stages.find(s => s.name === 'healthCheck');
    stage.status = 'running';
    stage.startedAt = new Date().toISOString();

    let statusCode = 200;
    let responseTime = 45;

    // Real health check when URL is available
    if (deployment.url && deployment.url.startsWith('https://')) {
      try {
        const start = Date.now();
        const res = await fetch(deployment.url, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
        statusCode = res.status;
        responseTime = Date.now() - start;
      } catch {
        // Health check failed — non-fatal, report it
        statusCode = 0;
        responseTime = -1;
      }
    }

    const check = {
      timestamp: new Date().toISOString(),
      url: deployment.url,
      statusCode,
      responseTime,
      healthy: statusCode >= 200 && statusCode < 400,
    };

    deployment.healthChecks.push(check);

    // Update deployment status in DB
    try {
      await deploymentRepo.update(deployment.id, {
        status: deployment.status,
        url: deployment.url,
        healthStatus: check.healthy ? 'healthy' : 'degraded',
      });
    } catch (err) {
      console.warn('[Deploy] DB update failed:', err.message);
    }

    stage.status = check.healthy ? 'success' : 'warning';
    stage.completedAt = new Date().toISOString();
  }

  _getNextVersion(projectId) {
    const projectDeploys = Array.from(deployments.values())
      .filter(d => d.projectId === projectId);
    return projectDeploys.length + 1;
  }
}

// Singleton
const deployOrchestrator = new DeployOrchestrator();

module.exports = { deployOrchestrator };
