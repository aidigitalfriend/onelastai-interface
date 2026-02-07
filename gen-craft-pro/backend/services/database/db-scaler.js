/**
 * GenCraft Pro — Database Scaler
 * Phase 5: Managed Database
 * 
 * Manages database scaling: read replicas, connection pooling,
 * resource allocation, and auto-scaling policies.
 */

class DatabaseScaler {
  constructor() {
    // Pool configurations per database
    this.pools = new Map();
    // Scaling policies
    this.policies = new Map();

    this.resourceTiers = {
      starter: { cpu: 0.25, memoryMB: 256, maxConnections: 10 },
      standard: { cpu: 0.5, memoryMB: 512, maxConnections: 50 },
      performance: { cpu: 1, memoryMB: 1024, maxConnections: 100 },
      enterprise: { cpu: 2, memoryMB: 2048, maxConnections: 200 },
    };

    this.planTiers = {
      weekly: 'starter',
      monthly: 'standard',
      yearly: 'performance',
    };
  }

  /**
   * Configure connection pool for a database
   */
  configurePool(dbId, options = {}) {
    const {
      plan = 'monthly',
      minConnections = 2,
      maxConnections = null,
      idleTimeoutMs = 30000,
      acquireTimeoutMs = 10000,
    } = options;

    const tier = this.planTiers[plan] || 'standard';
    const resources = this.resourceTiers[tier];
    const maxConn = maxConnections || resources.maxConnections;

    const pool = {
      databaseId: dbId,
      tier,
      resources,
      pool: {
        min: Math.min(minConnections, maxConn),
        max: maxConn,
        idleTimeoutMs,
        acquireTimeoutMs,
      },
      metrics: {
        activeConnections: 0,
        idleConnections: 0,
        waitingRequests: 0,
        totalAcquired: 0,
        totalReleased: 0,
      },
      createdAt: new Date().toISOString(),
    };

    this.pools.set(dbId, pool);
    console.log(`[DBScaler] Configured ${tier} pool (max ${maxConn}) for database ${dbId}`);
    return pool;
  }

  /**
   * Add a read replica
   */
  async addReadReplica(dbId, options = {}) {
    const {
      region = 'us-east-1',
      plan = 'yearly',
    } = options;

    const limits = {
      weekly: 0,
      monthly: 0,
      yearly: 2,
    };

    const maxReplicas = limits[plan] || 0;
    if (maxReplicas === 0) {
      throw new Error(`Read replicas not available on ${plan} plan`);
    }

    const pool = this.pools.get(dbId);
    if (!pool) throw new Error('Database pool not configured');

    if (!pool.replicas) pool.replicas = [];
    if (pool.replicas.length >= maxReplicas) {
      throw new Error(`Maximum replicas (${maxReplicas}) reached`);
    }

    const replicaId = `replica-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const replica = {
      id: replicaId,
      databaseId: dbId,
      region,
      status: 'provisioning',
      host: `${replicaId}.read.internal.maula.ai`,
      lag: 0,
      createdAt: new Date().toISOString(),
    };

    pool.replicas.push(replica);

    // In production: create read replica via managed DB API
    setTimeout(() => {
      replica.status = 'syncing';
      setTimeout(() => {
        replica.status = 'ready';
      }, 3000);
    }, 2000);

    console.log(`[DBScaler] Adding read replica ${replicaId} in ${region}`);
    return replica;
  }

  /**
   * Remove a read replica
   */
  async removeReadReplica(dbId, replicaId) {
    const pool = this.pools.get(dbId);
    if (!pool || !pool.replicas) throw new Error('No replicas found');

    const idx = pool.replicas.findIndex(r => r.id === replicaId);
    if (idx === -1) throw new Error('Replica not found');

    const replica = pool.replicas[idx];
    replica.status = 'deleting';

    // In production: terminate replica instance
    pool.replicas.splice(idx, 1);

    console.log(`[DBScaler] Removed replica ${replicaId}`);
    return { deleted: true, replicaId };
  }

  /**
   * Set auto-scaling policy
   */
  setAutoScalePolicy(dbId, policy = {}) {
    const {
      enabled = true,
      scaleUpThreshold = 80,     // CPU % to trigger scale up
      scaleDownThreshold = 20,   // CPU % to trigger scale down
      minTier = 'starter',
      maxTier = 'performance',
      cooldownMinutes = 10,
    } = policy;

    const autoScalePolicy = {
      databaseId: dbId,
      enabled,
      scaleUpThreshold,
      scaleDownThreshold,
      minTier,
      maxTier,
      cooldownMinutes,
      lastScaleAction: null,
      createdAt: new Date().toISOString(),
    };

    this.policies.set(dbId, autoScalePolicy);
    console.log(`[DBScaler] Auto-scale policy set for ${dbId}`);
    return autoScalePolicy;
  }

  /**
   * Evaluate auto-scaling (called by monitoring)
   */
  async evaluateScaling(dbId, currentMetrics) {
    const policy = this.policies.get(dbId);
    if (!policy || !policy.enabled) return null;

    const pool = this.pools.get(dbId);
    if (!pool) return null;

    const { cpuPercent } = currentMetrics;
    const tierOrder = ['starter', 'standard', 'performance', 'enterprise'];
    const currentTierIdx = tierOrder.indexOf(pool.tier);
    const minIdx = tierOrder.indexOf(policy.minTier);
    const maxIdx = tierOrder.indexOf(policy.maxTier);

    // Check cooldown
    if (policy.lastScaleAction) {
      const elapsed = Date.now() - new Date(policy.lastScaleAction).getTime();
      if (elapsed < policy.cooldownMinutes * 60 * 1000) {
        return { action: 'cooldown', remainingMs: policy.cooldownMinutes * 60 * 1000 - elapsed };
      }
    }

    let action = null;

    if (cpuPercent >= policy.scaleUpThreshold && currentTierIdx < maxIdx) {
      const newTier = tierOrder[currentTierIdx + 1];
      pool.tier = newTier;
      pool.resources = this.resourceTiers[newTier];
      pool.pool.max = pool.resources.maxConnections;
      action = { action: 'scale_up', from: tierOrder[currentTierIdx], to: newTier };
    } else if (cpuPercent <= policy.scaleDownThreshold && currentTierIdx > minIdx) {
      const newTier = tierOrder[currentTierIdx - 1];
      pool.tier = newTier;
      pool.resources = this.resourceTiers[newTier];
      pool.pool.max = pool.resources.maxConnections;
      action = { action: 'scale_down', from: tierOrder[currentTierIdx], to: newTier };
    }

    if (action) {
      policy.lastScaleAction = new Date().toISOString();
      console.log(`[DBScaler] Auto-scaled ${dbId}: ${action.action} (${action.from} → ${action.to})`);
    }

    return action;
  }

  /**
   * Get pool status and metrics
   */
  getPoolStatus(dbId) {
    const pool = this.pools.get(dbId);
    if (!pool) return null;

    return {
      databaseId: dbId,
      tier: pool.tier,
      resources: pool.resources,
      pool: pool.pool,
      metrics: pool.metrics,
      replicas: (pool.replicas || []).map(r => ({
        id: r.id,
        region: r.region,
        status: r.status,
        lag: r.lag,
      })),
      autoScale: this.policies.get(dbId) || null,
    };
  }
}

const dbScaler = new DatabaseScaler();
module.exports = { dbScaler, DatabaseScaler };
