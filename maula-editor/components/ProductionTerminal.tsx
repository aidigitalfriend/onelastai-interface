/**
 * Production-Level Terminal Component
 * Features:
 * - Multi-tab terminal sessions
 * - Split view (horizontal/vertical)
 * - Search within terminal output
 * - Command history navigation
 * - Copy/paste support
 * - Keyboard shortcuts
 * - Session persistence and recovery
 * - Theme customization
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import {
  terminalService,
  TerminalSession,
  TerminalOutput,
  TerminalConfig,
  TERMINAL_THEMES,
} from '../services/terminal';
import { socketService } from '../services/socket';

// ==================== Types ====================

interface TerminalTab {
  id: string;
  session: TerminalSession;
  terminal: XTerminal;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
}

interface SplitPane {
  id: string;
  tabs: TerminalTab[];
  activeTabId: string | null;
  size: number; // Percentage
}

type SplitDirection = 'horizontal' | 'vertical' | 'none';

interface TerminalPanelProps {
  className?: string;
  initialSplit?: SplitDirection;
  maxTabs?: number;
}

// ==================== Icons ====================

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SplitHorizontalIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const SplitVerticalIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16M15 4v16" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ClearIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const MaximizeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

const MinimizeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

const GearIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// ==================== Main Component ====================

export const ProductionTerminal: React.FC<TerminalPanelProps> = ({
  className = '',
  initialSplit = 'none',
  maxTabs = 10,
}) => {
  const { theme } = useStore();
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  // State
  const [panes, setPanes] = useState<SplitPane[]>([
    { id: 'pane-1', tabs: [], activeTabId: null, size: 100 },
  ]);
  const [splitDirection, setSplitDirection] = useState<SplitDirection>(initialSplit);
  const [activePaneId, setActivePaneId] = useState('pane-1');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [config, setConfig] = useState<TerminalConfig>(terminalService.getConfig());

  // Refs
  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const terminalTabsRef = useRef<Map<string, TerminalTab>>(new Map());

  // Theme
  const terminalTheme = useMemo(() => terminalService.getTheme(config.theme), [config.theme]);

  // Theme classes
  const bgClass = isDark ? 'bg-slate-900' : 'bg-white';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const hoverClass = isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100';
  const activeClass = isDark ? 'bg-slate-800' : 'bg-gray-100';

  // ==================== Terminal Management ====================

  const createTerminalInstance = useCallback((session: TerminalSession, container: HTMLDivElement): TerminalTab => {
    const terminal = new XTerminal({
      cursorBlink: config.cursorBlink,
      cursorStyle: config.cursorStyle,
      fontFamily: config.fontFamily,
      fontSize: config.fontSize,
      lineHeight: 1.4,
      scrollback: config.scrollback,
      theme: terminalTheme,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(container);
    fitAddon.fit();

    // Welcome message
    terminal.writeln('\x1b[1;36m╔════════════════════════════════════════════════════╗\x1b[0m');
    terminal.writeln('\x1b[1;36m║\x1b[0m   \x1b[1;33m⚡ Maula IDE - Production Terminal\x1b[0m              \x1b[1;36m║\x1b[0m');
    terminal.writeln('\x1b[1;36m║\x1b[0m      \x1b[90mSession: ' + session.name.padEnd(30) + '\x1b[0m\x1b[1;36m║\x1b[0m');
    terminal.writeln('\x1b[1;36m╚════════════════════════════════════════════════════╝\x1b[0m');
    terminal.writeln('');

    return {
      id: session.id,
      session,
      terminal,
      fitAddon,
      searchAddon,
    };
  }, [config, terminalTheme]);

  const createNewTab = useCallback(async (paneId: string) => {
    const pane = panes.find(p => p.id === paneId);
    if (!pane || pane.tabs.length >= maxTabs) return;

    try {
      setConnectionStatus('connecting');
      const session = await terminalService.createSession({
        name: `Terminal ${pane.tabs.length + 1}`,
        type: 'remote',
        cols: 80,
        rows: 24,
      });

      const container = containerRefs.current.get(`${paneId}-${session.id}`);
      if (container) {
        const tab = createTerminalInstance(session, container);
        terminalTabsRef.current.set(session.id, tab);

        // Set up socket handlers for this terminal
        socketService.onTerminalOutput((data) => {
          if (data.terminalId === session.id) {
            tab.terminal.write(data.data);
          }
        });

        // Handle user input
        tab.terminal.onData((data) => {
          terminalService.write(session.id, data);
        });

        setPanes(prev => prev.map(p => {
          if (p.id === paneId) {
            return {
              ...p,
              tabs: [...p.tabs, tab],
              activeTabId: session.id,
            };
          }
          return p;
        }));

        setConnectionStatus('connected');
      }
    } catch (error) {
      console.error('Failed to create terminal:', error);
      setConnectionStatus('disconnected');
    }
  }, [panes, maxTabs, createTerminalInstance]);

  const closeTab = useCallback((paneId: string, tabId: string) => {
    terminalService.closeSession(tabId);
    
    const tab = terminalTabsRef.current.get(tabId);
    if (tab) {
      tab.terminal.dispose();
      terminalTabsRef.current.delete(tabId);
    }

    setPanes(prev => prev.map(p => {
      if (p.id === paneId) {
        const newTabs = p.tabs.filter(t => t.id !== tabId);
        let newActiveId = p.activeTabId;
        
        if (p.activeTabId === tabId) {
          newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
        }

        return {
          ...p,
          tabs: newTabs,
          activeTabId: newActiveId,
        };
      }
      return p;
    }));
  }, []);

  const setActiveTab = useCallback((paneId: string, tabId: string) => {
    setPanes(prev => prev.map(p => {
      if (p.id === paneId) {
        return { ...p, activeTabId: tabId };
      }
      return p;
    }));
    setActivePaneId(paneId);

    // Focus the terminal
    const tab = terminalTabsRef.current.get(tabId);
    if (tab) {
      setTimeout(() => tab.terminal.focus(), 0);
    }
  }, []);

  // ==================== Split Management ====================

  const toggleSplit = useCallback((direction: SplitDirection) => {
    if (splitDirection === direction) {
      // Remove split - merge panes
      if (panes.length > 1) {
        const allTabs = panes.flatMap(p => p.tabs);
        setPanes([{
          id: 'pane-1',
          tabs: allTabs,
          activeTabId: allTabs[0]?.id || null,
          size: 100,
        }]);
        setActivePaneId('pane-1');
      }
      setSplitDirection('none');
    } else {
      // Create split
      setSplitDirection(direction);
      if (panes.length === 1) {
        setPanes(prev => [
          { ...prev[0], size: 50 },
          { id: 'pane-2', tabs: [], activeTabId: null, size: 50 },
        ]);
      }
    }
  }, [splitDirection, panes]);

  // ==================== Search ====================

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    const activePane = panes.find(p => p.id === activePaneId);
    const activeTab = activePane?.tabs.find(t => t.id === activePane.activeTabId);
    
    if (activeTab && query) {
      activeTab.searchAddon.findNext(query, { caseSensitive: false });
    }
  }, [panes, activePaneId]);

  const searchNext = useCallback(() => {
    const activePane = panes.find(p => p.id === activePaneId);
    const activeTab = activePane?.tabs.find(t => t.id === activePane.activeTabId);
    
    if (activeTab && searchQuery) {
      activeTab.searchAddon.findNext(searchQuery);
    }
  }, [panes, activePaneId, searchQuery]);

  const searchPrevious = useCallback(() => {
    const activePane = panes.find(p => p.id === activePaneId);
    const activeTab = activePane?.tabs.find(t => t.id === activePane.activeTabId);
    
    if (activeTab && searchQuery) {
      activeTab.searchAddon.findPrevious(searchQuery);
    }
  }, [panes, activePaneId, searchQuery]);

  // ==================== Clear Terminal ====================

  const clearTerminal = useCallback(() => {
    const activePane = panes.find(p => p.id === activePaneId);
    const activeTab = activePane?.tabs.find(t => t.id === activePane.activeTabId);
    
    if (activeTab) {
      activeTab.terminal.clear();
    }
  }, [panes, activePaneId]);

  // ==================== Keyboard Shortcuts ====================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + T: New terminal
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 't') {
        e.preventDefault();
        createNewTab(activePaneId);
      }
      
      // Ctrl/Cmd + W: Close terminal
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        const activePane = panes.find(p => p.id === activePaneId);
        if (activePane?.activeTabId) {
          e.preventDefault();
          closeTab(activePaneId, activePane.activeTabId);
        }
      }
      
      // Ctrl/Cmd + F: Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      
      // Ctrl/Cmd + K: Clear
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        clearTerminal();
      }
      
      // Escape: Close search
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
      
      // Ctrl/Cmd + Shift + \: Split vertical
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '\\') {
        e.preventDefault();
        toggleSplit('vertical');
      }
      
      // Ctrl/Cmd + Shift + -: Split horizontal
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '-') {
        e.preventDefault();
        toggleSplit('horizontal');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePaneId, panes, isSearchOpen, createNewTab, closeTab, clearTerminal, toggleSplit]);

  // ==================== Resize Handler ====================

  useEffect(() => {
    const handleResize = () => {
      terminalTabsRef.current.forEach(tab => {
        tab.fitAddon.fit();
        terminalService.resize(tab.id, tab.terminal.cols, tab.terminal.rows);
      });
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    
    containerRefs.current.forEach(container => {
      resizeObserver.observe(container);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [panes]);

  // ==================== Initialize First Terminal ====================

  useEffect(() => {
    // Connect to socket and create initial terminal
    const init = async () => {
      try {
        setConnectionStatus('connecting');
        await socketService.connect();
        setConnectionStatus('connected');
        
        // Create initial terminal if none exist
        if (panes[0].tabs.length === 0) {
          // We need to wait for the container to be ready
          setTimeout(() => createNewTab('pane-1'), 100);
        }
      } catch (error) {
        console.error('Failed to initialize terminal:', error);
        setConnectionStatus('disconnected');
      }
    };

    init();

    return () => {
      // Cleanup all terminals on unmount
      terminalTabsRef.current.forEach(tab => {
        terminalService.closeSession(tab.id);
        tab.terminal.dispose();
      });
    };
  }, []);

  // ==================== Render Pane ====================

  const renderPane = (pane: SplitPane) => {
    const activeTab = pane.tabs.find(t => t.id === pane.activeTabId);

    return (
      <div
        key={pane.id}
        className={`flex flex-col h-full ${pane.id === activePaneId ? '' : 'opacity-90'}`}
        style={{ flex: `${pane.size} 0 0%` }}
        onClick={() => setActivePaneId(pane.id)}
      >
        {/* Tab Bar */}
        <div className={`flex items-center h-9 ${bgClass} border-b ${borderClass} overflow-x-auto`}>
          <div className="flex items-center flex-1 min-w-0">
            {pane.tabs.map(tab => (
              <div
                key={tab.id}
                className={`group flex items-center gap-1 px-3 h-full cursor-pointer border-r ${borderClass} ${
                  tab.id === pane.activeTabId ? activeClass : hoverClass
                } transition-colors min-w-0`}
                onClick={() => setActiveTab(pane.id, tab.id)}
              >
                <span className={`text-xs ${tab.session.status === 'connected' ? 'text-green-500' : 'text-red-500'}`}>
                  ●
                </span>
                <span className={`text-xs truncate ${textClass}`}>
                  {tab.session.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(pane.id, tab.id);
                  }}
                  className={`opacity-0 group-hover:opacity-100 p-0.5 rounded ${hoverClass} transition-opacity`}
                >
                  <CloseIcon />
                </button>
              </div>
            ))}
          </div>
          
          {/* New Tab Button */}
          {pane.tabs.length < maxTabs && (
            <button
              onClick={() => createNewTab(pane.id)}
              className={`p-2 ${hoverClass} transition-colors`}
              title="New Terminal (Ctrl+Shift+T)"
            >
              <PlusIcon />
            </button>
          )}
        </div>

        {/* Terminal Container */}
        <div className="flex-1 relative">
          {pane.tabs.map(tab => (
            <div
              key={tab.id}
              ref={(el) => {
                if (el) {
                  containerRefs.current.set(`${pane.id}-${tab.id}`, el);
                }
              }}
              className={`absolute inset-0 p-1 ${
                tab.id === pane.activeTabId ? 'block' : 'hidden'
              }`}
              style={{ background: terminalTheme.background }}
            />
          ))}
          
          {pane.tabs.length === 0 && (
            <div className={`flex items-center justify-center h-full ${mutedClass}`}>
              <div className="text-center">
                <p className="mb-2">No terminal open</p>
                <button
                  onClick={() => createNewTab(pane.id)}
                  className={`px-4 py-2 rounded ${hoverClass} border ${borderClass}`}
                >
                  Create Terminal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==================== Main Render ====================

  return (
    <div className={`flex flex-col h-full ${bgClass} ${className} ${isMaximized ? 'fixed inset-0 z-50' : ''}`}>
      {/* Toolbar */}
      <div className={`flex items-center justify-between px-2 py-1 border-b ${borderClass}`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${textClass}`}>Terminal</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            connectionStatus === 'connected'
              ? 'bg-green-500/20 text-green-400'
              : connectionStatus === 'connecting'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
          }`}>
            {connectionStatus === 'connected' ? '● Connected' : connectionStatus === 'connecting' ? '○ Connecting...' : '○ Disconnected'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Search Toggle */}
          <button
            onClick={() => {
              setIsSearchOpen(prev => !prev);
              setTimeout(() => searchInputRef.current?.focus(), 0);
            }}
            className={`p-1.5 rounded ${isSearchOpen ? activeClass : hoverClass} transition-colors`}
            title="Search (Ctrl+F)"
          >
            <SearchIcon />
          </button>
          
          {/* Clear */}
          <button
            onClick={clearTerminal}
            className={`p-1.5 rounded ${hoverClass} transition-colors`}
            title="Clear (Ctrl+K)"
          >
            <ClearIcon />
          </button>
          
          {/* Split Horizontal */}
          <button
            onClick={() => toggleSplit('horizontal')}
            className={`p-1.5 rounded ${splitDirection === 'horizontal' ? activeClass : hoverClass} transition-colors`}
            title="Split Horizontal (Ctrl+Shift+-)"
          >
            <SplitHorizontalIcon />
          </button>
          
          {/* Split Vertical */}
          <button
            onClick={() => toggleSplit('vertical')}
            className={`p-1.5 rounded ${splitDirection === 'vertical' ? activeClass : hoverClass} transition-colors`}
            title="Split Vertical (Ctrl+Shift+\)"
          >
            <SplitVerticalIcon />
          </button>
          
          {/* Maximize */}
          <button
            onClick={() => setIsMaximized(prev => !prev)}
            className={`p-1.5 rounded ${hoverClass} transition-colors`}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <MinimizeIcon /> : <MaximizeIcon />}
          </button>
          
          {/* Settings */}
          <button
            onClick={() => setIsSettingsOpen(prev => !prev)}
            className={`p-1.5 rounded ${isSettingsOpen ? activeClass : hoverClass} transition-colors`}
            title="Settings"
          >
            <GearIcon />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`px-2 py-1.5 border-b ${borderClass} overflow-hidden`}
          >
            <div className="flex items-center gap-2">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.shiftKey ? searchPrevious() : searchNext();
                  }
                }}
                placeholder="Search..."
                className={`flex-1 px-2 py-1 text-sm rounded border ${
                  isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'
                } outline-none focus:ring-1 focus:ring-blue-500`}
              />
              <button
                onClick={searchPrevious}
                className={`p-1 rounded ${hoverClass}`}
                title="Previous (Shift+Enter)"
              >
                ↑
              </button>
              <button
                onClick={searchNext}
                className={`p-1 rounded ${hoverClass}`}
                title="Next (Enter)"
              >
                ↓
              </button>
              <button
                onClick={() => setIsSearchOpen(false)}
                className={`p-1 rounded ${hoverClass}`}
              >
                <CloseIcon />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`px-3 py-2 border-b ${borderClass} overflow-hidden`}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {/* Font Size */}
              <div>
                <label className={`block text-xs ${mutedClass} mb-1`}>Font Size</label>
                <input
                  type="number"
                  value={config.fontSize}
                  onChange={(e) => {
                    const newConfig = { ...config, fontSize: parseInt(e.target.value) || 13 };
                    setConfig(newConfig);
                    terminalService.setConfig(newConfig);
                  }}
                  className={`w-full px-2 py-1 rounded border ${
                    isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'
                  }`}
                  min={8}
                  max={24}
                />
              </div>
              
              {/* Theme */}
              <div>
                <label className={`block text-xs ${mutedClass} mb-1`}>Theme</label>
                <select
                  value={config.theme}
                  onChange={(e) => {
                    const newConfig = { ...config, theme: e.target.value as 'dark' | 'light' | 'custom' };
                    setConfig(newConfig);
                    terminalService.setConfig(newConfig);
                  }}
                  className={`w-full px-2 py-1 rounded border ${
                    isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="monokai">Monokai</option>
                  <option value="dracula">Dracula</option>
                </select>
              </div>
              
              {/* Cursor Style */}
              <div>
                <label className={`block text-xs ${mutedClass} mb-1`}>Cursor</label>
                <select
                  value={config.cursorStyle}
                  onChange={(e) => {
                    const newConfig = { ...config, cursorStyle: e.target.value as 'block' | 'underline' | 'bar' };
                    setConfig(newConfig);
                    terminalService.setConfig(newConfig);
                  }}
                  className={`w-full px-2 py-1 rounded border ${
                    isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="block">Block</option>
                  <option value="underline">Underline</option>
                  <option value="bar">Bar</option>
                </select>
              </div>
              
              {/* Cursor Blink */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cursorBlink"
                  checked={config.cursorBlink}
                  onChange={(e) => {
                    const newConfig = { ...config, cursorBlink: e.target.checked };
                    setConfig(newConfig);
                    terminalService.setConfig(newConfig);
                  }}
                />
                <label htmlFor="cursorBlink" className={`text-xs ${mutedClass}`}>Cursor Blink</label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terminal Panes */}
      <div className={`flex-1 flex ${splitDirection === 'horizontal' ? 'flex-col' : 'flex-row'} min-h-0`}>
        {panes.map((pane, index) => (
          <React.Fragment key={pane.id}>
            {renderPane(pane)}
            {index < panes.length - 1 && (
              <div
                className={`${
                  splitDirection === 'horizontal'
                    ? `h-1 cursor-row-resize border-y ${borderClass}`
                    : `w-1 cursor-col-resize border-x ${borderClass}`
                } ${isDark ? 'bg-slate-700 hover:bg-blue-500' : 'bg-gray-200 hover:bg-blue-400'} transition-colors`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Keyboard Shortcuts Help (shown on hover) */}
      <div className={`px-2 py-1 text-xs ${mutedClass} border-t ${borderClass} flex items-center gap-4`}>
        <span><kbd className="px-1 rounded bg-slate-700">Ctrl+Shift+T</kbd> New</span>
        <span><kbd className="px-1 rounded bg-slate-700">Ctrl+W</kbd> Close</span>
        <span><kbd className="px-1 rounded bg-slate-700">Ctrl+F</kbd> Search</span>
        <span><kbd className="px-1 rounded bg-slate-700">Ctrl+K</kbd> Clear</span>
      </div>
    </div>
  );
};

export default ProductionTerminal;
