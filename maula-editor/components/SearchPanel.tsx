import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { FileNode, OpenFile } from '../types';
import { isDarkTheme } from '../utils/theme';

interface SearchMatch {
  file: FileNode;
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

interface FileMatch {
  file: FileNode;
  matches: SearchMatch[];
  collapsed: boolean;
}

interface SearchPanelProps {
  onFileSelect?: (file: FileNode, lineNumber?: number) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onFileSelect }) => {
  const { files, theme, openFile } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isWholeWord, setIsWholeWord] = useState(false);
  const [includePattern, setIncludePattern] = useState('');
  const [excludePattern, setExcludePattern] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fileMatches, setFileMatches] = useState<FileMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [preserveCase, setPreserveCase] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const isDark = isDarkTheme(theme);

  // Flatten file tree to array of files
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

  // Check if file matches include/exclude patterns
  const matchesPattern = useCallback((filePath: string, pattern: string, isInclude: boolean): boolean => {
    if (!pattern.trim()) return isInclude;
    
    const patterns = pattern.split(',').map(p => p.trim()).filter(Boolean);
    
    for (const p of patterns) {
      // Convert glob pattern to regex
      const regexPattern = p
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      
      try {
        const regex = new RegExp(regexPattern, 'i');
        if (regex.test(filePath)) {
          return isInclude;
        }
      } catch {
        // Invalid pattern, skip
      }
    }
    
    return !isInclude;
  }, []);

  // Perform search
  const performSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setFileMatches([]);
      return;
    }

    setIsSearching(true);

    try {
      // Build search regex
      let searchPattern: RegExp;
      let flags = 'g';
      if (!isCaseSensitive) flags += 'i';

      if (isRegex) {
        searchPattern = new RegExp(searchQuery, flags);
      } else {
        let escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (isWholeWord) {
          escapedQuery = `\\b${escapedQuery}\\b`;
        }
        searchPattern = new RegExp(escapedQuery, flags);
      }

      const allFiles = flattenFiles(files);
      const results: FileMatch[] = [];

      for (const file of allFiles) {
        // Check include/exclude patterns
        if (!matchesPattern(file.path, includePattern, true)) continue;
        if (matchesPattern(file.path, excludePattern, false)) continue;

        const content = file.content || '';
        const lines = content.split('\n');
        const matches: SearchMatch[] = [];

        lines.forEach((line, index) => {
          searchPattern.lastIndex = 0;
          let match;
          while ((match = searchPattern.exec(line)) !== null) {
            matches.push({
              file,
              lineNumber: index + 1,
              lineContent: line,
              matchStart: match.index,
              matchEnd: match.index + match[0].length,
            });
            // Prevent infinite loop for zero-length matches
            if (match[0].length === 0) break;
          }
        });

        if (matches.length > 0) {
          results.push({
            file,
            matches,
            collapsed: false,
          });
        }
      }

      setFileMatches(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, isRegex, isCaseSensitive, isWholeWord, files, flattenFiles, includePattern, excludePattern, matchesPattern]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [performSearch]);

  // Handle file click
  const handleFileClick = useCallback((file: FileNode, lineNumber?: number) => {
    // Open file in editor
    const openFileData: OpenFile = {
      id: file.id,
      name: file.name,
      path: file.path,
      content: file.content || '',
      language: file.language || 'plaintext',
      isDirty: false,
    };
    openFile(openFileData);
    
    if (onFileSelect) {
      onFileSelect(file, lineNumber);
    }
  }, [openFile, onFileSelect]);

  // Toggle file collapse
  const toggleFileCollapse = useCallback((filePath: string) => {
    setFileMatches(prev =>
      prev.map(fm =>
        fm.file.path === filePath ? { ...fm, collapsed: !fm.collapsed } : fm
      )
    );
  }, []);

  // Replace in file
  const replaceInFile = useCallback((file: FileNode, matches: SearchMatch[]) => {
    if (!replaceQuery && replaceQuery !== '') return;
    
    let content = file.content || '';
    
    // Sort matches by position (reverse order to preserve indices)
    const sortedMatches = [...matches].sort((a, b) => {
      if (a.lineNumber !== b.lineNumber) return b.lineNumber - a.lineNumber;
      return b.matchStart - a.matchStart;
    });

    // Apply replacements
    const lines = content.split('\n');
    for (const match of sortedMatches) {
      const lineIndex = match.lineNumber - 1;
      const line = lines[lineIndex];
      lines[lineIndex] = line.substring(0, match.matchStart) + replaceQuery + line.substring(match.matchEnd);
    }

    content = lines.join('\n');
    
    // Update file content in store
    const { updateFileContent } = useStore.getState();
    updateFileContent(file.id, content);
    
    // Re-run search
    performSearch();
  }, [replaceQuery, performSearch]);

  // Replace all
  const replaceAll = useCallback(() => {
    for (const fm of fileMatches) {
      replaceInFile(fm.file, fm.matches);
    }
  }, [fileMatches, replaceInFile]);

  // Total match count
  const totalMatches = useMemo(() => 
    fileMatches.reduce((sum, fm) => sum + fm.matches.length, 0),
    [fileMatches]
  );

  // Highlight match in line
  const highlightMatch = (line: string, matchStart: number, matchEnd: number) => {
    const before = line.substring(0, matchStart);
    const match = line.substring(matchStart, matchEnd);
    const after = line.substring(matchEnd);
    
    return (
      <>
        <span className="opacity-70">{before}</span>
        <span className={`${isDark ? 'bg-yellow-500/40' : 'bg-yellow-300'} rounded`}>{match}</span>
        <span className="opacity-70">{after}</span>
      </>
    );
  };

  // Get file icon
  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, { color: string; icon: string }> = {
      ts: { color: '#3178c6', icon: 'TS' },
      tsx: { color: '#61dafb', icon: 'TSX' },
      js: { color: '#f7df1e', icon: 'JS' },
      jsx: { color: '#61dafb', icon: 'JSX' },
      json: { color: '#fbc02d', icon: '{}' },
      css: { color: '#1572b6', icon: '#' },
      html: { color: '#e44d26', icon: '<>' },
      md: { color: '#42a5f5', icon: 'M↓' },
      py: { color: '#3776ab', icon: 'PY' },
    };
    return iconMap[ext || ''] || { color: '#90a4ae', icon: '📄' };
  };

  return (
    <div className={`flex flex-col h-full ${isDark ? 'text-vscode-text' : 'text-gray-900'}`}>
      {/* Search Header */}
      <div className={`p-3 border-b ${isDark ? 'border-vscode-border' : 'border-gray-200'}`}>
        {/* Search Input Row */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setShowReplace(!showReplace)}
            className={`p-1 rounded ${isDark ? 'hover:bg-vscode-hover' : 'hover:bg-gray-200'}`}
            title={showReplace ? 'Hide Replace' : 'Show Replace'}
          >
            <svg 
              className={`w-4 h-4 transition-transform ${showReplace ? 'rotate-90' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          <div className="flex-1 relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 ${
                isDark 
                  ? 'bg-vscode-bg border-vscode-border focus:ring-vscode-accent placeholder-vscode-textMuted' 
                  : 'bg-white border-gray-300 focus:ring-blue-500 placeholder-gray-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded ${
                  isDark ? 'hover:bg-vscode-hover text-vscode-textMuted' : 'hover:bg-gray-200 text-gray-400'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Search options */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setIsCaseSensitive(!isCaseSensitive)}
              className={`p-1.5 rounded text-xs font-mono ${
                isCaseSensitive
                  ? isDark ? 'bg-vscode-accent text-white' : 'bg-blue-500 text-white'
                  : isDark ? 'hover:bg-vscode-hover text-vscode-textMuted' : 'hover:bg-gray-200 text-gray-500'
              }`}
              title="Match Case (Alt+C)"
            >
              Aa
            </button>
            <button
              onClick={() => setIsWholeWord(!isWholeWord)}
              className={`p-1.5 rounded text-xs font-mono ${
                isWholeWord
                  ? isDark ? 'bg-vscode-accent text-white' : 'bg-blue-500 text-white'
                  : isDark ? 'hover:bg-vscode-hover text-vscode-textMuted' : 'hover:bg-gray-200 text-gray-500'
              }`}
              title="Match Whole Word (Alt+W)"
            >
              ab
            </button>
            <button
              onClick={() => setIsRegex(!isRegex)}
              className={`p-1.5 rounded text-xs font-mono ${
                isRegex
                  ? isDark ? 'bg-vscode-accent text-white' : 'bg-blue-500 text-white'
                  : isDark ? 'hover:bg-vscode-hover text-vscode-textMuted' : 'hover:bg-gray-200 text-gray-500'
              }`}
              title="Use Regular Expression (Alt+R)"
            >
              .*
            </button>
          </div>
        </div>

        {/* Replace Input Row */}
        {showReplace && (
          <div className="flex items-center gap-2 mb-2 ml-6">
            <div className="flex-1 relative">
              <input
                ref={replaceInputRef}
                type="text"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="Replace"
                className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 ${
                  isDark 
                    ? 'bg-vscode-bg border-vscode-border focus:ring-vscode-accent placeholder-vscode-textMuted' 
                    : 'bg-white border-gray-300 focus:ring-blue-500 placeholder-gray-400'
                }`}
              />
            </div>
            
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setPreserveCase(!preserveCase)}
                className={`p-1.5 rounded text-xs font-mono ${
                  preserveCase
                    ? isDark ? 'bg-vscode-accent text-white' : 'bg-blue-500 text-white'
                    : isDark ? 'hover:bg-vscode-hover text-vscode-textMuted' : 'hover:bg-gray-200 text-gray-500'
                }`}
                title="Preserve Case"
              >
                AB
              </button>
              <button
                onClick={replaceAll}
                disabled={fileMatches.length === 0}
                className={`p-1.5 rounded ${
                  fileMatches.length > 0
                    ? isDark ? 'hover:bg-vscode-hover text-vscode-text' : 'hover:bg-gray-200 text-gray-700'
                    : 'opacity-50 cursor-not-allowed'
                }`}
                title="Replace All"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1 rounded flex items-center gap-1 text-xs ${
              isDark 
                ? 'hover:bg-vscode-hover text-vscode-textMuted' 
                : 'hover:bg-gray-200 text-gray-500'
            }`}
            title="Toggle Search Filters"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>Filters</span>
            {(includePattern || excludePattern) && (
              <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-vscode-accent' : 'bg-blue-500'}`} />
            )}
          </button>
          
          {fileMatches.length > 0 && (
            <span className={`text-xs ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
              {totalMatches} results in {fileMatches.length} files
            </span>
          )}
        </div>

        {/* Filter Inputs */}
        {showFilters && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs w-16 ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
                Include:
              </span>
              <input
                type="text"
                value={includePattern}
                onChange={(e) => setIncludePattern(e.target.value)}
                placeholder="e.g., *.ts, *.tsx"
                className={`flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                  isDark 
                    ? 'bg-vscode-bg border-vscode-border focus:ring-vscode-accent placeholder-vscode-textMuted' 
                    : 'bg-white border-gray-300 focus:ring-blue-500 placeholder-gray-400'
                }`}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs w-16 ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
                Exclude:
              </span>
              <input
                type="text"
                value={excludePattern}
                onChange={(e) => setExcludePattern(e.target.value)}
                placeholder="e.g., node_modules, dist"
                className={`flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                  isDark 
                    ? 'bg-vscode-bg border-vscode-border focus:ring-vscode-accent placeholder-vscode-textMuted' 
                    : 'bg-white border-gray-300 focus:ring-blue-500 placeholder-gray-400'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto">
        {isSearching && (
          <div className={`p-4 text-center ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
            <div className="inline-block animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
            <p className="mt-2 text-xs">Searching...</p>
          </div>
        )}

        {!isSearching && searchQuery && fileMatches.length === 0 && (
          <div className={`p-4 text-center ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
            <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No results found</p>
            <p className="text-xs mt-1">Try different search terms or filters</p>
          </div>
        )}

        {!isSearching && !searchQuery && (
          <div className={`p-4 text-center ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
            <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm">Search in files</p>
            <p className="text-xs mt-1">Type to search across all project files</p>
          </div>
        )}

        {/* File Results */}
        {fileMatches.map((fm) => {
          const icon = getFileIcon(fm.file.name);
          return (
            <div key={fm.file.path} className="border-b border-transparent">
              {/* File Header */}
              <button
                onClick={() => toggleFileCollapse(fm.file.path)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${
                  isDark ? 'hover:bg-vscode-hover' : 'hover:bg-gray-100'
                }`}
              >
                <svg 
                  className={`w-3 h-3 transition-transform ${fm.collapsed ? '' : 'rotate-90'}`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
                <span 
                  className="text-xs font-medium px-1 rounded" 
                  style={{ backgroundColor: `${icon.color}20`, color: icon.color }}
                >
                  {icon.icon}
                </span>
                <span className={`flex-1 text-sm truncate ${isDark ? 'text-vscode-text' : 'text-gray-700'}`}>
                  {fm.file.name}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  isDark ? 'bg-vscode-hover text-vscode-textMuted' : 'bg-gray-200 text-gray-500'
                }`}>
                  {fm.matches.length}
                </span>
              </button>

              {/* Match Lines */}
              {!fm.collapsed && (
                <div className="ml-6">
                  {fm.matches.slice(0, 100).map((match, idx) => (
                    <button
                      key={`${match.lineNumber}-${idx}`}
                      onClick={() => handleFileClick(match.file, match.lineNumber)}
                      className={`w-full flex items-start gap-2 px-3 py-1 text-left ${
                        isDark ? 'hover:bg-vscode-selection' : 'hover:bg-blue-50'
                      }`}
                    >
                      <span className={`text-xs font-mono w-8 text-right shrink-0 ${
                        isDark ? 'text-vscode-textMuted' : 'text-gray-400'
                      }`}>
                        {match.lineNumber}
                      </span>
                      <span className="text-xs font-mono truncate flex-1">
                        {highlightMatch(
                          match.lineContent.trim().substring(0, 200),
                          Math.max(0, match.matchStart - match.lineContent.search(/\S/)),
                          Math.max(0, match.matchEnd - match.lineContent.search(/\S/))
                        )}
                      </span>
                    </button>
                  ))}
                  {fm.matches.length > 100 && (
                    <div className={`px-3 py-1 text-xs ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
                      ... and {fm.matches.length - 100} more matches
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className={`p-2 border-t text-[10px] ${
        isDark ? 'border-vscode-border text-vscode-textMuted bg-vscode-bg/50' : 'border-gray-200 text-gray-500 bg-gray-50'
      }`}>
        <div className="flex items-center justify-between">
          <span>
            <kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-vscode-hover' : 'bg-gray-200'}`}>Ctrl+Shift+F</kbd>
            {' '}Search in Files
          </span>
          <span>
            <kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-vscode-hover' : 'bg-gray-200'}`}>Ctrl+Shift+H</kbd>
            {' '}Replace
          </span>
        </div>
      </div>
    </div>
  );
};

export default SearchPanel;
