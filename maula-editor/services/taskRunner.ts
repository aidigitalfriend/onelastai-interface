// Task Runner Service - Build tasks, Test runners, Coverage reports, Task automation

export type TaskType = 'build' | 'test' | 'lint' | 'format' | 'deploy' | 'custom' | 'watch' | 'clean' | 'install';
export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'skipped';
export type TestFramework = 'jest' | 'pytest' | 'mocha' | 'vitest' | 'jasmine' | 'cypress' | 'playwright' | 'unittest' | 'rspec' | 'go-test';

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  description?: string;
  group?: string;
  dependsOn?: string[];
  isBackground?: boolean;
  problemMatcher?: string[];
  presentation?: {
    reveal?: 'always' | 'silent' | 'never';
    panel?: 'shared' | 'dedicated' | 'new';
    showReuseMessage?: boolean;
    clear?: boolean;
  };
}

export interface TaskExecution {
  id: string;
  taskId: string;
  task: Task;
  status: TaskStatus;
  startTime: Date;
  endTime?: Date;
  exitCode?: number;
  output: string[];
  errors: string[];
  pid?: number;
}

export interface TestSuite {
  id: string;
  name: string;
  file: string;
  framework: TestFramework;
  tests: TestCase[];
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
}

export interface TestCase {
  id: string;
  name: string;
  fullName: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: TestError;
  logs?: string[];
  ancestorTitles?: string[];
}

export interface TestError {
  message: string;
  stack?: string;
  expected?: string;
  actual?: string;
  diff?: string;
  matcherResult?: {
    pass: boolean;
    message: string;
  };
}

export interface TestRun {
  id: string;
  framework: TestFramework;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  suites: TestSuite[];
  summary: TestSummary;
  coverage?: CoverageReport;
  output: string[];
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  duration: number;
}

export interface CoverageReport {
  timestamp: Date;
  summary: CoverageSummary;
  files: FileCoverage[];
}

export interface CoverageSummary {
  lines: CoverageMetric;
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
}

export interface CoverageMetric {
  total: number;
  covered: number;
  skipped: number;
  percentage: number;
}

export interface FileCoverage {
  file: string;
  lines: CoverageMetric;
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
  uncoveredLines: number[];
  uncoveredBranches: Array<{ line: number; branch: number }>;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: TaskType;
  command: string;
  args?: string[];
  category: 'build' | 'test' | 'lint' | 'deploy' | 'utility';
  language?: string;
  framework?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  tasks: string[];
  condition?: string;
}

export interface AutomationTrigger {
  type: 'fileChange' | 'schedule' | 'manual' | 'gitHook' | 'startup';
  pattern?: string;
  schedule?: string;
  gitEvent?: 'pre-commit' | 'pre-push' | 'post-merge';
}

type EventCallback = (event: TaskEvent) => void;

export interface TaskEvent {
  type: 'taskStart' | 'taskEnd' | 'taskOutput' | 'testStart' | 'testEnd' | 'testResult' | 'coverageUpdate';
  data: any;
}

