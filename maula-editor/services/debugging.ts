// Debugging Service - Debug Adapter Protocol (DAP) Implementation
// Supports multiple languages with breakpoints, call stack, variables, and watch expressions
// Now with real-time WebSocket connection to debug server

export type DebugLanguage = 'javascript' | 'typescript' | 'python' | 'java' | 'csharp' | 'cpp' | 'go' | 'rust' | 'ruby' | 'php';

// Debug server connection settings
export interface DebugServerConfig {
  url: string;
  enabled: boolean;
  autoConnect: boolean;
  reconnectAttempts: number;
  reconnectDelay: number;
}

export interface DebugAdapter {
  id: string;
  name: string;
  language: DebugLanguage;
  runtime: string;
  fileExtensions: string[];
  icon: string;
  color: string;
  supportsBreakpoints: boolean;
  supportsConditionalBreakpoints: boolean;
  supportsLogPoints: boolean;
  supportsHitCount: boolean;
  supportsExceptionBreakpoints: boolean;
}

export interface Breakpoint {
  id: string;
  file: string;
  line: number;
  column?: number;
  enabled: boolean;
  verified: boolean;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
  hitCount: number;
}

export interface StackFrame {
  id: number;
  name: string;
  source: {
    name: string;
    path: string;
  };
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  moduleId?: string;
  presentationHint?: 'normal' | 'label' | 'subtle';
}

export interface Thread {
  id: number;
  name: string;
  status: 'running' | 'stopped' | 'paused';
}

export interface Variable {
  name: string;
  value: string;
  type: string;
  variablesReference: number;
  namedVariables?: number;
  indexedVariables?: number;
  evaluateName?: string;
  memoryReference?: string;
  presentationHint?: {
    kind?: 'property' | 'method' | 'class' | 'data' | 'event' | 'baseClass' | 'innerClass' | 'interface' | 'mostDerivedClass' | 'virtual';
    attributes?: string[];
    visibility?: 'public' | 'private' | 'protected' | 'internal' | 'final';
  };
  children?: Variable[];
  expanded?: boolean;
}

export interface Scope {
  name: string;
  presentationHint?: 'arguments' | 'locals' | 'registers' | 'returnValue';
  variablesReference: number;
  namedVariables?: number;
  indexedVariables?: number;
  expensive: boolean;
  source?: {
    name: string;
    path: string;
  };
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  variables?: Variable[];
}

export interface WatchExpression {
  id: string;
  expression: string;
  value?: string;
  type?: string;
  error?: string;
  expanded?: boolean;
  children?: Variable[];
}

export interface DebugConsoleMessage {
  id: string;
  timestamp: Date;
  type: 'input' | 'output' | 'error' | 'warning' | 'info' | 'debug';
  category?: 'console' | 'stdout' | 'stderr' | 'telemetry';
  message: string;
  source?: string;
  line?: number;
  variablesReference?: number;
}

export interface DebugSession {
  id: string;
  name: string;
  adapter: DebugAdapter;
  status: 'initializing' | 'running' | 'paused' | 'stopped' | 'terminated';
  threads: Thread[];
  activeThreadId?: number;
  activeFrameId?: number;
  breakpoints: Breakpoint[];
  watchExpressions: WatchExpression[];
  scopes: Scope[];
  callStack: StackFrame[];
  consoleMessages: DebugConsoleMessage[];
  startTime: Date;
  configuration: DebugConfiguration;
}

export interface DebugConfiguration {
  type: string;
  name: string;
  request: 'launch' | 'attach';
  program?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  port?: number;
  host?: string;
  stopOnEntry?: boolean;
  sourceMaps?: boolean;
  outFiles?: string[];
  preLaunchTask?: string;
  postDebugTask?: string;
}

export interface ExceptionBreakpoint {
  filter: string;
  label: string;
  description?: string;
  default?: boolean;
  enabled: boolean;
  conditionDescription?: string;
  condition?: string;
}

type EventCallback = (event: DebugEvent) => void;

export interface DebugEvent {
  type: 'breakpoint' | 'stopped' | 'continued' | 'exited' | 'terminated' | 'thread' | 'output' | 'module' | 'loadedSource' | 'process' | 'capabilities' | 'progressStart' | 'progressUpdate' | 'progressEnd' | 'invalidated' | 'memory';
  data: any;
  sessionId: string;
}

