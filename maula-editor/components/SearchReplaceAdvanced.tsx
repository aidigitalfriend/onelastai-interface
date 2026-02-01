import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useStore } from '../store/useStore';
import { FileNode } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// Types
// ============================================================================

interface SearchReplaceAdvancedProps {
  className?: string;
  onFileSelect?: (file: FileNode, line?: number) => void;
}

interface LocalSearchMatch {
  line: number;
  column: number;
  length: number;
  text: string;
  matchText: string;
  preContext: string;
  postContext: string;
}

interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  includePattern: string;
  excludePattern: string;
  searchInOpenFiles: boolean;
}

interface GroupedResults {
  [filePath: string]: {
    file: FileNode;
    matches: LocalSearchMatch[];
    isExpanded: boolean;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

const matchesGlobPattern = (filepath: string, pattern: string): boolean => {
  if (!pattern.trim()) return true;
  
  const patterns = pattern.split(',').map(p => p.trim()).filter(Boolean);
  
  return patterns.some(p => {
    // Convert glob to regex
    const regexPattern = p
      .replace(/\*\*/g, '{{DOUBLESTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/{{DOUBLESTAR}}/g, '.*');
    
    try {
      return new RegExp(`^${regexPattern}$`, 'i').test(filepath);
    } catch {
      return filepath.includes(p);
    }
  });
};

// ============================================================================
// Main Component
// ============================================================================

export const SearchReplaceAdvanced: React.FC<SearchReplaceAdvancedProps> = ({
  className = '',
  onFileSelect,
}) => {
  const { files, theme, updateFileContent, openFile } = useStore();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    includePattern: '',
    excludePattern: 'node_modules/*, .git/*, dist/*, build/*',
    searchInOpenFiles: false,
  });
  
  // UI state
  const [showReplace, setShowReplace] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<GroupedResults>({});
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [selectedMatch, setSelectedMatch] = useState<{ filePath: string; matchIndex: number } | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout>();

  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  // ============================================================================
  // Flatten Files
  // ============================================================================

  const allFiles = useMemo(() => {
    const result: FileNode[] = [];
    const traverse = (nodes: FileNode[], path: string = '') => {
      nodes.forEach(node => {
        if (node.type === 'file') {
          result.push(node);
        }
        if (node.children) {
          traverse(node.children, node.path);
        }
      });
    };
    traverse(files);
    return result;
  }, [files]);

  // ============================================================================
  // Search Logic
  // ============================================================================

  const performSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setResults({});
      return;
    }

    setIsSearching(true);

    // Build search regex
    let pattern: RegExp;
    try {
      let searchPattern = options.useRegex 
        ? searchQuery 
        : escapeRegex(searchQuery);
      
      if (options.wholeWord) {
        searchPattern = `\\b${searchPattern}\\b`;
      }
      
      pattern = new RegExp(searchPattern, options.caseSensitive ? 'gm' : 'gim');
    } catch (e) {
      // Invalid regex
      setIsSearching(false);
      setResults({});
      return;
    }

    const searchResults: GroupedResults = {};

    allFiles.forEach(file => {
      // Check include/exclude patterns
      if (options.includePattern && !matchesGlobPattern(file.path, options.includePattern)) {
        return;
      }
      if (options.excludePattern && matchesGlobPattern(file.path, options.excludePattern)) {
        return;
      }

      const content = file.content || '';
      const lines = content.split('\n');
      const matches: LocalSearchMatch[] = [];

      lines.forEach((line, lineIndex) => {
        let match;
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(line)) !== null) {
          matches.push({
            line: lineIndex + 1,
            column: match.index + 1,
            length: match[0].length,
            text: line,
            matchText: match[0],
            preContext: lines.slice(Math.max(0, lineIndex - 1), lineIndex).join('\n'),
            postContext: lines.slice(lineIndex + 1, Math.min(lines.length, lineIndex + 2)).join('\n'),
          });
          
          // Prevent infinite loop for zero-length matches
          if (match[0].length === 0) break;
        }
      });

