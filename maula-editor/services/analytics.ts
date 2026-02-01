// Analytics & Telemetry Service
// Comprehensive usage insights, error reporting, crash logs, and extension analytics

export type EventCategory = 
  | 'session' | 'navigation' | 'editor' | 'terminal' | 'ai' 
  | 'extension' | 'git' | 'debug' | 'build' | 'deploy' 
  | 'collaboration' | 'search' | 'refactor' | 'performance';

export type EventSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AnalyticsEvent {
  id: string;
  timestamp: Date;
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  sessionId: string;
  userId?: string;
  anonymousId: string;
}

export interface ErrorReport {
  id: string;
  timestamp: Date;
  type: 'error' | 'unhandled-rejection' | 'crash' | 'warning';
  message: string;
  stack?: string;
  source?: string;
  lineNumber?: number;
  columnNumber?: number;
  url?: string;
  userAgent: string;
  metadata?: Record<string, any>;
  sessionId: string;
  resolved: boolean;
  occurrences: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedUsers: number;
}

export interface CrashLog {
  id: string;
  timestamp: Date;
  type: 'js-error' | 'memory' | 'freeze' | 'network' | 'storage' | 'webgl';
  severity: EventSeverity;
  title: string;
  description: string;
  stack?: string;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  systemInfo: {
    platform: string;
    userAgent: string;
    language: string;
    screenResolution: string;
    viewport: string;
    connectionType?: string;
  };
  sessionId: string;
  breadcrumbs: Breadcrumb[];
}

export interface Breadcrumb {
  timestamp: Date;
  category: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface UsageInsight {
  id: string;
  metric: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend: 'up' | 'down' | 'stable';
  period: 'hour' | 'day' | 'week' | 'month';
  category: EventCategory;
  details?: Record<string, any>;
}

export interface ExtensionAnalytics {
  extensionId: string;
  name: string;
  version: string;
  activations: number;
  commands: { [command: string]: number };
  errors: number;
  loadTime: number;
  memoryUsage: number;
  lastActive: Date;
  rating: number;
  userSatisfaction: number;
}

export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  name: string;
  value: number;
  unit: 'ms' | 's' | 'bytes' | 'count' | 'percent';
  category: 'load' | 'render' | 'memory' | 'network' | 'storage' | 'cpu';
  threshold?: number;
  isAnomaly: boolean;
}

export interface SessionInfo {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  userId?: string;
  anonymousId: string;
  platform: string;
  version: string;
  features: string[];
  events: number;
  errors: number;
  crashes: number;
}

export interface AnalyticsDashboard {
  overview: {
    totalSessions: number;
    activeUsers: number;
    avgSessionDuration: number;
    bounceRate: number;
    errorRate: number;
    crashFreeRate: number;
  };
  trends: {
    sessions: { date: string; count: number }[];
    errors: { date: string; count: number }[];
    performance: { date: string; value: number }[];
  };
  topFeatures: { feature: string; usage: number }[];
  topErrors: ErrorReport[];
  recentCrashes: CrashLog[];
  extensionMetrics: ExtensionAnalytics[];
}

// AI-Powered Refactoring Types
export interface RefactoringSuggestion {
  id: string;
  type: 'extract-method' | 'extract-variable' | 'inline' | 'rename' | 'move' | 'simplify' | 'optimize' | 'security';
  title: string;
  description: string;
  file: string;
  startLine: number;
  endLine: number;
  originalCode: string;
  suggestedCode: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  category: 'readability' | 'performance' | 'security' | 'maintainability' | 'best-practice';
  explanation: string;
  applied: boolean;
}

export interface RefactoringAnalysis {
  file: string;
  suggestions: RefactoringSuggestion[];
  codeQualityScore: number;
  complexityScore: number;
  maintainabilityIndex: number;
  technicalDebt: number; // in minutes
}

