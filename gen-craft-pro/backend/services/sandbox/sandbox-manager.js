/**
 * Sandbox Manager — Container lifecycle orchestrator
 * 
 * Phase 2: Every project runs in an isolated Docker container
 * 
 * Responsibilities:
 *   - Create/destroy Docker containers per project
 *   - Enforce resource limits (CPU/RAM/disk) per plan
 *   - Auto-destroy idle containers after timeout
 *   - Track sandbox state in database
 */

const { v4: uuidv4 } = require('uuid');
const Docker = require('dockerode');
const EventEmitter = require('events');
const { sandboxTemplates } = require('./sandbox-templates');
const { allocatePort, releasePort } = require('./sandbox-network');
const { createVolume, destroyVolume, getVolumeStats } = require('./sandbox-storage');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// In-memory sandbox registry (backed by DB in production)
const sandboxes = new Map();

// Plan-based resource limits
const PLAN_LIMITS = {
  weekly: {
    maxSandboxes: 2,
    memory: 256 * 1024 * 1024,     // 256MB
    cpuShares: 512,                 // 0.5 CPU
    storage: 1 * 1024 * 1024 * 1024, // 1GB
    timeoutMinutes: 30,
  },
  monthly: {
    maxSandboxes: 5,
    memory: 512 * 1024 * 1024,     // 512MB
    cpuShares: 1024,               // 1 CPU
    storage: 5 * 1024 * 1024 * 1024, // 5GB
    timeoutMinutes: 60,
  },
  yearly: {
    maxSandboxes: 10,
    memory: 1024 * 1024 * 1024,    // 1GB
    cpuShares: 2048,               // 2 CPU
    storage: 20 * 1024 * 1024 * 1024, // 20GB
    timeoutMinutes: 120,
  },
};

class SandboxManager extends EventEmitter {
  constructor() {
    super();
    this._idleCheckInterval = null;
  }

  /**
   * Initialize the sandbox manager
   * - Verify Docker connection
   * - Start idle sandbox cleanup cron
   * - Recover any orphaned containers
   */
  async initialize() {
    try {
      const info = await docker.info();
      console.log(`[SandboxManager] Docker connected: ${info.Name}, Containers: ${info.Containers}`);
    } catch (err) {
      console.error('[SandboxManager] Docker connection failed:', err.message);
      throw new Error('Docker is not available. Sandbox features disabled.');
    }

    // Start idle cleanup every 60 seconds
    this._idleCheckInterval = setInterval(() => this._cleanupIdleSandboxes(), 60_000);

    // Recover orphaned containers on startup
    await this._recoverOrphans();
  }

