/**
 * Task Runner Server - Real-time Task Execution with WebSocket
 * Handles build tasks, test runners, linters, and custom commands
 * Run: node task-runner-server.js
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Socket.IO with CORS for frontend
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173', /\.github\.dev$/, /\.app\.github\.dev$/],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Store active task executions
const taskExecutions = new Map();
const taskHistory = [];

// Predefined task templates
const TASK_TEMPLATES = {
  // Build tasks
  'npm-build': { command: 'npm', args: ['run', 'build'], type: 'build' },
  'npm-dev': { command: 'npm', args: ['run', 'dev'], type: 'watch' },
  'npm-install': { command: 'npm', args: ['install'], type: 'install' },
  'yarn-build': { command: 'yarn', args: ['build'], type: 'build' },
  'pnpm-build': { command: 'pnpm', args: ['build'], type: 'build' },
  'vite-build': { command: 'npx', args: ['vite', 'build'], type: 'build' },
  'tsc': { command: 'npx', args: ['tsc'], type: 'build' },
  'webpack': { command: 'npx', args: ['webpack'], type: 'build' },
  
  // Test tasks
  'npm-test': { command: 'npm', args: ['test'], type: 'test' },
  'jest': { command: 'npx', args: ['jest'], type: 'test' },
  'vitest': { command: 'npx', args: ['vitest', 'run'], type: 'test' },
  'vitest-watch': { command: 'npx', args: ['vitest'], type: 'watch' },
  'mocha': { command: 'npx', args: ['mocha'], type: 'test' },
  'pytest': { command: 'pytest', args: [], type: 'test' },
  'go-test': { command: 'go', args: ['test', './...'], type: 'test' },
  'cargo-test': { command: 'cargo', args: ['test'], type: 'test' },
  
  // Lint tasks
  'eslint': { command: 'npx', args: ['eslint', '.'], type: 'lint' },
  'eslint-fix': { command: 'npx', args: ['eslint', '.', '--fix'], type: 'lint' },
  'prettier': { command: 'npx', args: ['prettier', '--write', '.'], type: 'format' },
  'prettier-check': { command: 'npx', args: ['prettier', '--check', '.'], type: 'lint' },
  'pylint': { command: 'pylint', args: ['.'], type: 'lint' },
  'black': { command: 'black', args: ['.'], type: 'format' },
  'rustfmt': { command: 'cargo', args: ['fmt'], type: 'format' },
  'clippy': { command: 'cargo', args: ['clippy'], type: 'lint' },
  
  // Other tasks
  'docker-build': { command: 'docker', args: ['build', '.'], type: 'deploy' },
  'docker-compose-up': { command: 'docker-compose', args: ['up'], type: 'deploy' },
  'clean': { command: 'rm', args: ['-rf', 'node_modules', 'dist', '.cache'], type: 'clean' }
};

// Test framework configurations
const TEST_FRAMEWORKS = {
  jest: {
    command: 'npx',
    args: ['jest', '--json', '--outputFile=/tmp/jest-results.json'],
    coverageArgs: ['--coverage', '--coverageReporters=json-summary'],
    watchArgs: ['--watch']
  },
  vitest: {
    command: 'npx',
    args: ['vitest', 'run', '--reporter=json'],
    coverageArgs: ['--coverage'],
    watchArgs: []
  },
  pytest: {
    command: 'pytest',
    args: ['--tb=short', '-v'],
    coverageArgs: ['--cov', '--cov-report=json'],
    watchArgs: []
  },
  mocha: {
    command: 'npx',
    args: ['mocha', '--reporter', 'json'],
    coverageArgs: [],
    watchArgs: ['--watch']
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeExecutions: taskExecutions.size,
    historyCount: taskHistory.length
  });
});

// Get task templates
app.get('/api/tasks/templates', (req, res) => {
  res.json({ templates: TASK_TEMPLATES });
});

// Get test frameworks
app.get('/api/tasks/test-frameworks', (req, res) => {
  res.json({ frameworks: Object.keys(TEST_FRAMEWORKS) });
});

// Get task history
app.get('/api/tasks/history', (req, res) => {
  res.json({ 
    history: taskHistory.slice(-50).reverse(),
    total: taskHistory.length
  });
});

// Task Execution Class
class TaskExecution {
  constructor(id, config, socket) {
    this.id = id;
    this.config = config;
    this.socket = socket;
    this.process = null;
    this.status = 'pending';
    this.output = [];
    this.errors = [];
    this.startTime = null;
    this.endTime = null;
    this.exitCode = null;
  }

  async start() {
    this.startTime = new Date();
    this.status = 'running';

    const { command, args = [], cwd, env = {} } = this.config;

    try {
      this.process = spawn(command, args, {
        cwd: cwd || process.cwd(),
        env: { ...process.env, ...env, FORCE_COLOR: '1' },
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.socket.emit('task:started', {
        executionId: this.id,
        command: `${command} ${args.join(' ')}`,
        startTime: this.startTime
      });

      // Handle stdout
      this.process.stdout.on('data', (data) => {
        const line = data.toString();
        this.output.push(line);
        this.socket.emit('task:output', {
          executionId: this.id,
          type: 'stdout',
          data: line
        });
      });

      // Handle stderr
      this.process.stderr.on('data', (data) => {
        const line = data.toString();
        this.errors.push(line);
        this.socket.emit('task:output', {
          executionId: this.id,
          type: 'stderr',
          data: line
        });
      });

      // Handle process exit
      this.process.on('exit', (code, signal) => {
        this.endTime = new Date();
        this.exitCode = code;
        this.status = code === 0 ? 'success' : 'failed';

        const result = this.getResult();
        taskHistory.push(result);

        this.socket.emit('task:completed', result);
        taskExecutions.delete(this.id);
      });

      // Handle errors
      this.process.on('error', (error) => {
        this.endTime = new Date();
        this.status = 'failed';
        this.errors.push(error.message);

        this.socket.emit('task:error', {
          executionId: this.id,
          error: error.message
        });
        taskExecutions.delete(this.id);
      });

      return { success: true, executionId: this.id };
    } catch (error) {
      this.status = 'failed';
      throw error;
    }
  }

  cancel() {
    if (this.process && this.status === 'running') {
      this.process.kill('SIGTERM');
      this.status = 'cancelled';
      this.endTime = new Date();

      this.socket.emit('task:cancelled', {
        executionId: this.id
      });
    }
  }

  getResult() {
    return {
      id: this.id,
      config: this.config,
      status: this.status,
      output: this.output,
      errors: this.errors,
      startTime: this.startTime,
      endTime: this.endTime,
      exitCode: this.exitCode,
      duration: this.endTime && this.startTime 
        ? this.endTime.getTime() - this.startTime.getTime() 
        : null
    };
  }
}

// Test Runner Class
class TestRunner {
  constructor(id, framework, options, socket) {
    this.id = id;
    this.framework = framework;
    this.options = options;
    this.socket = socket;
    this.process = null;
    this.status = 'pending';
    this.output = [];
    this.results = null;
    this.coverage = null;
    this.startTime = null;
    this.endTime = null;
  }

  async start() {
    const frameworkConfig = TEST_FRAMEWORKS[this.framework];
    if (!frameworkConfig) {
      throw new Error(`Unknown test framework: ${this.framework}`);
    }

    this.startTime = new Date();
    this.status = 'running';

    let args = [...frameworkConfig.args];
    
    if (this.options.coverage && frameworkConfig.coverageArgs) {
      args = args.concat(frameworkConfig.coverageArgs);
    }
    
    if (this.options.watch && frameworkConfig.watchArgs) {
      args = args.concat(frameworkConfig.watchArgs);
    }
    
    if (this.options.filter) {
      args.push('--testNamePattern', this.options.filter);
    }
    
    if (this.options.files && this.options.files.length > 0) {
      args = args.concat(this.options.files);
    }

    try {
      this.process = spawn(frameworkConfig.command, args, {
        cwd: this.options.cwd || process.cwd(),
        env: { ...process.env, FORCE_COLOR: '1', CI: 'true' },
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.socket.emit('test:started', {
        runId: this.id,
        framework: this.framework,
        command: `${frameworkConfig.command} ${args.join(' ')}`,
        startTime: this.startTime
      });

      // Handle stdout
      this.process.stdout.on('data', (data) => {
        const line = data.toString();
        this.output.push(line);
        this.parseTestOutput(line);
        this.socket.emit('test:output', {
          runId: this.id,
          data: line
        });
      });

      // Handle stderr
      this.process.stderr.on('data', (data) => {
        const line = data.toString();
        this.output.push(line);
        this.socket.emit('test:output', {
          runId: this.id,
          data: line,
          type: 'stderr'
        });
      });

      // Handle process exit
      this.process.on('exit', async (code) => {
        this.endTime = new Date();
        this.status = code === 0 ? 'completed' : 'failed';

        // Try to read JSON results if available
        await this.loadResults();

        this.socket.emit('test:completed', {
          runId: this.id,
          status: this.status,
          results: this.results,
          coverage: this.coverage,
          duration: this.endTime.getTime() - this.startTime.getTime()
        });
      });

      // Handle errors
      this.process.on('error', (error) => {
        this.status = 'failed';
        this.socket.emit('test:error', {
          runId: this.id,
          error: error.message
        });
      });

      return { success: true, runId: this.id };
    } catch (error) {
      this.status = 'failed';
      throw error;
    }
  }

  parseTestOutput(line) {
    // Parse test results from output
    // Match patterns like "PASS", "FAIL", "✓", "✗"
    if (line.includes('PASS') || line.includes('✓')) {
      this.socket.emit('test:result', {
        runId: this.id,
        status: 'passed',
        line
      });
    } else if (line.includes('FAIL') || line.includes('✗')) {
      this.socket.emit('test:result', {
        runId: this.id,
        status: 'failed',
        line
      });
    }
  }

  async loadResults() {
    // Try to load Jest JSON results
    if (this.framework === 'jest') {
      try {
        const resultsPath = '/tmp/jest-results.json';
        if (fs.existsSync(resultsPath)) {
          const data = fs.readFileSync(resultsPath, 'utf-8');
          this.results = JSON.parse(data);
          fs.unlinkSync(resultsPath);
        }
      } catch (error) {
        console.error('Failed to load Jest results:', error.message);
      }

      // Try to load coverage
      try {
        const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
        if (fs.existsSync(coveragePath)) {
          const data = fs.readFileSync(coveragePath, 'utf-8');
          this.coverage = JSON.parse(data);
        }
      } catch (error) {
        console.error('Failed to load coverage:', error.message);
      }
    }
  }

  cancel() {
    if (this.process && this.status === 'running') {
      this.process.kill('SIGTERM');
      this.status = 'cancelled';
      this.endTime = new Date();

      this.socket.emit('test:cancelled', {
        runId: this.id
      });
    }
  }
}

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log(`✅ Task runner client connected: ${socket.id}`);

  // Execute a task
  socket.on('task:execute', async (config) => {
    const executionId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    try {
      // Check if it's a template
      if (config.templateId && TASK_TEMPLATES[config.templateId]) {
        const template = TASK_TEMPLATES[config.templateId];
        config = { ...template, ...config };
      }

      const execution = new TaskExecution(executionId, config, socket);
      taskExecutions.set(executionId, execution);
      
      const result = await execution.start();
      console.log(`📋 Task started: ${executionId} - ${config.command}`);
    } catch (error) {
      socket.emit('task:error', {
        executionId,
        error: error.message
      });
    }
  });

  // Cancel a task
  socket.on('task:cancel', ({ executionId }) => {
    const execution = taskExecutions.get(executionId);
    if (execution) {
      execution.cancel();
      taskExecutions.delete(executionId);
      console.log(`🛑 Task cancelled: ${executionId}`);
    }
  });

  // Get task status
  socket.on('task:status', ({ executionId }) => {
    const execution = taskExecutions.get(executionId);
    if (execution) {
      socket.emit('task:status:response', execution.getResult());
    } else {
      socket.emit('task:error', { error: 'Execution not found' });
    }
  });

  // Run tests
  socket.on('test:run', async (options) => {
    const runId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    try {
      const runner = new TestRunner(
        runId, 
        options.framework || 'jest', 
        options, 
        socket
      );
      taskExecutions.set(runId, runner);
      
      const result = await runner.start();
      console.log(`🧪 Test run started: ${runId} - ${options.framework}`);
    } catch (error) {
      socket.emit('test:error', {
        runId,
        error: error.message
      });
    }
  });

  // Cancel test run
  socket.on('test:cancel', ({ runId }) => {
    const runner = taskExecutions.get(runId);
    if (runner) {
      runner.cancel();
      taskExecutions.delete(runId);
      console.log(`🛑 Test run cancelled: ${runId}`);
    }
  });

  // Get task history
  socket.on('task:history', () => {
    socket.emit('task:history:response', {
      history: taskHistory.slice(-50).reverse()
    });
  });

  // Clear history
  socket.on('task:clearHistory', () => {
    taskHistory.length = 0;
    socket.emit('task:history:response', { history: [] });
  });

  // Get templates
  socket.on('task:templates', () => {
    socket.emit('task:templates:response', {
      templates: Object.entries(TASK_TEMPLATES).map(([id, config]) => ({
        id,
        ...config
      }))
    });
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    console.log(`❌ Task runner client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.TASK_PORT || 4003;

server.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   🚀 Task Runner Server Running                        ║');
  console.log(`║   📡 Port: ${PORT}                                        ║`);
  console.log('║   🔌 WebSocket: Ready for task execution               ║');
  console.log(`║   📋 Templates: ${Object.keys(TASK_TEMPLATES).length} available                         ║`);
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
});

module.exports = { app, server, io };
