/**
 * Build Logger — Stream build logs to frontend via SSE
 * 
 * Stores logs per build and provides real-time streaming
 * to connected clients via Server-Sent Events.
 */

const EventEmitter = require('events');

// Global log store
const buildLogs = new Map();
const logEmitter = new EventEmitter();
logEmitter.setMaxListeners(100);

class BuildLogger {
  constructor(buildId) {
    this.buildId = buildId;
    this.logs = [];
    this.startedAt = new Date().toISOString();
    this.finalized = false;
    buildLogs.set(buildId, this);
  }

  /**
   * Add a log entry
   * 
   * @param {string} stage - Build stage name
   * @param {'info'|'warn'|'error'|'debug'} level
   * @param {string} message
   */
  log(stage, level, message) {
    const entry = {
      timestamp: new Date().toISOString(),
      stage,
      level,
      message,
      buildId: this.buildId,
    };

    this.logs.push(entry);

    // Emit to SSE subscribers
    logEmitter.emit(`build:${this.buildId}`, entry);
    logEmitter.emit('build:*', entry);
  }

  /**
   * Get all logs
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Get logs for a specific stage
   */
  getStageLogs(stage) {
    return this.logs.filter(l => l.stage === stage);
  }

  /**
   * Mark logger as finalized (build complete)
   */
  finalize() {
    this.finalized = true;
    this.completedAt = new Date().toISOString();
    logEmitter.emit(`build:${this.buildId}`, {
      timestamp: this.completedAt,
      stage: 'system',
      level: 'info',
      message: '__BUILD_COMPLETE__',
      buildId: this.buildId,
    });
  }
}

/**
 * Stream build logs via SSE (Server-Sent Events)
 * 
 * @param {string} buildId
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function streamBuildLogs(buildId, req, res) {
  const logger = buildLogs.get(buildId);

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send existing logs first
  if (logger) {
    for (const entry of logger.logs) {
      res.write(`data: ${JSON.stringify(entry)}\n\n`);
    }

    // If build is already complete, close
    if (logger.finalized) {
      res.write(`data: ${JSON.stringify({ type: 'end', message: 'Build complete' })}\n\n`);
      res.end();
      return;
    }
  }

  // Subscribe to new logs
  const handler = (entry) => {
    if (entry.message === '__BUILD_COMPLETE__') {
      res.write(`data: ${JSON.stringify({ type: 'end', message: 'Build complete' })}\n\n`);
      res.end();
      logEmitter.removeListener(`build:${buildId}`, handler);
      return;
    }
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  };

  logEmitter.on(`build:${buildId}`, handler);

  // Cleanup on disconnect
  req.on('close', () => {
    logEmitter.removeListener(`build:${buildId}`, handler);
  });

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 15000);

  req.on('close', () => clearInterval(heartbeat));
}

/**
 * Get build logger instance
 */
function getLogger(buildId) {
  return buildLogs.get(buildId) || null;
}

/**
 * Get logs for a build
 */
function getBuildLogs(buildId) {
  const logger = buildLogs.get(buildId);
  return logger ? logger.getLogs() : [];
}

/**
 * Cleanup old build logs
 * @param {number} maxAgeMs - Max age in milliseconds
 */
function cleanupLogs(maxAgeMs = 24 * 60 * 60 * 1000) {
  const now = Date.now();
  let cleaned = 0;

  for (const [buildId, logger] of buildLogs) {
    if (logger.finalized) {
      const age = now - new Date(logger.completedAt || logger.startedAt).getTime();
      if (age > maxAgeMs) {
        buildLogs.delete(buildId);
        cleaned++;
      }
    }
  }

  return cleaned;
}

module.exports = {
  BuildLogger,
  streamBuildLogs,
  getLogger,
  getBuildLogs,
  cleanupLogs,
  logEmitter,
};
