/**
 * GenCraft Pro — Auto Recovery
 * Phase 6: Monitoring & Observability
 * 
 * Automated recovery for failed deployments, crashed sandboxes,
 * and unhealthy services. Integrates with health checks
 * to trigger remediation actions.
 */

class AutoRecovery {
  constructor() {
    this.policies = new Map();     // policyId -> config
    this.incidents = new Map();    // incidentId -> incident
    this.recoveryLog = [];
    this.maxLogEntries = 1000;
  }

  /**
   * Register a recovery policy
   */
  registerPolicy(config) {
    const {
      id = `recovery-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      projectId,
      trigger,                   // health_check_failed, error_rate_high, memory_high, crash
      action,                    // restart, rollback, scale_up, notify, custom
      conditions = {},
      maxAttempts = 3,
      cooldownMinutes = 5,
      enabled = true,
    } = config;

    const policy = {
      id,
      name: name || `${action} on ${trigger}`,
      projectId,
      trigger,
      action,
      conditions: {
        threshold: conditions.threshold || 3,    // e.g., 3 consecutive failures
        window: conditions.window || '5m',        // Time window
        severity: conditions.severity || 'critical',
        ...conditions,
      },
      maxAttempts,
      cooldownMinutes,
      enabled,
      lastTriggered: null,
      totalTriggered: 0,
      createdAt: new Date().toISOString(),
    };

    this.policies.set(id, policy);
    console.log(`[AutoRecovery] Registered policy '${policy.name}'`);
    return policy;
  }

  /**
   * Evaluate and potentially trigger recovery
   */
  async evaluate(event) {
    const { type, projectId, severity } = event;

    const matchingPolicies = [...this.policies.values()].filter(p =>
      p.enabled &&
      p.projectId === projectId &&
      p.trigger === type &&
      (p.conditions.severity === 'any' || severity === p.conditions.severity)
    );

    const results = [];

    for (const policy of matchingPolicies) {
      // Check cooldown
      if (policy.lastTriggered) {
        const elapsed = Date.now() - new Date(policy.lastTriggered).getTime();
        if (elapsed < policy.cooldownMinutes * 60 * 1000) {
          results.push({
            policyId: policy.id,
            action: 'skipped',
            reason: 'cooldown',
            remainingMs: policy.cooldownMinutes * 60 * 1000 - elapsed,
          });
          continue;
        }
      }

      // Check max attempts
      const recentIncidents = [...this.incidents.values()].filter(
        i => i.policyId === policy.id &&
        Date.now() - new Date(i.startedAt).getTime() < 60 * 60 * 1000 // Last hour
      );

      if (recentIncidents.length >= policy.maxAttempts) {
        results.push({
          policyId: policy.id,
          action: 'skipped',
          reason: 'max_attempts_reached',
          attempts: recentIncidents.length,
        });
        continue;
      }

      // Execute recovery action
      try {
        const result = await this._executeRecovery(policy, event);
        results.push(result);
      } catch (err) {
        results.push({
          policyId: policy.id,
          action: 'failed',
          error: err.message,
        });
      }
    }

    return results;
  }

  /**
   * Get active incidents
   */
  getIncidents(projectId, options = {}) {
    const { status = null, limit = 50 } = options;

    let incidents = [...this.incidents.values()]
      .filter(i => i.projectId === projectId);

    if (status) {
      incidents = incidents.filter(i => i.status === status);
    }

    return incidents
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  }

  /**
   * Get recovery log
   */
  getRecoveryLog(projectId, limit = 50) {
    return this.recoveryLog
      .filter(e => e.projectId === projectId)
      .slice(-limit);
  }

  /**
   * List policies for a project
   */
  listPolicies(projectId) {
    return [...this.policies.values()]
      .filter(p => p.projectId === projectId);
  }

  /**
   * Update a policy
   */
  updatePolicy(policyId, updates) {
    const policy = this.policies.get(policyId);
    if (!policy) throw new Error('Recovery policy not found');

    Object.assign(policy, updates);
    return policy;
  }

  /**
   * Delete a policy
   */
  deletePolicy(policyId) {
    this.policies.delete(policyId);
    return { deleted: true };
  }

  /**
   * Acknowledge/resolve an incident
   */
  resolveIncident(incidentId, resolution = {}) {
    const incident = this.incidents.get(incidentId);
    if (!incident) throw new Error('Incident not found');

    incident.status = 'resolved';
    incident.resolvedAt = new Date().toISOString();
    incident.resolution = resolution.note || 'Manually resolved';

    return incident;
  }

  // ── Private ──

  async _executeRecovery(policy, event) {
    const incidentId = `incident-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const incident = {
      id: incidentId,
      policyId: policy.id,
      projectId: policy.projectId,
      trigger: policy.trigger,
      action: policy.action,
      status: 'in_progress',
      event,
      startedAt: new Date().toISOString(),
      completedAt: null,
      resolution: null,
    };

    this.incidents.set(incidentId, incident);

    let result;

    switch (policy.action) {
      case 'restart':
        result = await this._restartAction(policy, event);
        break;

      case 'rollback':
        result = await this._rollbackAction(policy, event);
        break;

      case 'scale_up':
        result = await this._scaleUpAction(policy, event);
        break;

      case 'notify':
        result = await this._notifyAction(policy, event);
        break;

      default:
        result = { success: false, error: `Unknown action: ${policy.action}` };
    }

    // Update incident
    incident.status = result.success ? 'recovered' : 'failed';
    incident.completedAt = new Date().toISOString();
    incident.resolution = result.message || result.error;

    // Update policy
    policy.lastTriggered = new Date().toISOString();
    policy.totalTriggered++;

    // Log
    this._log(policy, incident, result);

    return {
      policyId: policy.id,
      incidentId,
      action: policy.action,
      ...result,
    };
  }

  async _restartAction(policy, event) {
    // In production: restart sandbox container or deployment
    // const { sandboxManager } = require('../sandbox/sandbox-manager');
    // await sandboxManager.restart(event.targetId);

    console.log(`[AutoRecovery] Restarting service for project ${policy.projectId}`);
    return { success: true, message: 'Service restarted' };
  }

  async _rollbackAction(policy, event) {
    // In production: trigger deployment rollback
    // const { deployOrchestrator } = require('../deploy/deploy-orchestrator');
    // await deployOrchestrator.rollback(policy.projectId);

    console.log(`[AutoRecovery] Rolling back deployment for project ${policy.projectId}`);
    return { success: true, message: 'Deployment rolled back to previous version' };
  }

  async _scaleUpAction(policy, event) {
    // In production: increase resources
    // const { dbScaler } = require('../database/db-scaler');
    // await dbScaler.evaluateScaling(event.targetId, { cpuPercent: 100 });

    console.log(`[AutoRecovery] Scaling up resources for project ${policy.projectId}`);
    return { success: true, message: 'Resources scaled up' };
  }

  async _notifyAction(policy, event) {
    // In production: send webhook, email, Slack, PagerDuty
    console.log(`[AutoRecovery] Sending notification for project ${policy.projectId}`);
    return { success: true, message: 'Notification sent' };
  }

  _log(policy, incident, result) {
    this.recoveryLog.push({
      timestamp: new Date().toISOString(),
      projectId: policy.projectId,
      policyName: policy.name,
      action: policy.action,
      incidentId: incident.id,
      success: result.success,
      message: result.message || result.error,
    });

    if (this.recoveryLog.length > this.maxLogEntries) {
      this.recoveryLog.splice(0, this.recoveryLog.length - this.maxLogEntries);
    }
  }
}

const autoRecovery = new AutoRecovery();
module.exports = { autoRecovery, AutoRecovery };