      if (matches.length > 0) {
        searchResults[file.path] = {
          file,
          matches,
          isExpanded: true,
        };
      }
    });

    setResults(searchResults);
    setExpandedFiles(new Set(Object.keys(searchResults)));
    setIsSearching(false);
  }, [searchQuery, options, allFiles]);

  // Debounced search
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    searchDebounceRef.current = setTimeout(() => {
      performSearch();
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [performSearch]);

  // ============================================================================
  // Replace Logic
  // ============================================================================

  const replaceInFile = useCallback((filePath: string, matchIndices?: number[]) => {
    const fileResult = results[filePath];
    if (!fileResult) return;

    const { file, matches } = fileResult;
    let content = file.content || '';
    
    // Sort matches in reverse order to preserve positions
    const sortedMatches = [...matches]
      .filter((_, i) => !matchIndices || matchIndices.includes(i))
      .sort((a, b) => {
        if (a.line !== b.line) return b.line - a.line;
        return b.column - a.column;
      });

    // Apply replacements
    const lines = content.split('\n');
    sortedMatches.forEach(match => {
      const lineIndex = match.line - 1;
      const line = lines[lineIndex];
      const before = line.substring(0, match.column - 1);
      const after = line.substring(match.column - 1 + match.length);
      lines[lineIndex] = before + replaceQuery + after;
    });

    const newContent = lines.join('\n');
    updateFileContent(file.id, newContent);

    // Re-run search
    setTimeout(performSearch, 100);
  }, [results, replaceQuery, updateFileContent, performSearch]);

  const replaceAll = useCallback(() => {
    Object.keys(results).forEach(filePath => {
      replaceInFile(filePath);
    });
  }, [results, replaceInFile]);

  // ============================================================================
  // UI Handlers
  // ============================================================================

  const toggleFileExpansion = useCallback((filePath: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  }, []);

  const handleMatchClick = useCallback((filePath: string, match: SearchMatch, matchIndex: number) => {
    const fileResult = results[filePath];
    if (!fileResult) return;

    setSelectedMatch({ filePath, matchIndex });
    
    // Open file and navigate to line
    openFile({
      id: fileResult.file.id,
      name: fileResult.file.name,
      path: fileResult.file.path,
      content: fileResult.file.content || '',
      language: fileResult.file.language || 'plaintext',
      isDirty: false,
    });
    
    onFileSelect?.(fileResult.file, match.line);
  }, [results, openFile, onFileSelect]);

  const collapseAll = useCallback(() => {
    setExpandedFiles(new Set());
  }, []);

  const expandAll = useCallback(() => {
    setExpandedFiles(new Set(Object.keys(results)));
  }, [results]);

  const clearResults = useCallback(() => {
    setSearchQuery('');
    setReplaceQuery('');
    setResults({});
    setSelectedMatch(null);
    searchInputRef.current?.focus();
  }, []);

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search (Ctrl+Shift+F)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Toggle replace (Ctrl+H)
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowReplace(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ============================================================================
  // Stats
  // ============================================================================

  const stats = useMemo(() => {
    const fileCount = Object.keys(results).length;
    const matchCount = Object.values(results).reduce((sum, r) => sum + r.matches.length, 0);
    return { fileCount, matchCount };
  }, [results]);

  // ============================================================================
  // Theme
  // ============================================================================

  const bgColor = isDark ? 'bg-vscode-sidebar' : 'bg-white';
  const borderColor = isDark ? 'border-vscode-border' : 'border-gray-200';
  const textColor = isDark ? 'text-vscode-text' : 'text-gray-900';
  const textMuted = isDark ? 'text-vscode-textMuted' : 'text-gray-500';
  const inputBg = isDark ? 'bg-vscode-input' : 'bg-white';
  const inputBorder = isDark ? 'border-vscode-inputBorder' : 'border-gray-300';
  const hoverBg = isDark ? 'hover:bg-vscode-hover' : 'hover:bg-gray-100';
  const selectedBg = isDark ? 'bg-vscode-listActive' : 'bg-blue-100';
  const highlightBg = isDark ? 'bg-yellow-500/30' : 'bg-yellow-200';

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`flex flex-col h-full ${bgColor} ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${borderColor}`}>
        <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>
          Search
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowReplace(!showReplace)}
            className={`p-1 rounded text-xs ${showReplace ? (isDark ? 'bg-vscode-accent text-white' : 'bg-blue-500 text-white') : `${textMuted} ${hoverBg}`}`}
            title="Toggle Replace (Ctrl+H)"
          >
            ↔️
          </button>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`p-1 rounded text-xs ${showAdvanced ? (isDark ? 'bg-vscode-accent text-white' : 'bg-blue-500 text-white') : `${textMuted} ${hoverBg}`}`}
            title="Toggle Advanced Options"
          >
            ⚙️
          </button>
          <button
            onClick={clearResults}
            className={`p-1 rounded ${textMuted} ${hoverBg}`}
            title="Clear"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Inputs */}
      <div className={`px-3 py-2 border-b ${borderColor} space-y-2`}>
        {/* Search Input */}
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className={`w-full pl-3 pr-20 py-1.5 text-xs rounded border ${inputBg} ${inputBorder} ${textColor} focus:outline-none focus:border-vscode-accent`}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <button
              onClick={() => setOptions(o => ({ ...o, caseSensitive: !o.caseSensitive }))}
              className={`p-1 rounded text-[10px] font-bold ${
                options.caseSensitive 
                  ? (isDark ? 'bg-vscode-accent text-white' : 'bg-blue-500 text-white')
                  : `${textMuted} ${hoverBg}`
              }`}
              title="Match Case"
            >
              Aa
            </button>
            <button
              onClick={() => setOptions(o => ({ ...o, wholeWord: !o.wholeWord }))}
              className={`p-1 rounded text-[10px] font-bold ${
                options.wholeWord 
                  ? (isDark ? 'bg-vscode-accent text-white' : 'bg-blue-500 text-white')
                  : `${textMuted} ${hoverBg}`
              }`}
              title="Match Whole Word"
            >
              ab
            </button>
            <button
              onClick={() => setOptions(o => ({ ...o, useRegex: !o.useRegex }))}
              className={`p-1 rounded text-[10px] font-bold ${
                options.useRegex 
                  ? (isDark ? 'bg-vscode-accent text-white' : 'bg-blue-500 text-white')
                  : `${textMuted} ${hoverBg}`
              }`}
              title="Use Regular Expression"
            >
              .*
            </button>
          </div>
        </div>

        {/* Replace Input */}
        <AnimatePresence>
          {showReplace && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-1">
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Replace with..."
                  className={`flex-1 px-3 py-1.5 text-xs rounded border ${inputBg} ${inputBorder} ${textColor} focus:outline-none focus:border-vscode-accent`}
                />
                <button
                  onClick={replaceAll}
                  disabled={stats.matchCount === 0}
                  className={`px-2 py-1 text-xs rounded ${
                    stats.matchCount > 0
                      ? (isDark ? 'bg-vscode-accent hover:bg-vscode-accent/80' : 'bg-blue-500 hover:bg-blue-600') + ' text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title="Replace All"
                >
                  All
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Advanced Options */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-2"
            >
              <div>
                <label className={`text-[10px] ${textMuted}`}>Files to include</label>
                <input
                  type="text"
                  value={options.includePattern}
                  onChange={(e) => setOptions(o => ({ ...o, includePattern: e.target.value }))}
                  placeholder="e.g., *.ts, src/**"
                  className={`w-full px-2 py-1 text-xs rounded border ${inputBg} ${inputBorder} ${textColor} focus:outline-none focus:border-vscode-accent`}
                />
              </div>
              <div>
                <label className={`text-[10px] ${textMuted}`}>Files to exclude</label>
                <input
                  type="text"
                  value={options.excludePattern}
                  onChange={(e) => setOptions(o => ({ ...o, excludePattern: e.target.value }))}
                  placeholder="e.g., node_modules/*, *.min.js"
                  className={`w-full px-2 py-1 text-xs rounded border ${inputBg} ${inputBorder} ${textColor} focus:outline-none focus:border-vscode-accent`}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Header */}
      {stats.matchCount > 0 && (
        <div className={`flex items-center justify-between px-3 py-1.5 border-b ${borderColor} ${textMuted}`}>
          <span className="text-xs">
            {stats.matchCount} result{stats.matchCount !== 1 ? 's' : ''} in {stats.fileCount} file{stats.fileCount !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={expandAll}
              className={`p-0.5 rounded ${hoverBg}`}
              title="Expand All"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={collapseAll}
              className={`p-0.5 rounded ${hoverBg}`}
              title="Collapse All"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <div className={`flex items-center justify-center py-8 ${textMuted}`}>
            <div className="animate-spin mr-2">⏳</div>
            <span className="text-xs">Searching...</span>
          </div>
        ) : stats.matchCount === 0 && searchQuery ? (
          <div className={`flex flex-col items-center justify-center py-8 ${textMuted}`}>
            <span className="text-3xl mb-2">🔍</span>
            <span className="text-xs">No results found</span>
            {options.excludePattern && (
              <span className="text-[10px] mt-1">Check your exclude patterns</span>
            )}
          </div>
        ) : !searchQuery ? (
          <div className={`flex flex-col items-center justify-center py-8 ${textMuted}`}>
            <span className="text-3xl mb-2">🔎</span>
            <span className="text-xs">Enter a search term</span>
            <div className="mt-3 text-[10px] space-y-1">
              <div><kbd className={`px-1 rounded ${isDark ? 'bg-vscode-input' : 'bg-gray-200'}`}>Aa</kbd> Case sensitive</div>
              <div><kbd className={`px-1 rounded ${isDark ? 'bg-vscode-input' : 'bg-gray-200'}`}>ab</kbd> Whole word</div>
              <div><kbd className={`px-1 rounded ${isDark ? 'bg-vscode-input' : 'bg-gray-200'}`}>.*</kbd> Regex</div>
            </div>
          </div>
        ) : (
          Object.entries(results).map(([filePath, { file, matches }]) => {
            const isExpanded = expandedFiles.has(filePath);
            
            return (
              <div key={filePath} className="border-b border-opacity-50 last:border-b-0">
                {/* File Header */}
                <div
                  className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer ${hoverBg}`}
                  onClick={() => toggleFileExpansion(filePath)}
                >
                  <svg 
                    className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''} ${textMuted}`}
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                  </svg>
                  <span className="text-sm">📄</span>
                  <span className={`text-xs font-medium ${textColor} truncate`}>{file.name}</span>
                  <span className={`text-[10px] ${textMuted} truncate`}>{file.path}</span>
                  <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-vscode-input' : 'bg-gray-200'} ${textMuted}`}>
                    {matches.length}
                  </span>
                  {showReplace && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        replaceInFile(filePath);
                      }}
                      className={`p-0.5 rounded ${isDark ? 'text-vscode-accent hover:bg-vscode-hover' : 'text-blue-500 hover:bg-gray-100'}`}
                      title="Replace All in File"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Matches */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {matches.map((match, matchIndex) => {
                        const isSelected = selectedMatch?.filePath === filePath && selectedMatch?.matchIndex === matchIndex;
                        
                        // Highlight match in text
                        const beforeMatch = match.text.substring(0, match.column - 1);
                        const matchText = match.text.substring(match.column - 1, match.column - 1 + match.length);
                        const afterMatch = match.text.substring(match.column - 1 + match.length);
                        
                        return (
                          <div
                            key={matchIndex}
                            className={`flex items-start gap-2 px-4 py-1 cursor-pointer ${
                              isSelected ? selectedBg : hoverBg
                            }`}
                            onClick={() => handleMatchClick(filePath, match, matchIndex)}
                          >
                            <span className={`text-[10px] ${textMuted} w-8 text-right flex-shrink-0`}>
                              {match.line}
                            </span>
                            <div className={`flex-1 text-xs font-mono overflow-hidden ${textColor}`}>
                              <span className="whitespace-pre">{beforeMatch.trimStart()}</span>
                              <span className={`${highlightBg} rounded px-0.5`}>{matchText}</span>
                              <span className="whitespace-pre">{afterMatch.trimEnd()}</span>
                            </div>
                            {showReplace && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  replaceInFile(filePath, [matchIndex]);
                                }}
                                className={`p-0.5 rounded flex-shrink-0 opacity-0 group-hover:opacity-100 ${isDark ? 'text-vscode-accent hover:bg-vscode-hover' : 'text-blue-500 hover:bg-gray-100'}`}
                                title="Replace"
                              >
                                ↔️
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {stats.matchCount > 0 && showReplace && (
        <div className={`flex items-center justify-between px-3 py-2 border-t ${borderColor}`}>
          <span className={`text-[10px] ${textMuted}`}>
            Replace "{searchQuery}" with "{replaceQuery || '(empty)'}"
          </span>
          <button
            onClick={replaceAll}
            className={`px-3 py-1 text-xs rounded ${isDark ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white`}
          >
            Replace All ({stats.matchCount})
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchReplaceAdvanced;