// Test Framework Configurations
const TEST_FRAMEWORKS: Record<TestFramework, { name: string; icon: string; color: string; languages: string[]; commands: { run: string; watch: string; coverage: string } }> = {
  jest: {
    name: 'Jest',
    icon: '🃏',
    color: '#c21325',
    languages: ['javascript', 'typescript'],
    commands: { run: 'npx jest', watch: 'npx jest --watch', coverage: 'npx jest --coverage' },
  },
  vitest: {
    name: 'Vitest',
    icon: '⚡',
    color: '#729b1b',
    languages: ['javascript', 'typescript'],
    commands: { run: 'npx vitest run', watch: 'npx vitest', coverage: 'npx vitest run --coverage' },
  },
  mocha: {
    name: 'Mocha',
    icon: '☕',
    color: '#8d6748',
    languages: ['javascript', 'typescript'],
    commands: { run: 'npx mocha', watch: 'npx mocha --watch', coverage: 'npx nyc mocha' },
  },
  jasmine: {
    name: 'Jasmine',
    icon: '🌸',
    color: '#8a4182',
    languages: ['javascript', 'typescript'],
    commands: { run: 'npx jasmine', watch: 'npx jasmine --watch', coverage: 'npx nyc jasmine' },
  },
  pytest: {
    name: 'PyTest',
    icon: '🐍',
    color: '#0a9edc',
    languages: ['python'],
    commands: { run: 'pytest', watch: 'pytest-watch', coverage: 'pytest --cov' },
  },
  unittest: {
    name: 'unittest',
    icon: '🧪',
    color: '#3776ab',
    languages: ['python'],
    commands: { run: 'python -m unittest', watch: 'python -m pytest --watch', coverage: 'coverage run -m unittest' },
  },
  cypress: {
    name: 'Cypress',
    icon: '🌲',
    color: '#17202c',
    languages: ['javascript', 'typescript'],
    commands: { run: 'npx cypress run', watch: 'npx cypress open', coverage: 'npx cypress run --env coverage=true' },
  },
  playwright: {
    name: 'Playwright',
    icon: '🎭',
    color: '#2ead33',
    languages: ['javascript', 'typescript', 'python'],
    commands: { run: 'npx playwright test', watch: 'npx playwright test --ui', coverage: 'npx playwright test --coverage' },
  },
  rspec: {
    name: 'RSpec',
    icon: '💎',
    color: '#cc342d',
    languages: ['ruby'],
    commands: { run: 'bundle exec rspec', watch: 'bundle exec guard', coverage: 'COVERAGE=true bundle exec rspec' },
  },
  'go-test': {
    name: 'Go Test',
    icon: '🔵',
    color: '#00add8',
    languages: ['go'],
    commands: { run: 'go test ./...', watch: 'gotestsum --watch', coverage: 'go test -cover ./...' },
  },
};