  /**
   * Create a new sandbox for a project
   * 
   * @param {Object} config
   * @param {string} config.projectId - Project ID
   * @param {string} config.userId - User ID
   * @param {string} config.template - Sandbox template (node-18, next-app, etc.)
   * @param {string} config.plan - User's plan (weekly/monthly/yearly)
   * @param {Object} [config.envVars] - Environment variables
   * @returns {Object} Sandbox record
   */
  async createSandbox({ projectId, userId, template, plan, envVars = {} }) {
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.weekly;

    // Check concurrent sandbox limit
    const userSandboxes = this.getUserSandboxes(userId);
    const activeSandboxes = userSandboxes.filter(s => 
      ['creating', 'pulling', 'starting', 'running'].includes(s.status)
    );
    if (activeSandboxes.length >= limits.maxSandboxes) {
      throw new Error(
        `Sandbox limit reached (${limits.maxSandboxes} for ${plan} plan). ` +
        `Destroy an existing sandbox first.`
      );
    }

    // Check if project already has an active sandbox
    const existingSandbox = this.getProjectSandbox(projectId);
    if (existingSandbox && existingSandbox.status === 'running') {
      return existingSandbox;
    }

    const sandboxId = `sb-${uuidv4().slice(0, 12)}`;
    const templateConfig = sandboxTemplates[template];
    if (!templateConfig) {
      throw new Error(`Unknown sandbox template: ${template}`);
    }

    const sandbox = {
      id: sandboxId,
      projectId,
      userId,
      template,
      containerId: null,
      status: 'creating',
      port: null,
      previewUrl: null,
      resources: {
        memory: limits.memory / (1024 * 1024),
        cpu: limits.cpuShares / 1024,
        storage: limits.storage / (1024 * 1024 * 1024),
        timeout: limits.timeoutMinutes,
      },
      lastActivity: new Date().toISOString(),
      expiresAt: new Date(Date.now() + limits.timeoutMinutes * 60_000).toISOString(),
      createdAt: new Date().toISOString(),
      logs: [],
    };

    sandboxes.set(sandboxId, sandbox);
    this.emit('sandbox:creating', sandbox);

    try {
      // 1. Allocate port
      sandbox.port = await allocatePort();
      sandbox.previewUrl = `http://localhost:${sandbox.port}`;
      this._log(sandboxId, `Allocated port ${sandbox.port}`);

      // 2. Create persistent volume
      sandbox.status = 'pulling';
      this.emit('sandbox:pulling', sandbox);
      const volumeName = await createVolume(sandboxId, limits.storage);
      this._log(sandboxId, `Created volume ${volumeName}`);

      // 3. Pull image if not cached
      const image = templateConfig.image;
      try {
        await docker.getImage(image).inspect();
        this._log(sandboxId, `Image ${image} already cached`);
      } catch {
        this._log(sandboxId, `Pulling image ${image}...`);
        await this._pullImage(image);
        this._log(sandboxId, `Image ${image} pulled successfully`);
      }

      // 4. Create container
      sandbox.status = 'starting';
      this.emit('sandbox:starting', sandbox);

      const envArray = [
        ...templateConfig.env || [],
        ...Object.entries(envVars).map(([k, v]) => `${k}=${v}`),
        `SANDBOX_ID=${sandboxId}`,
        `PROJECT_ID=${projectId}`,
      ];

      const container = await docker.createContainer({
        Image: image,
        name: `gencraft-${sandboxId}`,
        Env: envArray,
        ExposedPorts: { [`${templateConfig.internalPort}/tcp`]: {} },
        HostConfig: {
          Memory: limits.memory,
          CpuShares: limits.cpuShares,
          PortBindings: {
            [`${templateConfig.internalPort}/tcp`]: [{ HostPort: String(sandbox.port) }],
          },
          Binds: [`${volumeName}:/workspace`],
          NetworkMode: 'gencraft-sandbox-net',
          AutoRemove: false,
          RestartPolicy: { Name: 'unless-stopped' },
          // Security
          ReadonlyRootfs: false,
          SecurityOpt: ['no-new-privileges'],
          CapDrop: ['ALL'],
          CapAdd: ['CHOWN', 'SETUID', 'SETGID', 'DAC_OVERRIDE', 'NET_BIND_SERVICE'],
        },
        WorkingDir: '/workspace',
        Cmd: templateConfig.startCmd,
        Labels: {
          'gencraft.sandbox': 'true',
          'gencraft.sandboxId': sandboxId,
          'gencraft.projectId': projectId,
          'gencraft.userId': userId,
        },
      });

      sandbox.containerId = container.id;
      this._log(sandboxId, `Container created: ${container.id.slice(0, 12)}`);

      // 5. Start container
      await container.start();
      sandbox.status = 'running';
      sandbox.lastActivity = new Date().toISOString();
      this._log(sandboxId, 'Container started');

      this.emit('sandbox:running', sandbox);

      // 6. Run project setup commands if template has init
      if (templateConfig.initCommands && templateConfig.initCommands.length > 0) {
        for (const cmd of templateConfig.initCommands) {
          this._log(sandboxId, `Running init: ${cmd}`);
          await this.exec(sandboxId, cmd);
        }
      }

      return sandbox;
    } catch (err) {
      sandbox.status = 'error';
      sandbox.error = err.message;
      this._log(sandboxId, `Error: ${err.message}`);
      this.emit('sandbox:error', { sandbox, error: err });

      // Cleanup on failure
      try { await this.destroySandbox(sandboxId); } catch {}

      throw err;
    }
  }

  /**
   * Execute a command inside the sandbox container
   * 
   * @param {string} sandboxId
   * @param {string} command - Shell command to execute
   * @param {Object} [options]
   * @param {number} [options.timeout=30000] - Timeout in ms
   * @returns {Object} { exitCode, stdout, stderr, duration }
   */
  async exec(sandboxId, command, options = {}) {
    const sandbox = this._getSandbox(sandboxId);
    if (sandbox.status !== 'running') {
      throw new Error(`Sandbox ${sandboxId} is not running (status: ${sandbox.status})`);
    }

    const timeout = options.timeout || 30_000;
    const container = docker.getContainer(sandbox.containerId);
    const startTime = Date.now();

    const exec = await container.exec({
      Cmd: ['sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: options.workingDir || '/workspace',
    });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
      }, timeout);

