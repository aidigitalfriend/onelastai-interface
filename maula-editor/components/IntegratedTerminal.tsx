import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { socketService } from '../services/socket';
import { useStore } from '../store/useStore';
import { isDarkTheme } from '../utils/theme';

// Re-export the advanced terminal for easy access
export { IntegratedTerminalAdvanced } from './IntegratedTerminalAdvanced';

// Shell types
export type ShellType = 'bash' | 'zsh' | 'sh' | 'powershell' | 'cmd' | 'fish';

// Terminal tab interface
export interface TerminalTab {
  id: string;
  name: string;
  shellType: ShellType;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  terminalId?: string;
  splitId?: string; // ID of paired split terminal
}

// Split terminal state
export interface TerminalSplit {
  id: string;
  orientation: 'horizontal' | 'vertical';
  leftTerminalId: string;
  rightTerminalId: string;
  splitRatio: number;
}

interface IntegratedTerminalProps {
  className?: string;
  defaultHeight?: number;
  onHeightChange?: (height: number) => void;
  projectId?: string; // Project ID to start terminal in its workspace
}

// Shell icons and labels
const SHELL_CONFIG: Record<ShellType, { icon: string; label: string; command?: string }> = {
  bash: { icon: '🐚', label: 'Bash', command: '/bin/bash' },
  zsh: { icon: '⚡', label: 'Zsh', command: '/bin/zsh' },
  sh: { icon: '💲', label: 'Shell', command: '/bin/sh' },
  powershell: { icon: '🔵', label: 'PowerShell', command: 'powershell.exe' },
  cmd: { icon: '⬛', label: 'CMD', command: 'cmd.exe' },
  fish: { icon: '🐟', label: 'Fish', command: '/usr/bin/fish' },
};

