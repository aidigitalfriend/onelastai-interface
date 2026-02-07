/**
 * GenCraft Pro — Error Tracker
 * Phase 6: Monitoring & Observability
 * 
 * Captures, groups, and analyzes application errors.
 * Provides stack trace parsing, error deduplication,
 * and alerting integration.
 */

class ErrorTracker {
  constructor() {
    // In-memory error store (production: Sentry/Bugsnag/database)
    this.errors = new Map();      // projectId -> errorGroup[]
    this.errorEvents = new Map(); // projectId -> rawEvent[]
    this.maxEventsPerProject = 5000;
    this.maxGroupsPerProject = 500;
  }

  /**
   * Capture an error event
   */
  capture(projectId, error) {
    const event = {
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      projectId,
      timestamp: error.timestamp || new Date().toISOString(),
      type: error.type || error.name || 'Error',
      message: error.message || 'Unknown error',
      stack: error.stack || null,
      source: error.source || 'app',         // app, build, deploy, sandbox
      severity: error.severity || 'error',   // warning, error, fatal
      context: {
        url: error.url || null,
        method: error.method || null,
        statusCode: error.statusCode || null,
        userId: error.userId || null,
        userAgent: error.userAgent || null,
        ip: error.ip || null,
        environment: error.environment || 'production',
      },
      metadata: error.metadata || {},
      fingerprint: null,
      groupId: null,
    };

    // Generate fingerprint for grouping
    event.fingerprint = this._generateFingerprint(event);

    // Find or create error group
    const group = this._getOrCreateGroup(projectId, event);
    event.groupId = group.id;

    // Store raw event
    const events = this.errorEvents.get(projectId) || [];
    events.push(event);
    if (events.length > this.maxEventsPerProject) {
      events.splice(0, events.length - this.maxEventsPerProject);
    }
    this.errorEvents.set(projectId, events);

    console.log(`[ErrorTracker] Captured ${event.type}: ${event.message.substring(0, 80)}`);
    return event;
  }

  /**
   * Get grouped errors for a project
   */
  getGroups(projectId, options = {}) {
    const {
      status = null,          // new, acknowledged, resolved, ignored
      severity = null,
      source = null,
      sortBy = 'lastSeen',    // lastSeen, count, firstSeen
      order = 'desc',
      limit = 50,
      offset = 0,
    } = options;

    let groups = this.errors.get(projectId) || [];

    // Apply filters
    if (status) groups = groups.filter(g => g.status === status);
    if (severity) groups = groups.filter(g => g.severity === severity);
    if (source) groups = groups.filter(g => g.source === source);

    // Sort
    groups.sort((a, b) => {
      const cmp = sortBy === 'count'
        ? a.count - b.count
        : (a[sortBy] || '').localeCompare(b[sortBy] || '');
      return order === 'desc' ? -cmp : cmp;
    });

    const total = groups.length;
    groups = groups.slice(offset, offset + limit);

    return { total, groups };
  }

  /**
   * Get a specific error group with events
   */
  getGroup(projectId, groupId) {
    const groups = this.errors.get(projectId) || [];
    const group = groups.find(g => g.id === groupId);
    if (!group) return null;

    // Get events for this group
    const events = (this.errorEvents.get(projectId) || [])
      .filter(e => e.groupId === groupId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 50);

    return { ...group, events };
  }

  /**
   * Update error group status
   */
  updateGroupStatus(projectId, groupId, status) {
    const groups = this.errors.get(projectId) || [];
    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Error group not found');

    const validStatuses = ['new', 'acknowledged', 'resolved', 'ignored'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    group.status = status;
    group.updatedAt = new Date().toISOString();

    if (status === 'resolved') {
      group.resolvedAt = new Date().toISOString();
    }

    return group;
  }

  /**
   * Get error statistics
   */
  getStats(projectId, options = {}) {
    const { period = '24h' } = options;
    const groups = this.errors.get(projectId) || [];
    const events = this.errorEvents.get(projectId) || [];

    const periodMs = this._parsePeriod(period);
    const cutoff = new Date(Date.now() - periodMs).toISOString();
    const recentEvents = events.filter(e => e.timestamp >= cutoff);

    // Group by severity
    const bySeverity = {};
    for (const event of recentEvents) {
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
    }

    // Group by source
    const bySource = {};
    for (const event of recentEvents) {
      bySource[event.source] = (bySource[event.source] || 0) + 1;
    }

    // Error timeline (hourly buckets)
    const timeline = this._buildTimeline(recentEvents, periodMs);

    // Top errors
    const topErrors = [...groups]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(g => ({
        id: g.id,
        type: g.type,
        message: g.message,
        count: g.count,
        severity: g.severity,
        status: g.status,
      }));

    return {
      projectId,
      period,
      totalGroups: groups.length,
      openGroups: groups.filter(g => g.status !== 'resolved' && g.status !== 'ignored').length,
      totalEvents: recentEvents.length,
      bySeverity,
      bySource,
      timeline,
      topErrors,
    };
  }

  /**
   * Parse stack trace
   */
  parseStack(stack) {
    if (!stack) return [];

    return stack
      .split('\n')
      .filter(line => line.trim().startsWith('at '))
      .map(line => {
        const match = line.trim().match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
          return {
            function: match[1],
            file: match[2],
            line: parseInt(match[3]),
            column: parseInt(match[4]),
          };
        }

        const simpleMatch = line.trim().match(/at\s+(.+?):(\d+):(\d+)/);
        if (simpleMatch) {
          return {
            function: '<anonymous>',
            file: simpleMatch[1],
            line: parseInt(simpleMatch[2]),
            column: parseInt(simpleMatch[3]),
          };
        }

        return { raw: line.trim() };
      });
  }

