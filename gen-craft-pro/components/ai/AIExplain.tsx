/**
 * AIExplain — AI-powered code explanation
 * Select code to get plain-English explanations, documentation, and examples
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Sparkles, Loader2, Copy, Check,
  ChevronDown, ChevronRight, Code, FileText,
  MessageSquare, Lightbulb, Eye, Maximize2,
} from 'lucide-react';

export interface CodeExplanation {
  summary: string;
  details: string;
  complexity: 'simple' | 'moderate' | 'complex';
  concepts: string[];
  examples?: string[];
  documentation?: string;
}

interface AIExplainProps {
  selectedCode?: string;
  fileName?: string;
  lineRange?: [number, number];
  onExplain?: (code: string) => Promise<CodeExplanation>;
  className?: string;
}

const complexityColors = {
  simple: 'text-emerald-400 bg-emerald-500/15',
  moderate: 'text-amber-400 bg-amber-500/15',
  complex: 'text-red-400 bg-red-500/15',
};

const AIExplain: React.FC<AIExplainProps> = ({
  selectedCode,
  fileName,
  lineRange,
  onExplain,
  className = '',
}) => {
  const [explanation, setExplanation] = useState<CodeExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExplain = useCallback(async () => {
    if (!selectedCode) return;
    setLoading(true);
    setExplanation(null);

    if (onExplain) {
      const result = await onExplain(selectedCode);
      setExplanation(result);
    } else {
      // Simulate AI explanation
      await new Promise((r) => setTimeout(r, 2000));
      setExplanation({
        summary: 'This code defines a React component that manages state with Zustand and renders a dynamic list with filtering and pagination capabilities.',
        details: `The component follows these key patterns:

1. **State Management**: Uses Zustand store for global state, with local React state for UI-specific concerns like filter values and pagination.

2. **Memoization**: Computed values are wrapped in useMemo to prevent unnecessary recalculations during re-renders.

3. **Event Handling**: Uses useCallback for event handlers to maintain referential equality and prevent child component re-renders.

4. **Conditional Rendering**: Employs pattern matching with ternary operators and early returns for different loading/error/empty states.`,
        complexity: 'moderate',
        concepts: ['React Hooks', 'Zustand', 'Memoization', 'Conditional Rendering', 'Event Delegation'],
        examples: [
          `// Similar pattern with useCallback:\nconst handleClick = useCallback((id: string) => {\n  setSelected(id);\n  onSelect?.(id);\n}, [onSelect]);`,
          `// Zustand store pattern:\nconst useStore = create((set) => ({\n  items: [],\n  addItem: (item) => set(s => ({ items: [...s.items, item] })),\n}));`,
        ],
        documentation: '/**\n * @component FilteredList\n * @description Renders a filterable, paginated list of items.\n * @param {Item[]} items - Array of items to display\n * @param {(id: string) => void} onSelect - Selection callback\n * @param {number} pageSize - Items per page (default: 20)\n */',
      });
    }
    setLoading(false);
  }, [selectedCode, onExplain]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">AI Explain</h3>
            <p className="text-[10px] text-zinc-500">
              {selectedCode ? `${selectedCode.split('\n').length} lines selected` : 'Select code to explain'}
            </p>
          </div>
        </div>
        <button
          onClick={handleExplain}
          disabled={loading || !selectedCode}
          className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-[10px] font-semibold hover:bg-blue-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {loading ? 'Explaining...' : 'Explain'}
        </button>
      </div>

      {/* Selected code preview */}
      {selectedCode && (
        <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Code className="w-3 h-3 text-zinc-500" />
              <span className="text-[10px] text-zinc-500 font-mono">
                {fileName || 'selection'}
                {lineRange && `:${lineRange[0]}-${lineRange[1]}`}
              </span>
            </div>
            <button onClick={() => copyText(selectedCode)} className="p-1 text-zinc-600 hover:text-zinc-300">
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <pre className="text-[10px] font-mono text-zinc-400 overflow-x-auto max-h-[80px] overflow-y-auto custom-scrollbar whitespace-pre leading-relaxed">
            {selectedCode.split('\n').slice(0, 8).join('\n')}
            {selectedCode.split('\n').length > 8 && '\n...'}
          </pre>
        </div>
      )}

      {/* Explanation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <Sparkles className="w-4 h-4 text-violet-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <p className="text-xs text-zinc-400 mt-3">Analyzing code...</p>
            <p className="text-[10px] text-zinc-600 mt-1">Understanding patterns & logic</p>
          </div>
        ) : explanation ? (
          <div className="p-4 space-y-3">
            {/* Summary */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-zinc-200">Summary</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${complexityColors[explanation.complexity]}`}>
                  {explanation.complexity}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">{explanation.summary}</p>
            </div>

            {/* Concepts */}
            {explanation.concepts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-zinc-200">Key Concepts</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {explanation.concepts.map((concept) => (
                    <span
                      key={concept}
                      className="text-[10px] px-2 py-0.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-400"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed explanation */}
            <div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-zinc-200 transition-colors"
              >
                {showDetails ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <Eye className="w-3.5 h-3.5 text-violet-400" />
                Detailed Explanation
              </button>
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 text-[11px] text-zinc-400 leading-relaxed whitespace-pre-wrap bg-zinc-900/30 rounded-lg p-3 border border-zinc-800/50">
                      {explanation.details}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Examples */}
            {explanation.examples && explanation.examples.length > 0 && (
              <div>
                <button
                  onClick={() => setShowExamples(!showExamples)}
                  className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-zinc-200 transition-colors"
                >
                  {showExamples ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  <Code className="w-3.5 h-3.5 text-blue-400" />
                  Code Examples ({explanation.examples.length})
                </button>
                <AnimatePresence>
                  {showExamples && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-2">
                        {explanation.examples.map((example, i) => (
                          <div key={i} className="bg-[#050505] rounded-lg p-3 border border-zinc-800/50 relative group">
                            <pre className="text-[10px] font-mono text-zinc-400 whitespace-pre-wrap overflow-x-auto">
                              {example}
                            </pre>
                            <button
                              onClick={() => copyText(example)}
                              className="absolute top-2 right-2 p-1 text-zinc-700 hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Generated docs */}
            {explanation.documentation && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-zinc-200">Generated Documentation</span>
                  </div>
                  <button onClick={() => copyText(explanation.documentation!)} className="p-1 text-zinc-600 hover:text-zinc-300">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-emerald-400/60 bg-[#050505] rounded-lg p-3 border border-zinc-800/50 whitespace-pre-wrap">
                  {explanation.documentation}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-xs text-zinc-500">Select code to explain</p>
            <p className="text-[10px] text-zinc-600 mt-1">Highlight code in the editor, then click Explain</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIExplain;