export const IntegratedTerminal: React.FC<IntegratedTerminalProps> = ({
  className = '',
  defaultHeight = 250,
  onHeightChange,
  projectId,
}) => {
  const { theme, editorSettings, currentProject } = useStore();
  
  // Get the effective project ID from prop or store
  const effectiveProjectId = projectId || currentProject?.id;
  
  // Terminal tabs state
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [splits, setSplits] = useState<TerminalSplit[]>([]);
  
  // Terminal instances map
  const terminalsRef = useRef<Map<string, {
    xterm: XTerminal;
    fitAddon: FitAddon;
    terminalId: string | null;
    containerRef: HTMLDivElement | null;
  }>>(new Map());
  
  // Resize state
  const [height, setHeight] = useState(defaultHeight);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);
  
  // UI state
  const [showNewTerminalMenu, setShowNewTerminalMenu] = useState(false);
  const [showTabMenu, setShowTabMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // Theme colors from CSS variables
  const getTerminalTheme = useCallback(() => {
    const getComputedColor = (varName: string, fallback: string) => {
      const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      return value || fallback;
    };
    
    return {
      background: getComputedColor('--vscode-panel', '#1e1e1e'),
      foreground: getComputedColor('--vscode-text', '#d4d4d4'),
      cursor: getComputedColor('--vscode-accent', '#aeafad'),
      cursorAccent: getComputedColor('--vscode-panel', '#1e1e1e'),
      selectionBackground: getComputedColor('--vscode-selection', '#264f78'),
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

  // Create a new terminal instance
  const createTerminalInstance = useCallback((tabId: string, containerElement: HTMLDivElement) => {
    const terminalTheme = getTerminalTheme();
    
    const xterm = new XTerminal({
      cursorBlink: true,
      fontFamily: editorSettings.fontFamily || '"JetBrains Mono", "Fira Code", monospace',
      fontSize: editorSettings.fontSize || 13,
      lineHeight: editorSettings.lineHeight || 1.4,
      theme: terminalTheme,
      allowProposedApi: true,
      scrollback: 10000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    xterm.open(containerElement);
    
    // Fit after a small delay to ensure container is rendered
    setTimeout(() => fitAddon.fit(), 100);

    terminalsRef.current.set(tabId, {
      xterm,
      fitAddon,
      terminalId: null,
      containerRef: containerElement,
    });

    return { xterm, fitAddon };
  }, [editorSettings.fontFamily, editorSettings.fontSize, editorSettings.lineHeight, getTerminalTheme]);

  // Connect terminal to backend
  const connectTerminal = useCallback(async (tabId: string, xterm: XTerminal, projectId?: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, status: 'connecting' } : t));
    
    try {
      await socketService.connect();
      
      // Pass projectId to the server - it will start the terminal in the project's workspace directory
      const terminalId = await socketService.createTerminal({
        cols: xterm.cols,
        rows: xterm.rows,
        projectId: projectId,
      });

      console.log(`[Terminal] Created terminal ${terminalId} for project ${projectId || 'default'}`);

      const termData = terminalsRef.current.get(tabId);
      if (termData) {
        termData.terminalId = terminalId;
      }

      setTabs(prev => prev.map(t => 
        t.id === tabId ? { ...t, status: 'connected', terminalId } : t
      ));

      // Set up output handler
      socketService.onTerminalOutput((data) => {
        const termData = terminalsRef.current.get(tabId);
        if (data.terminalId === termData?.terminalId) {
          xterm.write(data.data);
        }
      });

      // Set up exit handler
      socketService.onTerminalExit((data) => {
        const termData = terminalsRef.current.get(tabId);
        if (data.terminalId === termData?.terminalId) {
          xterm.writeln(`\x1b[33m\r\n[Process exited with code ${data.exitCode}]\x1b[0m`);
          setTabs(prev => prev.map(t => 
            t.id === tabId ? { ...t, status: 'disconnected' } : t
          ));
        }
      });

      // Handle user input
      xterm.onData((data) => {
        const termData = terminalsRef.current.get(tabId);
        if (termData?.terminalId && socketService.isConnected()) {
          socketService.sendTerminalInput(termData.terminalId, data);
        }
      });

    } catch (error: any) {
      console.error('Terminal connection failed:', error);
      xterm.writeln(`\x1b[31m✗ Connection failed: ${error.message}\x1b[0m`);
      xterm.writeln('\x1b[90mUsing local shell emulation...\x1b[0m\r\n');
      
      setTabs(prev => prev.map(t => 
        t.id === tabId ? { ...t, status: 'error' } : t
      ));
      
      // Set up local shell emulation
      setupLocalShellEmulation(tabId, xterm);
    }
  }, [tabs]);

  // Local shell emulation for offline/fallback mode
  const setupLocalShellEmulation = useCallback((tabId: string, xterm: XTerminal) => {
    let currentLine = '';
    const commandHistory: string[] = [];
    let historyIndex = -1;

    const writePrompt = () => {
      xterm.write('\x1b[1;32muser\x1b[0m@\x1b[1;34mlocal\x1b[0m \x1b[1;36m~\x1b[0m \x1b[1;35m$\x1b[0m ');
    };

    writePrompt();

    xterm.onData((data) => {
      const code = data.charCodeAt(0);
      
      // Enter
      if (code === 13) {
        xterm.write('\r\n');
        const cmd = currentLine.trim();
        
        if (cmd) {
          commandHistory.push(cmd);
          historyIndex = commandHistory.length;
          executeLocalCommand(cmd, xterm);
        }
        
        currentLine = '';
        writePrompt();
      }
      // Backspace
      else if (code === 127) {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          xterm.write('\b \b');
        }
      }
      // Tab (autocomplete placeholder)
      else if (code === 9) {
        // Basic autocomplete hint
        xterm.write('\x07'); // Bell
      }
      // Arrow keys (escape sequences)
      else if (data === '\x1b[A') { // Up arrow
        if (historyIndex > 0) {
          historyIndex--;
          clearCurrentLine(xterm, currentLine.length);
          currentLine = commandHistory[historyIndex] || '';
          xterm.write(currentLine);
        }
      }
      else if (data === '\x1b[B') { // Down arrow
        if (historyIndex < commandHistory.length - 1) {
          historyIndex++;
          clearCurrentLine(xterm, currentLine.length);
          currentLine = commandHistory[historyIndex] || '';
          xterm.write(currentLine);
        } else {
          historyIndex = commandHistory.length;
          clearCurrentLine(xterm, currentLine.length);
          currentLine = '';
        }
      }
      // Ctrl+C
      else if (code === 3) {
        xterm.write('^C\r\n');
        currentLine = '';
        writePrompt();
      }
      // Ctrl+L (clear)
      else if (code === 12) {
        xterm.clear();
        writePrompt();
      }
      // Printable characters
      else if (code >= 32) {
        currentLine += data;
        xterm.write(data);
      }
    });
  }, []);

  const clearCurrentLine = (xterm: XTerminal, length: number) => {
    for (let i = 0; i < length; i++) {
      xterm.write('\b \b');
    }
  };

  const executeLocalCommand = (command: string, xterm: XTerminal) => {
    const [cmd, ...args] = command.split(' ');
    
    switch (cmd.toLowerCase()) {
      case 'help':
        xterm.writeln('\x1b[1;33m📖 Available Commands:\x1b[0m');
        xterm.writeln('  \x1b[36mclear\x1b[0m       - Clear terminal');
        xterm.writeln('  \x1b[36mecho\x1b[0m <text> - Print text');
        xterm.writeln('  \x1b[36mdate\x1b[0m        - Show date/time');
        xterm.writeln('  \x1b[36mpwd\x1b[0m         - Print working directory');
        xterm.writeln('  \x1b[36mwhoami\x1b[0m      - Show current user');
        xterm.writeln('  \x1b[36menv\x1b[0m         - Show environment');
        xterm.writeln('  \x1b[36mhistory\x1b[0m     - Show command history');
        break;
      case 'clear':
        xterm.clear();
        break;
      case 'echo':
        xterm.writeln(args.join(' '));
        break;
      case 'date':
        xterm.writeln(`\x1b[36m${new Date().toLocaleString()}\x1b[0m`);
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
        break;
      default:
        xterm.writeln(`\x1b[31mCommand not found: ${cmd}\x1b[0m`);
        xterm.writeln('\x1b[90mType "help" for available commands\x1b[0m');
    }
  };

  // Create new terminal tab
  const createTab = useCallback((shellType: ShellType = 'bash', name?: string) => {
    const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  // Close terminal tab
  const closeTab = useCallback((tabId: string) => {
    const termData = terminalsRef.current.get(tabId);
    
    if (termData) {
      if (termData.terminalId) {
        socketService.killTerminal(termData.terminalId);
      }
      termData.xterm.dispose();
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
  }, [activeTabId]);

  // Rename tab
  const renameTab = useCallback((tabId: string, newName: string) => {
    setTabs(prev => prev.map(t => 
      t.id === tabId ? { ...t, name: newName } : t
    ));
    setShowTabMenu(null);
  }, []);

  // Split terminal
  const splitTerminal = useCallback((tabId: string, orientation: 'horizontal' | 'vertical') => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    const newTabId = createTab(tab.shellType, `${tab.name} (Split)`);
    
    const splitId = `split-${Date.now()}`;
    const split: TerminalSplit = {
      id: splitId,
      orientation,
      leftTerminalId: tabId,
      rightTerminalId: newTabId,
      splitRatio: 50,
    };

    setSplits(prev => [...prev, split]);
    setTabs(prev => prev.map(t => {
      if (t.id === tabId) return { ...t, splitId };
      if (t.id === newTabId) return { ...t, splitId };
      return t;
    }));
    
    setShowTabMenu(null);
  }, [tabs, createTab]);

  // Handle resize
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
      const newHeight = Math.max(100, Math.min(600, resizeStartHeight.current + deltaY));
      setHeight(newHeight);
      onHeightChange?.(newHeight);
      
      // Fit all visible terminals
      terminalsRef.current.forEach(({ fitAddon }) => {
        fitAddon.fit();
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

  // Fit terminals on container resize
  useEffect(() => {
    const handleResize = () => {
      terminalsRef.current.forEach(({ fitAddon, terminalId }) => {
        fitAddon.fit();
        const xterm = terminalsRef.current.get(activeTabId || '')?.xterm;
        if (terminalId && xterm && socketService.isConnected()) {
          socketService.resizeTerminal(terminalId, xterm.cols, xterm.rows);
        }
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTabId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+` - New terminal
      if (e.ctrlKey && e.shiftKey && (e.key === '`' || e.keyCode === 192)) {
        e.preventDefault();
        createTab('bash');
      }
      // Ctrl+Shift+5 - Split terminal horizontally
      else if (e.ctrlKey && e.shiftKey && e.key === '5') {
        e.preventDefault();
        if (activeTabId) splitTerminal(activeTabId, 'horizontal');
      }
      // Ctrl+Shift+% - Split terminal vertically
      else if (e.ctrlKey && e.shiftKey && e.key === '%') {
        e.preventDefault();
        if (activeTabId) splitTerminal(activeTabId, 'vertical');
      }
      // Ctrl+W - Close terminal (when terminal focused)
      else if (e.ctrlKey && e.key === 'w' && activeTabId) {
        const termData = terminalsRef.current.get(activeTabId);
        if (termData?.containerRef?.contains(document.activeElement)) {
          e.preventDefault();
          closeTab(activeTabId);
        }
      }
      // Ctrl+PageUp/PageDown - Switch tabs
      else if (e.ctrlKey && e.key === 'PageUp') {
        e.preventDefault();
        switchToPreviousTab();
      }
      else if (e.ctrlKey && e.key === 'PageDown') {
        e.preventDefault();
        switchToNextTab();
      }
      // Ctrl+Shift+F - Find in terminal
      else if (e.ctrlKey && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, createTab, closeTab, splitTerminal]);

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

  // Update terminal theme when app theme changes
  useEffect(() => {
    const terminalTheme = getTerminalTheme();
    terminalsRef.current.forEach(({ xterm }) => {
      xterm.options.theme = terminalTheme;
    });
  }, [theme, getTerminalTheme]);

  // Initialize with first terminal if none exist
  useEffect(() => {
    if (tabs.length === 0) {
      createTab('bash');
    }
  }, []);

  // Theme classes
  const isDark = isDarkTheme(theme) || theme === 'high-contrast';
  const isHighContrast = theme === 'high-contrast';
  
  const bgColor = 'bg-vscode-panel';
  const borderColor = isHighContrast ? 'border-white' : isDark ? 'border-vscode-border' : 'border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100';
  const activeBg = isDark ? 'bg-white/10' : 'bg-gray-100';

  return (
    <div 
      className={`flex flex-col ${bgColor} border-t ${borderColor} ${className}`}
      style={{ height: `${height}px` }}
    >
      {/* Resize Handle */}
      <div 
        className={`h-1 cursor-ns-resize ${isDark ? 'hover:bg-vscode-accent' : 'hover:bg-blue-500'} transition-colors`}
        onMouseDown={handleResizeStart}
      />
      
      {/* Terminal Header */}
      <div className={`flex items-center justify-between px-2 py-1 border-b ${borderColor} ${isDark ? 'bg-vscode-sidebar' : 'bg-gray-50'}`}>
        {/* Tabs */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t cursor-pointer transition-colors ${
                activeTabId === tab.id
                  ? `${activeBg} ${textColor} border-b-2 border-vscode-accent`
                  : `${textMuted} ${hoverBg}`
              }`}
              onClick={() => setActiveTabId(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowTabMenu(tab.id);
              }}
            >
              <span>{SHELL_CONFIG[tab.shellType].icon}</span>
              <span className="max-w-[100px] truncate">{tab.name}</span>
              
              {/* Status indicator */}
              <span className={`w-2 h-2 rounded-full ${
                tab.status === 'connected' ? 'bg-green-500' :
                tab.status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                tab.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
              }`} />
              
              {/* Close button */}
              <button
                className={`opacity-0 group-hover:opacity-100 p-0.5 rounded ${hoverBg} transition-opacity`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                title="Close terminal"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Tab Context Menu */}
              {showTabMenu === tab.id && (
                <div 
                  className={`absolute top-full left-0 mt-1 py-1 rounded shadow-lg z-50 min-w-[160px] ${
                    isDark ? 'bg-vscode-panel border border-vscode-border' : 'bg-white border border-gray-200'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className={`w-full px-3 py-1.5 text-xs text-left ${hoverBg}`}
                    onClick={() => {
                      const name = prompt('Rename terminal:', tab.name);
                      if (name) renameTab(tab.id, name);
                    }}
                  >
                    ✏️ Rename
                  </button>
                  <button
                    className={`w-full px-3 py-1.5 text-xs text-left ${hoverBg}`}
                    onClick={() => splitTerminal(tab.id, 'horizontal')}
                  >
                    ⬌ Split Horizontal
                  </button>
                  <button
                    className={`w-full px-3 py-1.5 text-xs text-left ${hoverBg}`}
                    onClick={() => splitTerminal(tab.id, 'vertical')}
                  >
                    ⬍ Split Vertical
                  </button>
                  <div className={`my-1 border-t ${borderColor}`} />
                  <button
                    className={`w-full px-3 py-1.5 text-xs text-left ${hoverBg} text-red-500`}
                    onClick={() => closeTab(tab.id)}
                  >
                    ✕ Close
                  </button>
                </div>
              )}
            </div>
          ))}
          
          {/* New Terminal Button */}
          <div className="relative">
            <button
              className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded ${textMuted} ${hoverBg}`}
              onClick={() => setShowNewTerminalMenu(prev => !prev)}
              title="New Terminal (Ctrl+Shift+`)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            
            {/* New Terminal Menu */}
            {showNewTerminalMenu && (
              <div className={`absolute top-full left-0 mt-1 py-1 rounded shadow-lg z-50 min-w-[160px] ${
                isDark ? 'bg-vscode-panel border border-vscode-border' : 'bg-white border border-gray-200'
              }`}>
                {(Object.entries(SHELL_CONFIG) as [ShellType, typeof SHELL_CONFIG['bash']][]).map(([type, config]) => (
                  <button
                    key={type}
                    className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 ${hoverBg}`}
                    onClick={() => createTab(type)}
                  >
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Terminal Actions */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <button
            className={`p-1.5 rounded ${textMuted} ${hoverBg}`}
            onClick={() => setShowSearch(prev => !prev)}
            title="Find (Ctrl+Shift+F)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          {/* Split Horizontal */}
          <button
            className={`p-1.5 rounded ${textMuted} ${hoverBg}`}
            onClick={() => activeTabId && splitTerminal(activeTabId, 'horizontal')}
            title="Split Terminal Horizontally"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
            </svg>
          </button>
          
          {/* Split Vertical */}
          <button
            className={`p-1.5 rounded ${textMuted} ${hoverBg}`}
            onClick={() => activeTabId && splitTerminal(activeTabId, 'vertical')}
            title="Split Terminal Vertically"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Kill Terminal */}
          <button
            className={`p-1.5 rounded ${textMuted} ${hoverBg}`}
            onClick={() => activeTabId && closeTab(activeTabId)}
            title="Kill Terminal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          
          {/* Maximize */}
          <button
            className={`p-1.5 rounded ${textMuted} ${hoverBg}`}
            onClick={() => setHeight(height === defaultHeight ? 400 : defaultHeight)}
            title="Toggle Maximize"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {height === defaultHeight ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
              )}
            </svg>
          </button>
        </div>
      </div>
      
      {/* Search Bar */}
      {showSearch && (
        <div className={`flex items-center gap-2 px-2 py-1 border-b ${borderColor}`}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in terminal..."
            className={`flex-1 px-2 py-1 text-xs rounded border ${
              isDark ? 'bg-vscode-input border-vscode-border text-white' : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:border-vscode-accent`}
            autoFocus
          />
          <button
            className={`p-1 rounded ${textMuted} ${hoverBg}`}
            onClick={() => setShowSearch(false)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden">
        {tabs.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full ${textMuted}`}>
            <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">No terminal open</p>
            <button
              className={`mt-2 px-3 py-1.5 text-xs rounded ${isDark ? 'bg-vscode-accent' : 'bg-blue-500'} text-white`}
              onClick={() => createTab('bash')}
            >
              Create Terminal
            </button>
          </div>
        ) : (
          tabs.map((tab) => (
            <TerminalContent
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onMount={(container) => {
                const { xterm, fitAddon } = createTerminalInstance(tab.id, container);
                connectTerminal(tab.id, xterm, effectiveProjectId);
              }}
              theme={theme}
            />
          ))
        )}
      </div>
      
      {/* Click outside handler */}
      {(showNewTerminalMenu || showTabMenu) && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNewTerminalMenu(false);
            setShowTabMenu(null);
          }}
        />
      )}
    </div>
  );
};

// Separate component for terminal content to handle mounting
interface TerminalContentProps {
  tab: TerminalTab;
  isActive: boolean;
  onMount: (container: HTMLDivElement) => void;
  theme: string;
}

const TerminalContent: React.FC<TerminalContentProps> = ({ tab, isActive, onMount, theme }) => {
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
      className={`h-full w-full p-1 ${isActive ? 'block' : 'hidden'}`}
      style={{ backgroundColor: bgColor }}
    />
  );
};

export default IntegratedTerminal;
