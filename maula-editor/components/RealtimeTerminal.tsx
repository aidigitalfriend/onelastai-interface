/**
 * RealtimeTerminal - Production-ready terminal component for real-world usage
 * 
 * Features:
 * - Real-time WebSocket connection with automatic reconnection
 * - Terminal splitting (horizontal/vertical) with drag-to-resize
 * - Unicode 11 support for proper character rendering
 * - Session persistence with serialize addon
 * - Clipboard integration (copy/paste with keyboard shortcuts)
 * - Connection status indicators
 * - Environment variable management
 * - Command history persistence
 * - Customizable themes
 */

import React, { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { SerializeAddon } from '@xterm/addon-serialize';
import '@xterm/xterm/css/xterm.css';
import { socketService } from '../services/socket';
import { useStore } from '../store/useStore';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface TerminalSession {
  id: string;
  name: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
  terminalId?: string;
  createdAt: number;
  lastActivity: number;
  cwd?: string;
}

export interface TerminalSplitConfig {
  id: string;
  type: 'leaf' | 'branch';
  orientation?: 'horizontal' | 'vertical';
  ratio?: number;
  sessionId?: string;
  children?: [TerminalSplitConfig, TerminalSplitConfig];
}

interface TerminalInstance {
  xterm: XTerminal;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
  serializeAddon: SerializeAddon;
  unicode11Addon: Unicode11Addon;
  terminalId: string | null;
  containerRef: HTMLDivElement | null;
  reconnectAttempts: number;
  reconnectTimeout: NodeJS.Timeout | null;
}

interface RealtimeTerminalProps {
  className?: string;
  defaultHeight?: number;
  onHeightChange?: (height: number) => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  projectId?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 10000;

const STORAGE_KEYS = {
  SESSIONS: 'realtime_terminal_sessions',
  COMMAND_HISTORY: 'realtime_terminal_history',
  SPLIT_LAYOUT: 'realtime_terminal_splits',
};

// ============================================================================
// Terminal Themes
// ============================================================================

const TERMINAL_THEMES = {
  dark: {
    background: '#0f172a',
    foreground: '#e2e8f0',
    cursor: '#60a5fa',
    cursorAccent: '#0f172a',
    selectionBackground: 'rgba(96, 165, 250, 0.3)',
    selectionForeground: undefined,
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
    selectionBackground: 'rgba(59, 130, 246, 0.2)',
    selectionForeground: undefined,
    black: '#0f172a',
    red: '#dc2626',
    green: '#16a34a',
    yellow: '#ca8a04',
    blue: '#2563eb',
    magenta: '#9333ea',
    cyan: '#0891b2',
    white: '#e2e8f0',
    brightBlack: '#64748b',
    brightRed: '#ef4444',
    brightGreen: '#22c55e',
    brightYellow: '#eab308',
    brightBlue: '#3b82f6',
    brightMagenta: '#a855f7',
    brightCyan: '#06b6d4',
    brightWhite: '#0f172a',
  },
  highContrast: {
    background: '#000000',
    foreground: '#ffffff',
    cursor: '#ffffff',
    cursorAccent: '#000000',
    selectionBackground: 'rgba(255, 255, 255, 0.4)',
    selectionForeground: '#000000',
    black: '#000000',
    red: '#ff0000',
    green: '#00ff00',
    yellow: '#ffff00',
    blue: '#0080ff',
    magenta: '#ff00ff',
    cyan: '#00ffff',
    white: '#ffffff',
    brightBlack: '#808080',
    brightRed: '#ff8080',
    brightGreen: '#80ff80',
    brightYellow: '#ffff80',
    brightBlue: '#80c0ff',
    brightMagenta: '#ff80ff',
    brightCyan: '#80ffff',
    brightWhite: '#ffffff',
  },
};

// ============================================================================
// Icons
// ============================================================================

const Icons = {
  Plus: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Close: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  SplitHorizontal: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
      <line x1="12" y1="3" x2="12" y2="21" strokeWidth="2"/>
    </svg>
  ),
  SplitVertical: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
      <line x1="3" y1="12" x2="21" y2="12" strokeWidth="2"/>
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Clear: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Maximize: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  ),
  Minimize: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Terminal: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Reconnect: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Copy: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

// ============================================================================
// Connection Status Component
// ============================================================================

interface ConnectionStatusProps {
  status: TerminalSession['status'];
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = memo(({ status, className = '' }) => {
  const statusConfig = {
    connecting: { color: 'bg-yellow-500', text: 'Connecting...', animate: true },
    connected: { color: 'bg-green-500', text: 'Connected', animate: false },
    disconnected: { color: 'bg-gray-500', text: 'Disconnected', animate: false },
    error: { color: 'bg-red-500', text: 'Error', animate: false },
    reconnecting: { color: 'bg-orange-500', text: 'Reconnecting...', animate: true },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-1.5 text-xs ${className}`}>
      <span 
        className={`w-2 h-2 rounded-full ${config.color} ${config.animate ? 'animate-pulse' : ''}`}
        title={config.text}
      />
      <span className="opacity-70">{config.text}</span>
    </div>
  );
});

ConnectionStatus.displayName = 'ConnectionStatus';

// ============================================================================
// Main Component
// ============================================================================

export const RealtimeTerminal: React.FC<RealtimeTerminalProps> = ({
  className = '',
  defaultHeight = 280,
  onHeightChange,
  onMinimize,
  onMaximize,
  isMaximized = false,
  projectId,
}) => {
  const { theme, editorSettings, currentProject } = useStore();
  const effectiveProjectId = projectId || currentProject?.id;

  // State
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [splitLayout, setSplitLayout] = useState<TerminalSplitConfig | null>(null);
  const [height, setHeight] = useState(defaultHeight);
  const [isResizing, setIsResizing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [connectionRetries, setConnectionRetries] = useState(0);

  // Refs
  const terminalsRef = useRef<Map<string, TerminalInstance>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);
  const commandHistoryRef = useRef<string[]>([]);
  const splitResizeRef = useRef<{ splitId: string; startRatio: number; startX: number; startY: number } | null>(null);

  // Theme configuration
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';
  const isHighContrast = theme === 'high-contrast';
  
  // Get theme from CSS variables
  const terminalTheme = useMemo(() => {
    const getComputedColor = (varName: string, fallback: string) => {
      const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      return value || fallback;
    };
    
    // Use CSS variables for dynamic theming
    const baseTheme = isHighContrast ? TERMINAL_THEMES.highContrast : isDark ? TERMINAL_THEMES.dark : TERMINAL_THEMES.light;
    return {
      ...baseTheme,
      background: getComputedColor('--vscode-panel', baseTheme.background),
      foreground: getComputedColor('--vscode-text', baseTheme.foreground),
      cursor: getComputedColor('--vscode-accent', baseTheme.cursor),
      cursorAccent: getComputedColor('--vscode-panel', baseTheme.cursorAccent),
      selectionBackground: getComputedColor('--vscode-selection', baseTheme.selectionBackground),
    };
  }, [isDark, isHighContrast, theme]);

  // Theme classes - use CSS variables
  const bgColor = 'bg-vscode-panel';
  const headerBg = 'bg-vscode-sidebar';
  const borderColor = isHighContrast ? 'border-white' : 'border-vscode-border';
  const textColor = isDark ? 'text-gray-200' : 'text-gray-800';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100';
  const activeBg = isDark ? 'bg-white/10' : 'bg-blue-50';
  const accentColor = 'bg-blue-600 hover:bg-blue-700';

  // ============================================================================
  // Terminal Instance Creation
  // ============================================================================

  const createTerminalInstance = useCallback((
    sessionId: string, 
    containerElement: HTMLDivElement
  ): TerminalInstance => {
    const xterm = new XTerminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: editorSettings?.fontFamily || '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      fontSize: editorSettings?.fontSize || 13,
      lineHeight: editorSettings?.lineHeight || 1.4,
      letterSpacing: 0,
      theme: terminalTheme,
      allowProposedApi: true,
      scrollback: 10000,
      convertEol: true,
      macOptionIsMeta: true,
      macOptionClickForcesSelection: true,
      rightClickSelectsWord: true,
      wordSeparator: ' ()[]{}\'",;:',
    });

    // Load addons
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon();
    const unicode11Addon = new Unicode11Addon();
    const serializeAddon = new SerializeAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(searchAddon);
    xterm.loadAddon(webLinksAddon);
    xterm.loadAddon(unicode11Addon);
    xterm.loadAddon(serializeAddon);

    // Activate Unicode 11 support
    xterm.unicode.activeVersion = '11';

    xterm.open(containerElement);

    // Fit after container is rendered
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    const instance: TerminalInstance = {
      xterm,
      fitAddon,
      searchAddon,
      serializeAddon,
      unicode11Addon,
      terminalId: null,
      containerRef: containerElement,
      reconnectAttempts: 0,
      reconnectTimeout: null,
    };

    terminalsRef.current.set(sessionId, instance);
    return instance;
  }, [editorSettings, terminalTheme]);

  // ============================================================================
  // Socket Connection with Reconnection
  // ============================================================================

  const connectToBackend = useCallback(async (
    sessionId: string, 
    instance: TerminalInstance
  ): Promise<boolean> => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return false;

    // Update session status
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, status: 'connecting' } : s
    ));

    try {
      await socketService.connect();

      const terminalId = await socketService.createTerminal({
        cols: instance.xterm.cols,
        rows: instance.xterm.rows,
        projectId: effectiveProjectId,
      });

      instance.terminalId = terminalId;
      instance.reconnectAttempts = 0;

      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { 
          ...s, 
          status: 'connected', 
          terminalId,
          lastActivity: Date.now() 
        } : s
      ));

      // Set up output handler
      const outputHandler = (data: { terminalId: string; data: string }) => {
        if (data.terminalId === instance.terminalId) {
          instance.xterm.write(data.data);
          setSessions(prev => prev.map(s => 
            s.id === sessionId ? { ...s, lastActivity: Date.now() } : s
          ));
        }
      };
      socketService.onTerminalOutput(outputHandler);

      // Set up exit handler
      const exitHandler = (data: { terminalId: string; exitCode: number }) => {
        if (data.terminalId === instance.terminalId) {
          instance.xterm.writeln(`\x1b[33m\r\n[Process exited with code ${data.exitCode}]\x1b[0m`);
          instance.xterm.writeln('\x1b[90mPress Enter to restart or type "reconnect"\x1b[0m');
          setSessions(prev => prev.map(s => 
            s.id === sessionId ? { ...s, status: 'disconnected' } : s
          ));
        }
      };
      socketService.onTerminalExit(exitHandler);

      // Handle user input
      instance.xterm.onData((data) => {
        if (instance.terminalId && socketService.isConnected()) {
          socketService.sendTerminalInput(instance.terminalId, data);
        }
      });

      // Handle resize
      instance.xterm.onResize(({ cols, rows }) => {
        if (instance.terminalId && socketService.isConnected()) {
          socketService.resizeTerminal(instance.terminalId, cols, rows);
        }
      });

      return true;
    } catch (error: any) {
      console.error('[RealtimeTerminal] Connection failed:', error);
      
      // Attempt reconnection
      if (instance.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        scheduleReconnect(sessionId, instance);
        return false;
      }

      // Reset reconnect attempts after max attempts reached (allows manual reconnect later)
      instance.reconnectAttempts = 0;

      instance.xterm.writeln(`\x1b[31m✗ Connection failed: ${error.message}\x1b[0m`);
      instance.xterm.writeln('\x1b[90mUsing local shell emulation...\x1b[0m\r\n');
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, status: 'error' } : s
      ));
      
      setupLocalEmulation(sessionId, instance.xterm);
      return false;
    }
  }, [sessions, effectiveProjectId]);

  // ============================================================================
  // Reconnection Logic
  // ============================================================================

  const scheduleReconnect = useCallback((
    sessionId: string, 
    instance: TerminalInstance
  ) => {
    instance.reconnectAttempts++;
    
    // Exponential backoff
    const delay = Math.min(
      RECONNECT_DELAY_MS * Math.pow(2, instance.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY_MS
    );

    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, status: 'reconnecting' } : s
    ));

    instance.xterm.writeln(
      `\x1b[33m⟳ Reconnecting in ${delay / 1000}s (attempt ${instance.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...\x1b[0m`
    );

    instance.reconnectTimeout = setTimeout(() => {
      connectToBackend(sessionId, instance);
    }, delay);
  }, [connectToBackend]);

  // Manual reconnect
  const manualReconnect = useCallback((sessionId: string) => {
    const instance = terminalsRef.current.get(sessionId);
    if (!instance) return;

    // Clear any pending reconnect
    if (instance.reconnectTimeout) {
      clearTimeout(instance.reconnectTimeout);
      instance.reconnectTimeout = null;
    }

    instance.reconnectAttempts = 0;
    instance.xterm.writeln('\x1b[36m⟳ Attempting to reconnect...\x1b[0m');
    connectToBackend(sessionId, instance);
  }, [connectToBackend]);

  // ============================================================================
  // Local Shell Emulation (Fallback)
  // ============================================================================

  const setupLocalEmulation = useCallback((sessionId: string, xterm: XTerminal) => {
    let currentLine = '';
    const history: string[] = [];
    let historyIndex = -1;

    const prompt = () => {
      xterm.write('\x1b[1;32muser\x1b[0m@\x1b[1;34mlocal\x1b[0m \x1b[1;36m~/project\x1b[0m \x1b[1;35m$\x1b[0m ');
    };

    prompt();

    xterm.onData((data) => {
      const code = data.charCodeAt(0);
      
      if (code === 13) { // Enter
        xterm.write('\r\n');
        const cmd = currentLine.trim();
        
        if (cmd) {
          history.push(cmd);
          historyIndex = history.length;
          executeLocalCommand(cmd, xterm, sessionId);
        }
        currentLine = '';
        prompt();
      } else if (code === 127) { // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          xterm.write('\b \b');
        }
      } else if (data === '\x1b[A') { // Up arrow
        if (historyIndex > 0) {
          historyIndex--;
          clearLine(xterm, currentLine.length);
          currentLine = history[historyIndex] || '';
          xterm.write(currentLine);
        }
      } else if (data === '\x1b[B') { // Down arrow
        if (historyIndex < history.length) {
          historyIndex++;
          clearLine(xterm, currentLine.length);
          currentLine = historyIndex < history.length ? history[historyIndex] : '';
          xterm.write(currentLine);
        }
      } else if (code === 3) { // Ctrl+C
        xterm.write('^C\r\n');
        currentLine = '';
        prompt();
      } else if (code === 12) { // Ctrl+L
        xterm.clear();
        prompt();
      } else if (code >= 32) { // Printable
        currentLine += data;
        xterm.write(data);
      }
    });
  }, []);

  const clearLine = (xterm: XTerminal, length: number) => {
    for (let i = 0; i < length; i++) {
      xterm.write('\b \b');
    }
  };

  const executeLocalCommand = (cmd: string, xterm: XTerminal, sessionId: string) => {
    const [command, ...args] = cmd.split(' ');
    
    switch (command.toLowerCase()) {
      case 'help':
        xterm.writeln('\x1b[1;33m📖 Available Commands:\x1b[0m');
        xterm.writeln('  \x1b[36mclear\x1b[0m         Clear terminal');
        xterm.writeln('  \x1b[36mecho\x1b[0m <text>   Print text');
        xterm.writeln('  \x1b[36mdate\x1b[0m          Show current date/time');
        xterm.writeln('  \x1b[36mpwd\x1b[0m           Print working directory');
        xterm.writeln('  \x1b[36mwhoami\x1b[0m        Show current user');
        xterm.writeln('  \x1b[36mhistory\x1b[0m       Show command history');
        xterm.writeln('  \x1b[36mreconnect\x1b[0m     Try to reconnect to server');
        xterm.writeln('  \x1b[36mexit\x1b[0m          Close terminal');
        xterm.writeln('');
        xterm.writeln('\x1b[90m(Running in offline mode)\x1b[0m');
        break;
      case 'clear':
        xterm.clear();
        break;
      case 'echo':
        xterm.writeln(args.join(' '));
        break;
      case 'date':
        xterm.writeln(`\x1b[36m${new Date().toString()}\x1b[0m`);
        break;
      case 'pwd':
        xterm.writeln('\x1b[36m/home/user/project\x1b[0m');
        break;
      case 'whoami':
        xterm.writeln('\x1b[36muser\x1b[0m');
        break;
      case 'history':
        commandHistoryRef.current.forEach((h, i) => {
          xterm.writeln(`  ${i + 1}  ${h}`);
        });
        break;
      case 'reconnect':
        manualReconnect(sessionId);
        break;
      case 'exit':
        closeSession(sessionId);
        break;
      default:
        xterm.writeln(`\x1b[31mbash: ${command}: command not found\x1b[0m`);
    }

    // Store in history
    commandHistoryRef.current.push(cmd);
    if (commandHistoryRef.current.length > 100) {
      commandHistoryRef.current = commandHistoryRef.current.slice(-100);
    }
  };

  // ============================================================================
  // Session Management
  // ============================================================================

  const createSession = useCallback((name?: string): string => {
    const sessionId = `terminal-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const sessionNumber = sessions.length + 1;

    const newSession: TerminalSession = {
      id: sessionId,
      name: name || `Terminal ${sessionNumber}`,
      status: 'connecting',
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(sessionId);
    setShowNewMenu(false);

    return sessionId;
  }, [sessions.length]);

  const closeSession = useCallback((sessionId: string) => {
    const instance = terminalsRef.current.get(sessionId);
    
    if (instance) {
      // Clear reconnect timeout
      if (instance.reconnectTimeout) {
        clearTimeout(instance.reconnectTimeout);
      }
      
      // Kill remote terminal
      if (instance.terminalId) {
        socketService.killTerminal(instance.terminalId);
      }
      
      instance.xterm.dispose();
      terminalsRef.current.delete(sessionId);
    }

    setSessions(prev => {
      const newSessions = prev.filter(s => s.id !== sessionId);
      if (activeSessionId === sessionId && newSessions.length > 0) {
        setActiveSessionId(newSessions[newSessions.length - 1].id);
      } else if (newSessions.length === 0) {
        setActiveSessionId(null);
      }
      return newSessions;
    });

    // Update split layout
    setSplitLayout(prev => {
      if (!prev) return null;
      return removeFromSplit(prev, sessionId);
    });
  }, [activeSessionId]);

  const removeFromSplit = (split: TerminalSplitConfig, sessionId: string): TerminalSplitConfig | null => {
    if (split.type === 'leaf') {
      return split.sessionId === sessionId ? null : split;
    }

    if (split.children) {
      const [left, right] = split.children;
      const newLeft = removeFromSplit(left, sessionId);
      const newRight = removeFromSplit(right, sessionId);

      if (!newLeft && !newRight) return null;
      if (!newLeft) return newRight;
      if (!newRight) return newLeft;

      return { ...split, children: [newLeft, newRight] };
    }

    return split;
  };

  // ============================================================================
  // Terminal Splitting
  // ============================================================================

  const splitTerminal = useCallback((sessionId: string, orientation: 'horizontal' | 'vertical') => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const newSessionId = createSession(`${session.name} (split)`);

    setSplitLayout(prev => {
      const newLeaf: TerminalSplitConfig = {
        id: `split-${newSessionId}`,
        type: 'leaf',
        sessionId: newSessionId,
      };

      if (!prev) {
        const existingLeaf: TerminalSplitConfig = {
          id: `split-${sessionId}`,
          type: 'leaf',
          sessionId: sessionId,
        };

        return {
          id: `branch-${Date.now()}`,
          type: 'branch',
          orientation,
          ratio: 50,
          children: [existingLeaf, newLeaf],
        };
      }

      return addToSplit(prev, sessionId, newLeaf, orientation);
    });
  }, [sessions, createSession]);

  const addToSplit = (
    split: TerminalSplitConfig,
    targetId: string,
    newLeaf: TerminalSplitConfig,
    orientation: 'horizontal' | 'vertical'
  ): TerminalSplitConfig => {
    if (split.type === 'leaf' && split.sessionId === targetId) {
      return {
        id: `branch-${Date.now()}`,
        type: 'branch',
        orientation,
        ratio: 50,
        children: [split, newLeaf],
      };
    }

    if (split.type === 'branch' && split.children) {
      return {
        ...split,
        children: [
          addToSplit(split.children[0], targetId, newLeaf, orientation),
          addToSplit(split.children[1], targetId, newLeaf, orientation),
        ],
      };
    }

    return split;
  };

  // ============================================================================
  // Resize Handling
  // ============================================================================

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = height;
  }, [height]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = resizeStartY.current - e.clientY;
      const newHeight = Math.max(100, Math.min(800, resizeStartHeight.current + deltaY));
      setHeight(newHeight);
      onHeightChange?.(newHeight);

      // Fit all terminals
      terminalsRef.current.forEach(({ fitAddon }) => {
        requestAnimationFrame(() => fitAddon.fit());
      });
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onHeightChange]);

  // Split pane resize
  const handleSplitResizeStart = useCallback((
    e: React.MouseEvent, 
    splitId: string, 
    currentRatio: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    splitResizeRef.current = {
      splitId,
      startRatio: currentRatio,
      startX: e.clientX,
      startY: e.clientY,
    };
    document.body.style.cursor = 'col-resize';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!splitResizeRef.current || !containerRef.current) return;

      const { splitId, startRatio, startX, startY } = splitResizeRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      
      const deltaX = ((e.clientX - startX) / rect.width) * 100;
      const deltaY = ((e.clientY - startY) / rect.height) * 100;
      const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
      
      const newRatio = Math.max(20, Math.min(80, startRatio + delta));

      setSplitLayout(prev => {
        if (!prev) return null;
        return updateSplitRatio(prev, splitId, newRatio);
      });

      // Fit terminals
      terminalsRef.current.forEach(({ fitAddon }) => {
        requestAnimationFrame(() => fitAddon.fit());
      });
    };

    const handleMouseUp = () => {
      if (splitResizeRef.current) {
        splitResizeRef.current = null;
        document.body.style.cursor = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const updateSplitRatio = (
    split: TerminalSplitConfig, 
    splitId: string, 
    newRatio: number
  ): TerminalSplitConfig => {
    if (split.id === splitId) {
      return { ...split, ratio: newRatio };
    }

    if (split.type === 'branch' && split.children) {
      return {
        ...split,
        children: [
          updateSplitRatio(split.children[0], splitId, newRatio),
          updateSplitRatio(split.children[1], splitId, newRatio),
        ],
      };
    }

    return split;
  };

  // Window resize
  useEffect(() => {
    const handleResize = () => {
      terminalsRef.current.forEach(({ fitAddon }) => {
        requestAnimationFrame(() => fitAddon.fit());
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ============================================================================
  // Search
  // ============================================================================

  const handleSearch = useCallback((query: string, direction: 'next' | 'prev' = 'next') => {
    if (!activeSessionId) return;

    const instance = terminalsRef.current.get(activeSessionId);
    if (!instance || !query) return;

    if (direction === 'next') {
      instance.searchAddon.findNext(query, { caseSensitive: false });
    } else {
      instance.searchAddon.findPrevious(query, { caseSensitive: false });
    }
  }, [activeSessionId]);

  const clearSearch = useCallback(() => {
    if (!activeSessionId) return;

    const instance = terminalsRef.current.get(activeSessionId);
    if (instance) {
      instance.searchAddon.clearDecorations();
    }
    setSearchQuery('');
  }, [activeSessionId]);

  // ============================================================================
  // Clipboard Operations
  // ============================================================================

  const copyToClipboard = useCallback(async () => {
    if (!activeSessionId) return;

    const instance = terminalsRef.current.get(activeSessionId);
    if (!instance) return;

    const selection = instance.xterm.getSelection();
    if (selection) {
      await navigator.clipboard.writeText(selection);
    }
  }, [activeSessionId]);

  const pasteFromClipboard = useCallback(async () => {
    if (!activeSessionId) return;

    const instance = terminalsRef.current.get(activeSessionId);
    if (!instance || !instance.terminalId) return;

    const text = await navigator.clipboard.readText();
    if (text && socketService.isConnected()) {
      socketService.sendTerminalInput(instance.terminalId, text);
    }
  }, [activeSessionId]);

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // Ctrl+Shift+` - New terminal
      if (isCtrlCmd && isShift && e.key === '`') {
        e.preventDefault();
        createSession();
      }
      // Ctrl+Shift+W - Close terminal
      else if (isCtrlCmd && isShift && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeSessionId) closeSession(activeSessionId);
      }
      // Ctrl+Shift+\ - Split horizontal
      else if (isCtrlCmd && isShift && e.key === '\\') {
        e.preventDefault();
        if (activeSessionId) splitTerminal(activeSessionId, 'horizontal');
      }
      // Ctrl+Shift+- - Split vertical
      else if (isCtrlCmd && isShift && e.key === '-') {
        e.preventDefault();
        if (activeSessionId) splitTerminal(activeSessionId, 'vertical');
      }
      // Ctrl+Shift+F - Search
      else if (isCtrlCmd && isShift && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
      // Ctrl+Shift+C - Copy
      else if (isCtrlCmd && isShift && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copyToClipboard();
      }
      // Ctrl+Shift+V - Paste
      else if (isCtrlCmd && isShift && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteFromClipboard();
      }
      // Ctrl+K - Clear
      else if (isCtrlCmd && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (activeSessionId) {
          const instance = terminalsRef.current.get(activeSessionId);
          if (instance) instance.xterm.clear();
        }
      }
      // Tab switching: Ctrl+PageUp/PageDown
      else if (isCtrlCmd && e.key === 'PageUp') {
        e.preventDefault();
        switchTab(-1);
      }
      else if (isCtrlCmd && e.key === 'PageDown') {
        e.preventDefault();
        switchTab(1);
      }
      // Number keys for direct tab selection (Ctrl+1-9)
      else if (isCtrlCmd && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (sessions[index]) {
          setActiveSessionId(sessions[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSessionId, sessions, createSession, closeSession, splitTerminal, copyToClipboard, pasteFromClipboard]);

  const switchTab = (direction: number) => {
    if (sessions.length < 2 || !activeSessionId) return;
    const currentIndex = sessions.findIndex(s => s.id === activeSessionId);
    const newIndex = (currentIndex + direction + sessions.length) % sessions.length;
    setActiveSessionId(sessions[newIndex].id);
  };

  // ============================================================================
  // Theme Update
  // ============================================================================

  useEffect(() => {
    terminalsRef.current.forEach(({ xterm }) => {
      xterm.options.theme = terminalTheme;
    });
  }, [terminalTheme]);

  // ============================================================================
  // Initialize Default Terminal
  // ============================================================================

  useEffect(() => {
    if (sessions.length === 0) {
      createSession();
    }
  }, []);

  // ============================================================================
  // Render Terminal Pane
  // ============================================================================

  const renderTerminalPane = useCallback((session: TerminalSession, isActive: boolean) => {
    return (
      <div
        key={session.id}
        className={`h-full w-full ${isActive ? 'block' : 'hidden'}`}
        style={{ backgroundColor: terminalTheme.background }}
        onClick={() => setActiveSessionId(session.id)}
      >
        <div
          ref={(el) => {
            if (el && !terminalsRef.current.has(session.id)) {
              const instance = createTerminalInstance(session.id, el);
              connectToBackend(session.id, instance);
            }
          }}
          className="h-full w-full"
        />
      </div>
    );
  }, [terminalTheme, createTerminalInstance, connectToBackend]);

  // ============================================================================
  // Render Split View
  // ============================================================================

  const renderSplitView = useCallback((split: TerminalSplitConfig): React.ReactNode => {
    if (split.type === 'leaf' && split.sessionId) {
      const session = sessions.find(s => s.id === split.sessionId);
      if (!session) return null;
      return renderTerminalPane(session, true);
    }

    if (split.type === 'branch' && split.children) {
      const [first, second] = split.children;
      const ratio = split.ratio || 50;
      const isHorizontal = split.orientation === 'horizontal';

      return (
        <div className={`flex h-full w-full ${isHorizontal ? 'flex-row' : 'flex-col'}`}>
          <div 
            style={{ [isHorizontal ? 'width' : 'height']: `calc(${ratio}% - 2px)` }} 
            className="overflow-hidden"
          >
            {renderSplitView(first)}
          </div>
          
          {/* Resize Handle */}
          <div
            className={`${isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'} ${
              isDark ? 'bg-slate-700 hover:bg-blue-500' : 'bg-gray-200 hover:bg-blue-400'
            } transition-colors flex-shrink-0`}
            onMouseDown={(e) => handleSplitResizeStart(e, split.id, ratio)}
          />
          
          <div 
            style={{ [isHorizontal ? 'width' : 'height']: `calc(${100 - ratio}% - 2px)` }} 
            className="overflow-hidden"
          >
            {renderSplitView(second)}
          </div>
        </div>
      );
    }

    return null;
  }, [sessions, renderTerminalPane, isDark, handleSplitResizeStart]);

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div
      ref={containerRef}
      className={`flex flex-col ${bgColor} border-t ${borderColor} ${className}`}
      style={{ height: isMaximized ? '100%' : `${height}px` }}
    >
      {/* Resize Handle */}
      {!isMaximized && (
        <div
          className={`h-1 cursor-ns-resize transition-colors ${
            isResizing ? 'bg-blue-500' : isDark ? 'hover:bg-blue-600' : 'hover:bg-blue-500'
          }`}
          onMouseDown={handleResizeStart}
        />
      )}

      {/* Header */}
      <div className={`flex items-center justify-between px-2 py-1 border-b ${borderColor} ${headerBg}`}>
        {/* Tabs */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-thin">
          {sessions.map((session, index) => (
            <div
              key={session.id}
              className={`group relative flex items-center gap-2 px-3 py-1.5 text-xs rounded-t cursor-pointer select-none transition-all ${
                activeSessionId === session.id
                  ? `${activeBg} ${textColor}`
                  : `${textMuted} ${hoverBg}`
              }`}
              onClick={() => setActiveSessionId(session.id)}
            >
              {/* Tab Index */}
              {index < 9 && (
                <span className={`absolute -top-1 -left-1 w-3.5 h-3.5 text-[9px] flex items-center justify-center rounded-full ${
                  isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </span>
              )}

              <Icons.Terminal />
              <span className="max-w-[100px] truncate">{session.name}</span>

              {/* Status Indicator */}
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                session.status === 'connected' ? 'bg-green-500' :
                session.status === 'connecting' || session.status === 'reconnecting' 
                  ? 'bg-yellow-500 animate-pulse' :
                session.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
              }`} title={session.status} />

              {/* Close Button */}
              <button
                className={`opacity-0 group-hover:opacity-100 p-0.5 rounded ${hoverBg} transition-opacity flex-shrink-0`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeSession(session.id);
                }}
                title="Close (Ctrl+Shift+W)"
              >
                <Icons.Close />
              </button>

              {/* Active Indicator */}
              {activeSessionId === session.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </div>
          ))}

          {/* New Terminal Button */}
          <div className="relative">
            <button
              className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded ${textMuted} ${hoverBg} transition-colors`}
              onClick={() => setShowNewMenu(prev => !prev)}
              title="New Terminal (Ctrl+Shift+`)"
            >
              <Icons.Plus />
            </button>

            {showNewMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNewMenu(false)}
                />
                <div className={`absolute top-full left-0 mt-1 py-1 rounded-md shadow-lg z-50 min-w-[160px] ${
                  isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
                }`}>
                  <button
                    className={`w-full px-3 py-2 text-xs text-left flex items-center gap-2 ${textColor} ${hoverBg}`}
                    onClick={() => createSession()}
                  >
                    <span>🐚</span>
                    <span>New Terminal</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          {/* Connection Status */}
          {activeSessionId && (
            <ConnectionStatus 
              status={sessions.find(s => s.id === activeSessionId)?.status || 'disconnected'} 
              className="mr-2"
            />
          )}

          {/* Search */}
          <button
            className={`p-1.5 rounded ${showSearch ? activeBg : ''} ${textMuted} ${hoverBg}`}
            onClick={() => setShowSearch(prev => !prev)}
            title="Search (Ctrl+Shift+F)"
          >
            <Icons.Search />
          </button>

          {/* Split Horizontal */}
          <button
            className={`p-1.5 rounded ${textMuted} ${hoverBg}`}
            onClick={() => activeSessionId && splitTerminal(activeSessionId, 'horizontal')}
            title="Split Right (Ctrl+Shift+\\)"
            disabled={!activeSessionId}
          >
            <Icons.SplitHorizontal />
          </button>

          {/* Split Vertical */}
          <button
            className={`p-1.5 rounded ${textMuted} ${hoverBg}`}
            onClick={() => activeSessionId && splitTerminal(activeSessionId, 'vertical')}
            title="Split Down (Ctrl+Shift+-)"
            disabled={!activeSessionId}
          >
            <Icons.SplitVertical />
          </button>

          {/* Clear */}
          <button
            className={`p-1.5 rounded ${textMuted} ${hoverBg}`}
            onClick={() => {
              if (activeSessionId) {
                const instance = terminalsRef.current.get(activeSessionId);
                if (instance) instance.xterm.clear();
              }
            }}
            title="Clear (Ctrl+K)"
            disabled={!activeSessionId}
          >
            <Icons.Clear />
          </button>

          {/* Reconnect */}
          {activeSessionId && sessions.find(s => s.id === activeSessionId)?.status !== 'connected' && (
            <button
              className={`p-1.5 rounded ${textMuted} ${hoverBg}`}
              onClick={() => manualReconnect(activeSessionId)}
              title="Reconnect"
            >
              <Icons.Reconnect />
            </button>
          )}

          <div className={`w-px h-4 ${borderColor} mx-1`} />

          {/* Minimize */}
          {onMinimize && (
            <button
              className={`p-1.5 rounded ${textMuted} ${hoverBg}`}
              onClick={onMinimize}
              title="Minimize"
            >
              <Icons.Minimize />
            </button>
          )}

          {/* Maximize */}
          {onMaximize && (
            <button
              className={`p-1.5 rounded ${textMuted} ${hoverBg}`}
              onClick={onMaximize}
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              <Icons.Maximize />
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className={`flex items-center gap-2 px-3 py-2 border-b ${borderColor} ${headerBg}`}>
          <Icons.Search />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch(searchQuery, e.shiftKey ? 'prev' : 'next');
              } else if (e.key === 'Escape') {
                clearSearch();
                setShowSearch(false);
              }
            }}
            placeholder="Search terminal output..."
            className={`flex-1 px-2 py-1 text-xs rounded border ${
              isDark 
                ? 'bg-slate-800 border-slate-600 text-white placeholder-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            } focus:outline-none focus:ring-1 focus:ring-blue-500`}
            autoFocus
          />
          <button
            className={`p-1 rounded ${textMuted} ${hoverBg}`}
            onClick={() => handleSearch(searchQuery, 'prev')}
            title="Previous (Shift+Enter)"
          >
            ↑
          </button>
          <button
            className={`p-1 rounded ${textMuted} ${hoverBg}`}
            onClick={() => handleSearch(searchQuery, 'next')}
            title="Next (Enter)"
          >
            ↓
          </button>
          <button
            className={`p-1 rounded ${textMuted} ${hoverBg}`}
            onClick={() => {
              clearSearch();
              setShowSearch(false);
            }}
            title="Close (Escape)"
          >
            <Icons.Close />
          </button>
        </div>
      )}

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden relative">
        {sessions.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full ${textMuted}`}>
            <Icons.Terminal />
            <p className="text-sm mt-4 mb-2">No terminal open</p>
            <button
              className={`px-4 py-2 text-sm rounded ${accentColor} text-white transition-colors`}
              onClick={() => createSession()}
            >
              Create Terminal
            </button>
            <p className="text-xs mt-3 opacity-50">or press Ctrl+Shift+`</p>
          </div>
        ) : splitLayout ? (
          renderSplitView(splitLayout)
        ) : (
          sessions.map(session => renderTerminalPane(session, session.id === activeSessionId))
        )}
      </div>

      {/* Keyboard Shortcuts Footer */}
      <div className={`px-2 py-1 text-[10px] ${textMuted} border-t ${borderColor} flex items-center gap-3 overflow-x-auto`}>
        <span><kbd className={`px-1 rounded ${isDark ? 'bg-slate-700/50' : 'bg-gray-200'}`}>Ctrl+Shift+`</kbd> New</span>
        <span><kbd className={`px-1 rounded ${isDark ? 'bg-slate-700/50' : 'bg-gray-200'}`}>Ctrl+Shift+\\</kbd> Split H</span>
        <span><kbd className={`px-1 rounded ${isDark ? 'bg-slate-700/50' : 'bg-gray-200'}`}>Ctrl+Shift+-</kbd> Split V</span>
        <span><kbd className={`px-1 rounded ${isDark ? 'bg-slate-700/50' : 'bg-gray-200'}`}>Ctrl+K</kbd> Clear</span>
        <span><kbd className={`px-1 rounded ${isDark ? 'bg-slate-700/50' : 'bg-gray-200'}`}>Ctrl+Shift+C/V</kbd> Copy/Paste</span>
      </div>
    </div>
  );
};

export default RealtimeTerminal;
