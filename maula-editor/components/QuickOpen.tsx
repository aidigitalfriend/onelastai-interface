import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { FileNode, OpenFile } from '../types';
import { isDarkTheme } from '../utils/theme';

interface QuickOpenProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'files' | 'commands' | 'symbols' | 'lines';
  onFileSelect?: (file: FileNode) => void;
  onOpenWorkspaceManager?: () => void;
}

interface QuickOpenItem {
  id: string;
  label: string;
  description?: string;
  detail?: string;
  icon?: React.ReactNode;
  action: () => void;
  type: 'file' | 'command' | 'symbol' | 'recent' | 'line';
  path?: string;
  lineNumber?: number;
}

export const QuickOpen: React.FC<QuickOpenProps> = ({ isOpen, onClose, mode: initialMode = 'files', onFileSelect, onOpenWorkspaceManager }) => {
  const { files, openFile, theme, currentProject, projects, setCurrentProject, setFiles } = useStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<'files' | 'commands' | 'symbols' | 'lines'>(initialMode);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isDark = isDarkTheme(theme);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Parse query for mode switching
  useEffect(() => {
    if (query.startsWith('>')) {
      setMode('commands');
    } else if (query.startsWith('@')) {
      setMode('symbols');
    } else if (query.startsWith(':')) {
      setMode('lines');
    } else {
      setMode('files');
    }
  }, [query]);

  // Flatten files for search
  const flattenFiles = useCallback((nodes: FileNode[]): FileNode[] => {
    let result: FileNode[] = [];
    for (const node of nodes) {
      if (node.type === 'file') {
        result.push(node);
      } else if (node.children) {
        result = result.concat(flattenFiles(node.children));
      }
    }
    return result;
  }, []);

  // Get file icon
  const getFileIcon = (name: string): React.ReactNode => {
    const ext = name.split('.').pop()?.toLowerCase();
    const iconColors: Record<string, string> = {
      ts: '#3178c6',
      tsx: '#61dafb',
      js: '#f7df1e',
      jsx: '#61dafb',
      json: '#fbc02d',
      css: '#1572b6',
      scss: '#cc6699',
      html: '#e44d26',
      md: '#42a5f5',
      py: '#3776ab',
    };
    const color = iconColors[ext || ''] || '#90a4ae';
    
    return (
      <div 
        className="w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {ext?.substring(0, 2).toUpperCase() || '📄'}
      </div>
    );
  };

  // Commands list
  const commands: QuickOpenItem[] = useMemo(() => [
    {
      id: 'view.terminal',
      label: 'View: Toggle Terminal',
      description: 'Ctrl+`',
      icon: <span className="text-lg">⌨️</span>,
      action: () => {
        const { toggleTerminal } = useStore.getState();
        toggleTerminal();
      },
      type: 'command' as const,
    },
    {
      id: 'view.sidebar',
      label: 'View: Toggle Sidebar',
      description: 'Ctrl+B',
      icon: <span className="text-lg">📁</span>,
      action: () => {
        const { toggleSidebar } = useStore.getState();
        toggleSidebar();
      },
      type: 'command' as const,
    },
    {
      id: 'theme.toggle',
      label: 'Preferences: Toggle Color Theme',
      description: '',
      icon: <span className="text-lg">🎨</span>,
      action: () => {
        const { theme, setTheme } = useStore.getState();
        setTheme(isDarkTheme(theme) ? 'light' : 'dark');
      },
      type: 'command' as const,
    },
    {
      id: 'file.save',
      label: 'File: Save',
      description: 'Ctrl+S',
      icon: <span className="text-lg">💾</span>,
      action: () => {
        // Trigger save
        console.log('Save file');
      },
      type: 'command' as const,
    },
    {
      id: 'file.saveAll',
      label: 'File: Save All',
      description: 'Ctrl+K S',
      icon: <span className="text-lg">💾</span>,
      action: () => {
        console.log('Save all files');
      },
      type: 'command' as const,
    },
    {
      id: 'editor.format',
      label: 'Format Document',
      description: 'Shift+Alt+F',
      icon: <span className="text-lg">📝</span>,
      action: () => {
        console.log('Format document');
      },
      type: 'command' as const,
    },
    {
      id: 'editor.fold',
      label: 'Fold All',
      description: 'Ctrl+K Ctrl+0',
      icon: <span className="text-lg">📂</span>,
      action: () => {
        console.log('Fold all');
      },
      type: 'command' as const,
    },
    {
      id: 'editor.unfold',
      label: 'Unfold All',
      description: 'Ctrl+K Ctrl+J',
      icon: <span className="text-lg">📂</span>,
      action: () => {
        console.log('Unfold all');
      },
      type: 'command' as const,
    },
    {
      id: 'git.commit',
      label: 'Git: Commit',
      description: '',
      icon: <span className="text-lg">📦</span>,
      action: () => {
        console.log('Git commit');
      },
      type: 'command' as const,
    },
    {
      id: 'git.push',
      label: 'Git: Push',
      description: '',
      icon: <span className="text-lg">⬆️</span>,
      action: () => {
        console.log('Git push');
      },
      type: 'command' as const,
    },
    {
      id: 'git.pull',
      label: 'Git: Pull',
      description: '',
      icon: <span className="text-lg">⬇️</span>,
      action: () => {
        console.log('Git pull');
      },
      type: 'command' as const,
    },
  ], []);

  // Recent projects as items
  const recentProjects: QuickOpenItem[] = useMemo(() => 
    projects.slice(0, 10).map(project => ({
      id: `project-${project.id}`,
      label: project.name,
      description: `${project.template} • ${new Date(project.updatedAt).toLocaleDateString()}`,
      detail: `${project.files.length} files`,
      icon: <span className="text-lg">📂</span>,
      action: () => {
        setCurrentProject(project);
        setFiles(project.files);
      },
      type: 'recent' as const,
    })),
    [projects, setCurrentProject, setFiles]
  );

  // File items
  const fileItems: QuickOpenItem[] = useMemo(() => {
    const allFiles = flattenFiles(files);
    return allFiles.map(file => ({
      id: file.id,
      label: file.name,
      description: file.path,
      icon: getFileIcon(file.name),
      path: file.path,
      action: () => {
        const openFileData: OpenFile = {
          id: file.id,
          name: file.name,
          path: file.path,
          content: file.content || '',
          language: file.language || 'plaintext',
          isDirty: false,
        };
        openFile(openFileData);
      },
      type: 'file' as const,
    }));
  }, [files, flattenFiles, openFile]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    let items: QuickOpenItem[] = [];
    let searchQuery = query;

    if (mode === 'commands') {
      searchQuery = query.startsWith('>') ? query.slice(1).trim() : query;
      items = commands;
    } else if (mode === 'lines') {
      const lineNum = parseInt(query.slice(1));
      if (!isNaN(lineNum)) {
        return [{
          id: 'goto-line',
          label: `Go to Line ${lineNum}`,
          description: 'Press Enter to go',
          icon: <span className="text-lg">↓</span>,
          action: () => {
            // TODO: Implement go to line
            console.log('Go to line', lineNum);
          },
          type: 'line' as const,
          lineNumber: lineNum,
        }];
      }
      return [];
    } else {
      // Files mode - combine files and recent projects
      items = [
        ...fileItems,
        ...recentProjects,
      ];
    }

    if (!searchQuery.trim()) {
      return items.slice(0, 20);
    }

    const lowerQuery = searchQuery.toLowerCase();
    
    // Fuzzy match scoring
    const scored = items.map(item => {
      const label = item.label.toLowerCase();
      const path = (item.path || '').toLowerCase();
      
      // Exact match gets highest score
      if (label === lowerQuery) return { item, score: 1000 };
      
      // Starts with gets high score
      if (label.startsWith(lowerQuery)) return { item, score: 500 + (100 - label.length) };
      
      // Contains gets medium score
      if (label.includes(lowerQuery)) return { item, score: 300 + (100 - label.length) };
      
      // Path contains
      if (path.includes(lowerQuery)) return { item, score: 100 };
      
      // Fuzzy match - check if all characters appear in order
      let queryIdx = 0;
      let matchScore = 0;
      for (let i = 0; i < label.length && queryIdx < lowerQuery.length; i++) {
        if (label[i] === lowerQuery[queryIdx]) {
          matchScore += 10;
          queryIdx++;
        }
      }
      if (queryIdx === lowerQuery.length) {
        return { item, score: matchScore };
      }
      
      return { item, score: 0 };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.item)
      .slice(0, 20);
  }, [query, mode, commands, fileItems, recentProjects]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Reset selection when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Tab':
        e.preventDefault();
        // Cycle through modes
        if (mode === 'files') {
          setQuery('>');
        } else if (mode === 'commands') {
          setQuery('@');
        } else if (mode === 'symbols') {
          setQuery(':');
        } else {
          setQuery('');
        }
        break;
    }
  }, [filteredItems, selectedIndex, onClose, mode]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Quick Open Panel */}
      <div 
        className={`relative w-full max-w-2xl mx-4 ${
          isDark ? 'bg-vscode-sidebar border-vscode-border' : 'bg-white border-gray-200'
        } border rounded-lg shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className={`flex items-center gap-2 px-3 py-3 border-b ${
          isDark ? 'border-vscode-border' : 'border-gray-200'
        }`}>
          <svg className={`w-5 h-5 shrink-0 ${isDark ? 'text-vscode-textMuted' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'commands' ? 'Type a command...' :
              mode === 'symbols' ? 'Type @ to search symbols...' :
              mode === 'lines' ? 'Type : followed by line number...' :
              'Search files by name (or > for commands, @ for symbols, : for lines)'
            }
            className={`flex-1 bg-transparent border-none outline-none text-sm ${
              isDark ? 'text-white placeholder-vscode-textMuted' : 'text-gray-900 placeholder-gray-400'
            }`}
          />
          
          {/* Mode indicators */}
          <div className="flex items-center gap-1">
            {mode === 'commands' && (
              <span className={`px-2 py-0.5 text-xs rounded ${
                isDark ? 'bg-vscode-accent text-white' : 'bg-blue-500 text-white'
              }`}>
                Commands
              </span>
            )}
            {mode === 'symbols' && (
              <span className={`px-2 py-0.5 text-xs rounded ${
                isDark ? 'bg-purple-500 text-white' : 'bg-purple-500 text-white'
              }`}>
                Symbols
              </span>
            )}
            {mode === 'lines' && (
              <span className={`px-2 py-0.5 text-xs rounded ${
                isDark ? 'bg-green-500 text-white' : 'bg-green-500 text-white'
              }`}>
                Go to Line
              </span>
            )}
          </div>
          
          <kbd className={`px-1.5 py-0.5 text-[10px] rounded shrink-0 ${
            isDark ? 'bg-vscode-bg text-vscode-textMuted' : 'bg-gray-100 text-gray-500'
          }`}>
            ESC
          </kbd>
        </div>
        
        {/* Results List */}
        <div 
          ref={listRef}
          className="max-h-96 overflow-y-auto"
        >
          {filteredItems.length === 0 ? (
            <div className={`px-4 py-8 text-center ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
              <p className="text-sm">
                {query ? 'No results found' : mode === 'commands' ? 'Type to search commands' : 'Type to search files'}
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  index === selectedIndex
                    ? isDark ? 'bg-vscode-selection' : 'bg-blue-50'
                    : isDark ? 'hover:bg-vscode-hover' : 'hover:bg-gray-50'
                }`}
              >
                {/* Icon */}
                <div className="shrink-0">
                  {item.icon}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {item.label}
                  </div>
                  {item.description && (
                    <div className={`text-xs truncate ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
                      {item.description}
                    </div>
                  )}
                </div>
                
                {/* Type badge */}
                {item.type === 'recent' && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    isDark ? 'bg-vscode-hover text-vscode-textMuted' : 'bg-gray-200 text-gray-500'
                  }`}>
                    Recent
                  </span>
                )}
                
                {/* Shortcut */}
                {item.type === 'command' && item.description && (
                  <kbd className={`text-[10px] px-1.5 py-0.5 rounded ${
                    isDark ? 'bg-vscode-bg text-vscode-textMuted' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {item.description}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className={`flex items-center justify-between px-3 py-2 border-t text-[10px] ${
          isDark ? 'border-vscode-border text-vscode-textMuted bg-vscode-bg/50' : 'border-gray-200 text-gray-500 bg-gray-50'
        }`}>
          <div className="flex items-center gap-3">
            <span>
              <kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-vscode-hover' : 'bg-gray-200'}`}>↑↓</kbd>
              {' '}Navigate
            </span>
            <span>
              <kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-vscode-hover' : 'bg-gray-200'}`}>Enter</kbd>
              {' '}Open
            </span>
            <span>
              <kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-vscode-hover' : 'bg-gray-200'}`}>Tab</kbd>
              {' '}Switch Mode
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-50">{'>'} Commands</span>
            <span className="opacity-50">@ Symbols</span>
            <span className="opacity-50">: Go to Line</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickOpen;
