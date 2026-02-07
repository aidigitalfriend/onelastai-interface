/**
 * AIRefactor — AI-powered code refactoring suggestions
 * Analyzes code patterns and suggests optimizations, cleanup, modernization
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCcw, Sparkles, CheckCircle, Loader2, Code,
  ChevronRight, Zap, Shield, Lightbulb, Copy, Check,
  Play, Eye, XCircle, ArrowRight,
} from 'lucide-react';
import { analyzeForRefactoring } from '../../src/services/aiService';

export interface RefactorSuggestion {
  id: string;
  type: 'performance' | 'readability' | 'security' | 'modernize' | 'cleanup';
  title: string;
  description: string;
  file: string;
  lineRange: [number, number];
  before: string;
  after: string;
  impact: 'high' | 'medium' | 'low';
  applied?: boolean;
}

interface AIRefactorProps {
  code?: string;
  fileName?: string;
  onApply?: (suggestion: RefactorSuggestion) => void;
  onAnalyze?: (code: string) => Promise<RefactorSuggestion[]>;
  className?: string;
}

const typeConfig = {
  performance: { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'Performance' },
  readability: { icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/15', label: 'Readability' },
  security: { icon: Shield, color: 'text-red-400', bg: 'bg-red-500/15', label: 'Security' },
  modernize: { icon: Sparkles, color: 'text-violet-400', bg: 'bg-violet-500/15', label: 'Modernize' },
  cleanup: { icon: RefreshCcw, color: 'text-blue-400', bg: 'bg-blue-500/15', label: 'Cleanup' },
};

const impactBadge = (impact: RefactorSuggestion['impact']) => {
  const colors = {
    high: 'text-red-400 bg-red-500/15',
    medium: 'text-amber-400 bg-amber-500/15',
    low: 'text-emerald-400 bg-emerald-500/15',
  };
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${colors[impact]}`}>
      {impact}
    </span>
  );
};

const AIRefactor: React.FC<AIRefactorProps> = ({
  code,
  fileName,
  onApply,
  onAnalyze,
  className = '',
}) => {
  const [suggestions, setSuggestions] = useState<RefactorSuggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RefactorSuggestion['type'] | 'all'>('all');

  const handleAnalyze = useCallback(async () => {
    if (!code) return;
    setAnalyzing(true);

    try {
      if (onAnalyze) {
        const result = await onAnalyze(code);
        setSuggestions(result);
      } else {
        // Use AI service for real code analysis
        const result = await analyzeForRefactoring(code, fileName || 'App.tsx');
        setSuggestions(result);
      }
    } catch (err) {
      console.error('[AIRefactor] Analysis failed:', err);
    }
    setAnalyzing(false);
  }, [code, fileName, onAnalyze]);

  const handleApply = useCallback(async (suggestion: RefactorSuggestion) => {
    setApplyingId(suggestion.id);
    await new Promise((r) => setTimeout(r, 800));
    onApply?.(suggestion);
    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestion.id ? { ...s, applied: true } : s))
    );
    setApplyingId(null);
  }, [onApply]);

  const filtered = filter === 'all' ? suggestions : suggestions.filter((s) => s.type === filter);
  const types = Object.keys(typeConfig) as RefactorSuggestion['type'][];

  return (
    <div className={`flex flex-col bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <RefreshCcw className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">AI Refactor</h3>
            <p className="text-[10px] text-zinc-500">
              {suggestions.length} suggestions · {suggestions.filter((s) => s.applied).length} applied
            </p>
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing || !code}
          className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-[10px] font-semibold hover:bg-blue-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {analyzing ? 'Analyzing...' : 'Scan Code'}
        </button>
      </div>

      {/* Filters */}
      {suggestions.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-800 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all shrink-0 ${
              filter === 'all' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All ({suggestions.length})
          </button>
          {types.map((type) => {
            const count = suggestions.filter((s) => s.type === type).length;
            if (count === 0) return null;
            const cfg = typeConfig[type];
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all shrink-0 flex items-center gap-1 ${
                  filter === type ? `${cfg.bg} ${cfg.color}` : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <cfg.icon className="w-3 h-3" />
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Suggestions list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {suggestions.length === 0 && !analyzing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Lightbulb className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-xs text-zinc-500">No refactoring suggestions</p>
            <p className="text-[10px] text-zinc-600 mt-1">Click "Scan Code" to analyze current file</p>
          </div>
        ) : analyzing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
            <p className="text-xs text-zinc-400">Analyzing code patterns...</p>
            <p className="text-[10px] text-zinc-600 mt-1">Checking for improvements</p>
          </div>
        ) : (
          filtered.map((suggestion) => {
            const cfg = typeConfig[suggestion.type];
            const Icon = cfg.icon;
            const isExpanded = expandedId === suggestion.id;

            return (
              <div key={suggestion.id} className={`border-b border-zinc-800/50 ${suggestion.applied ? 'opacity-60' : ''}`}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-zinc-900/30 transition-colors text-left"
                >
                  <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-200 font-medium">{suggestion.title}</span>
                      {impactBadge(suggestion.impact)}
                      {suggestion.applied && (
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{suggestion.description}</p>
                    <span className="text-[9px] text-zinc-600 font-mono mt-0.5 block">
                      {suggestion.file}:{suggestion.lineRange[0]}-{suggestion.lineRange[1]}
                    </span>
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
                      <div className="px-4 pb-3 pl-14 space-y-2">
                        <p className="text-[10px] text-zinc-400">{suggestion.description}</p>

                        {/* Before/After diff */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[#050505] rounded-lg p-2 border border-red-500/10">
                            <span className="text-[9px] text-red-400 font-semibold mb-1 block">Before</span>
                            <pre className="text-[10px] font-mono text-zinc-400 whitespace-pre-wrap break-all">{suggestion.before}</pre>
                          </div>
                          <div className="bg-[#050505] rounded-lg p-2 border border-emerald-500/10">
                            <span className="text-[9px] text-emerald-400 font-semibold mb-1 block">After</span>
                            <pre className="text-[10px] font-mono text-zinc-400 whitespace-pre-wrap break-all">{suggestion.after}</pre>
                          </div>
                        </div>

                        {!suggestion.applied && (
                          <button
                            onClick={() => handleApply(suggestion)}
                            disabled={applyingId === suggestion.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-[10px] font-semibold hover:bg-blue-500/30 transition-all disabled:opacity-40"
                          >
                            {applyingId === suggestion.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                            {applyingId === suggestion.id ? 'Applying...' : 'Apply Refactor'}
                          </button>
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

export default AIRefactor;
