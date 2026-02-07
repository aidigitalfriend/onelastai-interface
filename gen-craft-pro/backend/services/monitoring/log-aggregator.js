/**
 * GenCraft Pro — Log Aggregator
 * Phase 6: Monitoring & Observability
 * 
 * Collects, indexes, and queries application logs from
 * sandboxes, build pipelines, and production deployments.
 */

class LogAggregator {
  constructor() {
    // In-memory log store (production: Elasticsearch/Loki/CloudWatch)
    this.logs = new Map();        // projectId -> log[]
    this.streams = new Map();     // streamId -> { res, projectId }
    this.maxLogsPerProject = 10000;
    this.retentionDays = {
      weekly: 1,
      monthly: 7,
      yearly: 30,
    };
  }

  /**
   * Ingest a log entry
   */
  ingest(projectId, entry) {
    const log = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      projectId,
      timestamp: entry.timestamp || new Date().toISOString(),
      level: entry.level || 'info',             // debug, info, warn, error, fatal
      source: entry.source || 'app',            // app, build, deploy, sandbox, system
      message: entry.message || '',
      metadata: entry.metadata || {},
      labels: entry.labels || {},
      traceId: entry.traceId || null,
      spanId: entry.spanId || null,
    };

    const projectLogs = this.logs.get(projectId) || [];
    projectLogs.push(log);

    // Enforce max logs
    if (projectLogs.length > this.maxLogsPerProject) {
      projectLogs.splice(0, projectLogs.length - this.maxLogsPerProject);
    }

    this.logs.set(projectId, projectLogs);

    // Stream to active listeners
    this._broadcast(projectId, log);

    return log;
  }

  /**
   * Batch ingest multiple entries
   */
  batchIngest(projectId, entries) {
    return entries.map(entry => this.ingest(projectId, entry));
  }

  /**
   * Query logs with filters
   */
  query(projectId, filters = {}) {
    const {
      level = null,          // Filter by level
      levels = null,         // Filter by multiple levels
      source = null,
      search = null,         // Full-text search
      startTime = null,
      endTime = null,
      labels = {},
      traceId = null,
      limit = 100,
      offset = 0,
      order = 'desc',        // asc | desc
    } = filters;

    let results = this.logs.get(projectId) || [];

    // Apply filters
    if (level) {
      results = results.filter(l => l.level === level);
    }
    if (levels && levels.length) {
      results = results.filter(l => levels.includes(l.level));
    }
    if (source) {
      results = results.filter(l => l.source === source);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(l =>
        l.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(l.metadata).toLowerCase().includes(searchLower)
      );
    }
    if (startTime) {
      results = results.filter(l => l.timestamp >= startTime);
    }
    if (endTime) {
      results = results.filter(l => l.timestamp <= endTime);
    }
    if (Object.keys(labels).length) {
      results = results.filter(l =>
        Object.entries(labels).every(([k, v]) => l.labels[k] === v)
      );
    }
    if (traceId) {
      results = results.filter(l => l.traceId === traceId);
    }

    // Sort
    results.sort((a, b) => {
      const cmp = a.timestamp.localeCompare(b.timestamp);
      return order === 'desc' ? -cmp : cmp;
    });

    // Paginate
    const total = results.length;
    results = results.slice(offset, offset + limit);

    return { total, offset, limit, logs: results };
  }

  /**
   * Get log stats/aggregations
   */
  getStats(projectId, options = {}) {
    const { period = '1h' } = options;
    const logs = this.logs.get(projectId) || [];

    const periodMs = this._parsePeriod(period);
    const cutoff = new Date(Date.now() - periodMs).toISOString();
    const recent = logs.filter(l => l.timestamp >= cutoff);

    // Count by level
    const byLevel = {};
    const bySource = {};
    for (const log of recent) {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      bySource[log.source] = (bySource[log.source] || 0) + 1;
    }

    // Error rate (errors + fatals / total)
    const errorCount = (byLevel.error || 0) + (byLevel.fatal || 0);
    const errorRate = recent.length > 0 ? (errorCount / recent.length * 100).toFixed(2) : 0;

    // Logs per minute
    const logsPerMinute = recent.length / (periodMs / 60000);

    return {
      projectId,
      period,
      total: recent.length,
      byLevel,
      bySource,
      errorRate: parseFloat(errorRate),
      logsPerMinute: Math.round(logsPerMinute * 100) / 100,
      oldestLog: recent[0]?.timestamp || null,
      newestLog: recent[recent.length - 1]?.timestamp || null,
    };
  }

  /**
   * Stream logs in real-time (SSE)
   */
  createStream(projectId, res, filters = {}) {
    const streamId = `stream-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    this.streams.set(streamId, {
      res,
      projectId,
      filters,
      createdAt: new Date().toISOString(),
    });

    // Send existing recent logs
    const recent = this.query(projectId, { ...filters, limit: 50, order: 'asc' });
    for (const log of recent.logs) {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    }

    // Heartbeat
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);

    // Cleanup on disconnect
    res.on('close', () => {
      clearInterval(heartbeat);
      this.streams.delete(streamId);
    });

    return streamId;
  }

  /**
   * Clean up old logs based on retention policy
   */
  cleanup(plan = 'monthly') {
    const retentionMs = (this.retentionDays[plan] || 7) * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - retentionMs).toISOString();
    let cleaned = 0;

    for (const [projectId, logs] of this.logs.entries()) {
      const before = logs.length;
      const filtered = logs.filter(l => l.timestamp >= cutoff);
      if (filtered.length < before) {
        this.logs.set(projectId, filtered);
        cleaned += before - filtered.length;
      }
    }

    console.log(`[LogAggregator] Cleaned ${cleaned} old log entries`);
    return { cleaned };
  }

  // ── Private ──

  _broadcast(projectId, log) {
    for (const [, stream] of this.streams.entries()) {
      if (stream.projectId !== projectId) continue;

      // Apply stream filters
      const { filters } = stream;
      if (filters.level && log.level !== filters.level) continue;
      if (filters.source && log.source !== filters.source) continue;

      try {
        stream.res.write(`data: ${JSON.stringify(log)}\n\n`);
      } catch (err) {
        // Client disconnected
      }
    }
  }

  _parsePeriod(period) {
    const match = period.match(/^(\d+)([mhd])$/);
    if (!match) return 60 * 60 * 1000; // Default 1h

    const [, value, unit] = match;
    const multipliers = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return parseInt(value) * (multipliers[unit] || multipliers.h);
  }
}

const logAggregator = new LogAggregator();
module.exports = { logAggregator, LogAggregator };
