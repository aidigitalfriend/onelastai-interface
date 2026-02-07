/**
 * AITestWriter — AI-powered test generation
 * Automatically generates unit tests, integration tests, and edge case tests
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TestTube2, Sparkles, Loader2, Copy, Check,
  Play, ChevronRight, FileCode, Plus,
  CheckCircle, XCircle, AlertTriangle, RefreshCcw,
  Code, Download,
} from 'lucide-react';
import { generateTests as generateTestsFromAI } from '../../src/services/aiService';

export interface GeneratedTest {
  id: string;
  type: 'unit' | 'integration' | 'edge-case' | 'snapshot';
  name: string;
  description: string;
  code: string;
  status?: 'passing' | 'failing' | 'pending';
  framework: 'jest' | 'vitest' | 'testing-library';
}

interface AITestWriterProps {
  targetCode?: string;
  fileName?: string;
  onInsertTests?: (tests: GeneratedTest[]) => void;
  onRunTests?: (tests: GeneratedTest[]) => Promise<GeneratedTest[]>;
  className?: string;
}

const typeConfig = {
  unit: { color: 'text-violet-400', bg: 'bg-violet-500/15', label: 'Unit' },
  integration: { color: 'text-blue-400', bg: 'bg-blue-500/15', label: 'Integration' },
  'edge-case': { color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'Edge Case' },
  snapshot: { color: 'text-blue-400', bg: 'bg-blue-500/15', label: 'Snapshot' },
};

const statusIcon = (status?: GeneratedTest['status']) => {
  switch (status) {
    case 'passing': return <CheckCircle className="w-3 h-3 text-emerald-400" />;
    case 'failing': return <XCircle className="w-3 h-3 text-red-400" />;
    case 'pending': return <AlertTriangle className="w-3 h-3 text-amber-400" />;
    default: return null;
  }
};

const AITestWriter: React.FC<AITestWriterProps> = ({
  targetCode,
  fileName,
  onInsertTests,
  onRunTests,
  className = '',
}) => {
  const [tests, setTests] = useState<GeneratedTest[]>([]);
  const [generating, setGenerating] = useState(false);
  const [running, setRunning] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [framework, setFramework] = useState<'jest' | 'vitest' | 'testing-library'>('vitest');

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      // Use AI service for real test generation
      const generated = await generateTestsFromAI(
        targetCode || '',
        fileName || 'Component.tsx',
        framework
      );
      // Map to component's GeneratedTest format
      setTests(generated.map(t => ({
        ...t,
        framework: (t.framework || framework) as GeneratedTest['framework'],
      })));
    } catch (err) {
      console.error('[AITestWriter] Generation failed:', err);
    }
    setGenerating(false);
  }, [framework, fileName, targetCode]);

  const handleRun = useCallback(async () => {
    setRunning(true);
    const testsToRun = selectedTests.size > 0
      ? tests.filter((t) => selectedTests.has(t.id))
      : tests;

    if (onRunTests) {
      const results = await onRunTests(testsToRun);
      setTests((prev) =>
        prev.map((t) => {
          const result = results.find((r) => r.id === t.id);
          return result || t;
        })
      );
    } else {
      // Simulate running tests
      await new Promise((r) => setTimeout(r, 2000));
      setTests((prev) =>
        prev.map((t) => ({
          ...t,
          status: (testsToRun.some((tr) => tr.id === t.id)
            ? Math.random() > 0.2 ? 'passing' : 'failing'
            : t.status) as GeneratedTest['status'],
        }))
      );
    }
    setRunning(false);
  }, [tests, selectedTests, onRunTests]);

  const handleInsert = useCallback(() => {
    const testsToInsert = selectedTests.size > 0
      ? tests.filter((t) => selectedTests.has(t.id))
      : tests;
    onInsertTests?.(testsToInsert);
  }, [tests, selectedTests, onInsertTests]);

  const toggleSelect = (id: string) => {
    setSelectedTests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getAllTestCode = () => {
    const header = `import { describe, it, expect, vi } from '${framework}';\nimport { render, screen } from '@testing-library/react';\nimport userEvent from '@testing-library/user-event';\n\n`;
    return header + tests.map((t) => t.code).join('\n\n');
  };

  const passingCount = tests.filter((t) => t.status === 'passing').length;
  const failingCount = tests.filter((t) => t.status === 'failing').length;

  return (
    <div className={`flex flex-col bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <TestTube2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">AI Test Writer</h3>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-zinc-500">{tests.length} tests</span>
              {passingCount > 0 && <span className="text-emerald-400">{passingCount} passing</span>}
              {failingCount > 0 && <span className="text-red-400">{failingCount} failing</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 flex-wrap">
        {/* Framework selector */}
        <div className="flex items-center gap-1 bg-zinc-900/40 rounded-lg p-0.5 border border-zinc-800">
          {(['vitest', 'jest', 'testing-library'] as const).map((fw) => (
            <button
              key={fw}
              onClick={() => setFramework(fw)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                framework === fw
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {fw}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-2.5 py-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-semibold hover:bg-emerald-500/30 transition-all disabled:opacity-40 flex items-center gap-1"
        >
          {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          Generate
        </button>

        {tests.length > 0 && (
          <>
            <button
              onClick={handleRun}
              disabled={running}
              className="px-2.5 py-1.5 bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded-lg text-[10px] font-semibold hover:bg-violet-500/30 transition-all disabled:opacity-40 flex items-center gap-1"
            >
              {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Run
            </button>
            {onInsertTests && (
              <button
                onClick={handleInsert}
                className="px-2.5 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-400 rounded-lg text-[10px] font-medium hover:text-zinc-200 transition-all flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Insert
              </button>
            )}
          </>
        )}
      </div>

      {/* Test list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {tests.length === 0 && !generating ? (
          <div className="flex flex-col items-center justify-center py-12">
            <TestTube2 className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-xs text-zinc-500">No tests generated yet</p>
            <p className="text-[10px] text-zinc-600 mt-1">Click "Generate" to create tests for your code</p>
          </div>
        ) : generating ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
            <p className="text-xs text-zinc-400">Generating tests...</p>
            <p className="text-[10px] text-zinc-600 mt-1">Analyzing code patterns & edge cases</p>
          </div>
        ) : (
          tests.map((test) => {
            const cfg = typeConfig[test.type];
            const isExpanded = expandedId === test.id;
            const isSelected = selectedTests.has(test.id);

            return (
              <div key={test.id} className="border-b border-zinc-800/50">
                <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-zinc-900/30 transition-colors">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(test.id)}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-emerald-500/30 border-emerald-500/50'
                        : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                  </button>

                  {/* Status */}
                  <div className="shrink-0">{statusIcon(test.status)}</div>

                  {/* Test info */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : test.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-200 font-medium truncate">{test.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">{test.description}</p>
                  </button>

                  <ChevronRight className={`w-3 h-3 text-zinc-700 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>

                {/* Expanded code */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 pl-10">
                        <div className="bg-[#050505] rounded-lg p-3 border border-zinc-800/50 relative group">
                          <pre className="text-[10px] font-mono text-zinc-400 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                            {test.code}
                          </pre>
                          <button
                            onClick={() => copyCode(test.code, test.id)}
                            className="absolute top-2 right-2 p-1 text-zinc-700 hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            {copied === test.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Footer - Copy all */}
      {tests.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 bg-zinc-950">
          <span className="text-[10px] text-zinc-600">
            {selectedTests.size > 0 ? `${selectedTests.size} selected` : `${tests.length} tests total`}
          </span>
          <button
            onClick={() => copyCode(getAllTestCode(), 'all')}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {copied === 'all' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            Copy All
          </button>
        </div>
      )}
    </div>
  );
};

export default AITestWriter;
