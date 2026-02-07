/**
 * AIAutofix — AI-powered error detection and auto-fix
 * Analyzes build/runtime errors and suggests or applies fixes
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, AlertTriangle, CheckCircle, Loader2, Sparkles,
  ChevronRight, Code, Copy, Check, Play, Eye,
  XCircle, Zap,
} from 'lucide-react';
import { analyzeErrors as analyzeErrorsFromAI } from '../../src/services/aiService';

export interface CodeError {
  id: string;
  file: string;
  line: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
  source?: string; // 'typescript' | 'eslint' | 'runtime'
}

export interface AutofixSuggestion {
  id: string;
  errorId: string;
  title: string;
  description: string;
  confidence: number; // 0-100
  diff: { before: string; after: string };
  applied?: boolean;
}

interface AIAutofixProps {
  errors: CodeError[];
  onApplyFix?: (suggestion: AutofixSuggestion) => void;
  onAnalyze?: (errors: CodeError[]) => Promise<AutofixSuggestion[]>;
  className?: string;
}

const AIAutofix: React.FC<AIAutofixProps> = ({
  errors,
  onApplyFix,
  onAnalyze,
  className = '',
}) => {
  const [suggestions, setSuggestions] = useState<AutofixSuggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true);
    try {
      if (onAnalyze) {
        const result = await onAnalyze(errors);
        setSuggestions(result);
      } else {
        // Use AI service for real error analysis
        const result = await analyzeErrorsFromAI(errors);
        setSuggestions(result);
      }
    } catch (err) {
      console.error('[AIAutofix] Analysis failed:', err);
    }
    setAnalyzing(false);
  }, [errors, onAnalyze]);

  const handleApply = useCallback(async (suggestion: AutofixSuggestion) => {
    setApplyingId(suggestion.id);
    await new Promise((r) => setTimeout(r, 1000));
    onApplyFix?.(suggestion);
    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestion.id ? { ...s, applied: true } : s))
    );
    setApplyingId(null);
  }, [onApplyFix]);

  const handleApplyAll = useCallback(async () => {
    for (const suggestion of suggestions.filter((s) => !s.applied && s.confidence >= 80)) {
      await handleApply(suggestion);
    }
  }, [suggestions, handleApply]);

  const severityIcon = (severity: CodeError['severity']) => {
    switch (severity) {
      case 'error': return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'info': return <Sparkles className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const confidenceBadge = (confidence: number) => {
    const color = confidence >= 90 ? 'text-emerald-400 bg-emerald-500/15' :
                  confidence >= 70 ? 'text-amber-400 bg-amber-500/15' :
                  'text-red-400 bg-red-500/15';
    return (
      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${color}`}>
        {confidence}%
      </span>
    );
  };

  const errorCount = errors.filter((e) => e.severity === 'error').length;
  const warningCount = errors.filter((e) => e.severity === 'warning').length;
  const appliedCount = suggestions.filter((s) => s.applied).length;

  return (
    <div className={`flex flex-col bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Wrench className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">AI Autofix</h3>
            <div className="flex items-center gap-2 text-[10px]">
              {errorCount > 0 && <span className="text-red-400">{errorCount} errors</span>}
              {warningCount > 0 && <span className="text-amber-400">{warningCount} warnings</span>}
              {appliedCount > 0 && <span className="text-emerald-400">{appliedCount} fixed</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {suggestions.filter((s) => !s.applied && s.confidence >= 80).length > 0 && (
            <button
              onClick={handleApplyAll}
              className="px-2 py-1 text-[10px] font-semibold bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all"
            >
              <Zap className="w-3 h-3 inline mr-1" />
              Fix All Safe
            </button>
          )}
          <button
            onClick={handleAnalyze}
            disabled={analyzing || errors.length === 0}
            className="px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded-lg text-[10px] font-semibold hover:bg-violet-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {analyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Error list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-8 h-8 text-emerald-400/30 mb-2" />
            <p className="text-xs text-zinc-500">No errors detected</p>
            <p className="text-[10px] text-zinc-600 mt-1">Your code is looking good!</p>
          </div>
        ) : (
          errors.map((error) => {
            const isExpanded = expandedError === error.id;
            const suggestion = suggestions.find((s) => s.errorId === error.id);

            return (
              <div key={error.id} className="border-b border-zinc-800/50">
                <button
                  onClick={() => setExpandedError(isExpanded ? null : error.id)}
                  className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-zinc-900/30 transition-colors text-left"
                >
                  {severityIcon(error.severity)}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-200 truncate">{error.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-blue-400/60 font-mono">{error.file}:{error.line}</span>
                      {error.source && <span className="text-[9px] text-zinc-600">{error.source}</span>}
                      {suggestion?.applied && (
                        <span className="text-[9px] px-1 py-0.5 bg-emerald-500/15 text-emerald-400 rounded">Fixed</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-3 h-3 text-zinc-700 shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 pl-10 space-y-2">
                        {/* Code context */}
                        {error.code && (
                          <div className="bg-[#050505] rounded-lg p-2 border border-zinc-800/50 font-mono text-[10px] text-zinc-400 overflow-x-auto">
                            {error.code}
                          </div>
                        )}

                        {/* AI suggestion */}
                        {suggestion && !suggestion.applied && (
                          <div className="bg-violet-500/[0.04] rounded-lg p-3 border border-violet-500/10">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-violet-400" />
                                <span className="text-[10px] font-semibold text-violet-300">{suggestion.title}</span>
                              </div>
                              {confidenceBadge(suggestion.confidence)}
                            </div>
                            <p className="text-[10px] text-zinc-500 mb-2">{suggestion.description}</p>

                            {/* Diff preview */}
                            <div className="bg-[#050505] rounded-lg p-2 border border-zinc-800/50 font-mono text-[10px] mb-2 space-y-1">
                              <div className="text-red-400/60">- {suggestion.diff.before.split('\n').pop()}</div>
                              <div className="text-emerald-400/60">+ {suggestion.diff.after.split('\n').pop()}</div>
                            </div>

                            <button
                              onClick={() => handleApply(suggestion)}
                              disabled={applyingId === suggestion.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded-lg text-[10px] font-semibold hover:bg-violet-500/30 transition-all disabled:opacity-40"
                            >
                              {applyingId === suggestion.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              {applyingId === suggestion.id ? 'Applying...' : 'Apply Fix'}
                            </button>
                          </div>
                        )}

                        {suggestion?.applied && (
                          <div className="flex items-center gap-2 text-[10px] text-emerald-400">
                            <CheckCircle className="w-3 h-3" />
                            Fix applied successfully
                          </div>
                        )}

                        {!suggestion && suggestions.length > 0 && (
                          <p className="text-[10px] text-zinc-600 italic">No automated fix available for this error</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AIAutofix;