// Task Templates
const TASK_TEMPLATES: TaskTemplate[] = [
  // Build tasks
  { id: 'npm-build', name: 'npm build', description: 'Build with npm', icon: '📦', type: 'build', command: 'npm', args: ['run', 'build'], category: 'build', language: 'javascript' },
  { id: 'npm-dev', name: 'npm dev', description: 'Start dev server', icon: '🚀', type: 'watch', command: 'npm', args: ['run', 'dev'], category: 'build', language: 'javascript' },
  { id: 'yarn-build', name: 'yarn build', description: 'Build with yarn', icon: '🧶', type: 'build', command: 'yarn', args: ['build'], category: 'build', language: 'javascript' },
  { id: 'pnpm-build', name: 'pnpm build', description: 'Build with pnpm', icon: '📦', type: 'build', command: 'pnpm', args: ['build'], category: 'build', language: 'javascript' },
  { id: 'tsc', name: 'TypeScript Compile', description: 'Compile TypeScript', icon: '🔷', type: 'build', command: 'npx', args: ['tsc'], category: 'build', language: 'typescript' },
  { id: 'vite-build', name: 'Vite Build', description: 'Build with Vite', icon: '⚡', type: 'build', command: 'npx', args: ['vite', 'build'], category: 'build', framework: 'vite' },
  { id: 'webpack', name: 'Webpack', description: 'Bundle with Webpack', icon: '📦', type: 'build', command: 'npx', args: ['webpack'], category: 'build', framework: 'webpack' },
  { id: 'pip-install', name: 'pip install', description: 'Install Python dependencies', icon: '🐍', type: 'install', command: 'pip', args: ['install', '-r', 'requirements.txt'], category: 'build', language: 'python' },
  { id: 'cargo-build', name: 'Cargo Build', description: 'Build Rust project', icon: '🦀', type: 'build', command: 'cargo', args: ['build'], category: 'build', language: 'rust' },
  { id: 'go-build', name: 'Go Build', description: 'Build Go project', icon: '🔵', type: 'build', command: 'go', args: ['build'], category: 'build', language: 'go' },
  { id: 'maven', name: 'Maven Build', description: 'Build with Maven', icon: '☕', type: 'build', command: 'mvn', args: ['package'], category: 'build', language: 'java' },
  { id: 'gradle', name: 'Gradle Build', description: 'Build with Gradle', icon: '🐘', type: 'build', command: 'gradle', args: ['build'], category: 'build', language: 'java' },
  { id: 'dotnet-build', name: '.NET Build', description: 'Build .NET project', icon: '💜', type: 'build', command: 'dotnet', args: ['build'], category: 'build', language: 'csharp' },
  
  // Test tasks
  { id: 'npm-test', name: 'npm test', description: 'Run tests with npm', icon: '🧪', type: 'test', command: 'npm', args: ['test'], category: 'test', language: 'javascript' },
  { id: 'jest', name: 'Jest', description: 'Run Jest tests', icon: '🃏', type: 'test', command: 'npx', args: ['jest'], category: 'test', framework: 'jest' },
  { id: 'vitest', name: 'Vitest', description: 'Run Vitest tests', icon: '⚡', type: 'test', command: 'npx', args: ['vitest', 'run'], category: 'test', framework: 'vitest' },
  { id: 'mocha', name: 'Mocha', description: 'Run Mocha tests', icon: '☕', type: 'test', command: 'npx', args: ['mocha'], category: 'test', framework: 'mocha' },
  { id: 'pytest', name: 'PyTest', description: 'Run PyTest tests', icon: '🐍', type: 'test', command: 'pytest', category: 'test', framework: 'pytest' },
  { id: 'cargo-test', name: 'Cargo Test', description: 'Run Rust tests', icon: '🦀', type: 'test', command: 'cargo', args: ['test'], category: 'test', language: 'rust' },
  { id: 'go-test', name: 'Go Test', description: 'Run Go tests', icon: '🔵', type: 'test', command: 'go', args: ['test', './...'], category: 'test', language: 'go' },
  
  // Lint tasks
  { id: 'eslint', name: 'ESLint', description: 'Lint with ESLint', icon: '🔍', type: 'lint', command: 'npx', args: ['eslint', '.'], category: 'lint', language: 'javascript' },
  { id: 'prettier', name: 'Prettier', description: 'Format with Prettier', icon: '✨', type: 'format', command: 'npx', args: ['prettier', '--write', '.'], category: 'lint', language: 'javascript' },
  { id: 'pylint', name: 'PyLint', description: 'Lint with PyLint', icon: '🐍', type: 'lint', command: 'pylint', args: ['.'], category: 'lint', language: 'python' },
  { id: 'black', name: 'Black', description: 'Format with Black', icon: '⬛', type: 'format', command: 'black', args: ['.'], category: 'lint', language: 'python' },
  { id: 'rustfmt', name: 'Rustfmt', description: 'Format Rust code', icon: '🦀', type: 'format', command: 'cargo', args: ['fmt'], category: 'lint', language: 'rust' },
  { id: 'clippy', name: 'Clippy', description: 'Lint Rust with Clippy', icon: '📎', type: 'lint', command: 'cargo', args: ['clippy'], category: 'lint', language: 'rust' },
  
  // Utility tasks
  { id: 'npm-install', name: 'npm install', description: 'Install dependencies', icon: '📦', type: 'install', command: 'npm', args: ['install'], category: 'utility', language: 'javascript' },
  { id: 'npm-clean', name: 'Clean node_modules', description: 'Remove node_modules', icon: '🗑️', type: 'clean', command: 'rm', args: ['-rf', 'node_modules'], category: 'utility', language: 'javascript' },
  { id: 'docker-build', name: 'Docker Build', description: 'Build Docker image', icon: '🐳', type: 'build', command: 'docker', args: ['build', '.'], category: 'deploy' },
  { id: 'docker-compose', name: 'Docker Compose Up', description: 'Start with Docker Compose', icon: '🐳', type: 'custom', command: 'docker-compose', args: ['up'], category: 'deploy' },
];

// Task server connection settings
export interface TaskServerConfig {
  url: string;
  enabled: boolean;
  autoConnect: boolean;
  reconnectAttempts: number;
  reconnectDelay: number;
}

class TaskRunnerService {
  private tasks: Map<string, Task> = new Map();
  private executions: Map<string, TaskExecution> = new Map();
  private testRuns: Map<string, TestRun> = new Map();
  private automationRules: Map<string, AutomationRule> = new Map();
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private activeTestRun: TestRun | null = null;

