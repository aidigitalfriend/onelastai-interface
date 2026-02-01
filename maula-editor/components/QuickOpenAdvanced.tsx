import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useStore } from '../store/useStore';
import { FileNode, Project, Workspace } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { isDarkTheme } from '../utils/theme';

// ============================================================================
// Types
// ============================================================================

interface QuickOpenAdvancedProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect?: (file: FileNode) => void;
}

type QuickOpenMode = 'files' | 'commands' | 'symbols' | 'lines' | 'projects' | 'workspaces' | 'recent' | 'goto';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  icon: string;
  action: () => void;
  category: string;
}

interface SymbolItem {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'method' | 'property' | 'enum' | 'constant';
  line: number;
  fileId: string;
  fileName: string;
}

// ============================================================================
// Mode Configurations
// ============================================================================

const MODE_CONFIG: Record<QuickOpenMode, { prefix: string; placeholder: string; icon: string }> = {
  files: { prefix: '', placeholder: 'Search files by name...', icon: '📄' },
  commands: { prefix: '>', placeholder: 'Search and run commands...', icon: '⌘' },
  symbols: { prefix: '@', placeholder: 'Go to symbol in file...', icon: '#' },
  lines: { prefix: ':', placeholder: 'Go to line number...', icon: '↓' },
  projects: { prefix: 'p:', placeholder: 'Switch to project...', icon: '📂' },
  workspaces: { prefix: 'w:', placeholder: 'Switch workspace...', icon: '🗂️' },
  recent: { prefix: 'r:', placeholder: 'Open recent file...', icon: '🕐' },
  goto: { prefix: 'g:', placeholder: 'Go to file:line...', icon: '→' },
};

// ============================================================================
// Symbol Icons
// ============================================================================

const SYMBOL_ICONS: Record<string, { icon: string; color: string }> = {
  function: { icon: 'ƒ', color: '#b180d7' },
  class: { icon: 'C', color: '#e2c08d' },
  interface: { icon: 'I', color: '#75beff' },
  variable: { icon: 'V', color: '#75beff' },
  method: { icon: 'M', color: '#b180d7' },
  property: { icon: 'P', color: '#75beff' },
  enum: { icon: 'E', color: '#e2c08d' },
  constant: { icon: 'K', color: '#4fc1ff' },
};

// ============================================================================
// Main Component
// ============================================================================