      exec.start({ hijack: true, stdin: false }, (err, stream) => {
        if (err) {
          clearTimeout(timer);
          return reject(err);
        }

        let stdout = '';
        let stderr = '';

        // Docker multiplexes stdout/stderr, demux them
        const stdoutStream = { write: (chunk) => { stdout += chunk.toString(); } };
        const stderrStream = { write: (chunk) => { stderr += chunk.toString(); } };

        docker.modem.demuxStream(stream, stdoutStream, stderrStream);

        stream.on('end', async () => {
          clearTimeout(timer);
          try {
            const inspectData = await exec.inspect();
            const duration = Date.now() - startTime;

            sandbox.lastActivity = new Date().toISOString();
            sandbox.expiresAt = new Date(
              Date.now() + (PLAN_LIMITS[sandbox.plan || 'weekly']?.timeoutMinutes || 30) * 60_000
            ).toISOString();

            resolve({
              exitCode: inspectData.ExitCode,
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              duration,
            });
          } catch (inspectErr) {
            resolve({ exitCode: -1, stdout, stderr, duration: Date.now() - startTime });
          }
        });

        stream.on('error', (streamErr) => {
          clearTimeout(timer);
          reject(streamErr);
        });
      });
    });
  }

  /**
   * Get sandbox status with live container stats
   */
  async getSandboxStatus(sandboxId) {
    const sandbox = this._getSandbox(sandboxId);
    
    if (sandbox.status === 'running' && sandbox.containerId) {
      try {
        const container = docker.getContainer(sandbox.containerId);
        const stats = await container.stats({ stream: false });
        const volumeStats = await getVolumeStats(sandboxId);

        sandbox.metrics = {
          cpuPercent: this._calculateCpuPercent(stats),
          memoryUsed: stats.memory_stats.usage || 0,
          memoryLimit: stats.memory_stats.limit || 0,
          memoryPercent: stats.memory_stats.usage 
            ? ((stats.memory_stats.usage / stats.memory_stats.limit) * 100).toFixed(1)
            : 0,
          networkRx: stats.networks?.eth0?.rx_bytes || 0,
          networkTx: stats.networks?.eth0?.tx_bytes || 0,
          diskUsed: volumeStats.used,
          diskLimit: volumeStats.limit,
        };
      } catch (err) {
        // Container might have been removed externally
        if (err.statusCode === 404) {
          sandbox.status = 'destroyed';
        }
      }
    }

    return { ...sandbox };
  }

  /**
   * Destroy a sandbox and clean up resources
   */
  async destroySandbox(sandboxId) {
    const sandbox = sandboxes.get(sandboxId);
    if (!sandbox) return;

    sandbox.status = 'destroying';
    this.emit('sandbox:destroying', sandbox);
    this._log(sandboxId, 'Destroying sandbox...');

    try {
      // Stop & remove container
      if (sandbox.containerId) {
        const container = docker.getContainer(sandbox.containerId);
        try {
          await container.stop({ t: 5 });
        } catch {}
        try {
          await container.remove({ force: true });
        } catch {}
        this._log(sandboxId, 'Container removed');
      }

      // Release port
      if (sandbox.port) {
        releasePort(sandbox.port);
        this._log(sandboxId, `Port ${sandbox.port} released`);
      }

      // Destroy volume
      try {
        await destroyVolume(sandboxId);
        this._log(sandboxId, 'Volume destroyed');
      } catch {}

      sandbox.status = 'destroyed';
      sandbox.destroyedAt = new Date().toISOString();
      this.emit('sandbox:destroyed', sandbox);

      // Remove from registry after a delay (keep for history)
      setTimeout(() => sandboxes.delete(sandboxId), 300_000); // 5 min

    } catch (err) {
      sandbox.status = 'error';
      sandbox.error = `Destroy failed: ${err.message}`;
      this._log(sandboxId, `Destroy error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get all sandboxes for a user
   */
  getUserSandboxes(userId) {
    return Array.from(sandboxes.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Get active sandbox for a project
   */
  getProjectSandbox(projectId) {
    return Array.from(sandboxes.values())
      .find(s => s.projectId === projectId && !['destroyed', 'error'].includes(s.status));
  }

  /**
   * List all active sandboxes (admin)
   */
  listAllSandboxes() {
    return Array.from(sandboxes.values())
      .filter(s => s.status === 'running')
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  }

  /**
   * Stream container logs via SSE
   */
  async streamLogs(sandboxId, res) {
    const sandbox = this._getSandbox(sandboxId);
    if (!sandbox.containerId) {
      throw new Error('Sandbox has no container');
    }

    const container = docker.getContainer(sandbox.containerId);
    const logStream = await container.logs({
      stdout: true,
      stderr: true,
      follow: true,
      tail: 100,
      timestamps: true,
    });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    logStream.on('data', (chunk) => {
      const text = chunk.toString().trim();
      if (text) {
        res.write(`data: ${JSON.stringify({ text, timestamp: new Date().toISOString() })}\n\n`);
      }
    });

    logStream.on('end', () => {
      res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
      res.end();
    });

    res.on('close', () => {
      logStream.destroy();
    });
  }

  /**
   * Extend sandbox timeout (touch activity)
   */
  touchSandbox(sandboxId) {
    const sandbox = sandboxes.get(sandboxId);
    if (sandbox && sandbox.status === 'running') {
      sandbox.lastActivity = new Date().toISOString();
      const timeoutMs = (PLAN_LIMITS[sandbox.plan || 'weekly']?.timeoutMinutes || 30) * 60_000;
      sandbox.expiresAt = new Date(Date.now() + timeoutMs).toISOString();
    }
  }

  /**
   * Shutdown all sandboxes and cleanup
   */
  async shutdown() {
    clearInterval(this._idleCheckInterval);
    const activeSandboxes = Array.from(sandboxes.values())
      .filter(s => s.status === 'running');

    console.log(`[SandboxManager] Shutting down ${activeSandboxes.length} sandboxes...`);
    await Promise.allSettled(
      activeSandboxes.map(s => this.destroySandbox(s.id))
    );
  }

  // ──────────── PRIVATE METHODS ────────────

  _getSandbox(sandboxId) {
    const sandbox = sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox not found: ${sandboxId}`);
    }
    return sandbox;
  }

  _log(sandboxId, message) {
    const sandbox = sandboxes.get(sandboxId);
    if (sandbox) {
      sandbox.logs.push({
        timestamp: new Date().toISOString(),
        message,
      });
    }
    console.log(`[Sandbox:${sandboxId}] ${message}`);
  }

  async _pullImage(image) {
    return new Promise((resolve, reject) => {
      docker.pull(image, (err, stream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  }

  _calculateCpuPercent(stats) {
    const cpuDelta = (stats.cpu_stats.cpu_usage.total_usage || 0) -
                     (stats.precpu_stats.cpu_usage.total_usage || 0);
    const systemDelta = (stats.cpu_stats.system_cpu_usage || 0) -
                        (stats.precpu_stats.system_cpu_usage || 0);
    const cpuCount = stats.cpu_stats.online_cpus || 1;

    if (systemDelta > 0 && cpuDelta > 0) {
      return ((cpuDelta / systemDelta) * cpuCount * 100).toFixed(2);
    }
    return 0;
  }

  async _cleanupIdleSandboxes() {
    const now = Date.now();
    for (const [id, sandbox] of sandboxes) {
      if (sandbox.status === 'running' && new Date(sandbox.expiresAt).getTime() < now) {
        console.log(`[SandboxManager] Auto-destroying idle sandbox: ${id}`);
        try {
          await this.destroySandbox(id);
        } catch (err) {
          console.error(`[SandboxManager] Failed to destroy ${id}:`, err.message);
        }
      }
    }
  }

  async _recoverOrphans() {
    try {
      const containers = await docker.listContainers({
        all: true,
        filters: { label: ['gencraft.sandbox=true'] },
      });

      for (const containerInfo of containers) {
        const sandboxId = containerInfo.Labels['gencraft.sandboxId'];
        if (sandboxId && !sandboxes.has(sandboxId)) {
          console.log(`[SandboxManager] Removing orphaned container: ${containerInfo.Id.slice(0, 12)}`);
          try {
            const container = docker.getContainer(containerInfo.Id);
            await container.stop({ t: 2 });
            await container.remove({ force: true });
          } catch {}
        }
      }
    } catch (err) {
      console.warn('[SandboxManager] Orphan recovery failed:', err.message);
    }
  }
}

// Singleton
const sandboxManager = new SandboxManager();

module.exports = { sandboxManager, PLAN_LIMITS };