  // WebSocket connection to task server
  private socket: any = null;
  private serverConfig: TaskServerConfig = {
    url: 'http://localhost:4003',
    enabled: true,
    autoConnect: true,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
  };
  private connected: boolean = false;
  private useServerMode: boolean = false; // Toggle between server and simulation mode

  constructor() {
    // Load default tasks
    this.loadDefaultTasks();
    
    // Try to connect to server on init if autoConnect is enabled
    if (this.serverConfig.autoConnect) {
      this.connectToServer();
    }
  }

  // Connect to the task server
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
          console.log('🚀 Connected to task runner server');
          this.connected = true;
          this.useServerMode = true;
        });

        this.socket.on('disconnect', () => {
          console.log('🚀 Disconnected from task runner server');
          this.connected = false;
        });

        this.socket.on('connect_error', () => {
          // Fall back to simulation mode
          console.log('🚀 Task server not available, using simulation mode');
          this.useServerMode = false;
        });

        // Listen for task events from server
        this.socket.on('task:started', (data: any) => {
          const execution = this.executions.get(data.executionId);
          if (execution) {
            execution.status = 'running';
            execution.startTime = new Date(data.startTime);
            this.emit({ type: 'taskStart', data: { execution, task: execution.task } });
          }
        });

        this.socket.on('task:output', (data: any) => {
          const execution = this.executions.get(data.executionId);
          if (execution) {
            if (data.type === 'stderr') {
              execution.errors.push(data.data);
            } else {
              execution.output.push(data.data);
            }
            this.emit({ type: 'taskOutput', data: { executionId: data.executionId, line: data.data } });
          }
        });

        this.socket.on('task:completed', (data: any) => {
          const execution = this.executions.get(data.id);
          if (execution) {
            execution.status = data.status;
            execution.endTime = new Date(data.endTime);
            execution.exitCode = data.exitCode;
            execution.output = data.output || execution.output;
            execution.errors = data.errors || execution.errors;
            this.emit({ type: 'taskEnd', data: { execution } });
          }
        });

        this.socket.on('task:cancelled', (data: any) => {
          const execution = this.executions.get(data.executionId);
          if (execution) {
            execution.status = 'cancelled';
            execution.endTime = new Date();
            this.emit({ type: 'taskEnd', data: { execution } });
          }
        });

        this.socket.on('task:error', (data: any) => {
          console.error('Task error:', data.error);
        });

        // Listen for test events from server
        this.socket.on('test:started', (data: any) => {
          const testRun = this.testRuns.get(data.runId);
          if (testRun) {
            testRun.status = 'running';
            testRun.startTime = new Date(data.startTime);
            this.emit({ type: 'testStart', data: { testRun } });
          }
        });

        this.socket.on('test:output', (data: any) => {
          const testRun = this.testRuns.get(data.runId);
          if (testRun) {
            testRun.output.push(data.data);
            this.emit({ type: 'testResult', data: { testRun, output: data.data } });
          }
        });

        this.socket.on('test:result', (data: any) => {
          const testRun = this.testRuns.get(data.runId);
          if (testRun) {
            // Update summary based on result
            if (data.status === 'passed') {
              testRun.summary.passed++;
            } else if (data.status === 'failed') {
              testRun.summary.failed++;
            }
            testRun.summary.total++;
            this.emit({ type: 'testResult', data: { testRun } });
          }
        });

        this.socket.on('test:completed', (data: any) => {
          const testRun = this.testRuns.get(data.runId);
          if (testRun) {
            testRun.status = data.status;
            testRun.endTime = new Date();
            testRun.summary.duration = data.duration;
            if (data.coverage) {
              testRun.coverage = data.coverage;
            }
            if (data.results) {
              // Parse Jest results if available
              this.parseTestResults(testRun, data.results);
            }
            this.emit({ type: 'testEnd', data: { testRun } });
          }
        });

        this.socket.on('test:cancelled', (data: any) => {
          const testRun = this.testRuns.get(data.runId);
          if (testRun) {
            testRun.status = 'cancelled';
            testRun.endTime = new Date();
            if (this.activeTestRun?.id === data.runId) {
              this.activeTestRun = null;
            }
            this.emit({ type: 'testEnd', data: { testRun } });
          }
        });

        this.socket.on('test:error', (data: any) => {
          console.error('Test error:', data.error);
        });
      }).catch(() => {
        console.log('🚀 Socket.io-client not available, using simulation mode');
        this.useServerMode = false;
      });
    } catch (error) {
      console.error('Failed to connect to task server:', error);
      this.useServerMode = false;
    }
  }

  // Parse test results from Jest JSON output
  private parseTestResults(testRun: TestRun, results: any): void {
    if (results.testResults) {
      testRun.suites = results.testResults.map((suite: any) => ({
        id: `suite-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        name: suite.name.split('/').pop() || suite.name,
        file: suite.name,
        framework: testRun.framework,
        status: suite.status === 'passed' ? 'passed' : 'failed',
        duration: suite.endTime - suite.startTime,
        tests: (suite.assertionResults || []).map((test: any) => ({
          id: `test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          name: test.title,
          fullName: test.fullName,
          status: test.status,
          duration: test.duration,
          error: test.failureMessages?.length ? {
            message: test.failureMessages[0],
            stack: test.failureMessages.join('\n'),
          } : undefined,
        })),
      }));
      
      testRun.summary = {
        total: results.numTotalTests,
        passed: results.numPassedTests,
        failed: results.numFailedTests,
        skipped: results.numPendingTests,
        pending: 0,
        duration: testRun.summary.duration,
      };
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
  updateServerConfig(config: Partial<TaskServerConfig>): void {
    this.serverConfig = { ...this.serverConfig, ...config };
  }

  // Get server config
  getServerConfig(): TaskServerConfig {
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

  private loadDefaultTasks(): void {
    TASK_TEMPLATES.forEach(template => {
      const task: Task = {
        id: template.id,
        name: template.name,
        type: template.type,
        command: template.command,
        args: template.args,
        description: template.description,
        group: template.category,
      };
      this.tasks.set(task.id, task);
    });
  }

  // Get all test frameworks
  getTestFrameworks(): typeof TEST_FRAMEWORKS {
    return TEST_FRAMEWORKS;
  }

  // Get framework info
  getFrameworkInfo(framework: TestFramework) {
    return TEST_FRAMEWORKS[framework];
  }

  // Get task templates
  getTaskTemplates(): TaskTemplate[] {
    return [...TASK_TEMPLATES];
  }

  // Get templates by category
  getTemplatesByCategory(category: string): TaskTemplate[] {
    return TASK_TEMPLATES.filter(t => t.category === category);
  }

  // Task management
  addTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  removeTask(id: string): void {
    this.tasks.delete(id);
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTasksByType(type: TaskType): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.type === type);
  }

  getTasksByGroup(group: string): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.group === group);
  }

  // Execute a task
  async executeTask(taskId: string): Promise<TaskExecution> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const execution: TaskExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      taskId,
      task,
      status: 'running',
      startTime: new Date(),
      output: [],
      errors: [],
    };

    this.executions.set(execution.id, execution);

    this.emit({
      type: 'taskStart',
      data: { execution, task },
    });

    // Use server mode if connected, otherwise simulate
    if (this.useServerMode && this.socket) {
      // Execute task on server
      this.socket.emit('task:execute', {
        executionId: execution.id,
        command: task.command,
        args: task.args,
        cwd: task.cwd,
        env: task.env,
        templateId: task.id,
      });
    } else {
      // Simulate task execution
      await this.simulateTaskExecution(execution);
    }

    return execution;
  }

  private async simulateTaskExecution(execution: TaskExecution): Promise<void> {
    const task = execution.task;
    const commandStr = `${task.command} ${(task.args || []).join(' ')}`;

    // Add initial output
    execution.output.push(`> Executing task: ${task.name}`);
    execution.output.push(`> ${commandStr}`);
    execution.output.push('');

    this.emit({ type: 'taskOutput', data: { executionId: execution.id, output: execution.output } });

    // Simulate different task types
    switch (task.type) {
      case 'build':
        await this.simulateBuildTask(execution);
        break;
      case 'test':
        await this.simulateTestTask(execution);
        break;
      case 'lint':
        await this.simulateLintTask(execution);
        break;
      default:
        await this.simulateGenericTask(execution);
    }

    // Complete execution
    execution.endTime = new Date();
    execution.status = execution.errors.length > 0 ? 'failed' : 'success';
    execution.exitCode = execution.errors.length > 0 ? 1 : 0;

    this.emit({
      type: 'taskEnd',
      data: { execution },
    });
  }

  private async simulateBuildTask(execution: TaskExecution): Promise<void> {
    const steps = [
      'Resolving dependencies...',
      'Compiling source files...',
      '  ✓ src/index.ts',
      '  ✓ src/components/App.tsx',
      '  ✓ src/utils/helpers.ts',
      'Bundling assets...',
      'Optimizing for production...',
      'Writing output files...',
      '',
      '✓ Build completed successfully',
      `  Output: dist/`,
      `  Size: 1.2 MB (354 KB gzipped)`,
      `  Duration: ${(1.5 + Math.random() * 2).toFixed(2)}s`,
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
      execution.output.push(step);
      this.emit({ type: 'taskOutput', data: { executionId: execution.id, line: step } });
    }
  }

  private async simulateTestTask(execution: TaskExecution): Promise<void> {
    const steps = [
      'Collecting tests...',
      'Running test suites...',
      '',
      ' PASS  src/__tests__/utils.test.ts',
      '  ✓ should add numbers correctly (2ms)',
      '  ✓ should handle edge cases (1ms)',
      '',
      ' PASS  src/__tests__/components.test.tsx',
      '  ✓ renders without crashing (15ms)',
      '  ✓ displays correct content (8ms)',
      '  ✓ handles user interaction (12ms)',
      '',
      'Test Suites: 2 passed, 2 total',
      'Tests:       5 passed, 5 total',
      'Snapshots:   0 total',
      `Time:        ${(2 + Math.random() * 3).toFixed(2)}s`,
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 80 + Math.random() * 150));
      execution.output.push(step);
      this.emit({ type: 'taskOutput', data: { executionId: execution.id, line: step } });
    }
  }

  private async simulateLintTask(execution: TaskExecution): Promise<void> {
    const steps = [
      'Linting files...',
      '',
      '  src/index.ts',
      '  src/App.tsx',
      '  src/components/Header.tsx',
      '  src/utils/helpers.ts',
      '',
      '✓ No issues found',
      `  Files checked: 4`,
      `  Duration: ${(0.5 + Math.random()).toFixed(2)}s`,
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
      execution.output.push(step);
      this.emit({ type: 'taskOutput', data: { executionId: execution.id, line: step } });
    }
  }

  private async simulateGenericTask(execution: TaskExecution): Promise<void> {
    const steps = [
      'Starting task...',
      'Processing...',
      '...',
      'Task completed.',
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      execution.output.push(step);
      this.emit({ type: 'taskOutput', data: { executionId: execution.id, line: step } });
    }
  }

  // Cancel a running task
  cancelTask(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      // Cancel on server if connected
      if (this.useServerMode && this.socket) {
        this.socket.emit('task:cancel', { executionId });
      } else {
        execution.status = 'cancelled';
        execution.endTime = new Date();
        execution.output.push('');
        execution.output.push('Task cancelled by user');

        this.emit({
          type: 'taskEnd',
          data: { execution },
        });
      }
    }
  }

  // Get execution history
  getExecutionHistory(): TaskExecution[] {
    return Array.from(this.executions.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  getExecution(id: string): TaskExecution | undefined {
    return this.executions.get(id);
  }

  clearHistory(): void {
    const runningExecutions = new Map<string, TaskExecution>();
    this.executions.forEach((exec, id) => {
      if (exec.status === 'running') {
        runningExecutions.set(id, exec);
      }
    });
    this.executions = runningExecutions;
  }

  // Test Runner Methods
  async runTests(framework: TestFramework, options?: { watch?: boolean; coverage?: boolean; filter?: string; files?: string[] }): Promise<TestRun> {
    const frameworkInfo = TEST_FRAMEWORKS[framework];
    if (!frameworkInfo) {
      throw new Error(`Unknown test framework: ${framework}`);
    }

    const testRun: TestRun = {
      id: `test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      framework,
      status: 'running',
      startTime: new Date(),
      suites: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0, duration: 0 },
      output: [],
    };

    this.testRuns.set(testRun.id, testRun);
    this.activeTestRun = testRun;

    this.emit({
      type: 'testStart',
      data: { testRun },
    });

    // Use server mode if connected, otherwise simulate
    if (this.useServerMode && this.socket) {
      // Run tests on server
      this.socket.emit('test:run', {
        runId: testRun.id,
        framework,
        coverage: options?.coverage,
        watch: options?.watch,
        filter: options?.filter,
        files: options?.files,
      });
    } else {
      // Simulate test execution
      await this.simulateTestRun(testRun, options);
    }

    return testRun;
  }

  private async simulateTestRun(testRun: TestRun, options?: { coverage?: boolean; filter?: string }): Promise<void> {
    const framework = testRun.framework;

    // Generate mock test suites based on framework
    const suites = this.generateMockTestSuites(framework, options?.filter);
    testRun.suites = suites;

    // Run each suite
    for (const suite of suites) {
      suite.status = 'running';
      this.emit({ type: 'testResult', data: { testRun, suite } });

      // Run each test
      for (const test of suite.tests) {
        test.status = 'running';
        await new Promise(r => setTimeout(r, 50 + Math.random() * 150));

        // Simulate test result (90% pass rate)
        const passed = Math.random() > 0.1;
        test.status = passed ? 'passed' : 'failed';
        test.duration = Math.floor(Math.random() * 100) + 1;

        if (!passed) {
          test.error = {
            message: `Expected value to be true, but received false`,
            stack: `Error: Expected value to be true\n    at Object.<anonymous> (${suite.file}:${Math.floor(Math.random() * 100) + 1}:5)`,
            expected: 'true',
            actual: 'false',
          };
        }

        testRun.summary.total++;
        if (passed) testRun.summary.passed++;
        else testRun.summary.failed++;

        this.emit({ type: 'testResult', data: { testRun, suite, test } });
      }

      suite.status = suite.tests.some(t => t.status === 'failed') ? 'failed' : 'passed';
      suite.duration = suite.tests.reduce((sum, t) => sum + (t.duration || 0), 0);
    }

    testRun.summary.duration = suites.reduce((sum, s) => sum + (s.duration || 0), 0);

    // Generate coverage if requested
    if (options?.coverage) {
      testRun.coverage = this.generateMockCoverage();
    }

    testRun.status = testRun.summary.failed > 0 ? 'failed' : 'completed';
    testRun.endTime = new Date();

    this.emit({
      type: 'testEnd',
      data: { testRun },
    });
  }

  private generateMockTestSuites(framework: TestFramework, filter?: string): TestSuite[] {
    const suiteTemplates = [
      { name: 'Utils', file: 'src/__tests__/utils.test.ts', tests: ['should handle empty input', 'should process valid data', 'should throw on invalid input'] },
      { name: 'Components', file: 'src/__tests__/components.test.tsx', tests: ['renders correctly', 'handles click events', 'updates state properly', 'displays loading state'] },
      { name: 'API', file: 'src/__tests__/api.test.ts', tests: ['fetches data successfully', 'handles errors gracefully', 'retries on failure'] },
      { name: 'Hooks', file: 'src/__tests__/hooks.test.ts', tests: ['initializes with default value', 'updates on change', 'cleans up on unmount'] },
    ];

    return suiteTemplates
      .filter(t => !filter || t.name.toLowerCase().includes(filter.toLowerCase()))
      .map(template => ({
        id: `suite-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        name: template.name,
        file: template.file,
        framework,
        status: 'pending' as const,
        tests: template.tests.map(testName => ({
          id: `test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          name: testName,
          fullName: `${template.name} > ${testName}`,
          status: 'pending' as const,
          ancestorTitles: [template.name],
        })),
      }));
  }

  private generateMockCoverage(): CoverageReport {
    const files = [
      { file: 'src/index.ts', lines: 95, statements: 94, functions: 100, branches: 85 },
      { file: 'src/App.tsx', lines: 88, statements: 87, functions: 90, branches: 75 },
      { file: 'src/components/Header.tsx', lines: 92, statements: 91, functions: 100, branches: 80 },
      { file: 'src/utils/helpers.ts', lines: 100, statements: 100, functions: 100, branches: 100 },
      { file: 'src/hooks/useStore.ts', lines: 78, statements: 76, functions: 85, branches: 65 },
    ];

    const fileCoverages: FileCoverage[] = files.map(f => {
      const createMetric = (pct: number): CoverageMetric => ({
        total: 100,
        covered: pct,
        skipped: 0,
        percentage: pct,
      });

      return {
        file: f.file,
        lines: createMetric(f.lines),
        statements: createMetric(f.statements),
        functions: createMetric(f.functions),
        branches: createMetric(f.branches),
        uncoveredLines: f.lines < 100 ? [15, 23, 47].filter(() => Math.random() > 0.5) : [],
        uncoveredBranches: f.branches < 100 ? [{ line: 30, branch: 1 }] : [],
      };
    });

    const calcSummary = (key: keyof Omit<FileCoverage, 'file' | 'uncoveredLines' | 'uncoveredBranches'>): CoverageMetric => {
      const total = fileCoverages.reduce((sum, f) => sum + f[key].total, 0);
      const covered = fileCoverages.reduce((sum, f) => sum + f[key].covered, 0);
      return { total, covered, skipped: 0, percentage: Math.round((covered / total) * 100) };
    };

    return {
      timestamp: new Date(),
      summary: {
        lines: calcSummary('lines'),
        statements: calcSummary('statements'),
        functions: calcSummary('functions'),
        branches: calcSummary('branches'),
      },
      files: fileCoverages,
    };
  }

  // Get active test run
  getActiveTestRun(): TestRun | null {
    return this.activeTestRun;
  }

  // Get all test runs
  getAllTestRuns(): TestRun[] {
    return Array.from(this.testRuns.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  // Cancel test run
  cancelTestRun(runId: string): void {
    const run = this.testRuns.get(runId);
    if (run && run.status === 'running') {
      // Cancel on server if connected
      if (this.useServerMode && this.socket) {
        this.socket.emit('test:cancel', { runId });
      } else {
        run.status = 'cancelled';
        run.endTime = new Date();
        if (this.activeTestRun?.id === runId) {
          this.activeTestRun = null;
        }
        this.emit({ type: 'testEnd', data: { testRun: run } });
      }
    }
  }

  // Re-run failed tests
  async rerunFailedTests(): Promise<TestRun | null> {
    if (!this.activeTestRun) return null;

    const failedTests = this.activeTestRun.suites
      .flatMap(s => s.tests)
      .filter(t => t.status === 'failed')
      .map(t => t.fullName);

    if (failedTests.length === 0) return null;

    return this.runTests(this.activeTestRun.framework, { filter: failedTests.join('|') });
  }

  // Automation Rules
  addAutomationRule(rule: AutomationRule): void {
    this.automationRules.set(rule.id, rule);
  }

  removeAutomationRule(id: string): void {
    this.automationRules.delete(id);
  }

  getAutomationRules(): AutomationRule[] {
    return Array.from(this.automationRules.values());
  }

  toggleAutomationRule(id: string): void {
    const rule = this.automationRules.get(id);
    if (rule) {
      rule.enabled = !rule.enabled;
    }
  }

  // Run automation rule
  async runAutomation(ruleId: string): Promise<void> {
    const rule = this.automationRules.get(ruleId);
    if (!rule || !rule.enabled) return;

    for (const taskId of rule.tasks) {
      await this.executeTask(taskId);
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

  private emit(event: TaskEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(cb => cb(event));

    const wildcardListeners = this.eventListeners.get('*') || [];
    wildcardListeners.forEach(cb => cb(event));
  }

  // Generate tasks.json content
  generateTasksJson(): string {
    const tasks = Array.from(this.tasks.values()).map(task => ({
      label: task.name,
      type: 'shell',
      command: task.command,
      args: task.args,
      group: task.group,
      problemMatcher: task.problemMatcher || [],
      presentation: task.presentation,
    }));

    return JSON.stringify({ version: '2.0.0', tasks }, null, 2);
  }
}

// Singleton instance
export const taskRunnerService = new TaskRunnerService();
export default taskRunnerService;