export const QuickOpenAdvanced: React.FC<QuickOpenAdvancedProps> = ({
  isOpen,
  onClose,
  onFileSelect,
}) => {
  const {
    files,
    openFiles,
    openFile,
    setActiveFile,
    theme,
    projects,
    currentProject,
    setCurrentProject,
    setFiles,
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    toggleSidebar,
    toggleTerminal,
  } = useStore();

  // State
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<QuickOpenMode>('files');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isDark = isDarkTheme(theme) || theme === 'high-contrast';

  // ============================================================================
  // Reset state when opened
  // ============================================================================

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setMode('files');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ============================================================================
  // Detect Mode from Query
  // ============================================================================

  useEffect(() => {
    const q = query.toLowerCase();
    
    if (q.startsWith('>')) {
      setMode('commands');
    } else if (q.startsWith('@')) {
      setMode('symbols');
    } else if (q.startsWith(':')) {
      setMode('lines');
    } else if (q.startsWith('p:')) {
      setMode('projects');
    } else if (q.startsWith('w:')) {
      setMode('workspaces');
    } else if (q.startsWith('r:')) {
      setMode('recent');
    } else if (q.startsWith('g:')) {
      setMode('goto');
    } else {
      setMode('files');
    }
    
    setSelectedIndex(0);
  }, [query]);

  // ============================================================================
  // Commands List
  // ============================================================================

  const commands = useMemo<CommandItem[]>(() => [
    // File commands
    { id: 'newFile', label: 'New File', description: 'Create a new file', shortcut: 'Ctrl+N', icon: '📄', action: () => {}, category: 'File' },
    { id: 'newFolder', label: 'New Folder', description: 'Create a new folder', icon: '📁', action: () => {}, category: 'File' },
    { id: 'save', label: 'Save', description: 'Save the current file', shortcut: 'Ctrl+S', icon: '💾', action: () => {}, category: 'File' },
    { id: 'saveAll', label: 'Save All', description: 'Save all open files', shortcut: 'Ctrl+Shift+S', icon: '💾', action: () => {}, category: 'File' },
    
    // View commands
    { id: 'toggleSidebar', label: 'Toggle Sidebar', description: 'Show or hide the sidebar', shortcut: 'Ctrl+B', icon: '📋', action: toggleSidebar, category: 'View' },
    { id: 'toggleTerminal', label: 'Toggle Terminal', description: 'Show or hide the terminal', shortcut: 'Ctrl+`', icon: '💻', action: toggleTerminal, category: 'View' },
    { id: 'zoomIn', label: 'Zoom In', shortcut: 'Ctrl++', icon: '🔍', action: () => {}, category: 'View' },
    { id: 'zoomOut', label: 'Zoom Out', shortcut: 'Ctrl+-', icon: '🔍', action: () => {}, category: 'View' },
    
    // Edit commands
    { id: 'find', label: 'Find', description: 'Find in current file', shortcut: 'Ctrl+F', icon: '🔍', action: () => {}, category: 'Edit' },
    { id: 'replace', label: 'Find and Replace', description: 'Find and replace in current file', shortcut: 'Ctrl+H', icon: '🔄', action: () => {}, category: 'Edit' },
    { id: 'findInFiles', label: 'Find in Files', description: 'Search across all files', shortcut: 'Ctrl+Shift+F', icon: '🔍', action: () => {}, category: 'Edit' },
    
    // Git commands
    { id: 'gitCommit', label: 'Git: Commit', description: 'Commit staged changes', icon: '', action: () => {}, category: 'Git' },
    { id: 'gitPush', label: 'Git: Push', description: 'Push to remote', icon: '⬆️', action: () => {}, category: 'Git' },
    { id: 'gitPull', label: 'Git: Pull', description: 'Pull from remote', icon: '⬇️', action: () => {}, category: 'Git' },
    { id: 'gitStatus', label: 'Git: Status', description: 'Show git status', icon: 'ℹ️', action: () => {}, category: 'Git' },
    
    // Terminal commands
    { id: 'newTerminal', label: 'Terminal: New Terminal', description: 'Create a new terminal instance', icon: '💻', action: () => {}, category: 'Terminal' },
    { id: 'clearTerminal', label: 'Terminal: Clear', description: 'Clear terminal output', icon: '🧹', action: () => {}, category: 'Terminal' },
    
    // Project commands
    { id: 'newProject', label: 'New Project', description: 'Create a new project', icon: '📂', action: () => {}, category: 'Project' },
    { id: 'openProject', label: 'Open Project', description: 'Open an existing project', icon: '📂', action: () => {}, category: 'Project' },
    
    // Preferences
    { id: 'settings', label: 'Preferences: Open Settings', description: 'Open settings panel', shortcut: 'Ctrl+,', icon: '⚙️', action: () => {}, category: 'Preferences' },
    { id: 'themeLight', label: 'Preferences: Light Theme', icon: '☀️', action: () => {}, category: 'Preferences' },
    { id: 'themeDark', label: 'Preferences: Dark Theme', icon: '🌙', action: () => {}, category: 'Preferences' },
    { id: 'keyboardShortcuts', label: 'Preferences: Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', icon: '⌨️', action: () => {}, category: 'Preferences' },
  ], [toggleSidebar, toggleTerminal]);

  // ============================================================================
  // Extract Symbols from Current File
  // ============================================================================

  const symbols = useMemo<SymbolItem[]>(() => {
    const activeFile = openFiles.find(f => f.isDirty !== undefined);
    if (!activeFile?.content) return [];

    const result: SymbolItem[] = [];
    const lines = activeFile.content.split('\n');

    lines.forEach((line, lineIndex) => {
      // Function declarations
      const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
      if (funcMatch) {
        result.push({ name: funcMatch[1], kind: 'function', line: lineIndex + 1, fileId: activeFile.id, fileName: activeFile.name });
      }

      // Arrow functions
      const arrowMatch = line.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/);
      if (arrowMatch) {
        result.push({ name: arrowMatch[1], kind: 'function', line: lineIndex + 1, fileId: activeFile.id, fileName: activeFile.name });
      }

      // Class declarations
      const classMatch = line.match(/(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/);
      if (classMatch) {
        result.push({ name: classMatch[1], kind: 'class', line: lineIndex + 1, fileId: activeFile.id, fileName: activeFile.name });
      }

      // Interface declarations
      const interfaceMatch = line.match(/(?:export\s+)?interface\s+(\w+)/);
      if (interfaceMatch) {
        result.push({ name: interfaceMatch[1], kind: 'interface', line: lineIndex + 1, fileId: activeFile.id, fileName: activeFile.name });
      }

      // Type declarations
      const typeMatch = line.match(/(?:export\s+)?type\s+(\w+)/);
      if (typeMatch) {
        result.push({ name: typeMatch[1], kind: 'interface', line: lineIndex + 1, fileId: activeFile.id, fileName: activeFile.name });
      }

      // Enum declarations
      const enumMatch = line.match(/(?:export\s+)?enum\s+(\w+)/);
      if (enumMatch) {
        result.push({ name: enumMatch[1], kind: 'enum', line: lineIndex + 1, fileId: activeFile.id, fileName: activeFile.name });
      }

      // Const declarations (outside of functions)
      const constMatch = line.match(/^(?:export\s+)?const\s+(\w+)\s*[:=]/);
      if (constMatch && !line.includes('=>')) {
        result.push({ name: constMatch[1], kind: 'constant', line: lineIndex + 1, fileId: activeFile.id, fileName: activeFile.name });
      }
    });

    return result;
  }, [openFiles]);

  // ============================================================================
  // Flatten Files for Search
  // ============================================================================

  const allFiles = useMemo(() => {
    const result: FileNode[] = [];
    const traverse = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'file') {
          result.push(node);
        }
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(files);
    return result;
  }, [files]);

  // ============================================================================
  // Fuzzy Match
  // ============================================================================

  const fuzzyMatch = useCallback((text: string, pattern: string): { matched: boolean; score: number; indices: number[] } => {
    if (!pattern) return { matched: true, score: 0, indices: [] };
    
    const textLower = text.toLowerCase();
    const patternLower = pattern.toLowerCase();
    
    let patternIdx = 0;
    let score = 0;
    let consecutiveMatch = 0;
    const indices: number[] = [];
    
    for (let i = 0; i < textLower.length && patternIdx < patternLower.length; i++) {
      if (textLower[i] === patternLower[patternIdx]) {
        indices.push(i);
        patternIdx++;
        
        // Bonus for consecutive matches
        if (consecutiveMatch > 0) {
          score += consecutiveMatch * 2;
        }
        consecutiveMatch++;
        
        // Bonus for matching at word boundaries
        if (i === 0 || text[i - 1] === '/' || text[i - 1] === '.' || text[i - 1] === '-' || text[i - 1] === '_') {
          score += 10;
        }
        
        // Bonus for matching uppercase (camelCase/PascalCase)
        if (text[i] === text[i].toUpperCase() && text[i] !== text[i].toLowerCase()) {
          score += 5;
        }
      } else {
        consecutiveMatch = 0;
      }
    }
    
    const matched = patternIdx === patternLower.length;
    
    // Penalty for longer strings
    if (matched) {
      score -= (text.length - pattern.length) * 0.1;
    }
    
    return { matched, score, indices };
  }, []);

  // ============================================================================
  // Filtered Results
  // ============================================================================

  const filteredResults = useMemo(() => {
    const searchQuery = query.replace(/^[>@:prwg]:?/, '').trim();

    switch (mode) {
      case 'files': {
        if (!searchQuery) {
          // Show recent files first, then all files
          const recentIds = new Set(openFiles.map(f => f.id));
          const recent = allFiles.filter(f => recentIds.has(f.id));
          const others = allFiles.filter(f => !recentIds.has(f.id)).slice(0, 20);
          return [...recent, ...others];
        }
        
        return allFiles
          .map(file => {
            const nameMatch = fuzzyMatch(file.name, searchQuery);
            const pathMatch = fuzzyMatch(file.path, searchQuery);
            const bestMatch = nameMatch.score > pathMatch.score ? nameMatch : pathMatch;
            return { file, ...bestMatch };
          })
          .filter(r => r.matched)
          .sort((a, b) => b.score - a.score)
          .map(r => r.file)
          .slice(0, 50);
      }

      case 'commands': {
        if (!searchQuery) return commands;
        
        return commands
          .map(cmd => ({
            cmd,
            ...fuzzyMatch(`${cmd.label} ${cmd.description || ''} ${cmd.category}`, searchQuery)
          }))
          .filter(r => r.matched)
          .sort((a, b) => b.score - a.score)
          .map(r => r.cmd);
      }

      case 'symbols': {
        if (!searchQuery) return symbols;
        
        return symbols
          .map(sym => ({
            sym,
            ...fuzzyMatch(sym.name, searchQuery)
          }))
          .filter(r => r.matched)
          .sort((a, b) => b.score - a.score)
          .map(r => r.sym);
      }

      case 'lines': {
        const lineNum = parseInt(searchQuery);
        return isNaN(lineNum) ? [] : [lineNum];
      }

      case 'projects': {
        if (!searchQuery) return projects;
        
        return projects
          .map(proj => ({
            proj,
            ...fuzzyMatch(proj.name, searchQuery)
          }))
          .filter(r => r.matched)
          .sort((a, b) => b.score - a.score)
          .map(r => r.proj);
      }

      case 'workspaces': {
        if (!searchQuery) return workspaces;
        
        return workspaces
          .map(ws => ({
            ws,
            ...fuzzyMatch(ws.name, searchQuery)
          }))
          .filter(r => r.matched)
          .sort((a, b) => b.score - a.score)
          .map(r => r.ws);
      }

      case 'recent': {
        const recentFiles = openFiles.map(of => allFiles.find(f => f.id === of.id)).filter(Boolean) as FileNode[];
        if (!searchQuery) return recentFiles;
        
        return recentFiles
          .map(file => ({
            file,
            ...fuzzyMatch(file.name, searchQuery)
          }))
          .filter(r => r.matched)
          .sort((a, b) => b.score - a.score)
          .map(r => r.file);
      }

      case 'goto': {
        // Format: filename:line
        const [fileName, lineStr] = searchQuery.split(':');
        const lineNum = parseInt(lineStr);
        
        if (!fileName) return [];
        
        const matchedFiles = allFiles
          .map(file => ({
            file,
            line: isNaN(lineNum) ? 1 : lineNum,
            ...fuzzyMatch(file.name, fileName)
          }))
          .filter(r => r.matched)
          .sort((a, b) => b.score - a.score)
          .slice(0, 20);
        
        return matchedFiles;
      }

      default:
        return [];
    }
  }, [mode, query, allFiles, commands, symbols, projects, workspaces, openFiles, fuzzyMatch]);

  // ============================================================================
  // Selection Handling
  // ============================================================================

  const handleSelect = useCallback((index?: number) => {
    const idx = index ?? selectedIndex;
    const item = filteredResults[idx];
    
    if (!item) return;

    switch (mode) {
      case 'files':
      case 'recent': {
        const file = item as FileNode;
        openFile({
          id: file.id,
          name: file.name,
          path: file.path,
          content: file.content || '',
          language: file.language || 'plaintext',
          isDirty: false,
        });
        onFileSelect?.(file);
        onClose();
        break;
      }

      case 'commands': {
        const cmd = item as CommandItem;
        cmd.action();
        onClose();
        break;
      }

      case 'symbols': {
        const sym = item as SymbolItem;
        setActiveFile(sym.fileId);
        // TODO: Go to line
        onClose();
        break;
      }

      case 'lines': {
        const lineNum = item as number;
        // TODO: Go to line in active file
        onClose();
        break;
      }

      case 'projects': {
        const project = item as Project;
        setCurrentProject(project);
        setFiles(project.files);
        onClose();
        break;
      }

      case 'workspaces': {
        const workspace = item as Workspace;
        setActiveWorkspace(workspace.id);
        onClose();
        break;
      }

      case 'goto': {
        const { file, line } = item as { file: FileNode; line: number };
        openFile({
          id: file.id,
          name: file.name,
          path: file.path,
          content: file.content || '',
          language: file.language || 'plaintext',
          isDirty: false,
        });
        // TODO: Go to line
        onClose();
        break;
      }
    }
  }, [mode, filteredResults, selectedIndex, openFile, setActiveFile, setCurrentProject, setFiles, setActiveWorkspace, onFileSelect, onClose]);

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;

        case 'Enter':
          e.preventDefault();
          handleSelect();
          break;

        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredResults.length - 1));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;

        case 'Tab':
          e.preventDefault();
          // Cycle through modes
          const modes: QuickOpenMode[] = ['files', 'commands', 'symbols', 'projects'];
          const currentIdx = modes.indexOf(mode);
          const nextMode = modes[(currentIdx + (e.shiftKey ? -1 : 1) + modes.length) % modes.length];
          setQuery(MODE_CONFIG[nextMode].prefix);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, filteredResults.length, handleSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderHighlightedText = (text: string, pattern: string) => {
    if (!pattern) return text;
    
    const { indices } = fuzzyMatch(text, pattern);
    if (indices.length === 0) return text;

    const chars = text.split('');
    return chars.map((char, idx) => (
      <span 
        key={idx} 
        className={indices.includes(idx) ? (isDark ? 'text-vscode-accent font-bold' : 'text-blue-600 font-bold') : ''}
      >
        {char}
      </span>
    ));
  };

  const getSearchPattern = () => query.replace(/^[>@:prwg]:?/, '').trim();

  // ============================================================================
  // Theme
  // ============================================================================

  const bgColor = isDark ? 'bg-vscode-bg/95' : 'bg-white/95';
  const panelBg = isDark ? 'bg-vscode-sidebar' : 'bg-gray-50';
  const borderColor = isDark ? 'border-vscode-border' : 'border-gray-200';
  const textColor = isDark ? 'text-vscode-text' : 'text-gray-900';
  const textMuted = isDark ? 'text-vscode-textMuted' : 'text-gray-500';
  const hoverBg = isDark ? 'bg-vscode-hover' : 'bg-gray-100';
  const selectedBg = isDark ? 'bg-vscode-listActive' : 'bg-blue-100';

  // ============================================================================
  // Render
  // ============================================================================

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={`relative w-full max-w-[600px] mx-4 ${panelBg} rounded-lg shadow-2xl border ${borderColor} overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className={`flex items-center px-4 py-3 border-b ${borderColor}`}>
            <span className={`mr-2 text-lg ${textMuted}`}>{MODE_CONFIG[mode].icon}</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={MODE_CONFIG[mode].placeholder}
              className={`flex-1 bg-transparent text-sm ${textColor} placeholder:${textMuted} outline-none`}
              autoComplete="off"
              spellCheck={false}
            />
            <div className={`flex items-center gap-1 ${textMuted}`}>
              <kbd className={`px-1.5 py-0.5 text-[10px] rounded ${isDark ? 'bg-vscode-input' : 'bg-gray-200'}`}>
                ↑↓
              </kbd>
              <span className="text-[10px]">navigate</span>
              <kbd className={`px-1.5 py-0.5 text-[10px] rounded ml-2 ${isDark ? 'bg-vscode-input' : 'bg-gray-200'}`}>
                Enter
              </kbd>
              <span className="text-[10px]">select</span>
            </div>
          </div>

          {/* Mode Hints */}
          <div className={`flex items-center gap-2 px-4 py-2 border-b ${borderColor} overflow-x-auto`}>
            {Object.entries(MODE_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setQuery(config.prefix)}
                className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded whitespace-nowrap transition-colors ${
                  mode === key 
                    ? (isDark ? 'bg-vscode-accent text-white' : 'bg-blue-500 text-white')
                    : `${textMuted} hover:${hoverBg}`
                }`}
              >
                <span>{config.icon}</span>
                <span>{config.prefix || 'files'}</span>
              </button>
            ))}
          </div>

          {/* Results */}
          <div 
            ref={listRef}
            className="max-h-[400px] overflow-y-auto"
          >
            {filteredResults.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-12 ${textMuted}`}>
                <span className="text-4xl mb-3">🔍</span>
                <span className="text-sm">No results found</span>
                <span className="text-xs mt-1">Try a different search term</span>
              </div>
            ) : (
              filteredResults.map((item, index) => {
                const isSelected = index === selectedIndex;
                const pattern = getSearchPattern();

                // Render based on mode
                switch (mode) {
                  case 'files':
                  case 'recent': {
                    const file = item as FileNode;
                    return (
                      <div
                        key={file.id}
                        data-index={index}
                        className={`flex items-center px-4 py-2 cursor-pointer ${
                          isSelected ? selectedBg : `hover:${hoverBg}`
                        }`}
                        onClick={() => handleSelect(index)}
                      >
                        <span className="mr-3 text-sm">📄</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${textColor}`}>
                            {renderHighlightedText(file.name, pattern)}
                          </div>
                          <div className={`text-xs ${textMuted} truncate`}>
                            {file.path}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  case 'commands': {
                    const cmd = item as CommandItem;
                    return (
                      <div
                        key={cmd.id}
                        data-index={index}
                        className={`flex items-center px-4 py-2 cursor-pointer ${
                          isSelected ? selectedBg : `hover:${hoverBg}`
                        }`}
                        onClick={() => handleSelect(index)}
                      >
                        <span className="mr-3 text-sm">{cmd.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${textColor}`}>
                            {renderHighlightedText(cmd.label, pattern)}
                          </div>
                          {cmd.description && (
                            <div className={`text-xs ${textMuted}`}>{cmd.description}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-vscode-input' : 'bg-gray-200'} ${textMuted}`}>
                            {cmd.category}
                          </span>
                          {cmd.shortcut && (
                            <span className={`text-[10px] ${textMuted}`}>{cmd.shortcut}</span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  case 'symbols': {
                    const sym = item as SymbolItem;
                    const iconConfig = SYMBOL_ICONS[sym.kind];
                    return (
                      <div
                        key={`${sym.fileId}-${sym.line}`}
                        data-index={index}
                        className={`flex items-center px-4 py-2 cursor-pointer ${
                          isSelected ? selectedBg : `hover:${hoverBg}`
                        }`}
                        onClick={() => handleSelect(index)}
                      >
                        <span 
                          className="mr-3 w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: `${iconConfig.color}33`, color: iconConfig.color }}
                        >
                          {iconConfig.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${textColor}`}>
                            {renderHighlightedText(sym.name, pattern)}
                          </div>
                          <div className={`text-xs ${textMuted}`}>
                            {sym.kind} • Line {sym.line}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  case 'projects': {
                    const project = item as Project;
                    return (
                      <div
                        key={project.id}
                        data-index={index}
                        className={`flex items-center px-4 py-2 cursor-pointer ${
                          isSelected ? selectedBg : `hover:${hoverBg}`
                        }`}
                        onClick={() => handleSelect(index)}
                      >
                        <span className="mr-3 text-lg">📂</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${textColor}`}>
                            {renderHighlightedText(project.name, pattern)}
                          </div>
                          <div className={`text-xs ${textMuted}`}>
                            {project.template} • {new Date(project.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  case 'workspaces': {
                    const workspace = item as Workspace;
                    const isActive = workspace.id === activeWorkspaceId;
                    return (
                      <div
                        key={workspace.id}
                        data-index={index}
                        className={`flex items-center px-4 py-2 cursor-pointer ${
                          isSelected ? selectedBg : `hover:${hoverBg}`
                        }`}
                        onClick={() => handleSelect(index)}
                      >
                        <div 
                          className="mr-3 w-4 h-4 rounded"
                          style={{ backgroundColor: workspace.color || '#3b82f6' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${textColor}`}>
                            {renderHighlightedText(workspace.name, pattern)}
                            {isActive && (
                              <span className={`ml-2 text-[10px] ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                (active)
                              </span>
                            )}
                          </div>
                          <div className={`text-xs ${textMuted}`}>
                            {workspace.projectIds.length} projects
                          </div>
                        </div>
                      </div>
                    );
                  }

                  case 'goto': {
                    const { file, line } = item as { file: FileNode; line: number };
                    return (
                      <div
                        key={`${file.id}-${line}`}
                        data-index={index}
                        className={`flex items-center px-4 py-2 cursor-pointer ${
                          isSelected ? selectedBg : `hover:${hoverBg}`
                        }`}
                        onClick={() => handleSelect(index)}
                      >
                        <span className="mr-3 text-sm">→</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${textColor}`}>
                            {file.name}:{line}
                          </div>
                          <div className={`text-xs ${textMuted}`}>
                            {file.path}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  default:
                    return null;
                }
              })
            )}
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-between px-4 py-2 border-t ${borderColor} ${textMuted}`}>
            <span className="text-[10px]">
              {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-3 text-[10px]">
              <span><kbd className={`px-1 rounded ${isDark ? 'bg-vscode-input' : 'bg-gray-200'}`}>Tab</kbd> switch mode</span>
              <span><kbd className={`px-1 rounded ${isDark ? 'bg-vscode-input' : 'bg-gray-200'}`}>Esc</kbd> close</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuickOpenAdvanced;