// Debug Adapters for different languages
const DEBUG_ADAPTERS: DebugAdapter[] = [
  {
    id: 'js-debug',
    name: 'JavaScript Debug',
    language: 'javascript',
    runtime: 'Node.js / Chrome',
    fileExtensions: ['.js', '.mjs', '.cjs'],
    icon: '🟨',
    color: '#f7df1e',
    supportsBreakpoints: true,
    supportsConditionalBreakpoints: true,
    supportsLogPoints: true,
    supportsHitCount: true,
    supportsExceptionBreakpoints: true,
  },
  {
    id: 'ts-debug',
    name: 'TypeScript Debug',
    language: 'typescript',
    runtime: 'Node.js / Chrome',
    fileExtensions: ['.ts', '.tsx', '.mts', '.cts'],
    icon: '🔷',
    color: '#3178c6',
    supportsBreakpoints: true,
    supportsConditionalBreakpoints: true,
    supportsLogPoints: true,
    supportsHitCount: true,
    supportsExceptionBreakpoints: true,
  },
  {
    id: 'python-debug',
    name: 'Python Debug',
    language: 'python',
    runtime: 'Python / debugpy',
    fileExtensions: ['.py', '.pyw'],
    icon: '🐍',
    color: '#3776ab',
    supportsBreakpoints: true,
    supportsConditionalBreakpoints: true,
    supportsLogPoints: true,
    supportsHitCount: true,
    supportsExceptionBreakpoints: true,
  },
  {
    id: 'java-debug',
    name: 'Java Debug',
    language: 'java',
    runtime: 'JVM / JDWP',
    fileExtensions: ['.java'],
    icon: '☕',
    color: '#007396',
    supportsBreakpoints: true,
    supportsConditionalBreakpoints: true,
    supportsLogPoints: false,
    supportsHitCount: true,
    supportsExceptionBreakpoints: true,
  },
  {
    id: 'csharp-debug',
    name: 'C# Debug',
    language: 'csharp',
    runtime: '.NET / OmniSharp',
    fileExtensions: ['.cs'],
    icon: '💜',
    color: '#68217a',
    supportsBreakpoints: true,
    supportsConditionalBreakpoints: true,
    supportsLogPoints: true,
    supportsHitCount: true,
    supportsExceptionBreakpoints: true,
  },
  {
    id: 'cpp-debug',
    name: 'C/C++ Debug',
    language: 'cpp',
    runtime: 'GDB / LLDB',
    fileExtensions: ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp'],
    icon: '⚙️',
    color: '#00599c',
    supportsBreakpoints: true,
    supportsConditionalBreakpoints: true,
    supportsLogPoints: false,
    supportsHitCount: true,
    supportsExceptionBreakpoints: true,
  },
  {
    id: 'go-debug',
    name: 'Go Debug',
    language: 'go',
    runtime: 'Delve',
    fileExtensions: ['.go'],
    icon: '🔵',
    color: '#00add8',
    supportsBreakpoints: true,
    supportsConditionalBreakpoints: true,
    supportsLogPoints: true,
    supportsHitCount: true,
    supportsExceptionBreakpoints: false,
  },
  {
    id: 'rust-debug',
    name: 'Rust Debug',
    language: 'rust',
    runtime: 'LLDB / GDB',
    fileExtensions: ['.rs'],
    icon: '🦀',
    color: '#dea584',
    supportsBreakpoints: true,
    supportsConditionalBreakpoints: true,
    supportsLogPoints: false,
    supportsHitCount: true,
    supportsExceptionBreakpoints: false,
  },
  {
    id: 'ruby-debug',
    name: 'Ruby Debug',
    language: 'ruby',
    runtime: 'debug.gem',
    fileExtensions: ['.rb', '.rake'],
    icon: '💎',
    color: '#cc342d',
    supportsBreakpoints: true,
    supportsConditionalBreakpoints: true,
    supportsLogPoints: true,
    supportsHitCount: true,
    supportsExceptionBreakpoints: true,
  },
  {
    id: 'php-debug',
    name: 'PHP Debug',
    language: 'php',
    runtime: 'Xdebug',
    fileExtensions: ['.php'],
    icon: '🐘',
    color: '#777bb4',
    supportsBreakpoints: true,
    supportsConditionalBreakpoints: true,
    supportsLogPoints: false,
    supportsHitCount: true,
    supportsExceptionBreakpoints: true,
  },
];

class DebuggingService {
  private sessions: Map<string, DebugSession> = new Map();
  private activeSessionId: string | null = null;
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private globalBreakpoints: Breakpoint[] = [];
  private exceptionBreakpoints: ExceptionBreakpoint[] = [
    { filter: 'all', label: 'All Exceptions', enabled: false },
    { filter: 'uncaught', label: 'Uncaught Exceptions', enabled: true },
    { filter: 'userUnhandled', label: 'User-Unhandled Exceptions', enabled: false },
  ];

  // WebSocket connection to debug server
  private socket: any = null;
  private serverConfig: DebugServerConfig = {
    url: 'http://localhost:4002',
    enabled: true,
    autoConnect: true,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
  };
  private connected: boolean = false;
  private useServerMode: boolean = false; // Toggle between server and simulation mode

