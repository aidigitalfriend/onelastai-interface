/**
 * Code Intelligence Panel Component
 * Provides UI for code intelligence features including:
 * - Diagnostics (Problems/Errors)
 * - Document Outline (Symbols)
 * - References
 * - Refactoring Menu
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { 
  codeIntelligence,
  Diagnostic, 
  SymbolInfo, 
  SymbolKind,
  ReferenceResult,
  RefactorAction,
  getLanguageFromFilename
} from '../services/codeIntelligence';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// Types
// ============================================================================

interface CodeIntelligencePanelProps {
  className?: string;
  onNavigateToLine?: (line: number, column: number) => void;
}

type TabType = 'problems' | 'outline' | 'references' | 'refactor';

// ============================================================================
// Symbol Icon Mapping
// ============================================================================

const SYMBOL_ICONS: Record<SymbolKind, { icon: string; color: string }> = {
  [SymbolKind.File]: { icon: '📄', color: '#858585' },
  [SymbolKind.Module]: { icon: '📦', color: '#6c71c4' },
  [SymbolKind.Namespace]: { icon: '🗂️', color: '#6c71c4' },
  [SymbolKind.Package]: { icon: '📦', color: '#6c71c4' },
  [SymbolKind.Class]: { icon: 'C', color: '#e2c08d' },
  [SymbolKind.Method]: { icon: 'M', color: '#b180d7' },
  [SymbolKind.Property]: { icon: 'P', color: '#75beff' },
  [SymbolKind.Field]: { icon: 'F', color: '#75beff' },
  [SymbolKind.Constructor]: { icon: '⚙️', color: '#b180d7' },
  [SymbolKind.Enum]: { icon: 'E', color: '#e2c08d' },
  [SymbolKind.Interface]: { icon: 'I', color: '#75beff' },
  [SymbolKind.Function]: { icon: 'ƒ', color: '#b180d7' },
  [SymbolKind.Variable]: { icon: 'V', color: '#75beff' },
  [SymbolKind.Constant]: { icon: 'K', color: '#4fc1ff' },
  [SymbolKind.String]: { icon: 'S', color: '#ce9178' },
  [SymbolKind.Number]: { icon: '#', color: '#b5cea8' },
  [SymbolKind.Boolean]: { icon: 'B', color: '#569cd6' },
  [SymbolKind.Array]: { icon: '[]', color: '#75beff' },
  [SymbolKind.Object]: { icon: '{}', color: '#75beff' },
  [SymbolKind.Key]: { icon: 'K', color: '#75beff' },
  [SymbolKind.Null]: { icon: 'N', color: '#569cd6' },
  [SymbolKind.EnumMember]: { icon: 'EM', color: '#4fc1ff' },
  [SymbolKind.Struct]: { icon: 'S', color: '#e2c08d' },
  [SymbolKind.Event]: { icon: '⚡', color: '#e2c08d' },
  [SymbolKind.Operator]: { icon: 'O', color: '#d4d4d4' },
  [SymbolKind.TypeParameter]: { icon: 'T', color: '#4ec9b0' },
};

// ============================================================================
// Severity Icon Mapping
// ============================================================================

const SEVERITY_CONFIG = {
  error: { icon: '❌', color: '#f14c4c', bgColor: '#f14c4c20' },
  warning: { icon: '⚠️', color: '#cca700', bgColor: '#cca70020' },
  info: { icon: 'ℹ️', color: '#3794ff', bgColor: '#3794ff20' },
  hint: { icon: '💡', color: '#75beff', bgColor: '#75beff20' },
};

// ============================================================================
// Main Component
// ============================================================================

export const CodeIntelligencePanel: React.FC<CodeIntelligencePanelProps> = ({
  className = '',
  onNavigateToLine,
}) => {
  const { openFiles, activeFileId, theme, updateFileContent } = useStore();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('problems');
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
  const [references, setReferences] = useState<ReferenceResult[]>([]);
  const [refactorActions, setRefactorActions] = useState<RefactorAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['error', 'warning']));
  const [filterText, setFilterText] = useState('');

  const isDark = theme !== 'light' && theme !== 'high-contrast-light';
  const activeFile = openFiles.find(f => f.id === activeFileId);

  // ============================================================================
  // Analysis Effect
  // ============================================================================

  useEffect(() => {
    if (!activeFile) {
      setDiagnostics([]);
      setSymbols([]);
      return;
    }

    const language = getLanguageFromFilename(activeFile.name);
    const uri = activeFile.path;

    // Subscribe to diagnostics updates
    const unsubscribe = codeIntelligence.subscribeToDiagnostics(uri, (newDiagnostics) => {
      setDiagnostics(newDiagnostics);
    });

    // Initial analysis
    const analyze = async () => {
      setIsLoading(true);
      try {
        const result = await codeIntelligence.analyzeDocument(
          uri,
          activeFile.content,
          language
        );
        setDiagnostics(result.diagnostics);
        setSymbols(result.symbols);
      } catch (error) {
        console.error('Analysis failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    analyze();

    return () => {
      unsubscribe();
    };
  }, [activeFile?.id, activeFile?.content]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleDiagnosticClick = useCallback((diagnostic: Diagnostic) => {
    if (onNavigateToLine) {
      onNavigateToLine(diagnostic.range.start.line + 1, diagnostic.range.start.column);
    }
  }, [onNavigateToLine]);

  const handleSymbolClick = useCallback((symbol: SymbolInfo) => {
    setSelectedSymbol(symbol.name);
    if (onNavigateToLine) {
      onNavigateToLine(symbol.selectionRange.start.line + 1, symbol.selectionRange.start.column);
    }
  }, [onNavigateToLine]);

  const handleReferenceClick = useCallback((reference: ReferenceResult) => {
    if (onNavigateToLine) {
      onNavigateToLine(reference.range.start.line + 1, reference.range.start.column);
    }
  }, [onNavigateToLine]);

  const handleApplyQuickFix = useCallback((diagnostic: Diagnostic, quickFix: any) => {
    if (!activeFile) return;
    
    const newContent = codeIntelligence.applyQuickFix(activeFile.content, quickFix);
    updateFileContent(activeFile.id, newContent);
  }, [activeFile, updateFileContent]);

  const handleApplyRefactor = useCallback(async (action: RefactorAction) => {
    if (!activeFile || !action.edit) return;

    const edits = action.edit.changes[activeFile.path] || action.edit.changes[''] || [];
    let content = activeFile.content;

    for (const edit of edits.reverse()) {
      const lines = content.split('\n');
      const startLine = edit.range.start.line;
      const endLine = edit.range.end.line;

      if (startLine === endLine) {
        const line = lines[startLine];
        lines[startLine] = 
          line.substring(0, edit.range.start.column) +
          edit.newText +
          line.substring(edit.range.end.column);
      }

      content = lines.join('\n');
    }

    updateFileContent(activeFile.id, content);
  }, [activeFile, updateFileContent]);

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const groupedDiagnostics = useMemo(() => {
    const groups: Record<string, Diagnostic[]> = {
      error: [],
      warning: [],
      info: [],
      hint: [],
    };

    diagnostics.forEach(d => {
      if (filterText && !d.message.toLowerCase().includes(filterText.toLowerCase())) {
        return;
      }
      groups[d.severity].push(d);
    });

    return groups;
  }, [diagnostics, filterText]);

  const diagnosticCounts = useMemo(() => ({
    error: groupedDiagnostics.error.length,
    warning: groupedDiagnostics.warning.length,
    info: groupedDiagnostics.info.length,
    hint: groupedDiagnostics.hint.length,
    total: diagnostics.length,
  }), [groupedDiagnostics, diagnostics]);

  const filteredSymbols = useMemo(() => {
    if (!filterText) return symbols;
    return symbols.filter(s => 
      s.name.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [symbols, filterText]);

  // ============================================================================
  // Theme Styles
  // ============================================================================

  const bgColor = isDark ? 'bg-vscode-sidebar' : 'bg-white';
  const borderColor = isDark ? 'border-vscode-border' : 'border-gray-200';
  const textColor = isDark ? 'text-vscode-text' : 'text-gray-900';
  const textMuted = isDark ? 'text-vscode-textMuted' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-vscode-hover' : 'hover:bg-gray-100';
  const selectedBg = isDark ? 'bg-vscode-listActive' : 'bg-blue-100';
  const inputBg = isDark ? 'bg-vscode-input' : 'bg-white';
  const inputBorder = isDark ? 'border-vscode-inputBorder' : 'border-gray-300';

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderDiagnosticItem = (diagnostic: Diagnostic, index: number) => {
    const config = SEVERITY_CONFIG[diagnostic.severity];
    const hasQuickFix = diagnostic.quickFixes && diagnostic.quickFixes.length > 0;

    return (
      <div
        key={`${diagnostic.range.start.line}-${index}`}
        className={`flex items-start gap-2 px-3 py-2 cursor-pointer ${hoverBg} group`}
        onClick={() => handleDiagnosticClick(diagnostic)}
      >
        <span className="text-sm flex-shrink-0" style={{ color: config.color }}>
          {config.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className={`text-xs ${textColor}`}>
            {diagnostic.message}
          </div>
          <div className={`text-[10px] ${textMuted} flex items-center gap-2 mt-0.5`}>
            <span>Line {diagnostic.range.start.line + 1}</span>
            {diagnostic.source && <span>• {diagnostic.source}</span>}
            {diagnostic.code && <span>• {diagnostic.code}</span>}
          </div>
        </div>
        {hasQuickFix && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleApplyQuickFix(diagnostic, diagnostic.quickFixes![0]);
            }}
            className={`opacity-0 group-hover:opacity-100 px-2 py-0.5 text-[10px] rounded ${
              isDark ? 'bg-vscode-accent text-white' : 'bg-blue-500 text-white'
            }`}
            title="Quick Fix"
          >
            Fix
          </button>
        )}
      </div>
    );
  };

  const renderSymbolItem = (symbol: SymbolInfo, depth: number = 0) => {
    const iconConfig = SYMBOL_ICONS[symbol.kind] || { icon: '?', color: '#858585' };
    const isSelected = selectedSymbol === symbol.name;

    return (
      <div key={`${symbol.name}-${symbol.range.start.line}`}>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer ${
            isSelected ? selectedBg : hoverBg
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => handleSymbolClick(symbol)}
        >
          <span
            className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: `${iconConfig.color}33`, color: iconConfig.color }}
          >
            {iconConfig.icon}
          </span>
          <span className={`text-xs truncate ${textColor}`}>
            {symbol.name}
          </span>
          <span className={`text-[10px] ${textMuted} ml-auto`}>
            :{symbol.range.start.line + 1}
          </span>
        </div>
        {symbol.children?.map(child => renderSymbolItem(child, depth + 1))}
      </div>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`flex flex-col h-full ${bgColor} ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${borderColor}`}>
        <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>
          Code Intelligence
        </span>
        {isLoading && (
          <div className="animate-spin text-sm">⏳</div>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${borderColor}`}>
        <button
          onClick={() => setActiveTab('problems')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium ${
            activeTab === 'problems'
              ? isDark ? 'text-white border-b-2 border-vscode-accent' : 'text-blue-600 border-b-2 border-blue-500'
              : `${textMuted} ${hoverBg}`
          }`}
        >
          Problems
          {diagnosticCounts.total > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              diagnosticCounts.error > 0
                ? 'bg-red-500 text-white'
                : diagnosticCounts.warning > 0
                  ? 'bg-yellow-500 text-black'
                  : isDark ? 'bg-vscode-hover text-vscode-text' : 'bg-gray-200 text-gray-600'
            }`}>
              {diagnosticCounts.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('outline')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium ${
            activeTab === 'outline'
              ? isDark ? 'text-white border-b-2 border-vscode-accent' : 'text-blue-600 border-b-2 border-blue-500'
              : `${textMuted} ${hoverBg}`
          }`}
        >
          Outline
          {symbols.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              isDark ? 'bg-vscode-hover text-vscode-text' : 'bg-gray-200 text-gray-600'
            }`}>
              {symbols.length}
            </span>
          )}
        </button>
      </div>

      {/* Filter */}
      <div className={`px-3 py-2 border-b ${borderColor}`}>
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder={activeTab === 'problems' ? 'Filter problems...' : 'Filter symbols...'}
          className={`w-full px-2 py-1 text-xs rounded border ${inputBg} ${inputBorder} ${textColor} focus:outline-none focus:border-vscode-accent`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'problems' && (
            <motion.div
              key="problems"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {!activeFile ? (
                <div className={`p-4 text-center ${textMuted}`}>
                  <span className="text-3xl">📝</span>
                  <p className="text-xs mt-2">Open a file to see problems</p>
                </div>
              ) : diagnosticCounts.total === 0 ? (
                <div className={`p-4 text-center ${textMuted}`}>
                  <span className="text-3xl">✨</span>
                  <p className="text-xs mt-2">No problems detected</p>
                </div>
              ) : (
                Object.entries(groupedDiagnostics).map(([severity, items]) => {
                  if (items.length === 0) return null;
                  const config = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG];
                  const isExpanded = expandedGroups.has(severity);

                  return (
                    <div key={severity}>
                      <button
                        onClick={() => toggleGroup(severity)}
                        className={`w-full flex items-center gap-2 px-3 py-2 ${hoverBg}`}
                        style={{ backgroundColor: config.bgColor }}
                      >
                        <svg
                          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                        </svg>
                        <span style={{ color: config.color }}>{config.icon}</span>
                        <span className={`text-xs font-medium ${textColor}`}>
                          {severity.charAt(0).toUpperCase() + severity.slice(1)}s
                        </span>
                        <span className={`text-xs ${textMuted}`}>({items.length})</span>
                      </button>
                      {isExpanded && (
                        <div className="pl-2">
                          {items.map((d, i) => renderDiagnosticItem(d, i))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === 'outline' && (
            <motion.div
              key="outline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {!activeFile ? (
                <div className={`p-4 text-center ${textMuted}`}>
                  <span className="text-3xl">📝</span>
                  <p className="text-xs mt-2">Open a file to see outline</p>
                </div>
              ) : filteredSymbols.length === 0 ? (
                <div className={`p-4 text-center ${textMuted}`}>
                  <span className="text-3xl">📋</span>
                  <p className="text-xs mt-2">
                    {filterText ? 'No matching symbols' : 'No symbols found'}
                  </p>
                </div>
              ) : (
                filteredSymbols.map(symbol => renderSymbolItem(symbol))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <div className={`flex items-center justify-between px-3 py-1.5 border-t ${borderColor} ${textMuted}`}>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span style={{ color: SEVERITY_CONFIG.error.color }}>●</span>
            {diagnosticCounts.error}
          </span>
          <span className="flex items-center gap-1">
            <span style={{ color: SEVERITY_CONFIG.warning.color }}>●</span>
            {diagnosticCounts.warning}
          </span>
          <span className="flex items-center gap-1">
            <span style={{ color: SEVERITY_CONFIG.info.color }}>●</span>
            {diagnosticCounts.info}
          </span>
        </div>
        {activeFile && (
          <span className="text-[10px] truncate max-w-[120px]">
            {activeFile.name}
          </span>
        )}
      </div>
    </div>
  );
};

export default CodeIntelligencePanel;
