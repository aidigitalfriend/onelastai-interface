import React, { useEffect, useRef, useState, useCallback, useMemo, createContext, useContext } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { socketService } from '../services/socket';
import { useStore } from '../store/useStore';
import { isDarkTheme } from '../utils/theme';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ShellType = 'bash' | 'zsh' | 'sh' | 'powershell' | 'cmd' | 'fish';

export interface TerminalTab {
  id: string;
  name: string;
  shellType: ShellType;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  terminalId?: string;
  cwd?: string;
  profile?: string;
}

export interface TerminalSplit {
  id: string;
  type: 'leaf' | 'branch';
  orientation?: 'horizontal' | 'vertical';
  ratio?: number;
  terminalId?: string;
  children?: [TerminalSplit, TerminalSplit];
}

export interface TerminalGroup {
  id: string;
  name: string;
  tabs: TerminalTab[];
  activeTabId: string | null;
  splitLayout: TerminalSplit | null;
}

export interface TerminalInstance {
  xterm: XTerminal;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
  terminalId: string | null;
  containerRef: HTMLDivElement | null;
}

interface IntegratedTerminalProps {
  className?: string;
  defaultHeight?: number;
  onHeightChange?: (height: number) => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  hideHeader?: boolean;
}

// ============================================================================
// Shell Configuration
// ============================================================================

const SHELL_CONFIG: Record<ShellType, { 
  icon: string; 
  label: string; 
  command: string;
  args?: string[];
  env?: Record<string, string>;
}> = {
  bash: { 
    icon: '🐚', 
    label: 'Bash', 
    command: '/bin/bash',
    args: ['--login'],
  },
  zsh: { 
    icon: '⚡', 
    label: 'Zsh', 
    command: '/bin/zsh',
    args: ['--login'],
  },
  sh: { 
    icon: '💲', 
    label: 'Shell', 
    command: '/bin/sh',
  },
  powershell: { 
    icon: '🔵', 
    label: 'PowerShell', 
    command: 'pwsh',
    args: ['-NoLogo'],
  },
  cmd: { 
    icon: '⬛', 
    label: 'CMD', 
    command: 'cmd.exe',
  },
  fish: { 
    icon: '🐟', 
    label: 'Fish', 
    command: '/usr/bin/fish',
  },
};

// ============================================================================
// Keyboard Shortcuts Configuration
// ============================================================================

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: string;
  description: string;
}

const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: '`', ctrlKey: true, shiftKey: true, action: 'newTerminal', description: 'New Terminal' },
  { key: 'w', ctrlKey: true, shiftKey: true, action: 'closeTerminal', description: 'Close Terminal' },
  { key: '\\', ctrlKey: true, shiftKey: true, action: 'splitHorizontal', description: 'Split Horizontal' },
  { key: '-', ctrlKey: true, shiftKey: true, action: 'splitVertical', description: 'Split Vertical' },
  { key: 'PageUp', ctrlKey: true, action: 'previousTab', description: 'Previous Tab' },
  { key: 'PageDown', ctrlKey: true, action: 'nextTab', description: 'Next Tab' },
  { key: 'f', ctrlKey: true, shiftKey: true, action: 'search', description: 'Search in Terminal' },
  { key: 'c', ctrlKey: true, shiftKey: true, action: 'copy', description: 'Copy Selection' },
  { key: 'v', ctrlKey: true, shiftKey: true, action: 'paste', description: 'Paste' },
  { key: 'ArrowUp', ctrlKey: true, altKey: true, action: 'scrollUp', description: 'Scroll Up' },
  { key: 'ArrowDown', ctrlKey: true, altKey: true, action: 'scrollDown', description: 'Scroll Down' },
  { key: 'Home', ctrlKey: true, shiftKey: true, action: 'scrollToTop', description: 'Scroll to Top' },
  { key: 'End', ctrlKey: true, shiftKey: true, action: 'scrollToBottom', description: 'Scroll to Bottom' },
  { key: 'k', ctrlKey: true, action: 'clear', description: 'Clear Terminal' },
  { key: 'r', ctrlKey: true, shiftKey: true, action: 'rename', description: 'Rename Terminal' },
  { key: '1', ctrlKey: true, action: 'focusTab1', description: 'Focus Tab 1' },
  { key: '2', ctrlKey: true, action: 'focusTab2', description: 'Focus Tab 2' },
  { key: '3', ctrlKey: true, action: 'focusTab3', description: 'Focus Tab 3' },
  { key: '4', ctrlKey: true, action: 'focusTab4', description: 'Focus Tab 4' },
  { key: '5', ctrlKey: true, action: 'focusTab5', description: 'Focus Tab 5' },
];

// ============================================================================
// Terminal Context
// ============================================================================