  constructor() {
    // Try to connect to server on init if autoConnect is enabled
    if (this.serverConfig.autoConnect) {
      this.connectToServer();
    }
  }

  // Connect to the debug server
  connectToServer(): void {
    if (!this.serverConfig.enabled || this.socket) return;

    try {
      // Dynamic import for socket.io-client
      import('socket.io-client').then(({ io }) => {
        this.socket = io(this.serverConfig.url, {
          reconnectionAttempts: this.serverConfig.reconnectAttempts,
          reconnectionDelay: this.serverConfig.reconnectDelay,
          transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
          console.log('🐛 Connected to debug server');
          this.connected = true;
          this.useServerMode = true;
        });

        this.socket.on('disconnect', () => {
          console.log('🐛 Disconnected from debug server');
          this.connected = false;
        });

        this.socket.on('connect_error', () => {
        // Fall back to simulation mode
        console.log('🐛 Debug server not available, using simulation mode');
        this.useServerMode = false;
      });

      // Listen for debug events from server
      this.socket.on('debug:created', (data) => {
        console.log('Debug session created:', data);
        this.emit({ type: 'process', data, sessionId: data.sessionId });
      });

      this.socket.on('debug:started', (data) => {
        const session = this.sessions.get(data.sessionId);
        if (session) {
          session.status = data.status;
          this.emit({ type: 'process', data, sessionId: data.sessionId });
        }
      });

      this.socket.on('debug:output', (data) => {
        const session = this.sessions.get(data.sessionId);
        if (session) {
          session.consoleMessages.push({
            id: `msg-${Date.now()}`,
            timestamp: new Date(),
            type: data.type === 'stderr' ? 'error' : 'output',
            message: data.message,
            category: data.type,
          });
          this.emit({ type: 'output', data, sessionId: data.sessionId });
        }
      });

      this.socket.on('debug:stopped', (data) => {
        const session = this.sessions.get(data.sessionId);
        if (session) {
          session.status = 'paused';
          session.callStack = data.callStack || [];
          if (data.variables) {
            // Convert variables to scopes
            session.scopes = [{
              name: 'Locals',
              variablesReference: 1,
              expensive: false,
              variables: data.variables.locals || [],
            }];
          }
          this.emit({ type: 'stopped', data, sessionId: data.sessionId });
        }
      });

      this.socket.on('debug:continued', (data) => {
        const session = this.sessions.get(data.sessionId);
        if (session) {
          session.status = 'running';
          this.emit({ type: 'continued', data, sessionId: data.sessionId });
        }
      });

      this.socket.on('debug:terminated', (data) => {
        const session = this.sessions.get(data.sessionId);
        if (session) {
          session.status = 'terminated';
          this.emit({ type: 'terminated', data, sessionId: data.sessionId });
        }
      });

      this.socket.on('debug:error', (data) => {
        console.error('Debug error:', data.error);
      });

      this.socket.on('debug:evaluated', (data) => {
        console.log('Evaluation result:', data);
      });

      this.socket.on('debug:breakpointSet', (data) => {
        this.globalBreakpoints.push(data.breakpoint);
        this.emit({ type: 'breakpoint', data: { reason: 'new', breakpoint: data.breakpoint }, sessionId: this.activeSessionId || '' });
      });
      }).catch(() => {
        console.log('🐛 Socket.io-client not available, using simulation mode');
        this.useServerMode = false;
      });
    } catch (error) {
      console.error('Failed to connect to debug server:', error);
      this.useServerMode = false;
    }
  }