  /**
   * Clean up resolved/old errors
   */
  cleanup(projectId, options = {}) {
    const { olderThanDays = 30, includeResolved = true } = options;
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

    let groups = this.errors.get(projectId) || [];
    const before = groups.length;

    groups = groups.filter(g => {
      if (includeResolved && g.status === 'resolved' && g.resolvedAt < cutoff) return false;
      if (g.lastSeen < cutoff && g.status === 'ignored') return false;
      return true;
    });

    this.errors.set(projectId, groups);
    const cleaned = before - groups.length;

    console.log(`[ErrorTracker] Cleaned ${cleaned} error groups for project ${projectId}`);
    return { cleaned };
  }

  // ── Private ──

  _generateFingerprint(event) {
    // Group by error type + first meaningful stack frame + message pattern
    const parts = [event.type, event.source];

    if (event.stack) {
      const frames = this.parseStack(event.stack);
      const firstAppFrame = frames.find(f => f.file && !f.file.includes('node_modules'));
      if (firstAppFrame) {
        parts.push(`${firstAppFrame.file}:${firstAppFrame.function}`);
      }
    }

    // Normalize message (remove variable parts like IDs, timestamps)
    const normalizedMsg = event.message
      .replace(/[0-9a-f]{8,}/gi, '<id>')
      .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/g, '<timestamp>')
      .replace(/\d+/g, '<n>');
    parts.push(normalizedMsg);

    const crypto = require('crypto');
    return crypto.createHash('md5').update(parts.join('|')).digest('hex');
  }

  _getOrCreateGroup(projectId, event) {
    const groups = this.errors.get(projectId) || [];
    let group = groups.find(g => g.fingerprint === event.fingerprint);

    if (group) {
      group.count++;
      group.lastSeen = event.timestamp;
      if (group.status === 'resolved') {
        group.status = 'regressed';
      }
    } else {
      group = {
        id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        projectId,
        fingerprint: event.fingerprint,
        type: event.type,
        message: event.message,
        source: event.source,
        severity: event.severity,
        status: 'new',
        count: 1,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        resolvedAt: null,
        parsedStack: event.stack ? this.parseStack(event.stack) : [],
      };
      groups.push(group);

      // Enforce max groups
      if (groups.length > this.maxGroupsPerProject) {
        // Remove oldest resolved groups
        const resolved = groups
          .filter(g => g.status === 'resolved')
          .sort((a, b) => a.resolvedAt.localeCompare(b.resolvedAt));
        if (resolved.length) {
          const idx = groups.indexOf(resolved[0]);
          groups.splice(idx, 1);
        }
      }
    }

    this.errors.set(projectId, groups);
    return group;
  }

  _buildTimeline(events, periodMs) {
    const bucketMs = Math.min(periodMs / 24, 60 * 60 * 1000); // Max 1 hour buckets
    const buckets = new Map();

    for (const event of events) {
      const ts = new Date(event.timestamp).getTime();
      const bucket = Math.floor(ts / bucketMs) * bucketMs;
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([timestamp, count]) => ({
        timestamp: new Date(timestamp).toISOString(),
        count,
      }));
  }

  _parsePeriod(period) {
    const match = period.match(/^(\d+)([mhd])$/);
    if (!match) return 24 * 60 * 60 * 1000;

    const [, value, unit] = match;
    const multipliers = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return parseInt(value) * (multipliers[unit] || multipliers.h);
  }
}

const errorTracker = new ErrorTracker();
module.exports = { errorTracker, ErrorTracker };
