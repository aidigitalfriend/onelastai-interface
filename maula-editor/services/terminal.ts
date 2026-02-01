/**
 * Production-Level Terminal Service
 * Features:
 * - Multi-session management with tabs
 * - Command history with persistence
 * - Session recovery and reconnection
 * - Local/Remote execution modes
 * - WebContainer integration
 * - Environment variable management
 */

import { socketService } from './socket';
import { webContainerService } from './webcontainer';

// Terminal session types
export interface TerminalSession {
  id: string;
  name: string;
  type: 'local' | 'remote' | 'webcontainer';
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  createdAt: number;
  lastActivity: number;
  cwd?: string;
  env?: Record<string, string>;
  shellType?: string;
}

export interface CommandHistoryEntry {
  id: string;
  command: string;
  output: string;
  exitCode: number | null;
  timestamp: number;
  duration: number;
  sessionId: string;
}

export interface TerminalOutput {
  sessionId: string;
  data: string;
  timestamp: number;
}

export interface TerminalConfig {
  defaultShell: string;
  fontSize: number;
  fontFamily: string;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  scrollback: number;
  copyOnSelect: boolean;
  enableBell: boolean;
  theme: 'dark' | 'light' | 'custom';
  customColors?: TerminalTheme;
}

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

// Event callbacks
export interface TerminalCallbacks {
  onOutput?: (data: TerminalOutput) => void;
  onStatusChange?: (session: TerminalSession) => void;
  onExit?: (sessionId: string, exitCode: number) => void;
  onError?: (sessionId: string, error: string) => void;
  onReconnect?: (sessionId: string) => void;
}

// Default terminal themes
export const TERMINAL_THEMES: Record<string, TerminalTheme> = {
  dark: {
    background: '#0f172a',
    foreground: '#e2e8f0',
    cursor: '#60a5fa',
    cursorAccent: '#0f172a',
    selectionBackground: 'rgba(96, 165, 250, 0.3)',
    black: '#1e293b',
    red: '#ef4444',
    green: '#22c55e',
    yellow: '#eab308',
    blue: '#3b82f6',
    magenta: '#a855f7',
    cyan: '#06b6d4',
    white: '#f1f5f9',
    brightBlack: '#475569',
    brightRed: '#f87171',
    brightGreen: '#4ade80',
    brightYellow: '#facc15',
    brightBlue: '#60a5fa',
    brightMagenta: '#c084fc',
    brightCyan: '#22d3ee',
    brightWhite: '#ffffff',
  },
  light: {
    background: '#ffffff',
    foreground: '#1e293b',
    cursor: '#3b82f6',
    cursorAccent: '#ffffff',
    selectionBackground: 'rgba(59, 130, 246, 0.3)',
    black: '#0f172a',
    red: '#dc2626',
    green: '#16a34a',
    yellow: '#ca8a04',
    blue: '#2563eb',
    magenta: '#9333ea',
    cyan: '#0891b2',
    white: '#334155',
    brightBlack: '#64748b',
    brightRed: '#ef4444',
    brightGreen: '#22c55e',
    brightYellow: '#eab308',
    brightBlue: '#3b82f6',
    brightMagenta: '#a855f7',
    brightCyan: '#06b6d4',
    brightWhite: '#0f172a',
  },
  monokai: {
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    cursorAccent: '#272822',
    selectionBackground: 'rgba(73, 72, 62, 0.8)',
    black: '#272822',
    red: '#f92672',
    green: '#a6e22e',
    yellow: '#f4bf75',
    blue: '#66d9ef',
    magenta: '#ae81ff',
    cyan: '#a1efe4',
    white: '#f8f8f2',
    brightBlack: '#75715e',
    brightRed: '#f92672',
    brightGreen: '#a6e22e',
    brightYellow: '#f4bf75',
    brightBlue: '#66d9ef',
    brightMagenta: '#ae81ff',
    brightCyan: '#a1efe4',
    brightWhite: '#f9f8f5',
  },
  dracula: {
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    cursorAccent: '#282a36',
    selectionBackground: 'rgba(68, 71, 90, 0.8)',
    black: '#21222c',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
    brightBlack: '#6272a4',
    brightRed: '#ff6e6e',
    brightGreen: '#69ff94',
    brightYellow: '#ffffa5',
    brightBlue: '#d6acff',
    brightMagenta: '#ff92df',
    brightCyan: '#a4ffff',
    brightWhite: '#ffffff',
  },
};