  // Disconnect from server
  disconnectFromServer(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Update server configuration
  updateServerConfig(config: Partial<DebugServerConfig>): void {
    this.serverConfig = { ...this.serverConfig, ...config };
  }

  // Get server config
  getServerConfig(): DebugServerConfig {
    return { ...this.serverConfig };
  }

  // Check if connected to server
  isConnected(): boolean {
    return this.connected;
  }

  // Toggle between server and simulation mode
  setServerMode(enabled: boolean): void {
    this.useServerMode = enabled && this.connected;
  }

  // Get all available debug adapters
  getAdapters(): DebugAdapter[] {
    return [...DEBUG_ADAPTERS];
  }

  // Get adapter by language
  getAdapterByLanguage(language: DebugLanguage): DebugAdapter | undefined {
    return DEBUG_ADAPTERS.find(a => a.language === language);
  }

  // Get adapter for file extension
  getAdapterForFile(filename: string): DebugAdapter | undefined {
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    return DEBUG_ADAPTERS.find(a => a.fileExtensions.includes(ext));
  }

  // Create a new debug session
  async createSession(config: DebugConfiguration): Promise<DebugSession> {
    const adapter = DEBUG_ADAPTERS.find(a => a.id === config.type || a.language === config.type);
    if (!adapter) {
      throw new Error(`No debug adapter found for type: ${config.type}`);
    }

    const session: DebugSession = {
      id: `debug-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: config.name,
      adapter,
      status: 'initializing',
      threads: [],
      breakpoints: [...this.globalBreakpoints],
      watchExpressions: [],
      scopes: [],
      callStack: [],
      consoleMessages: [],
      startTime: new Date(),
      configuration: config,
    };

    this.sessions.set(session.id, session);
    this.activeSessionId = session.id;

    // Emit session created event
    this.emit({
      type: 'process',
      data: { sessionId: session.id, name: session.name, startMethod: config.request },
      sessionId: session.id,
    });

    // Use server mode if connected, otherwise simulate
    if (this.useServerMode && this.socket) {
      this.socket.emit('debug:create', {
        ...config,
        language: adapter.language,
        sessionId: session.id,
      });
      
      // Add console message for real debug session
      this.addConsoleMessage(session.id, {
        type: 'info',
        message: `Starting debug session "${session.name}" with ${adapter.name}...`,
        category: 'console',
      });
    } else {
      // Simulate initialization for demo/offline mode
      await this.simulateInitialization(session);
    }

    return session;
  }

  private async simulateInitialization(session: DebugSession): Promise<void> {
    // Add console message
    this.addConsoleMessage(session.id, {
      type: 'info',
      message: `Debug session "${session.name}" started`,
      category: 'console',
    });

    // Simulate thread creation
    session.threads = [
      { id: 1, name: 'Main Thread', status: 'running' },
    ];

    // Update status
    session.status = 'running';

    this.emit({
      type: 'thread',
      data: { reason: 'started', threadId: 1 },
      sessionId: session.id,
    });
  }

  // Get active session
  getActiveSession(): DebugSession | undefined {
    return this.activeSessionId ? this.sessions.get(this.activeSessionId) : undefined;
  }

  // Get all sessions
  getAllSessions(): DebugSession[] {
    return Array.from(this.sessions.values());
  }

  // Set active session
  setActiveSession(sessionId: string): void {
    if (this.sessions.has(sessionId)) {
      this.activeSessionId = sessionId;
    }
  }

  // Breakpoint management
  addBreakpoint(file: string, line: number, options?: Partial<Breakpoint>): Breakpoint {
    const breakpoint: Breakpoint = {
      id: `bp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      file,
      line,
      enabled: true,
      verified: true,
      hitCount: 0,
      ...options,
    };

    this.globalBreakpoints.push(breakpoint);

    // Add to all active sessions
    this.sessions.forEach(session => {
      session.breakpoints.push({ ...breakpoint });
    });

    this.emit({
      type: 'breakpoint',
      data: { reason: 'new', breakpoint },
      sessionId: this.activeSessionId || '',
    });

    return breakpoint;
  }

  removeBreakpoint(id: string): void {
    this.globalBreakpoints = this.globalBreakpoints.filter(bp => bp.id !== id);

    this.sessions.forEach(session => {
      session.breakpoints = session.breakpoints.filter(bp => bp.id !== id);
    });

    this.emit({
      type: 'breakpoint',
      data: { reason: 'removed', breakpoint: { id } },
      sessionId: this.activeSessionId || '',
    });
  }

  toggleBreakpoint(id: string): void {
    const bp = this.globalBreakpoints.find(b => b.id === id);
    if (bp) {
      bp.enabled = !bp.enabled;

      this.sessions.forEach(session => {
        const sessionBp = session.breakpoints.find(b => b.id === id);
        if (sessionBp) {
          sessionBp.enabled = bp.enabled;
        }
      });

      this.emit({
        type: 'breakpoint',
        data: { reason: 'changed', breakpoint: bp },
        sessionId: this.activeSessionId || '',
      });
    }
  }

  updateBreakpoint(id: string, updates: Partial<Breakpoint>): void {
    const bp = this.globalBreakpoints.find(b => b.id === id);
    if (bp) {
      Object.assign(bp, updates);

      this.sessions.forEach(session => {
        const sessionBp = session.breakpoints.find(b => b.id === id);
        if (sessionBp) {
          Object.assign(sessionBp, updates);
        }
      });

      this.emit({
        type: 'breakpoint',
        data: { reason: 'changed', breakpoint: bp },
        sessionId: this.activeSessionId || '',
      });
    }
  }

  getBreakpoints(): Breakpoint[] {
    return [...this.globalBreakpoints];
  }

  getBreakpointsForFile(file: string): Breakpoint[] {
    return this.globalBreakpoints.filter(bp => bp.file === file);
  }

  clearAllBreakpoints(): void {
    this.globalBreakpoints = [];
    this.sessions.forEach(session => {
      session.breakpoints = [];
    });
  }

  // Exception breakpoints
  getExceptionBreakpoints(): ExceptionBreakpoint[] {
    return [...this.exceptionBreakpoints];
  }

  toggleExceptionBreakpoint(filter: string): void {
    const eb = this.exceptionBreakpoints.find(e => e.filter === filter);
    if (eb) {
      eb.enabled = !eb.enabled;
    }
  }

  // Watch expressions
  addWatchExpression(expression: string): WatchExpression {
    const watch: WatchExpression = {
      id: `watch-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      expression,
    };

    const session = this.getActiveSession();
    if (session) {
      session.watchExpressions.push(watch);
      // Evaluate immediately if paused
      if (session.status === 'paused') {
        this.evaluateWatchExpression(session.id, watch.id);
      }
    }

    return watch;
  }

  removeWatchExpression(id: string): void {
    const session = this.getActiveSession();
    if (session) {
      session.watchExpressions = session.watchExpressions.filter(w => w.id !== id);
    }
  }

  updateWatchExpression(id: string, expression: string): void {
    const session = this.getActiveSession();
    if (session) {
      const watch = session.watchExpressions.find(w => w.id === id);
      if (watch) {
        watch.expression = expression;
        watch.value = undefined;
        watch.error = undefined;
        if (session.status === 'paused') {
          this.evaluateWatchExpression(session.id, id);
        }
      }
    }
  }

  async evaluateWatchExpression(sessionId: string, watchId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const watch = session.watchExpressions.find(w => w.id === watchId);
    if (!watch) return;

    // Simulate evaluation
    try {
      const result = await this.simulateEvaluate(watch.expression, session);
      watch.value = result.value;
      watch.type = result.type;
      watch.error = undefined;
      watch.children = result.children;
    } catch (error: any) {
      watch.error = error.message;
      watch.value = undefined;
    }
  }

  private async simulateEvaluate(expression: string, _session: DebugSession): Promise<{ value: string; type: string; children?: Variable[] }> {
    // Simulate expression evaluation
    await new Promise(r => setTimeout(r, 50));

    // Simple evaluation simulation
    if (expression.match(/^\d+$/)) {
      return { value: expression, type: 'number' };
    }
    if (expression.match(/^["'].*["']$/)) {
      return { value: expression, type: 'string' };
    }
    if (expression === 'true' || expression === 'false') {
      return { value: expression, type: 'boolean' };
    }
    if (expression === 'null') {
      return { value: 'null', type: 'null' };
    }
    if (expression === 'undefined') {
      return { value: 'undefined', type: 'undefined' };
    }

    // Simulate object/array
    if (expression.includes('[') || expression.includes('.')) {
      return {
        value: '{...}',
        type: 'object',
        children: [
          { name: 'property1', value: '"value1"', type: 'string', variablesReference: 0 },
          { name: 'property2', value: '42', type: 'number', variablesReference: 0 },
        ],
      };
    }

    // Variable lookup simulation
    return { value: `<${expression}>`, type: 'unknown' };
  }

  // Debug controls
  async continue(sessionId?: string): Promise<void> {
    const session = sessionId ? this.sessions.get(sessionId) : this.getActiveSession();
    if (!session) return;

    // Use server mode if connected
    if (this.useServerMode && this.socket) {
      this.socket.emit('debug:continue', { sessionId: session.id });
    } else {
      session.status = 'running';
      session.threads.forEach(t => t.status = 'running');

      this.addConsoleMessage(session.id, {
        type: 'debug',
        message: 'Continued',
        category: 'console',
      });

      this.emit({
        type: 'continued',
        data: { threadId: session.activeThreadId || 1, allThreadsContinued: true },
        sessionId: session.id,
      });
    }
  }

  async pause(sessionId?: string): Promise<void> {
    const session = sessionId ? this.sessions.get(sessionId) : this.getActiveSession();
    if (!session) return;

    // Use server mode if connected
    if (this.useServerMode && this.socket) {
      this.socket.emit('debug:pause', { sessionId: session.id });
    } else {
      session.status = 'paused';
      session.threads.forEach(t => t.status = 'paused');
      session.activeThreadId = 1;

      // Simulate call stack
      this.simulateCallStack(session);

      this.addConsoleMessage(session.id, {
        type: 'debug',
        message: 'Paused',
        category: 'console',
      });

      this.emit({
        type: 'stopped',
        data: { reason: 'pause', threadId: 1, allThreadsStopped: true },
        sessionId: session.id,
      });
    }
  }

  async stepOver(sessionId?: string): Promise<void> {
    const session = sessionId ? this.sessions.get(sessionId) : this.getActiveSession();
    if (!session || session.status !== 'paused') return;

    // Use server mode if connected
    if (this.useServerMode && this.socket) {
      this.socket.emit('debug:stepOver', { sessionId: session.id });
    } else {
      this.addConsoleMessage(session.id, {
        type: 'debug',
        message: 'Step over',
        category: 'console',
      });

      // Simulate stepping
      await new Promise(r => setTimeout(r, 100));

      // Update call stack
      if (session.callStack.length > 0) {
        session.callStack[0].line += 1;
      }

      this.emit({
        type: 'stopped',
        data: { reason: 'step', threadId: session.activeThreadId || 1 },
        sessionId: session.id,
      });

      // Re-evaluate watch expressions
      session.watchExpressions.forEach(w => {
        this.evaluateWatchExpression(session.id, w.id);
      });
    }
  }

  async stepInto(sessionId?: string): Promise<void> {
    const session = sessionId ? this.sessions.get(sessionId) : this.getActiveSession();
    if (!session || session.status !== 'paused') return;

    // Use server mode if connected
    if (this.useServerMode && this.socket) {
      this.socket.emit('debug:stepInto', { sessionId: session.id });
    } else {
      this.addConsoleMessage(session.id, {
        type: 'debug',
        message: 'Step into',
        category: 'console',
      });

      // Simulate stepping into a function
      await new Promise(r => setTimeout(r, 100));

      // Add a new stack frame
      const newFrame: StackFrame = {
        id: session.callStack.length,
        name: 'innerFunction',
        source: { name: 'module.js', path: '/src/module.js' },
        line: 10,
        column: 1,
      };
      session.callStack.unshift(newFrame);
      session.activeFrameId = newFrame.id;

      this.emit({
        type: 'stopped',
        data: { reason: 'step', threadId: session.activeThreadId || 1 },
        sessionId: session.id,
      });
    }
  }

  async stepOut(sessionId?: string): Promise<void> {
    const session = sessionId ? this.sessions.get(sessionId) : this.getActiveSession();
    if (!session || session.status !== 'paused') return;

    // Use server mode if connected
    if (this.useServerMode && this.socket) {
      this.socket.emit('debug:stepOut', { sessionId: session.id });
    } else {
      this.addConsoleMessage(session.id, {
        type: 'debug',
        message: 'Step out',
        category: 'console',
      });

      // Simulate stepping out
      await new Promise(r => setTimeout(r, 100));

      // Remove top stack frame if possible
      if (session.callStack.length > 1) {
        session.callStack.shift();
        session.activeFrameId = session.callStack[0]?.id;
      }

      this.emit({
        type: 'stopped',
        data: { reason: 'step', threadId: session.activeThreadId || 1 },
        sessionId: session.id,
      });
    }
  }

  async restart(sessionId?: string): Promise<void> {
    const session = sessionId ? this.sessions.get(sessionId) : this.getActiveSession();
    if (!session) return;

    this.addConsoleMessage(session.id, {
      type: 'info',
      message: 'Restarting debug session...',
      category: 'console',
    });

    session.status = 'initializing';
    session.callStack = [];
    session.scopes = [];

    await new Promise(r => setTimeout(r, 500));

    session.status = 'running';
    session.startTime = new Date();

    this.addConsoleMessage(session.id, {
      type: 'info',
      message: 'Debug session restarted',
      category: 'console',
    });
  }

  async stop(sessionId?: string): Promise<void> {
    const session = sessionId ? this.sessions.get(sessionId) : this.getActiveSession();
    if (!session) return;

    // Use server mode if connected
    if (this.useServerMode && this.socket) {
      this.socket.emit('debug:terminate', { sessionId: session.id });
    }

    session.status = 'terminated';

    this.addConsoleMessage(session.id, {
      type: 'info',
      message: 'Debug session ended',
      category: 'console',
    });

    this.emit({
      type: 'terminated',
      data: {},
      sessionId: session.id,
    });
  }

  async terminateSession(sessionId: string): Promise<void> {
    await this.stop(sessionId);
    this.sessions.delete(sessionId);

    if (this.activeSessionId === sessionId) {
      const remaining = Array.from(this.sessions.keys());
      this.activeSessionId = remaining.length > 0 ? remaining[0] : null;
    }
  }

  // Simulate hitting a breakpoint
  async simulateHitBreakpoint(breakpointId: string): Promise<void> {
    const session = this.getActiveSession();
    if (!session) return;

    const bp = session.breakpoints.find(b => b.id === breakpointId);
    if (!bp || !bp.enabled) return;

    bp.hitCount += 1;
    session.status = 'paused';
    session.threads.forEach(t => t.status = 'paused');

    // Generate call stack
    this.simulateCallStack(session, bp);

    this.addConsoleMessage(session.id, {
      type: 'info',
      message: `Breakpoint hit at ${bp.file}:${bp.line}`,
      category: 'console',
    });

    // Handle log point
    if (bp.logMessage) {
      this.addConsoleMessage(session.id, {
        type: 'output',
        message: bp.logMessage,
        category: 'console',
        source: bp.file,
        line: bp.line,
      });
    }

    this.emit({
      type: 'stopped',
      data: {
        reason: 'breakpoint',
        threadId: 1,
        hitBreakpointIds: [bp.id],
        allThreadsStopped: true,
      },
      sessionId: session.id,
    });

    // Evaluate watch expressions
    for (const watch of session.watchExpressions) {
      await this.evaluateWatchExpression(session.id, watch.id);
    }
  }

  private simulateCallStack(session: DebugSession, breakpoint?: Breakpoint): void {
    const file = breakpoint?.file || '/src/index.js';
    const line = breakpoint?.line || 1;

    session.callStack = [
      {
        id: 0,
        name: 'currentFunction',
        source: { name: file.split('/').pop() || 'index.js', path: file },
        line,
        column: 1,
      },
      {
        id: 1,
        name: 'callerFunction',
        source: { name: 'caller.js', path: '/src/caller.js' },
        line: 25,
        column: 5,
      },
      {
        id: 2,
        name: 'main',
        source: { name: 'main.js', path: '/src/main.js' },
        line: 10,
        column: 1,
      },
    ];

    session.activeFrameId = 0;

    // Generate scopes for current frame
    session.scopes = [
      {
        name: 'Local',
        presentationHint: 'locals',
        variablesReference: 1,
        expensive: false,
        variables: [
          { name: 'i', value: '5', type: 'number', variablesReference: 0 },
          { name: 'result', value: '"hello"', type: 'string', variablesReference: 0 },
          { name: 'items', value: 'Array(3)', type: 'Array', variablesReference: 2, namedVariables: 3 },
          { name: 'config', value: 'Object', type: 'Object', variablesReference: 3, namedVariables: 4 },
        ],
      },
      {
        name: 'Closure',
        variablesReference: 4,
        expensive: false,
        variables: [
          { name: 'outerVar', value: '100', type: 'number', variablesReference: 0 },
          { name: 'callback', value: 'ƒ callback()', type: 'function', variablesReference: 0 },
        ],
      },
      {
        name: 'Global',
        variablesReference: 5,
        expensive: true,
        variables: [
          { name: 'window', value: 'Window', type: 'object', variablesReference: 6 },
          { name: 'document', value: 'HTMLDocument', type: 'object', variablesReference: 7 },
          { name: 'console', value: 'Console', type: 'object', variablesReference: 8 },
        ],
      },
    ];
  }

  // Get variables for a scope
  async getVariables(variablesReference: number): Promise<Variable[]> {
    const session = this.getActiveSession();
    if (!session) return [];

    // Find scope or variable with this reference
    for (const scope of session.scopes) {
      if (scope.variablesReference === variablesReference) {
        return scope.variables || [];
      }
      // Check nested variables
      const found = this.findVariableChildren(scope.variables || [], variablesReference);
      if (found) return found;
    }

    // Simulate fetching children
    return this.simulateVariableChildren(variablesReference);
  }

  private findVariableChildren(variables: Variable[], ref: number): Variable[] | null {
    for (const v of variables) {
      if (v.variablesReference === ref && v.children) {
        return v.children;
      }
      if (v.children) {
        const found = this.findVariableChildren(v.children, ref);
        if (found) return found;
      }
    }
    return null;
  }

  private simulateVariableChildren(ref: number): Variable[] {
    // Simulate array items
    if (ref === 2) {
      return [
        { name: '0', value: '"item1"', type: 'string', variablesReference: 0 },
        { name: '1', value: '"item2"', type: 'string', variablesReference: 0 },
        { name: '2', value: '"item3"', type: 'string', variablesReference: 0 },
        { name: 'length', value: '3', type: 'number', variablesReference: 0 },
      ];
    }
    // Simulate object properties
    if (ref === 3) {
      return [
        { name: 'enabled', value: 'true', type: 'boolean', variablesReference: 0 },
        { name: 'timeout', value: '5000', type: 'number', variablesReference: 0 },
        { name: 'name', value: '"test"', type: 'string', variablesReference: 0 },
        { name: 'options', value: 'Object', type: 'Object', variablesReference: 10 },
      ];
    }
    return [];
  }

  // Debug console
  addConsoleMessage(sessionId: string, message: Partial<DebugConsoleMessage>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const fullMessage: DebugConsoleMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
      type: message.type || 'output',
      message: message.message || '',
      category: message.category,
      source: message.source,
      line: message.line,
      variablesReference: message.variablesReference,
    };

    session.consoleMessages.push(fullMessage);

    this.emit({
      type: 'output',
      data: fullMessage,
      sessionId,
    });
  }

  async evaluateInConsole(sessionId: string, expression: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('No active session');

    // Log input
    this.addConsoleMessage(sessionId, {
      type: 'input',
      message: expression,
      category: 'console',
    });

    try {
      const result = await this.simulateEvaluate(expression, session);

      // Log output
      this.addConsoleMessage(sessionId, {
        type: 'output',
        message: result.value,
        category: 'console',
      });

      return result.value;
    } catch (error: any) {
      this.addConsoleMessage(sessionId, {
        type: 'error',
        message: error.message,
        category: 'stderr',
      });
      throw error;
    }
  }

  clearConsole(sessionId?: string): void {
    const session = sessionId ? this.sessions.get(sessionId) : this.getActiveSession();
    if (session) {
      session.consoleMessages = [];
    }
  }

  // Event system
  on(event: string, callback: EventCallback): () => void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);

    return () => {
      const current = this.eventListeners.get(event) || [];
      this.eventListeners.set(event, current.filter(cb => cb !== callback));
    };
  }

  private emit(event: DebugEvent): void {
    // Emit specific event
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(cb => cb(event));

    // Emit wildcard
    const wildcardListeners = this.eventListeners.get('*') || [];
    wildcardListeners.forEach(cb => cb(event));
  }

  // Launch configurations
  getDefaultConfigurations(language: DebugLanguage): DebugConfiguration[] {
    const configs: Record<DebugLanguage, DebugConfiguration[]> = {
      javascript: [
        { type: 'js-debug', name: 'Launch Node.js', request: 'launch', program: '${workspaceFolder}/index.js' },
        { type: 'js-debug', name: 'Launch Chrome', request: 'launch', program: '${workspaceFolder}/index.html' },
        { type: 'js-debug', name: 'Attach to Node', request: 'attach', port: 9229 },
      ],
      typescript: [
        { type: 'ts-debug', name: 'Launch TypeScript', request: 'launch', program: '${workspaceFolder}/src/index.ts', sourceMaps: true, outFiles: ['${workspaceFolder}/dist/**/*.js'] },
        { type: 'ts-debug', name: 'Debug Jest Tests', request: 'launch', program: '${workspaceFolder}/node_modules/.bin/jest', args: ['--runInBand'] },
      ],
      python: [
        { type: 'python-debug', name: 'Launch Python', request: 'launch', program: '${workspaceFolder}/main.py' },
        { type: 'python-debug', name: 'Debug Flask', request: 'launch', program: '${workspaceFolder}/app.py', env: { FLASK_DEBUG: '1' } },
        { type: 'python-debug', name: 'Attach Remote', request: 'attach', host: 'localhost', port: 5678 },
      ],
      java: [
        { type: 'java-debug', name: 'Launch Java', request: 'launch', program: '${workspaceFolder}/src/Main.java' },
        { type: 'java-debug', name: 'Attach to JVM', request: 'attach', host: 'localhost', port: 5005 },
      ],
      csharp: [
        { type: 'csharp-debug', name: 'Launch .NET', request: 'launch', program: '${workspaceFolder}/bin/Debug/net6.0/app.dll' },
        { type: 'csharp-debug', name: 'Attach to Process', request: 'attach' },
      ],
      cpp: [
        { type: 'cpp-debug', name: 'Launch GDB', request: 'launch', program: '${workspaceFolder}/a.out' },
        { type: 'cpp-debug', name: 'Launch LLDB', request: 'launch', program: '${workspaceFolder}/a.out' },
      ],
      go: [
        { type: 'go-debug', name: 'Launch Go', request: 'launch', program: '${workspaceFolder}/main.go' },
        { type: 'go-debug', name: 'Debug Test', request: 'launch', program: '${workspaceFolder}', args: ['-test.v'] },
      ],
      rust: [
        { type: 'rust-debug', name: 'Launch Rust', request: 'launch', program: '${workspaceFolder}/target/debug/app' },
      ],
      ruby: [
        { type: 'ruby-debug', name: 'Launch Ruby', request: 'launch', program: '${workspaceFolder}/main.rb' },
        { type: 'ruby-debug', name: 'Debug Rails', request: 'launch', program: '${workspaceFolder}/bin/rails', args: ['server'] },
      ],
      php: [
        { type: 'php-debug', name: 'Launch PHP', request: 'launch', program: '${workspaceFolder}/index.php' },
        { type: 'php-debug', name: 'Listen for Xdebug', request: 'launch', port: 9003 },
      ],
    };

    return configs[language] || [];
  }

  // Utility: Generate launch.json content
  generateLaunchJson(language: DebugLanguage): string {
    const configs = this.getDefaultConfigurations(language);
    return JSON.stringify({
      version: '0.2.0',
      configurations: configs,
    }, null, 2);
  }
}

// Singleton instance
export const debuggingService = new DebuggingService();
export default debuggingService;
