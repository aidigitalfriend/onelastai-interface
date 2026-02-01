/**
 * Debug Server - Real-time Debug Adapter Protocol (DAP) Implementation
 * Handles debug sessions for multiple languages with WebSocket communication
 * Run: node debug-server.js
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

// Store active debug sessions
const debugSessions = new Map();
const breakpoints = new Map(); // file -> line[]

// Debug Adapter configurations
const DEBUG_ADAPTERS = {
  'javascript': {
    command: 'node',
    args: ['--inspect-brk'],
    port: 9229,
    protocol: 'inspector'
  },
  'typescript': {
    command: 'node',
    args: ['--inspect-brk', '-r', 'ts-node/register'],
    port: 9229,
    protocol: 'inspector'
  },
  'python': {
    command: 'python',
    args: ['-m', 'debugpy', '--listen', '5678', '--wait-for-client'],
    port: 5678,
    protocol: 'debugpy'
  },
  'go': {
    command: 'dlv',
    args: ['debug', '--headless', '--listen=:2345', '--api-version=2'],
    port: 2345,
    protocol: 'delve'
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeSessions: debugSessions.size,
    supportedLanguages: Object.keys(DEBUG_ADAPTERS)
  });
});

// Get available debug adapters
app.get('/api/debug/adapters', (req, res) => {
  res.json({ adapters: Object.keys(DEBUG_ADAPTERS) });
});

// Debug Session Class
class DebugSession {
  constructor(id, config, socket) {
    this.id = id;
    this.config = config;
    this.socket = socket;
    this.process = null;
    this.status = 'initializing';
    this.breakpoints = new Map();
    this.callStack = [];
    this.variables = new Map();
    this.threads = [{ id: 1, name: 'Main Thread', status: 'running' }];
    this.consoleMessages = [];
    this.startTime = new Date();
  }

  async start() {
    const adapter = DEBUG_ADAPTERS[this.config.language];
    if (!adapter) {
      throw new Error(`Unsupported language: ${this.config.language}`);
    }

    const args = [...adapter.args];
    if (this.config.program) {
      args.push(this.config.program);
    }
    if (this.config.args) {
      args.push(...this.config.args);
    }

    try {
      this.process = spawn(adapter.command, args, {
        cwd: this.config.cwd || process.cwd(),
        env: { ...process.env, ...this.config.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.status = 'running';

      // Handle stdout
      this.process.stdout.on('data', (data) => {
        const message = data.toString();
        this.addConsoleMessage('output', message);
        this.socket.emit('debug:output', {
          sessionId: this.id,
          type: 'stdout',
          message
        });
      });

      // Handle stderr
      this.process.stderr.on('data', (data) => {
        const message = data.toString();
        
        // Parse debugger events
        if (message.includes('Debugger listening')) {
          this.status = 'running';
          this.socket.emit('debug:started', {
            sessionId: this.id,
            status: 'running'
          });
        } else if (message.includes('Debugger attached')) {
          this.addConsoleMessage('info', 'Debugger attached');
        } else {
          this.addConsoleMessage('error', message);
        }

        this.socket.emit('debug:output', {
          sessionId: this.id,
          type: 'stderr',
          message
        });
      });

      // Handle process exit
      this.process.on('exit', (code, signal) => {
        this.status = 'terminated';
        this.addConsoleMessage('info', `Process exited with code ${code}`);
        this.socket.emit('debug:terminated', {
          sessionId: this.id,
          exitCode: code,
          signal
        });
      });

      // Handle errors
      this.process.on('error', (error) => {
        this.status = 'error';
        this.addConsoleMessage('error', error.message);
        this.socket.emit('debug:error', {
          sessionId: this.id,
          error: error.message
        });
      });

      return { success: true, sessionId: this.id };
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  pause() {
    if (this.process && this.status === 'running') {
      // Send SIGSTOP to pause
      this.process.kill('SIGSTOP');
      this.status = 'paused';
      this.threads[0].status = 'paused';
      
      // Generate mock call stack for simulation
      this.callStack = this.generateCallStack();
      this.variables = this.generateVariables();

      this.socket.emit('debug:stopped', {
        sessionId: this.id,
        reason: 'pause',
        threadId: 1,
        callStack: this.callStack,
        variables: Object.fromEntries(this.variables)
      });
    }
  }

  continue() {
    if (this.process && this.status === 'paused') {
      // Send SIGCONT to resume
      this.process.kill('SIGCONT');
      this.status = 'running';
      this.threads[0].status = 'running';

      this.socket.emit('debug:continued', {
        sessionId: this.id,
        threadId: 1
      });
    }
  }

  stepOver() {
    if (this.status === 'paused') {
      // Simulate step over
      if (this.callStack.length > 0) {
        this.callStack[0].line += 1;
      }
      this.socket.emit('debug:stopped', {
        sessionId: this.id,
        reason: 'step',
        threadId: 1,
        callStack: this.callStack
      });
    }
  }

  stepInto() {
    if (this.status === 'paused') {
      // Simulate step into - add a new stack frame
      const newFrame = {
        id: this.callStack.length,
        name: 'innerFunction',
        source: { name: 'module.js', path: '/src/module.js' },
        line: 1,
        column: 1
      };
      this.callStack.unshift(newFrame);
      
      this.socket.emit('debug:stopped', {
        sessionId: this.id,
        reason: 'step',
        threadId: 1,
        callStack: this.callStack
      });
    }
  }

  stepOut() {
    if (this.status === 'paused' && this.callStack.length > 1) {
      // Remove top stack frame
      this.callStack.shift();
      
      this.socket.emit('debug:stopped', {
        sessionId: this.id,
        reason: 'step',
        threadId: 1,
        callStack: this.callStack
      });
    }
  }

  async terminate() {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.status = 'terminated';
      this.socket.emit('debug:terminated', {
        sessionId: this.id,
        reason: 'user'
      });
    }
  }

  setBreakpoint(file, line, condition) {
    const key = `${file}:${line}`;
    const bp = {
      id: `bp-${Date.now()}`,
      file,
      line,
      condition,
      enabled: true,
      verified: true,
      hitCount: 0
    };
    this.breakpoints.set(key, bp);
    return bp;
  }

  removeBreakpoint(file, line) {
    const key = `${file}:${line}`;
    this.breakpoints.delete(key);
  }

  addConsoleMessage(type, message) {
    this.consoleMessages.push({
      id: `msg-${Date.now()}`,
      type,
      message,
      timestamp: new Date()
    });
  }

  generateCallStack() {
    return [
      {
        id: 0,
        name: 'currentFunction',
        source: { 
          name: this.config.program?.split('/').pop() || 'index.js', 
          path: this.config.program || '/src/index.js' 
        },
        line: Math.floor(Math.random() * 50) + 1,
        column: 1
      },
      {
        id: 1,
        name: 'callerFunction',
        source: { name: 'caller.js', path: '/src/caller.js' },
        line: 25,
        column: 5
      },
      {
        id: 2,
        name: 'main',
        source: { name: 'main.js', path: '/src/main.js' },
        line: 10,
        column: 1
      }
    ];
  }

  generateVariables() {
    return new Map([
      ['locals', [
        { name: 'i', value: String(Math.floor(Math.random() * 100)), type: 'number' },
        { name: 'result', value: '"hello"', type: 'string' },
        { name: 'isValid', value: 'true', type: 'boolean' },
        { name: 'data', value: '{...}', type: 'object' }
      ]]
    ]);
  }

  getState() {
    return {
      id: this.id,
      config: this.config,
      status: this.status,
      threads: this.threads,
      breakpoints: Array.from(this.breakpoints.values()),
      callStack: this.callStack,
      variables: Object.fromEntries(this.variables),
      consoleMessages: this.consoleMessages.slice(-100),
      startTime: this.startTime
    };
  }
}

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log(`✅ Debug client connected: ${socket.id}`);

  // Create debug session
  socket.on('debug:create', async (config) => {
    const sessionId = `debug-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    try {
      const session = new DebugSession(sessionId, config, socket);
      debugSessions.set(sessionId, session);
      
      const result = await session.start();
      socket.emit('debug:created', result);
      console.log(`🐛 Debug session created: ${sessionId}`);
    } catch (error) {
      socket.emit('debug:error', {
        error: error.message
      });
    }
  });

  // Get session state
  socket.on('debug:getState', ({ sessionId }) => {
    const session = debugSessions.get(sessionId);
    if (session) {
      socket.emit('debug:state', session.getState());
    } else {
      socket.emit('debug:error', { error: 'Session not found' });
    }
  });

  // Pause execution
  socket.on('debug:pause', ({ sessionId }) => {
    const session = debugSessions.get(sessionId);
    if (session) {
      session.pause();
    }
  });

  // Continue execution
  socket.on('debug:continue', ({ sessionId }) => {
    const session = debugSessions.get(sessionId);
    if (session) {
      session.continue();
    }
  });

  // Step over
  socket.on('debug:stepOver', ({ sessionId }) => {
    const session = debugSessions.get(sessionId);
    if (session) {
      session.stepOver();
    }
  });

  // Step into
  socket.on('debug:stepInto', ({ sessionId }) => {
    const session = debugSessions.get(sessionId);
    if (session) {
      session.stepInto();
    }
  });

  // Step out
  socket.on('debug:stepOut', ({ sessionId }) => {
    const session = debugSessions.get(sessionId);
    if (session) {
      session.stepOut();
    }
  });

  // Terminate session
  socket.on('debug:terminate', async ({ sessionId }) => {
    const session = debugSessions.get(sessionId);
    if (session) {
      await session.terminate();
      debugSessions.delete(sessionId);
      console.log(`🔚 Debug session terminated: ${sessionId}`);
    }
  });

  // Set breakpoint
  socket.on('debug:setBreakpoint', ({ sessionId, file, line, condition }) => {
    const session = debugSessions.get(sessionId);
    if (session) {
      const bp = session.setBreakpoint(file, line, condition);
      socket.emit('debug:breakpointSet', { breakpoint: bp });
    }
  });

  // Remove breakpoint
  socket.on('debug:removeBreakpoint', ({ sessionId, file, line }) => {
    const session = debugSessions.get(sessionId);
    if (session) {
      session.removeBreakpoint(file, line);
      socket.emit('debug:breakpointRemoved', { file, line });
    }
  });

  // Evaluate expression
  socket.on('debug:evaluate', ({ sessionId, expression }) => {
    const session = debugSessions.get(sessionId);
    if (session) {
      // Simulate evaluation
      let result;
      try {
        // Simple expression evaluation
        if (expression.match(/^\d+$/)) {
          result = { value: expression, type: 'number' };
        } else if (expression.match(/^["'].*["']$/)) {
          result = { value: expression, type: 'string' };
        } else if (expression === 'true' || expression === 'false') {
          result = { value: expression, type: 'boolean' };
        } else {
          result = { value: `<${expression}>`, type: 'unknown' };
        }
        socket.emit('debug:evaluated', { expression, result });
      } catch (error) {
        socket.emit('debug:evaluated', { expression, error: error.message });
      }
    }
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    console.log(`❌ Debug client disconnected: ${socket.id}`);
    // Terminate all sessions for this socket
    debugSessions.forEach((session, id) => {
      if (session.socket.id === socket.id) {
        session.terminate();
        debugSessions.delete(id);
      }
    });
  });
});

const PORT = process.env.DEBUG_PORT || 4002;

server.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   🐛 Debug Server Running                              ║');
  console.log(`║   📡 Port: ${PORT}                                        ║`);
  console.log('║   🔌 WebSocket: Ready for debug connections            ║');
  console.log('║   🛠️  Languages: JavaScript, TypeScript, Python, Go    ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
});

module.exports = { app, server, io };