interface TerminalContextValue {
  activeTerminalId: string | null;
  focusTerminal: (id: string) => void;
  sendInput: (id: string, data: string) => void;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

// ============================================================================
// Main Component
// ============================================================================

export const IntegratedTerminalAdvanced: React.FC<IntegratedTerminalProps> = ({
  className = '',
  defaultHeight = 280,
  onHeightChange,
  onMinimize,
  onMaximize,
  isMaximized = false,
  hideHeader = false,
}) => {
  const { theme, editorSettings } = useStore();
  
  // State
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [splitLayout, setSplitLayout] = useState<TerminalSplit | null>(null);
  const [height, setHeight] = useState(defaultHeight);
  const [isResizing, setIsResizing] = useState(false);
  const [showNewTerminalMenu, setShowNewTerminalMenu] = useState(false);
  const [showTabContextMenu, setShowTabContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ current: 0, total: 0 });
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  
  // Refs
  const terminalsRef = useRef<Map<string, TerminalInstance>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);
  const splitResizeRef = useRef<{ splitId: string; startRatio: number; startX: number; startY: number } | null>(null);

  // Theme Configuration
  const getTerminalTheme = useCallback(() => {
    const isDark = isDarkTheme(theme) || theme === 'high-contrast';
    const isHighContrast = theme === 'high-contrast';
    
    return {
      background: isHighContrast ? '#000000' : isDark ? '#1e1e1e' : '#ffffff',
      foreground: isHighContrast ? '#ffffff' : isDark ? '#d4d4d4' : '#1e293b',
      cursor: isHighContrast ? '#ffffff' : isDark ? '#aeafad' : '#3b82f6',
      cursorAccent: isHighContrast ? '#000000' : isDark ? '#1e1e1e' : '#ffffff',
      selectionBackground: isHighContrast ? 'rgba(255,255,255,0.3)' : isDark ? '#264f78' : 'rgba(59, 130, 246, 0.3)',
      selectionForeground: isHighContrast ? '#000000' : undefined,
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#ffffff',
    };
  }, [theme]);

  // ============================================================================
  // Terminal Instance Management
  // ============================================================================

  const createTerminalInstance = useCallback((tabId: string, containerElement: HTMLDivElement): TerminalInstance => {
    const terminalTheme = getTerminalTheme();
    
    const xterm = new XTerminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: editorSettings?.fontFamily || '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, Monaco, monospace',
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

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(searchAddon);
    xterm.loadAddon(webLinksAddon);

    xterm.open(containerElement);
    
    // Fit after container is rendered
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    const instance: TerminalInstance = {
      xterm,
      fitAddon,
      searchAddon,
      terminalId: null,
      containerRef: containerElement,
    };

    terminalsRef.current.set(tabId, instance);
    return instance;
  }, [editorSettings, getTerminalTheme]);

  const connectTerminal = useCallback(async (tabId: string, instance: TerminalInstance) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, status: 'connecting' } : t));
    instance.xterm.writeln('\x1b[33m⏳ Connecting to terminal server...\x1b[0m');

    try {
      await socketService.connect();
      
      const terminalId = await socketService.createTerminal({
        cols: instance.xterm.cols,
        rows: instance.xterm.rows,
        shell: SHELL_CONFIG[tab.shellType].command,
        args: SHELL_CONFIG[tab.shellType].args,
      });

      instance.terminalId = terminalId;

      setTabs(prev => prev.map(t => 
        t.id === tabId ? { ...t, status: 'connected', terminalId } : t
      ));

      // Clear the connecting message
      instance.xterm.clear();

      // Set up output handler
      const outputHandler = (data: { terminalId: string; data: string }) => {
        if (data.terminalId === instance.terminalId) {
          instance.xterm.write(data.data);
        }
      };
      socketService.onTerminalOutput(outputHandler);

      // Set up exit handler
      const exitHandler = (data: { terminalId: string; exitCode: number }) => {
        if (data.terminalId === instance.terminalId) {
          instance.xterm.writeln(`\x1b[33m\r\n[Process exited with code ${data.exitCode}]\x1b[0m`);
          instance.xterm.writeln('\x1b[90mPress Enter to restart or close the terminal.\x1b[0m');
          setTabs(prev => prev.map(t => 
            t.id === tabId ? { ...t, status: 'disconnected' } : t
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

    } catch (error: any) {
      console.error('Terminal connection failed:', error);
      instance.xterm.writeln(`\x1b[31m✗ Connection failed: ${error.message}\x1b[0m`);
      instance.xterm.writeln('\x1b[90mUsing local shell emulation...\x1b[0m\r\n');
      
      setTabs(prev => prev.map(t => 
        t.id === tabId ? { ...t, status: 'error' } : t
      ));
      
      setupLocalShellEmulation(tabId, instance.xterm);
    }
  }, [tabs]);

  // Local shell emulation for fallback
  const setupLocalShellEmulation = useCallback((tabId: string, xterm: XTerminal) => {
    let currentLine = '';
    const commandHistory: string[] = [];
    let historyIndex = -1;

    const writePrompt = () => {
      const tab = tabs.find(t => t.id === tabId);
      const shellIcon = tab ? SHELL_CONFIG[tab.shellType].icon : '💲';
      xterm.write(`\x1b[1;32muser\x1b[0m@\x1b[1;34mlocal\x1b[0m \x1b[1;36m~/project\x1b[0m ${shellIcon} `);
    };

    writePrompt();

    xterm.onData((data) => {
      const code = data.charCodeAt(0);
      
      if (code === 13) { // Enter
        xterm.write('\r\n');
        const cmd = currentLine.trim();
        if (cmd) {
          commandHistory.push(cmd);
          historyIndex = commandHistory.length;
          executeLocalCommand(cmd, xterm, tabId);
        }
        currentLine = '';
        writePrompt();
      } else if (code === 127) { // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          xterm.write('\b \b');
        }
      } else if (code === 9) { // Tab - autocomplete
        const completions = getCompletions(currentLine);
        if (completions.length === 1) {
          const completion = completions[0].slice(currentLine.split(' ').pop()?.length || 0);
          currentLine += completion;
          xterm.write(completion);
        } else if (completions.length > 1) {
          xterm.write('\r\n');
          xterm.writeln(completions.join('  '));
          writePrompt();
          xterm.write(currentLine);
        }
      } else if (data === '\x1b[A') { // Up arrow
        if (historyIndex > 0) {
          historyIndex--;
          clearLine(xterm, currentLine.length);
          currentLine = commandHistory[historyIndex] || '';
          xterm.write(currentLine);
        }
      } else if (data === '\x1b[B') { // Down arrow
        if (historyIndex < commandHistory.length - 1) {
          historyIndex++;
          clearLine(xterm, currentLine.length);
          currentLine = commandHistory[historyIndex] || '';
          xterm.write(currentLine);
        } else {
          historyIndex = commandHistory.length;
          clearLine(xterm, currentLine.length);
          currentLine = '';
        }
      } else if (code === 3) { // Ctrl+C
        xterm.write('^C\r\n');
        currentLine = '';
        writePrompt();
      } else if (code === 12) { // Ctrl+L
        xterm.clear();
        writePrompt();
      } else if (code === 4) { // Ctrl+D
        if (currentLine.length === 0) {
          xterm.writeln('exit');
          closeTab(tabId);
        }
      } else if (code >= 32) { // Printable
        currentLine += data;
        xterm.write(data);
      }
    });
  }, [tabs]);

  const clearLine = (xterm: XTerminal, length: number) => {
    for (let i = 0; i < length; i++) {
      xterm.write('\b \b');
    }
  };

  const getCompletions = (input: string): string[] => {
    const commands = ['help', 'clear', 'echo', 'date', 'pwd', 'whoami', 'env', 'history', 'exit', 'ls', 'cat'];
    const lastWord = input.split(' ').pop() || '';
    return commands.filter(cmd => cmd.startsWith(lastWord));
  };

  const executeLocalCommand = (command: string, xterm: XTerminal, tabId: string) => {
    const [cmd, ...args] = command.split(' ');
    
    switch (cmd.toLowerCase()) {
      case 'help':
        xterm.writeln('\x1b[1;33m📖 Available Commands:\x1b[0m');
        xterm.writeln('');
        xterm.writeln('  \x1b[36mclear\x1b[0m         Clear terminal');
        xterm.writeln('  \x1b[36mecho\x1b[0m <text>   Print text');
        xterm.writeln('  \x1b[36mdate\x1b[0m          Show current date/time');
        xterm.writeln('  \x1b[36mpwd\x1b[0m           Print working directory');
        xterm.writeln('  \x1b[36mwhoami\x1b[0m        Show current user');
        xterm.writeln('  \x1b[36menv\x1b[0m           Show environment variables');
        xterm.writeln('  \x1b[36mhistory\x1b[0m       Show command history');
        xterm.writeln('  \x1b[36mexit\x1b[0m          Close terminal');
        xterm.writeln('  \x1b[36mls\x1b[0m            List files (simulated)');
        xterm.writeln('  \x1b[36mcat\x1b[0m <file>    Display file (simulated)');
        xterm.writeln('');
        xterm.writeln('\x1b[90mNote: Running in fallback mode. Some features limited.\x1b[0m');
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
      case 'env':
        xterm.writeln('SHELL=/bin/bash');
        xterm.writeln('USER=user');
        xterm.writeln('HOME=/home/user');
        xterm.writeln('PWD=/home/user/project');
        xterm.writeln('TERM=xterm-256color');
        xterm.writeln('LANG=en_US.UTF-8');
        xterm.writeln('PATH=/usr/local/bin:/usr/bin:/bin');
        break;
      case 'ls':
        xterm.writeln('\x1b[34mnode_modules/\x1b[0m  package.json  \x1b[34msrc/\x1b[0m  tsconfig.json  README.md');
        break;
      case 'cat':
        if (args.length === 0) {
          xterm.writeln('\x1b[31mcat: missing file operand\x1b[0m');
        } else {
          xterm.writeln(`\x1b[90m(File content of ${args[0]} would appear here)\x1b[0m`);
        }
        break;
      case 'exit':
        closeTab(tabId);
        break;
      default:
        xterm.writeln(`\x1b[31mbash: ${cmd}: command not found\x1b[0m`);
        xterm.writeln('\x1b[90mType "help" for available commands\x1b[0m');
    }
  };

  // ============================================================================
  // Tab Management
  // ============================================================================

  const createTab = useCallback((shellType: ShellType = 'bash', name?: string): string => {
    const tabId = `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tabNumber = tabs.length + 1;
    
    const newTab: TerminalTab = {
      id: tabId,
      name: name || `${SHELL_CONFIG[shellType].label} ${tabNumber}`,
      shellType,
      status: 'disconnected',
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(tabId);
    setShowNewTerminalMenu(false);

    return tabId;
  }, [tabs.length]);

  const closeTab = useCallback((tabId: string) => {
    const instance = terminalsRef.current.get(tabId);
    
    if (instance) {
      if (instance.terminalId) {
        socketService.killTerminal(instance.terminalId);
      }
      instance.xterm.dispose();
      terminalsRef.current.delete(tabId);
    }

    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId && newTabs.length > 0) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }
      return newTabs;
    });

    // Clean up split layout
    setSplitLayout(prev => {
      if (!prev) return null;
      return removeTerminalFromSplit(prev, tabId);
    });
  }, [activeTabId]);

  const removeTerminalFromSplit = (split: TerminalSplit, tabId: string): TerminalSplit | null => {
    if (split.type === 'leaf') {
      return split.terminalId === tabId ? null : split;
    }
    
    if (split.children) {
      const [left, right] = split.children;
      const newLeft = removeTerminalFromSplit(left, tabId);
      const newRight = removeTerminalFromSplit(right, tabId);
      
      if (!newLeft && !newRight) return null;
      if (!newLeft) return newRight;
      if (!newRight) return newLeft;
      
      return { ...split, children: [newLeft, newRight] };
    }
    
    return split;
  };

  const renameTab = useCallback((tabId: string, newName: string) => {
    setTabs(prev => prev.map(t => 
      t.id === tabId ? { ...t, name: newName } : t
    ));
    setShowTabContextMenu(null);
  }, []);

  const duplicateTab = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      createTab(tab.shellType, `${tab.name} (copy)`);
    }
    setShowTabContextMenu(null);
  }, [tabs, createTab]);

  // ============================================================================
  // Split Terminal Management
  // ============================================================================

  const splitTerminal = useCallback((tabId: string, orientation: 'horizontal' | 'vertical') => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    const newTabId = createTab(tab.shellType, `${tab.name} (split)`);
    
    setSplitLayout(prev => {
      const newLeaf: TerminalSplit = {
        id: `split-leaf-${newTabId}`,
        type: 'leaf',
        terminalId: newTabId,
      };

      if (!prev) {
        const existingLeaf: TerminalSplit = {
          id: `split-leaf-${tabId}`,
          type: 'leaf',
          terminalId: tabId,
        };
        
        return {
          id: `split-branch-${Date.now()}`,
          type: 'branch',
          orientation,
          ratio: 50,
          children: [existingLeaf, newLeaf],
        };
      }

      // Find and split the existing terminal
      return addSplitToLayout(prev, tabId, newLeaf, orientation);
    });

    setShowTabContextMenu(null);
  }, [tabs, createTab]);

  const addSplitToLayout = (
    split: TerminalSplit, 
    targetId: string, 
    newLeaf: TerminalSplit, 
    orientation: 'horizontal' | 'vertical'
  ): TerminalSplit => {
    if (split.type === 'leaf' && split.terminalId === targetId) {
      return {
        id: `split-branch-${Date.now()}`,
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
          addSplitToLayout(split.children[0], targetId, newLeaf, orientation),
          addSplitToLayout(split.children[1], targetId, newLeaf, orientation),
        ],
      };
    }

    return split;
  };

  const updateSplitRatio = useCallback((splitId: string, newRatio: number) => {
    setSplitLayout(prev => {
      if (!prev) return null;
      return updateSplitRatioInLayout(prev, splitId, newRatio);
    });
  }, []);

  const updateSplitRatioInLayout = (split: TerminalSplit, splitId: string, newRatio: number): TerminalSplit => {
    if (split.id === splitId) {
      return { ...split, ratio: Math.max(10, Math.min(90, newRatio)) };
    }

    if (split.type === 'branch' && split.children) {
      return {
        ...split,
        children: [
          updateSplitRatioInLayout(split.children[0], splitId, newRatio),
          updateSplitRatioInLayout(split.children[1], splitId, newRatio),
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

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onHeightChange]);

  // Split pane resize handling
  const handleSplitResizeStart = useCallback((e: React.MouseEvent, splitId: string, currentRatio: number) => {
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
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Calculate delta based on container size
      const deltaX = ((e.clientX - startX) / containerRect.width) * 100;
      const deltaY = ((e.clientY - startY) / containerRect.height) * 100;
      
      // Use the larger delta (for the appropriate orientation)
      const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
      const newRatio = startRatio + delta;
      
      updateSplitRatio(splitId, newRatio);
      
      // Fit all terminals
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
  }, [updateSplitRatio]);

  // Window resize handler
  useEffect(() => {
    const handleWindowResize = () => {
      terminalsRef.current.forEach(({ fitAddon }) => {
        requestAnimationFrame(() => fitAddon.fit());
      });
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // ============================================================================
  // Search Functionality
  // ============================================================================

  const handleSearch = useCallback((query: string, direction: 'next' | 'previous' = 'next') => {
    if (!activeTabId) return;
    
    const instance = terminalsRef.current.get(activeTabId);
    if (!instance) return;

    if (query) {
      const found = direction === 'next' 
        ? instance.searchAddon.findNext(query, { caseSensitive: false, regex: false })
        : instance.searchAddon.findPrevious(query, { caseSensitive: false, regex: false });
      
      // Update search results count (approximate)
      setSearchResults(prev => ({
        ...prev,
        current: found ? prev.current + (direction === 'next' ? 1 : -1) : 0,
      }));
    }
  }, [activeTabId]);

  const clearSearch = useCallback(() => {
    if (!activeTabId) return;
    
    const instance = terminalsRef.current.get(activeTabId);
    if (instance) {
      instance.searchAddon.clearDecorations();
    }
    setSearchQuery('');
    setSearchResults({ current: 0, total: 0 });
  }, [activeTabId]);

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check each shortcut
      for (const shortcut of KEYBOARD_SHORTCUTS) {
        const keyMatch = e.key === shortcut.key || e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrlKey === (e.ctrlKey || e.metaKey);
        const shiftMatch = !!shortcut.shiftKey === e.shiftKey;
        const altMatch = !!shortcut.altKey === e.altKey;
        
        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          executeShortcutAction(shortcut.action);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabs]);

  const executeShortcutAction = useCallback((action: string) => {
    switch (action) {
      case 'newTerminal':
        createTab('bash');
        break;
      case 'closeTerminal':
        if (activeTabId) closeTab(activeTabId);
        break;
      case 'splitHorizontal':
        if (activeTabId) splitTerminal(activeTabId, 'horizontal');
        break;
      case 'splitVertical':
        if (activeTabId) splitTerminal(activeTabId, 'vertical');
        break;
      case 'previousTab':
        switchToPreviousTab();
        break;
      case 'nextTab':
        switchToNextTab();
        break;
      case 'search':
        setShowSearch(prev => !prev);
        break;
      case 'copy':
        copySelection();
        break;
      case 'paste':
        pasteFromClipboard();
        break;
      case 'scrollUp':
        scrollTerminal(-5);
        break;
      case 'scrollDown':
        scrollTerminal(5);
        break;
      case 'scrollToTop':
        scrollToTop();
        break;
      case 'scrollToBottom':
        scrollToBottom();
        break;
      case 'clear':
        clearActiveTerminal();
        break;
      case 'rename':
        promptRename();
        break;
      case 'focusTab1':
      case 'focusTab2':
      case 'focusTab3':
      case 'focusTab4':
      case 'focusTab5':
        const tabIndex = parseInt(action.replace('focusTab', '')) - 1;
        if (tabs[tabIndex]) {
          setActiveTabId(tabs[tabIndex].id);
        }
        break;
    }
  }, [activeTabId, tabs, createTab, closeTab, splitTerminal]);

  const switchToPreviousTab = useCallback(() => {
    if (tabs.length < 2 || !activeTabId) return;
    const currentIndex = tabs.findIndex(t => t.id === activeTabId);
    const newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
    setActiveTabId(tabs[newIndex].id);
  }, [tabs, activeTabId]);

  const switchToNextTab = useCallback(() => {
    if (tabs.length < 2 || !activeTabId) return;
    const currentIndex = tabs.findIndex(t => t.id === activeTabId);
    const newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
    setActiveTabId(tabs[newIndex].id);
  }, [tabs, activeTabId]);

  const copySelection = useCallback(() => {
    if (!activeTabId) return;
    const instance = terminalsRef.current.get(activeTabId);
    if (instance) {
      const selection = instance.xterm.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
    }
  }, [activeTabId]);

  const pasteFromClipboard = useCallback(async () => {
    if (!activeTabId) return;
    const instance = terminalsRef.current.get(activeTabId);
    if (instance && instance.terminalId) {
      const text = await navigator.clipboard.readText();
      socketService.sendTerminalInput(instance.terminalId, text);
    }
  }, [activeTabId]);

  const scrollTerminal = useCallback((lines: number) => {
    if (!activeTabId) return;
    const instance = terminalsRef.current.get(activeTabId);
    if (instance) {
      instance.xterm.scrollLines(lines);
    }
  }, [activeTabId]);

  const scrollToTop = useCallback(() => {
    if (!activeTabId) return;
    const instance = terminalsRef.current.get(activeTabId);
    if (instance) {
      instance.xterm.scrollToTop();
    }
  }, [activeTabId]);

  const scrollToBottom = useCallback(() => {
    if (!activeTabId) return;
    const instance = terminalsRef.current.get(activeTabId);
    if (instance) {
      instance.xterm.scrollToBottom();
    }
  }, [activeTabId]);

  const clearActiveTerminal = useCallback(() => {
    if (!activeTabId) return;
    const instance = terminalsRef.current.get(activeTabId);
    if (instance) {
      instance.xterm.clear();
    }
  }, [activeTabId]);

  const promptRename = useCallback(() => {
    if (!activeTabId) return;
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab) {
      const name = prompt('Rename terminal:', tab.name);
      if (name) renameTab(activeTabId, name);
    }
  }, [activeTabId, tabs, renameTab]);

  // ============================================================================
  // Theme Update
  // ============================================================================

  useEffect(() => {
    const terminalTheme = getTerminalTheme();
    terminalsRef.current.forEach(({ xterm }) => {
      xterm.options.theme = terminalTheme;
    });
  }, [theme, getTerminalTheme]);

  // ============================================================================
  // Initialize Default Terminal
  // ============================================================================

  useEffect(() => {
    if (tabs.length === 0) {
      createTab('bash');
    }
  }, []);

  // ============================================================================
  // Theme Classes
  // ============================================================================

  const isDark = isDarkTheme(theme) || theme === 'high-contrast';
  const isHighContrast = theme === 'high-contrast';
  
  const bgColor = isHighContrast ? 'bg-black' : isDark ? 'bg-[#1e1e1e]' : 'bg-white';
  const headerBg = isHighContrast ? 'bg-black' : isDark ? 'bg-[#252526]' : 'bg-gray-50';
  const borderColor = isHighContrast ? 'border-white' : isDark ? 'border-[#3c3c3c]' : 'border-gray-200';
  const textColor = isDark ? 'text-gray-200' : 'text-gray-800';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100';
  const activeBg = isDark ? 'bg-white/10' : 'bg-gray-100';
  const accentColor = isDark ? 'bg-blue-600' : 'bg-blue-500';

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col ${bgColor} border-t ${borderColor} ${className}`}
      style={{ height: isMaximized ? '100%' : `${height}px` }}
    >
      {/* Resize Handle */}
      {!isMaximized && !hideHeader && (
        <div 
          className={`h-1 cursor-ns-resize transition-colors ${
            isResizing ? accentColor : isDark ? 'hover:bg-blue-600' : 'hover:bg-blue-500'
          }`}
          onMouseDown={handleResizeStart}
        />
      )}
      
      {/* Header */}
      {!hideHeader && (
      <div className={`flex items-center justify-between px-2 py-1 border-b ${borderColor} ${headerBg}`}>
        {/* Tabs */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-thin">
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              draggable
              onDragStart={() => setDraggedTabId(tab.id)}
              onDragEnd={() => setDraggedTabId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedTabId && draggedTabId !== tab.id) {
                  // Reorder tabs
                  setTabs(prev => {
                    const newTabs = [...prev];
                    const draggedIndex = newTabs.findIndex(t => t.id === draggedTabId);
                    const dropIndex = newTabs.findIndex(t => t.id === tab.id);
                    const [removed] = newTabs.splice(draggedIndex, 1);
                    newTabs.splice(dropIndex, 0, removed);
                    return newTabs;
                  });
                }
              }}
              className={`group relative flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t cursor-pointer select-none transition-all ${
                activeTabId === tab.id
                  ? `${activeBg} ${textColor}`
                  : `${textMuted} ${hoverBg}`
              } ${draggedTabId === tab.id ? 'opacity-50' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowTabContextMenu({ tabId: tab.id, x: e.clientX, y: e.clientY });
              }}
            >
              {/* Tab Index Badge */}
              {index < 5 && (
                <span className={`absolute -top-1 -left-1 w-4 h-4 text-[10px] flex items-center justify-center rounded-full ${
                  isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </span>
              )}
              
              <span>{SHELL_CONFIG[tab.shellType].icon}</span>
              <span className="max-w-[100px] truncate">{tab.name}</span>
              
              {/* Status Indicator */}
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                tab.status === 'connected' ? 'bg-green-500' :
                tab.status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                tab.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
              }`} title={tab.status} />
              
              {/* Close Button */}
              <button
                className={`opacity-0 group-hover:opacity-100 p-0.5 rounded ${hoverBg} transition-opacity flex-shrink-0`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                title="Close (Ctrl+Shift+W)"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Active Tab Indicator */}
              {activeTabId === tab.id && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${accentColor}`} />
              )}
            </div>
          ))}
          
          {/* New Terminal Button */}
          <div className="relative">
            <button
              className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded ${textMuted} ${hoverBg} transition-colors`}
              onClick={() => setShowNewTerminalMenu(prev => !prev)}
              title="New Terminal (Ctrl+Shift+`)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            
            {/* New Terminal Dropdown */}
            {showNewTerminalMenu && (
              <div className={`absolute top-full left-0 mt-1 py-1 rounded-md shadow-lg z-50 min-w-[180px] ${
                isDark ? 'bg-[#3c3c3c] border border-[#555]' : 'bg-white border border-gray-200'
              }`}>
                <div className={`px-3 py-1 text-xs ${textMuted} uppercase tracking-wide`}>
                  New Terminal
                </div>
                {(Object.entries(SHELL_CONFIG) as [ShellType, typeof SHELL_CONFIG['bash']][]).map(([type, config]) => (
                  <button
                    key={type}
                    className={`w-full px-3 py-2 text-xs text-left flex items-center gap-2 ${textColor} ${hoverBg} transition-colors`}
                    onClick={() => createTab(type)}
                  >
                    <span className="text-base">{config.icon}</span>
                    <span>{config.label}</span>
                    <span className={`ml-auto ${textMuted}`}>{config.command}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-0.5">
          {/* Search Toggle */}
          <button
            className={`p-1.5 rounded ${showSearch ? activeBg : ''} ${textMuted} ${hoverBg} transition-colors`}
            onClick={() => setShowSearch(prev => !prev)}
            title="Find (Ctrl+Shift+F)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          {/* Split Horizontal */}
          <button
            className={`p-1.5 rounded ${textMuted} ${hoverBg} transition-colors`}
            onClick={() => activeTabId && splitTerminal(activeTabId, 'horizontal')}
            title="Split Right (Ctrl+Shift+\\)"
            disabled={!activeTabId}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
              <line x1="12" y1="3" x2="12" y2="21" strokeWidth="2"/>
            </svg>
          </button>
          
          {/* Split Vertical */}
          <button
            className={`p-1.5 rounded ${textMuted} ${hoverBg} transition-colors`}
            onClick={() => activeTabId && splitTerminal(activeTabId, 'vertical')}
            title="Split Down (Ctrl+Shift+-)"
            disabled={!activeTabId}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
              <line x1="3" y1="12" x2="21" y2="12" strokeWidth="2"/>
            </svg>
          </button>
          
          {/* Keyboard Shortcuts Help */}
          <button
            className={`p-1.5 rounded ${textMuted} ${hoverBg} transition-colors`}
            onClick={() => setShowShortcutsHelp(prev => !prev)}
            title="Keyboard Shortcuts"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
          
          <div className={`w-px h-4 ${borderColor} mx-1`} />
          
          {/* Clear Terminal */}
          <button
            className={`p-1.5 rounded ${textMuted} ${hoverBg} transition-colors`}
            onClick={clearActiveTerminal}
            title="Clear Terminal (Ctrl+K)"
            disabled={!activeTabId}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          
          {/* Kill Terminal */}
          <button
            className={`p-1.5 rounded ${textMuted} ${hoverBg} transition-colors`}
            onClick={() => activeTabId && closeTab(activeTabId)}
            title="Kill Terminal (Ctrl+Shift+W)"
            disabled={!activeTabId}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className={`w-px h-4 ${borderColor} mx-1`} />
          
          {/* Minimize */}
          {onMinimize && (
            <button
              className={`p-1.5 rounded ${textMuted} ${hoverBg} transition-colors`}
              onClick={onMinimize}
              title="Minimize Panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          
          {/* Maximize/Restore */}
          {onMaximize && (
            <button
              className={`p-1.5 rounded ${textMuted} ${hoverBg} transition-colors`}
              onClick={onMaximize}
              title={isMaximized ? "Restore Panel" : "Maximize Panel"}
            >
              {isMaximized ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
      )}
      
      {/* Search Bar */}
      {showSearch && !hideHeader && (
        <div className={`flex items-center gap-2 px-3 py-2 border-b ${borderColor} ${headerBg}`}>
          <svg className={`w-4 h-4 ${textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch(searchQuery, e.shiftKey ? 'previous' : 'next');
              } else if (e.key === 'Escape') {
                clearSearch();
                setShowSearch(false);
              }
            }}
            placeholder="Search terminal output..."
            className={`flex-1 px-2 py-1 text-xs rounded border ${
              isDark ? 'bg-[#3c3c3c] border-[#555] text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            } focus:outline-none focus:ring-1 focus:ring-blue-500`}
            autoFocus
          />
          <span className={`text-xs ${textMuted}`}>
            {searchResults.current > 0 ? `${searchResults.current} of ${searchResults.total || '?'}` : 'No results'}
          </span>
          <button
            className={`p-1 rounded ${textMuted} ${hoverBg}`}
            onClick={() => handleSearch(searchQuery, 'previous')}
            title="Previous (Shift+Enter)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            className={`p-1 rounded ${textMuted} ${hoverBg}`}
            onClick={() => handleSearch(searchQuery, 'next')}
            title="Next (Enter)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            className={`p-1 rounded ${textMuted} ${hoverBg}`}
            onClick={() => {
              clearSearch();
              setShowSearch(false);
            }}
            title="Close (Escape)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden relative">
        {tabs.length === 0 ? (
          <EmptyTerminalState 
            isDark={isDark} 
            textMuted={textMuted}
            accentColor={accentColor}
            onCreateTerminal={() => createTab('bash')}
          />
        ) : splitLayout ? (
          <SplitTerminalView
            split={splitLayout}
            tabs={tabs}
            activeTabId={activeTabId}
            onMount={(tabId, container) => {
              const instance = createTerminalInstance(tabId, container);
              connectTerminal(tabId, instance);
            }}
            onFocus={setActiveTabId}
            onSplitResize={handleSplitResizeStart}
            theme={theme}
          />
        ) : (
          tabs.map((tab) => (
            <TerminalPane
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onMount={(container) => {
                const instance = createTerminalInstance(tab.id, container);
                connectTerminal(tab.id, instance);
              }}
              onFocus={() => setActiveTabId(tab.id)}
              theme={theme}
            />
          ))
        )}
      </div>
      
      {/* Tab Context Menu */}
      {showTabContextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowTabContextMenu(null)}
          />
          <div 
            className={`fixed z-50 py-1 rounded-md shadow-lg min-w-[180px] ${
              isDark ? 'bg-[#3c3c3c] border border-[#555]' : 'bg-white border border-gray-200'
            }`}
            style={{ left: showTabContextMenu.x, top: showTabContextMenu.y }}
          >
            <button
              className={`w-full px-3 py-2 text-xs text-left flex items-center gap-2 ${textColor} ${hoverBg}`}
              onClick={() => {
                const name = prompt('Rename terminal:', tabs.find(t => t.id === showTabContextMenu.tabId)?.name);
                if (name) renameTab(showTabContextMenu.tabId, name);
              }}
            >
              <span>✏️</span>
              <span>Rename</span>
              <span className={`ml-auto ${textMuted}`}>Ctrl+Shift+R</span>
            </button>
            <button
              className={`w-full px-3 py-2 text-xs text-left flex items-center gap-2 ${textColor} ${hoverBg}`}
              onClick={() => duplicateTab(showTabContextMenu.tabId)}
            >
              <span>📋</span>
              <span>Duplicate</span>
            </button>
            <div className={`my-1 border-t ${borderColor}`} />
            <button
              className={`w-full px-3 py-2 text-xs text-left flex items-center gap-2 ${textColor} ${hoverBg}`}
              onClick={() => splitTerminal(showTabContextMenu.tabId, 'horizontal')}
            >
              <span>⬌</span>
              <span>Split Right</span>
              <span className={`ml-auto ${textMuted}`}>Ctrl+Shift+\\</span>
            </button>
            <button
              className={`w-full px-3 py-2 text-xs text-left flex items-center gap-2 ${textColor} ${hoverBg}`}
              onClick={() => splitTerminal(showTabContextMenu.tabId, 'vertical')}
            >
              <span>⬍</span>
              <span>Split Down</span>
              <span className={`ml-auto ${textMuted}`}>Ctrl+Shift+-</span>
            </button>
            <div className={`my-1 border-t ${borderColor}`} />
            <button
              className={`w-full px-3 py-2 text-xs text-left flex items-center gap-2 text-red-500 ${hoverBg}`}
              onClick={() => closeTab(showTabContextMenu.tabId)}
            >
              <span>✕</span>
              <span>Close</span>
              <span className={`ml-auto ${textMuted}`}>Ctrl+Shift+W</span>
            </button>
          </div>
        </>
      )}
      
      {/* New Terminal Menu Backdrop */}
      {showNewTerminalMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowNewTerminalMenu(false)}
        />
      )}
      
      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <KeyboardShortcutsModal
          isDark={isDark}
          textColor={textColor}
          textMuted={textMuted}
          borderColor={borderColor}
          onClose={() => setShowShortcutsHelp(false)}
        />
      )}
    </div>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

interface TerminalPaneProps {
  tab: TerminalTab;
  isActive: boolean;
  onMount: (container: HTMLDivElement) => void;
  onFocus: () => void;
  theme: string;
}

const TerminalPane: React.FC<TerminalPaneProps> = ({ tab, isActive, onMount, onFocus, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (containerRef.current && !mountedRef.current) {
      mountedRef.current = true;
      onMount(containerRef.current);
    }
  }, [onMount]);

  const isDark = isDarkTheme(theme) || theme === 'high-contrast';
  const bgColor = theme === 'high-contrast' ? '#000000' : isDark ? '#1e1e1e' : '#ffffff';

  return (
    <div
      ref={containerRef}
      className={`h-full w-full ${isActive ? 'block' : 'hidden'}`}
      style={{ backgroundColor: bgColor }}
      onClick={onFocus}
    />
  );
};

interface SplitTerminalViewProps {
  split: TerminalSplit;
  tabs: TerminalTab[];
  activeTabId: string | null;
  onMount: (tabId: string, container: HTMLDivElement) => void;
  onFocus: (tabId: string) => void;
  onSplitResize: (e: React.MouseEvent, splitId: string, currentRatio: number) => void;
  theme: string;
}

const SplitTerminalView: React.FC<SplitTerminalViewProps> = ({ 
  split, 
  tabs, 
  activeTabId, 
  onMount, 
  onFocus, 
  onSplitResize,
  theme 
}) => {
  const isDark = isDarkTheme(theme) || theme === 'high-contrast';

  if (split.type === 'leaf' && split.terminalId) {
    const tab = tabs.find(t => t.id === split.terminalId);
    if (!tab) return null;
    
    return (
      <TerminalPane
        tab={tab}
        isActive={true}
        onMount={(container) => onMount(tab.id, container)}
        onFocus={() => onFocus(tab.id)}
        theme={theme}
      />
    );
  }

  if (split.type === 'branch' && split.children) {
    const [first, second] = split.children;
    const ratio = split.ratio || 50;
    const isHorizontal = split.orientation === 'horizontal';

    return (
      <div className={`flex h-full w-full ${isHorizontal ? 'flex-row' : 'flex-col'}`}>
        <div style={{ [isHorizontal ? 'width' : 'height']: `${ratio}%` }} className="overflow-hidden">
          <SplitTerminalView
            split={first}
            tabs={tabs}
            activeTabId={activeTabId}
            onMount={onMount}
            onFocus={onFocus}
            onSplitResize={onSplitResize}
            theme={theme}
          />
        </div>
        
        {/* Resize Handle */}
        <div
          className={`${isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'} ${
            isDark ? 'bg-[#3c3c3c] hover:bg-blue-600' : 'bg-gray-200 hover:bg-blue-500'
          } transition-colors flex-shrink-0`}
          onMouseDown={(e) => onSplitResize(e, split.id, ratio)}
        />
        
        <div style={{ [isHorizontal ? 'width' : 'height']: `${100 - ratio}%` }} className="overflow-hidden">
          <SplitTerminalView
            split={second}
            tabs={tabs}
            activeTabId={activeTabId}
            onMount={onMount}
            onFocus={onFocus}
            onSplitResize={onSplitResize}
            theme={theme}
          />
        </div>
      </div>
    );
  }

  return null;
};

interface EmptyTerminalStateProps {
  isDark: boolean;
  textMuted: string;
  accentColor: string;
  onCreateTerminal: () => void;
}

const EmptyTerminalState: React.FC<EmptyTerminalStateProps> = ({ 
  isDark, 
  textMuted, 
  accentColor, 
  onCreateTerminal 
}) => (
  <div className={`flex flex-col items-center justify-center h-full ${textMuted}`}>
    <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    <p className="text-sm mb-2">No terminal open</p>
    <p className="text-xs mb-4 opacity-70">Create a terminal to get started</p>
    <button
      className={`px-4 py-2 text-sm rounded ${accentColor} text-white hover:opacity-90 transition-opacity`}
      onClick={onCreateTerminal}
    >
      Create Terminal
    </button>
    <p className="text-xs mt-3 opacity-50">or press Ctrl+Shift+`</p>
  </div>
);

interface KeyboardShortcutsModalProps {
  isDark: boolean;
  textColor: string;
  textMuted: string;
  borderColor: string;
  onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isDark,
  textColor,
  textMuted,
  borderColor,
  onClose,
}) => (
  <>
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
    <div 
      className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[500px] max-h-[80vh] overflow-y-auto rounded-lg shadow-2xl ${
        isDark ? 'bg-[#252526]' : 'bg-white'
      }`}
    >
      <div className={`sticky top-0 flex items-center justify-between px-4 py-3 border-b ${borderColor} ${isDark ? 'bg-[#252526]' : 'bg-white'}`}>
        <h2 className={`text-lg font-semibold ${textColor}`}>⌨️ Keyboard Shortcuts</h2>
        <button
          className={`p-1 rounded ${textMuted} hover:bg-white/10 transition-colors`}
          onClick={onClose}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-4">
        <div className="grid gap-2">
          {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
            <div key={index} className={`flex items-center justify-between py-2 px-3 rounded ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
              <span className={textColor}>{shortcut.description}</span>
              <kbd className={`px-2 py-1 text-xs rounded ${isDark ? 'bg-[#3c3c3c] text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                {[
                  shortcut.ctrlKey && 'Ctrl',
                  shortcut.shiftKey && 'Shift',
                  shortcut.altKey && 'Alt',
                  shortcut.key,
                ].filter(Boolean).join('+')}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);

export default IntegratedTerminalAdvanced;