type EventCallback = (event: { type: string; data: any }) => void;

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private errors: ErrorReport[] = [];
  private crashes: CrashLog[] = [];
  private insights: UsageInsight[] = [];
  private extensionAnalytics: Map<string, ExtensionAnalytics> = new Map();
  private performanceMetrics: PerformanceMetric[] = [];
  private breadcrumbs: Breadcrumb[] = [];
  private currentSession: SessionInfo;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private flushInterval: number = 30000; // 30 seconds
  private maxBreadcrumbs: number = 100;
  private isEnabled: boolean = true;
  private consentGiven: boolean = false;

  constructor() {
    this.currentSession = this.createSession();
    this.setupErrorHandlers();
    this.setupPerformanceObserver();
    this.startFlushInterval();
    this.generateMockData();
  }

  private createSession(): SessionInfo {
    return {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date(),
      anonymousId: this.getAnonymousId(),
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      version: '1.0.0',
      features: [],
      events: 0,
      errors: 0,
      crashes: 0,
    };
  }

  private getAnonymousId(): string {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('analytics_anonymous_id') : null;
    if (stored) return stored;
    
    const id = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('analytics_anonymous_id', id);
    }
    return id;
  }

  private setupErrorHandlers(): void {
    if (typeof window !== 'undefined') {
      window.onerror = (message, source, lineno, colno, error) => {
        this.reportError({
          type: 'error',
          message: String(message),
          stack: error?.stack,
          source,
          lineNumber: lineno,
          columnNumber: colno,
        });
        return false;
      };

      window.onunhandledrejection = (event) => {
        this.reportError({
          type: 'unhandled-rejection',
          message: event.reason?.message || String(event.reason),
          stack: event.reason?.stack,
        });
      };
    }
  }

  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordPerformanceMetric({
              name: entry.name,
              value: entry.duration || (entry as any).value || 0,
              unit: 'ms',
              category: this.categorizePerformanceEntry(entry),
            });
          }
        });
        observer.observe({ entryTypes: ['measure', 'longtask', 'largest-contentful-paint'] });
      } catch (e) {
        // PerformanceObserver not fully supported
      }
    }
  }

  private categorizePerformanceEntry(entry: PerformanceEntry): PerformanceMetric['category'] {
    if (entry.entryType === 'longtask') return 'cpu';
    if (entry.name.includes('render')) return 'render';
    if (entry.name.includes('load')) return 'load';
    return 'render';
  }

  private startFlushInterval(): void {
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.flush(), this.flushInterval);
    }
  }

  // Event Tracking
  trackEvent(
    category: EventCategory,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      category,
      action,
      label,
      value,
      metadata,
      sessionId: this.currentSession.id,
      anonymousId: this.currentSession.anonymousId,
    };

    this.events.push(event);
    this.currentSession.events++;
    this.addBreadcrumb('event', `${category}:${action}`, 'info', metadata);
    this.emit('event', event);
  }

  // Error Reporting
  reportError(options: {
    type: ErrorReport['type'];
    message: string;
    stack?: string;
    source?: string;
    lineNumber?: number;
    columnNumber?: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.isEnabled) return;

    // Check for duplicate errors
    const existingError = this.errors.find(
      e => e.message === options.message && e.stack === options.stack
    );

    if (existingError) {
      existingError.occurrences++;
      existingError.lastOccurrence = new Date();
      existingError.affectedUsers++;
      this.emit('errorUpdated', existingError);
      return;
    }

    const error: ErrorReport = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: options.type,
      message: options.message,
      stack: options.stack,
      source: options.source,
      lineNumber: options.lineNumber,
      columnNumber: options.columnNumber,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      metadata: options.metadata,
      sessionId: this.currentSession.id,
      resolved: false,
      occurrences: 1,
      firstOccurrence: new Date(),
      lastOccurrence: new Date(),
      affectedUsers: 1,
    };

    this.errors.push(error);
    this.currentSession.errors++;
    this.addBreadcrumb('error', options.message, 'error', { stack: options.stack });
    this.emit('error', error);
  }

  // Crash Logging
  logCrash(options: {
    type: CrashLog['type'];
    severity: EventSeverity;
    title: string;
    description: string;
    stack?: string;
  }): void {
    if (!this.isEnabled) return;

    const crash: CrashLog = {
      id: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: options.type,
      severity: options.severity,
      title: options.title,
      description: options.description,
      stack: options.stack,
      memoryUsage: this.getMemoryUsage(),
      systemInfo: this.getSystemInfo(),
      sessionId: this.currentSession.id,
      breadcrumbs: [...this.breadcrumbs].slice(-20), // Last 20 breadcrumbs
    };

    this.crashes.push(crash);
    this.currentSession.crashes++;
    this.emit('crash', crash);
  }

  private getMemoryUsage(): CrashLog['memoryUsage'] | undefined {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return undefined;
  }

  private getSystemInfo(): CrashLog['systemInfo'] {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
      return {
        platform: 'unknown',
        userAgent: 'unknown',
        language: 'en',
        screenResolution: '1920x1080',
        viewport: '1920x1080',
      };
    }

    return {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      connectionType: (navigator as any).connection?.effectiveType,
    };
  }

  // Breadcrumbs
  addBreadcrumb(
    category: string,
    message: string,
    level: Breadcrumb['level'] = 'info',
    data?: Record<string, any>
  ): void {
    const breadcrumb: Breadcrumb = {
      timestamp: new Date(),
      category,
      message,
      level,
      data,
    };

    this.breadcrumbs.push(breadcrumb);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  // Performance Metrics
  recordPerformanceMetric(options: {
    name: string;
    value: number;
    unit: PerformanceMetric['unit'];
    category: PerformanceMetric['category'];
    threshold?: number;
  }): void {
    const metric: PerformanceMetric = {
      id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      name: options.name,
      value: options.value,
      unit: options.unit,
      category: options.category,
      threshold: options.threshold,
      isAnomaly: options.threshold ? options.value > options.threshold : false,
    };

    this.performanceMetrics.push(metric);
    
    if (metric.isAnomaly) {
      this.emit('performanceAnomaly', metric);
    }
  }

  // Extension Analytics
  trackExtension(extensionId: string, event: 'activate' | 'command' | 'error', data?: any): void {
    let analytics = this.extensionAnalytics.get(extensionId);
    
    if (!analytics) {
      analytics = {
        extensionId,
        name: data?.name || extensionId,
        version: data?.version || '1.0.0',
        activations: 0,
        commands: {},
        errors: 0,
        loadTime: 0,
        memoryUsage: 0,
        lastActive: new Date(),
        rating: 0,
        userSatisfaction: 0,
      };
      this.extensionAnalytics.set(extensionId, analytics);
    }

    switch (event) {
      case 'activate':
        analytics.activations++;
        analytics.loadTime = data?.loadTime || 0;
        break;
      case 'command':
        const cmd = data?.command || 'unknown';
        analytics.commands[cmd] = (analytics.commands[cmd] || 0) + 1;
        break;
      case 'error':
        analytics.errors++;
        break;
    }

    analytics.lastActive = new Date();
    this.emit('extensionAnalytics', analytics);
  }

  // Usage Insights
  getInsights(period: UsageInsight['period'] = 'day'): UsageInsight[] {
    return this.insights.filter(i => i.period === period);
  }

  generateInsights(): void {
    const categories: EventCategory[] = ['editor', 'terminal', 'ai', 'git', 'debug', 'build'];
    
    for (const category of categories) {
      const categoryEvents = this.events.filter(e => e.category === category);
      const previousCount = Math.floor(Math.random() * 100) + 50;
      const currentCount = categoryEvents.length;
      const change = currentCount - previousCount;
      
      this.insights.push({
        id: `insight_${category}_${Date.now()}`,
        metric: `${category}_usage`,
        value: currentCount,
        previousValue: previousCount,
        change,
        changePercent: previousCount > 0 ? (change / previousCount) * 100 : 0,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        period: 'day',
        category,
      });
    }

    this.emit('insightsGenerated', this.insights);
  }

  // AI-Powered Refactoring
  async analyzeCodeForRefactoring(code: string, language: string, filePath: string): Promise<RefactoringAnalysis> {
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 500));

    const suggestions: RefactoringSuggestion[] = [];
    const lines = code.split('\n');

    // Detect long functions
    let functionStart = -1;
    let braceCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(/)) {
        functionStart = i;
        braceCount = 0;
      }
      braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      if (functionStart !== -1 && braceCount === 0 && i > functionStart) {
        const funcLength = i - functionStart;
        if (funcLength > 20) {
          suggestions.push({
            id: `refactor_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            type: 'extract-method',
            title: 'Extract Method',
            description: `Function is ${funcLength} lines long. Consider extracting some logic into smaller functions.`,
            file: filePath,
            startLine: functionStart,
            endLine: i,
            originalCode: lines.slice(functionStart, i + 1).join('\n'),
            suggestedCode: '// Extract complex logic into separate functions',
            confidence: 0.85,
            impact: 'medium',
            category: 'maintainability',
            explanation: 'Long functions are harder to understand and maintain. Breaking them into smaller, focused functions improves readability.',
            applied: false,
          });
        }
        functionStart = -1;
      }
    }

    // Detect duplicate code patterns
    const codeBlocks = new Map<string, number[]>();
    for (let i = 0; i < lines.length - 3; i++) {
      const block = lines.slice(i, i + 3).join('\n').trim();
      if (block.length > 30) {
        const existing = codeBlocks.get(block);
        if (existing) {
          existing.push(i);
        } else {
          codeBlocks.set(block, [i]);
        }
      }
    }

    for (const [block, occurrences] of codeBlocks) {
      if (occurrences.length > 1) {
        suggestions.push({
          id: `refactor_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: 'extract-method',
          title: 'Remove Duplicate Code',
          description: `Similar code block found ${occurrences.length} times. Consider extracting to a reusable function.`,
          file: filePath,
          startLine: occurrences[0],
          endLine: occurrences[0] + 3,
          originalCode: block,
          suggestedCode: '// Extract to a reusable function',
          confidence: 0.9,
          impact: 'high',
          category: 'maintainability',
          explanation: 'Duplicate code increases maintenance burden. Extract to a single function that can be reused.',
          applied: false,
        });
        break; // Only report first duplicate
      }
    }

    // Detect magic numbers
    for (let i = 0; i < lines.length; i++) {
      const magicNumbers = lines[i].match(/(?<![a-zA-Z_$])\b\d{2,}\b(?![a-zA-Z_$])/g);
      if (magicNumbers && !lines[i].includes('const') && !lines[i].includes('//')) {
        suggestions.push({
          id: `refactor_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: 'extract-variable',
          title: 'Extract Magic Number',
          description: `Consider extracting magic number(s) ${magicNumbers.join(', ')} to named constants.`,
          file: filePath,
          startLine: i,
          endLine: i,
          originalCode: lines[i],
          suggestedCode: `const MEANINGFUL_NAME = ${magicNumbers[0]}; // Replace with descriptive name`,
          confidence: 0.75,
          impact: 'low',
          category: 'readability',
          explanation: 'Named constants improve code readability and make it easier to update values.',
          applied: false,
        });
      }
    }

    // Detect console.log statements
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('console.log')) {
        suggestions.push({
          id: `refactor_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: 'simplify',
          title: 'Remove Debug Statement',
          description: 'Remove console.log statement before production.',
          file: filePath,
          startLine: i,
          endLine: i,
          originalCode: lines[i],
          suggestedCode: '// Consider using a proper logging library',
          confidence: 0.95,
          impact: 'low',
          category: 'best-practice',
          explanation: 'Console.log statements should be removed or replaced with proper logging in production code.',
          applied: false,
        });
      }
    }

    // Calculate scores
    const codeQualityScore = Math.max(0, 100 - suggestions.length * 5);
    const complexityScore = Math.min(100, lines.length / 5);
    const maintainabilityIndex = Math.max(0, 100 - complexityScore * 0.5 - suggestions.length * 3);
    const technicalDebt = suggestions.reduce((acc, s) => {
      const impactMinutes = s.impact === 'high' ? 30 : s.impact === 'medium' ? 15 : 5;
      return acc + impactMinutes;
    }, 0);

    return {
      file: filePath,
      suggestions,
      codeQualityScore,
      complexityScore,
      maintainabilityIndex,
      technicalDebt,
    };
  }

  // Dashboard
  getDashboard(): AnalyticsDashboard {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentEvents = this.events.filter(e => e.timestamp > dayAgo);
    const recentErrors = this.errors.filter(e => e.timestamp > dayAgo);

    // Generate trend data
    const sessionsTrend = [];
    const errorsTrend = [];
    const perfTrend = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      sessionsTrend.push({ date: dateStr, count: Math.floor(Math.random() * 100) + 50 });
      errorsTrend.push({ date: dateStr, count: Math.floor(Math.random() * 20) });
      perfTrend.push({ date: dateStr, value: Math.random() * 100 + 200 });
    }

    // Top features
    const featureUsage = new Map<string, number>();
    for (const event of this.events) {
      const key = `${event.category}:${event.action}`;
      featureUsage.set(key, (featureUsage.get(key) || 0) + 1);
    }
    const topFeatures = Array.from(featureUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([feature, usage]) => ({ feature, usage }));

    return {
      overview: {
        totalSessions: Math.floor(Math.random() * 1000) + 500,
        activeUsers: Math.floor(Math.random() * 200) + 100,
        avgSessionDuration: Math.floor(Math.random() * 1800) + 600, // seconds
        bounceRate: Math.random() * 30 + 10,
        errorRate: (recentErrors.length / Math.max(recentEvents.length, 1)) * 100,
        crashFreeRate: 100 - (this.crashes.length / Math.max(this.events.length, 1)) * 100,
      },
      trends: {
        sessions: sessionsTrend,
        errors: errorsTrend,
        performance: perfTrend,
      },
      topFeatures,
      topErrors: this.errors.slice(0, 5),
      recentCrashes: this.crashes.slice(-5).reverse(),
      extensionMetrics: Array.from(this.extensionAnalytics.values()),
    };
  }

  // Data Management
  flush(): void {
    if (!this.isEnabled || !this.consentGiven) return;
    
    // In production, this would send data to analytics server
    console.log('[Analytics] Flushing data:', {
      events: this.events.length,
      errors: this.errors.length,
      crashes: this.crashes.length,
    });
  }

  clearData(): void {
    this.events = [];
    this.errors = [];
    this.crashes = [];
    this.insights = [];
    this.performanceMetrics = [];
    this.breadcrumbs = [];
    this.extensionAnalytics.clear();
    this.emit('dataCleared', {});
  }

  exportData(): string {
    return JSON.stringify({
      events: this.events,
      errors: this.errors,
      crashes: this.crashes,
      insights: this.insights,
      performanceMetrics: this.performanceMetrics,
      extensionAnalytics: Array.from(this.extensionAnalytics.entries()),
      session: this.currentSession,
    }, null, 2);
  }

  // Settings
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.emit('settingsChanged', { enabled });
  }

  setConsent(consent: boolean): void {
    this.consentGiven = consent;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('analytics_consent', String(consent));
    }
    this.emit('consentChanged', { consent });
  }

  getConsent(): boolean {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('analytics_consent') === 'true';
    }
    return this.consentGiven;
  }

  // Getters
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  getCrashes(): CrashLog[] {
    return [...this.crashes];
  }

  getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.performanceMetrics];
  }

  getExtensionAnalytics(): ExtensionAnalytics[] {
    return Array.from(this.extensionAnalytics.values());
  }

  getSession(): SessionInfo {
    return { ...this.currentSession };
  }

  // Event System
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(cb => cb({ type: event, data }));
    this.listeners.get('*')?.forEach(cb => cb({ type: event, data }));
  }

  // Mock data generator
  private generateMockData(): void {
    // Generate mock events
    const categories: EventCategory[] = ['editor', 'terminal', 'ai', 'git', 'debug', 'extension'];
    const actions = ['open', 'close', 'save', 'run', 'search', 'commit', 'push', 'build'];
    
    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      this.events.push({
        id: `evt_mock_${i}`,
        timestamp,
        category: categories[Math.floor(Math.random() * categories.length)],
        action: actions[Math.floor(Math.random() * actions.length)],
        sessionId: this.currentSession.id,
        anonymousId: this.currentSession.anonymousId,
      });
    }

    // Generate mock errors
    const errorMessages = [
      'Cannot read property of undefined',
      'Network request failed',
      'Unexpected token in JSON',
      'Out of memory',
      'Extension host terminated',
    ];

    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      this.errors.push({
        id: `err_mock_${i}`,
        timestamp,
        type: 'error',
        message: errorMessages[Math.floor(Math.random() * errorMessages.length)],
        userAgent: 'Mozilla/5.0 (Mock)',
        sessionId: this.currentSession.id,
        resolved: Math.random() > 0.7,
        occurrences: Math.floor(Math.random() * 50) + 1,
        firstOccurrence: timestamp,
        lastOccurrence: new Date(),
        affectedUsers: Math.floor(Math.random() * 20) + 1,
      });
    }

    // Generate mock extension analytics
    const extensions = [
      { id: 'prettier', name: 'Prettier', version: '3.0.0' },
      { id: 'eslint', name: 'ESLint', version: '2.4.0' },
      { id: 'github-copilot', name: 'GitHub Copilot', version: '1.80.0' },
      { id: 'python', name: 'Python', version: '2023.0.0' },
      { id: 'gitlens', name: 'GitLens', version: '14.0.0' },
    ];

    for (const ext of extensions) {
      this.extensionAnalytics.set(ext.id, {
        extensionId: ext.id,
        name: ext.name,
        version: ext.version,
        activations: Math.floor(Math.random() * 1000) + 100,
        commands: { 'format': Math.floor(Math.random() * 500), 'lint': Math.floor(Math.random() * 300) },
        errors: Math.floor(Math.random() * 10),
        loadTime: Math.random() * 500 + 100,
        memoryUsage: Math.random() * 50 + 10,
        lastActive: new Date(),
        rating: Math.random() * 2 + 3,
        userSatisfaction: Math.random() * 30 + 70,
      });
    }

    // Generate insights
    this.generateInsights();
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