const DEFAULT_CONFIG: TerminalConfig = {
  defaultShell: 'bash',
  fontSize: 13,
  fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, Monaco, monospace',
  cursorStyle: 'block',
  cursorBlink: true,
  scrollback: 10000,
  copyOnSelect: true,
  enableBell: false,
  theme: 'dark',
};

class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();
  private commandHistory: CommandHistoryEntry[] = [];
  private config: TerminalConfig = DEFAULT_CONFIG;
  private callbacks: TerminalCallbacks = {};
  private outputBuffers: Map<string, string[]> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private commandStartTimes: Map<string, number> = new Map();
  private historyIndex: Map<string, number> = new Map();
  
  // Storage keys
  private HISTORY_KEY = 'terminal_command_history';
  private CONFIG_KEY = 'terminal_config';
  private SESSIONS_KEY = 'terminal_sessions';

  constructor() {
    this.loadFromStorage();
    this.setupSocketListeners();
  }

  // ==================== Configuration ====================

  getConfig(): TerminalConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<TerminalConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveToStorage();
  }

  getTheme(themeName?: string): TerminalTheme {
    const name = themeName || this.config.theme;
    if (name === 'custom' && this.config.customColors) {
      return this.config.customColors;
    }
    return TERMINAL_THEMES[name] || TERMINAL_THEMES.dark;
  }

  // ==================== Session Management ====================

  async createSession(options?: {
    name?: string;
    type?: 'local' | 'remote' | 'webcontainer';
    cwd?: string;
    env?: Record<string, string>;
    cols?: number;
    rows?: number;
  }): Promise<TerminalSession> {
    const type = options?.type || 'remote';
    
    try {
      let sessionId: string;

      if (type === 'webcontainer') {
        // WebContainer terminal
        const container = await webContainerService.boot();
        sessionId = `wc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // WebContainer doesn't provide traditional sessions
        // We'll track it locally
      } else {
        // Remote terminal via Socket.IO
        await socketService.connect();
        sessionId = await socketService.createTerminal({
          cols: options?.cols || 80,
          rows: options?.rows || 24,
        });
      }

      const session: TerminalSession = {
        id: sessionId,
        name: options?.name || `Terminal ${this.sessions.size + 1}`,
        type,
        status: 'connected',
        createdAt: Date.now(),
        lastActivity: Date.now(),
        cwd: options?.cwd,
        env: options?.env,
        shellType: this.config.defaultShell,
      };

      this.sessions.set(sessionId, session);
      this.outputBuffers.set(sessionId, []);
      this.historyIndex.set(sessionId, -1);
      this.reconnectAttempts.set(sessionId, 0);
      this.saveToStorage();

      this.callbacks.onStatusChange?.(session);

      return session;
    } catch (error) {
      throw new Error(`Failed to create terminal session: ${(error as Error).message}`);
    }
  }

  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  getActiveSessions(): TerminalSession[] {
    return this.getAllSessions().filter(s => s.status === 'connected');
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.type === 'remote') {
      socketService.killTerminal(sessionId);
    }

    session.status = 'disconnected';
    this.callbacks.onStatusChange?.(session);
    
    this.sessions.delete(sessionId);
    this.outputBuffers.delete(sessionId);
    this.historyIndex.delete(sessionId);
    this.reconnectAttempts.delete(sessionId);
    this.saveToStorage();
  }

  async renameSession(sessionId: string, name: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.name = name;
      this.callbacks.onStatusChange?.(session);
      this.saveToStorage();
    }
  }

  // ==================== Terminal I/O ====================

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'connected') return;

    if (session.type === 'remote') {
      socketService.sendTerminalInput(sessionId, data);
    } else if (session.type === 'webcontainer') {
      // WebContainer input handling
      // This would be connected to the WebContainer process stdin
    }

    session.lastActivity = Date.now();
    this.saveToStorage();
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'connected') return;

    if (session.type === 'remote') {
      socketService.resizeTerminal(sessionId, cols, rows);
    }
  }

  // Execute a command and capture output
  async executeCommand(
    sessionId: string,
    command: string
  ): Promise<{ output: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const session = this.sessions.get(sessionId);
      if (!session || session.status !== 'connected') {
        reject(new Error('Session not connected'));
        return;
      }

      const commandId = `cmd-${Date.now()}`;
      const output: string[] = [];
      let resolved = false;

      // Create unique marker for command completion
      const marker = `__CMD_DONE_${commandId}__`;
      
      // Listen for output
      const outputHandler = (data: TerminalOutput) => {
        if (data.sessionId === sessionId) {
          output.push(data.data);
          
          // Check for completion marker
          if (data.data.includes(marker)) {
            resolved = true;
            const fullOutput = output.join('');
            const exitCodeMatch = fullOutput.match(new RegExp(`${marker}:(\\d+)`));
            const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : 0;
            
            // Clean marker from output
            const cleanOutput = fullOutput.replace(new RegExp(`echo ${marker}.*`, 'g'), '').trim();
            
            resolve({ output: cleanOutput, exitCode });
          }
        }
      };

      this.callbacks.onOutput = outputHandler;

      // Send command with completion marker
      this.write(sessionId, `${command}; echo "${marker}:$?"\n`);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!resolved) {
          reject(new Error('Command execution timeout'));
        }
      }, 30000);
    });
  }

  // ==================== Command History ====================

  addToHistory(entry: Omit<CommandHistoryEntry, 'id'>): void {
    const historyEntry: CommandHistoryEntry = {
      ...entry,
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.commandHistory.push(historyEntry);

    // Keep only last 1000 commands
    if (this.commandHistory.length > 1000) {
      this.commandHistory = this.commandHistory.slice(-1000);
    }

    this.saveToStorage();
  }

  getHistory(sessionId?: string, limit = 100): CommandHistoryEntry[] {
    let history = this.commandHistory;
    
    if (sessionId) {
      history = history.filter(h => h.sessionId === sessionId);
    }

    return history.slice(-limit).reverse();
  }

  searchHistory(query: string, limit = 20): CommandHistoryEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.commandHistory
      .filter(h => h.command.toLowerCase().includes(lowerQuery))
      .slice(-limit)
      .reverse();
  }

  getPreviousCommand(sessionId: string): string | null {
    const index = this.historyIndex.get(sessionId) ?? -1;
    const sessionHistory = this.commandHistory.filter(h => h.sessionId === sessionId);
    
    if (sessionHistory.length === 0) return null;

    const newIndex = Math.min(index + 1, sessionHistory.length - 1);
    this.historyIndex.set(sessionId, newIndex);

    return sessionHistory[sessionHistory.length - 1 - newIndex]?.command || null;
  }

  getNextCommand(sessionId: string): string | null {
    const index = this.historyIndex.get(sessionId) ?? -1;
    
    if (index <= 0) {
      this.historyIndex.set(sessionId, -1);
      return '';
    }

    const sessionHistory = this.commandHistory.filter(h => h.sessionId === sessionId);
    const newIndex = index - 1;
    this.historyIndex.set(sessionId, newIndex);

    return sessionHistory[sessionHistory.length - 1 - newIndex]?.command || null;
  }

  resetHistoryIndex(sessionId: string): void {
    this.historyIndex.set(sessionId, -1);
  }

  clearHistory(): void {
    this.commandHistory = [];
    this.saveToStorage();
  }

  // ==================== Output Buffer ====================

  getOutputBuffer(sessionId: string): string[] {
    return this.outputBuffers.get(sessionId) || [];
  }

  clearOutputBuffer(sessionId: string): void {
    this.outputBuffers.set(sessionId, []);
  }

  searchOutput(sessionId: string, query: string): number[] {
    const buffer = this.outputBuffers.get(sessionId) || [];
    const indices: number[] = [];
    const lowerQuery = query.toLowerCase();

    buffer.forEach((line, index) => {
      if (line.toLowerCase().includes(lowerQuery)) {
        indices.push(index);
      }
    });

    return indices;
  }

  // ==================== Reconnection ====================

  async reconnect(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const attempts = this.reconnectAttempts.get(sessionId) || 0;
    if (attempts >= this.maxReconnectAttempts) {
      this.callbacks.onError?.(sessionId, 'Max reconnection attempts reached');
      return false;
    }

    this.reconnectAttempts.set(sessionId, attempts + 1);
    session.status = 'connecting';
    this.callbacks.onStatusChange?.(session);

    try {
      if (session.type === 'remote') {
        await socketService.connect();
        const newSessionId = await socketService.createTerminal({
          cols: 80,
          rows: 24,
        });

        // Update session with new ID
        session.id = newSessionId;
        session.status = 'connected';
        session.lastActivity = Date.now();
        
        // Re-map session
        this.sessions.delete(sessionId);
        this.sessions.set(newSessionId, session);
        
        // Move output buffer
        const buffer = this.outputBuffers.get(sessionId);
        this.outputBuffers.delete(sessionId);
        this.outputBuffers.set(newSessionId, buffer || []);

        this.reconnectAttempts.set(newSessionId, 0);
        this.callbacks.onReconnect?.(newSessionId);
        this.callbacks.onStatusChange?.(session);
        
        return true;
      }
    } catch (error) {
      session.status = 'error';
      this.callbacks.onStatusChange?.(session);
      this.callbacks.onError?.(sessionId, (error as Error).message);
    }

    return false;
  }

  // ==================== Event Callbacks ====================

  setCallbacks(callbacks: TerminalCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // ==================== Socket Listeners ====================

  private setupSocketListeners(): void {
    // Listen for terminal output
    socketService.onTerminalOutput((data) => {
      const session = this.sessions.get(data.terminalId);
      if (session) {
        session.lastActivity = Date.now();
        
        // Add to output buffer
        const buffer = this.outputBuffers.get(data.terminalId) || [];
        buffer.push(data.data);
        
        // Keep buffer size manageable
        if (buffer.length > this.config.scrollback) {
          buffer.splice(0, buffer.length - this.config.scrollback);
        }
        this.outputBuffers.set(data.terminalId, buffer);

        this.callbacks.onOutput?.({
          sessionId: data.terminalId,
          data: data.data,
          timestamp: Date.now(),
        });
      }
    });

    // Listen for terminal exit
    socketService.onTerminalExit((data) => {
      const session = this.sessions.get(data.terminalId);
      if (session) {
        session.status = 'disconnected';
        this.callbacks.onStatusChange?.(session);
        this.callbacks.onExit?.(data.terminalId, data.exitCode);
      }
    });
  }

  // ==================== Storage ====================

  private loadFromStorage(): void {
    try {
      // Load config
      const savedConfig = localStorage.getItem(this.CONFIG_KEY);
      if (savedConfig) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) };
      }

      // Load command history
      const savedHistory = localStorage.getItem(this.HISTORY_KEY);
      if (savedHistory) {
        this.commandHistory = JSON.parse(savedHistory);
      }

      // Note: We don't restore sessions on load as they need to be recreated
    } catch (error) {
      console.error('Failed to load terminal data from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.commandHistory));
      
      // Save session metadata (not the actual connections)
      const sessionMeta = Array.from(this.sessions.values()).map(s => ({
        name: s.name,
        type: s.type,
        cwd: s.cwd,
        env: s.env,
      }));
      localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessionMeta));
    } catch (error) {
      console.error('Failed to save terminal data to storage:', error);
    }
  }

  // ==================== Utilities ====================

  // Parse ANSI escape codes for plain text extraction
  stripAnsi(text: string): string {
    return text.replace(
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ''
    );
  }

  // Format output for export
  exportOutput(sessionId: string, format: 'text' | 'html' = 'text'): string {
    const buffer = this.outputBuffers.get(sessionId) || [];
    
    if (format === 'text') {
      return buffer.map(line => this.stripAnsi(line)).join('');
    }

    // HTML format with ANSI color support
    return this.ansiToHtml(buffer.join(''));
  }

  private ansiToHtml(text: string): string {
    const ansiColors: Record<number, string> = {
      30: '#000000', 31: '#ff0000', 32: '#00ff00', 33: '#ffff00',
      34: '#0000ff', 35: '#ff00ff', 36: '#00ffff', 37: '#ffffff',
      90: '#808080', 91: '#ff8080', 92: '#80ff80', 93: '#ffff80',
      94: '#8080ff', 95: '#ff80ff', 96: '#80ffff', 97: '#ffffff',
    };

    let html = text;
    
    // Basic ANSI color codes to HTML spans
    html = html.replace(/\x1b\[(\d+)m/g, (_, code) => {
      const colorCode = parseInt(code, 10);
      if (colorCode === 0) return '</span>';
      if (ansiColors[colorCode]) {
        return `<span style="color: ${ansiColors[colorCode]}">`;
      }
      return '';
    });

    return `<pre style="font-family: monospace; background: #1e1e1e; color: #fff; padding: 16px;">${html}</pre>`;
  }
}

// Export singleton instance
export const terminalService = new TerminalService();
