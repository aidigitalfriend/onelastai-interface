/**
 * Deploy Rollback — Rollback to a previous deployment version
 * 
 * Handles:
 *   - Version history tracking
 *   - Instant rollback via S3 pointer swap
 *   - Health check verification after rollback
 *   - Notification of rollback events
 */

const { deployOrchestrator } = require('./deploy-orchestrator');

/**
 * Get rollback candidates for a project
 * Returns previous successful deployments that can be rolled back to.
 * 
 * @param {string} projectId
 * @param {string} [environment='production']
 * @param {number} [limit=10]
 * @returns {Object[]} Rollback candidates
 */
function getRollbackCandidates(projectId, environment = 'production', limit = 10) {
  const deployments = deployOrchestrator.getProjectDeployments(projectId);

  return deployments
    .filter(d => 
      d.environment === environment &&
      ['live', 'superseded', 'rolled-back'].includes(d.status) &&
      d.healthStatus !== 'unhealthy'
    )
    .slice(0, limit)
    .map(d => ({
      id: d.id,
      version: d.version,
      buildId: d.buildId,
      environment: d.environment,
      url: d.url,
      status: d.status,
      healthStatus: d.healthStatus,
      createdAt: d.createdAt,
      canRollback: d.status !== 'live', // Can't rollback to current
    }));
}

/**
 * Execute rollback to a specific deployment
 * 
 * @param {string} projectId
 * @param {string} targetDeployId - Deployment ID to rollback to
 * @param {string} userId
 * @param {string} [reason] - Reason for rollback
 * @returns {Object} New deployment record
 */
async function executeRollback(projectId, targetDeployId, userId, reason) {
  console.log(`[Rollback] Starting rollback for project ${projectId} to deploy ${targetDeployId}`);
  
  if (reason) {
    console.log(`[Rollback] Reason: ${reason}`);
  }

  const deployment = await deployOrchestrator.rollback(projectId, targetDeployId, userId);
  deployment.metadata = deployment.metadata || {};
  deployment.metadata.rollbackReason = reason;

  return deployment;
}

/**
 * Auto-rollback triggered by health check failures
 * 
 * @param {string} projectId
 * @param {string} failedDeployId
 * @returns {Object|null} Rollback deployment or null if no target
 */
async function autoRollback(projectId, failedDeployId) {
  const candidates = getRollbackCandidates(projectId);
  const target = candidates.find(c => c.canRollback);

  if (!target) {
    console.warn(`[Rollback] No rollback target found for project ${projectId}`);
    return null;
  }

  console.log(`[Rollback] Auto-rollback from ${failedDeployId} to ${target.id}`);

  const deployment = await deployOrchestrator.rollback(
    projectId,
    target.id,
    'system' // Auto-rollback by system
  );

  deployment.metadata = deployment.metadata || {};
  deployment.metadata.autoRollback = true;
  deployment.metadata.failedDeployId = failedDeployId;
  deployment.metadata.rollbackReason = 'Health check failure — automatic rollback';

  return deployment;
}

module.exports = {
  getRollbackCandidates,
  executeRollback,
  autoRollback,
};
