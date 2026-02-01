/**
 * AI Integration Panel Component
 * ===============================
 * Comprehensive AI-powered coding assistance UI including:
 * - Code completion & generation
 * - AI code review
 * - Documentation generation
 * - Inline explanations
 * - Security scanning
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import {
  aiCodeAssistant,
  AIAssistantProvider,
  CodeReviewResult,
  CodeReviewIssue,
  DocumentationResult,
  ExplanationResult,
  SecurityScanResult,
  SecurityVulnerability,
} from '../services/aiCodeAssistant';

// ============================================================================
// Types
// ============================================================================

type AITab = 'review' | 'docs' | 'explain' | 'security' | 'refactor' | 'settings';

interface AIIntegrationPanelProps {
  className?: string;
  onApplyFix?: (code: string) => void;
  onInsertCode?: (code: string) => void;
}

// ============================================================================
// Icons
// ============================================================================

const Icons = {
  Review: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Docs: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Explain: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  Security: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Refactor: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Play: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Copy: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Apply: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Error: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Info: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Code: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  Loader: () => (
    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
};

// ============================================================================
// Severity Colors & Icons
// ============================================================================

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; border: string; icon: React.FC }> = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: Icons.Error },
  error: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: Icons.Error },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', icon: Icons.Warning },
  warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: Icons.Warning },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: Icons.Warning },
  info: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', icon: Icons.Info },
  low: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', icon: Icons.Info },
  hint: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', icon: Icons.Info },
};

// ============================================================================
// Provider Icons
// ============================================================================

const PROVIDER_ICONS: Record<AIAssistantProvider, string> = {
  openai: '🤖',
  anthropic: '🧠',
  cerebras: '🔮',
  groq: '⚡',
  xai: '🅧',
  gemini: '✨',
  ollama: '🦙',
};

// ============================================================================
// Main Component
// ============================================================================

export const AIIntegrationPanel: React.FC<AIIntegrationPanelProps> = ({
  className = '',
  onApplyFix,
  onInsertCode,
}) => {
  const { theme, activeFile, openFiles } = useStore();
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  // ============================================================================
  // State
  // ============================================================================

  const [activeTab, setActiveTab] = useState<AITab>('review');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings state
  const [provider, setProvider] = useState<AIAssistantProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [isConfigured, setIsConfigured] = useState(false);

  // Results state
  const [reviewResult, setReviewResult] = useState<CodeReviewResult | null>(null);
  const [docsResult, setDocsResult] = useState<DocumentationResult | null>(null);
  const [explainResult, setExplainResult] = useState<ExplanationResult | null>(null);
  const [securityResult, setSecurityResult] = useState<SecurityScanResult | null>(null);
  const [refactorResult, setRefactorResult] = useState<string | null>(null);

  // Options state
  const [reviewType, setReviewType] = useState<'full' | 'security' | 'performance' | 'style' | 'bugs'>('full');
  const [docStyle, setDocStyle] = useState<'jsdoc' | 'tsdoc' | 'docstring' | 'javadoc' | 'markdown'>('jsdoc');
  const [explainLevel, setExplainLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [refactorType, setRefactorType] = useState<'simplify' | 'modernize' | 'optimize' | 'extract-function'>('simplify');

  // ============================================================================
  // Theme Classes
  // ============================================================================

  const bgClass = isDark ? 'bg-vscode-sidebar' : 'bg-white';
  const bgSecondary = isDark ? 'bg-vscode-hover' : 'bg-gray-50';
  const borderClass = isDark ? 'border-vscode-border' : 'border-gray-200';
  const textClass = isDark ? 'text-vscode-text' : 'text-gray-900';
  const mutedClass = isDark ? 'text-vscode-textMuted' : 'text-gray-500';
  const hoverClass = isDark ? 'hover:bg-vscode-hover' : 'hover:bg-gray-100';
  const activeClass = isDark ? 'bg-vscode-listActive' : 'bg-blue-100';
  const inputClass = isDark
    ? 'bg-vscode-input border-vscode-inputBorder text-vscode-text'
    : 'bg-white border-gray-300 text-gray-900';

  // ============================================================================
  // Get Current Code
  // ============================================================================

  const currentCode = useMemo(() => {
    if (!activeFile) return '';
    const file = openFiles.find(f => f.id === activeFile);
    return file?.content || '';
  }, [activeFile, openFiles]);

  const currentLanguage = useMemo(() => {
    if (!activeFile) return 'javascript';
    const file = openFiles.find(f => f.id === activeFile);
    return file?.language || 'javascript';
  }, [activeFile, openFiles]);

  const currentFilename = useMemo(() => {
    if (!activeFile) return 'untitled';
    const file = openFiles.find(f => f.id === activeFile);
    return file?.name || 'untitled';
  }, [activeFile, openFiles]);

  // ============================================================================
  // Configure AI
  // ============================================================================

  const handleConfigure = useCallback(() => {
    if (!apiKey && provider !== 'ollama') {
      setError('API key is required');
      return;
    }

    aiCodeAssistant.configure({
      provider,
      apiKey,
      model,
      temperature: 0.3,
    });

    setIsConfigured(true);
    setError(null);

    // Save to localStorage
    localStorage.setItem('ai-assistant-config', JSON.stringify({ provider, model }));
    if (apiKey) {
      localStorage.setItem(`ai-key-${provider}`, apiKey);
    }
  }, [provider, apiKey, model]);

  // Load saved config on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('ai-assistant-config');
    if (savedConfig) {
      try {
        const { provider: savedProvider, model: savedModel } = JSON.parse(savedConfig);
        setProvider(savedProvider);
        setModel(savedModel);
        
        const savedKey = localStorage.getItem(`ai-key-${savedProvider}`);
        if (savedKey) {
          setApiKey(savedKey);
          aiCodeAssistant.configure({
            provider: savedProvider,
            apiKey: savedKey,
            model: savedModel,
          });
          setIsConfigured(true);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // ============================================================================
  // AI Actions
  // ============================================================================

  const handleReviewCode = useCallback(async () => {
    if (!currentCode) {
      setError('No code to review');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await aiCodeAssistant.reviewCode({
        code: currentCode,
        language: currentLanguage,
        filename: currentFilename,
        reviewType,
      });
      setReviewResult(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [currentCode, currentLanguage, currentFilename, reviewType]);

  const handleGenerateDocs = useCallback(async () => {
    if (!currentCode) {
      setError('No code to document');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await aiCodeAssistant.generateDocumentation({
        code: currentCode,
        language: currentLanguage,
        style: docStyle,
        includeExamples: true,
        includeTypes: true,
      });
      setDocsResult(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [currentCode, currentLanguage, docStyle]);

  const handleExplainCode = useCallback(async () => {
    if (!currentCode) {
      setError('No code to explain');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await aiCodeAssistant.explainCode({
        code: currentCode,
        language: currentLanguage,
        level: explainLevel,
      });
      setExplainResult(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [currentCode, currentLanguage, explainLevel]);

  const handleSecurityScan = useCallback(async () => {
    if (!currentCode) {
      setError('No code to scan');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await aiCodeAssistant.scanSecurity({
        code: currentCode,
        language: currentLanguage,
        filename: currentFilename,
      });
      setSecurityResult(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [currentCode, currentLanguage, currentFilename]);

  const handleRefactorCode = useCallback(async () => {
    if (!currentCode) {
      setError('No code to refactor');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await aiCodeAssistant.refactorCode({
        code: currentCode,
        language: currentLanguage,
        refactorType,
      });
      setRefactorResult(result.refactoredCode);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [currentCode, currentLanguage, refactorType]);

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderReviewTab = () => (
    <div className="p-3 space-y-4">
      {/* Options */}
      <div className="flex items-center gap-2">
        <select
          value={reviewType}
          onChange={(e) => setReviewType(e.target.value as any)}
          className={`flex-1 px-3 py-1.5 text-sm rounded border ${inputClass}`}
        >
          <option value="full">Full Review</option>
          <option value="bugs">Bug Detection</option>
          <option value="performance">Performance</option>
          <option value="style">Code Style</option>
          <option value="security">Security Focus</option>
        </select>
        <button
          onClick={handleReviewCode}
          disabled={isLoading || !isConfigured}
          className="px-4 py-1.5 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? <Icons.Loader /> : <Icons.Play />}
          Review
        </button>
      </div>

      {/* Results */}
      {reviewResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Score */}
          <div className={`p-4 rounded ${bgSecondary} border ${borderClass}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${textClass}`}>Code Quality Score</span>
              <span className={`text-2xl font-bold ${getScoreColor(reviewResult.score)}`}>
                {reviewResult.score}/100
              </span>
            </div>
            <p className={`text-sm ${mutedClass}`}>{reviewResult.summary}</p>
          </div>

          {/* Issues */}
          {reviewResult.issues.length > 0 && (
            <div>
              <h4 className={`text-sm font-medium ${textClass} mb-2`}>Issues Found ({reviewResult.issues.length})</h4>
              <div className="space-y-2">
                {reviewResult.issues.map((issue, idx) => {
                  const config = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info;
                  const SeverityIcon = config.icon;
                  return (
                    <div key={idx} className={`p-3 rounded ${config.bg} border ${config.border}`}>
                      <div className="flex items-start gap-2">
                        <SeverityIcon />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${config.text}`}>
                              {issue.severity.toUpperCase()}
                            </span>
                            {issue.line && (
                              <span className={`text-xs ${mutedClass}`}>Line {issue.line}</span>
                            )}
                          </div>
                          <p className={`text-sm ${textClass} mt-1`}>{issue.message}</p>
                          {issue.fix && (
                            <p className={`text-xs ${mutedClass} mt-1`}>💡 {issue.fix}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {reviewResult.suggestions.length > 0 && (
            <div>
              <h4 className={`text-sm font-medium ${textClass} mb-2`}>Suggestions</h4>
              <div className="space-y-2">
                {reviewResult.suggestions.map((suggestion, idx) => (
                  <div key={idx} className={`p-3 rounded ${bgSecondary} border ${borderClass}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icons.Sparkles />
                      <span className={`text-sm font-medium ${textClass}`}>{suggestion.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        suggestion.impact === 'high' ? 'bg-green-500/20 text-green-400' :
                        suggestion.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {suggestion.impact} impact
                      </span>
                    </div>
                    <p className={`text-sm ${mutedClass}`}>{suggestion.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metrics */}
          {reviewResult.metrics && (
            <div>
              <h4 className={`text-sm font-medium ${textClass} mb-2`}>Metrics</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2 rounded ${bgSecondary}`}>
                  <span className={`text-xs ${mutedClass}`}>Complexity</span>
                  <p className={`text-lg font-medium ${textClass}`}>{reviewResult.metrics.complexity}</p>
                </div>
                <div className={`p-2 rounded ${bgSecondary}`}>
                  <span className={`text-xs ${mutedClass}`}>Maintainability</span>
                  <p className={`text-lg font-medium ${textClass}`}>{reviewResult.metrics.maintainability}%</p>
                </div>
                <div className={`p-2 rounded ${bgSecondary}`}>
                  <span className={`text-xs ${mutedClass}`}>Lines of Code</span>
                  <p className={`text-lg font-medium ${textClass}`}>{reviewResult.metrics.linesOfCode}</p>
                </div>
                <div className={`p-2 rounded ${bgSecondary}`}>
                  <span className={`text-xs ${mutedClass}`}>Comment Ratio</span>
                  <p className={`text-lg font-medium ${textClass}`}>{Math.round(reviewResult.metrics.commentRatio * 100)}%</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );

  const renderDocsTab = () => (
    <div className="p-3 space-y-4">
      {/* Options */}
      <div className="flex items-center gap-2">
        <select
          value={docStyle}
          onChange={(e) => setDocStyle(e.target.value as any)}
          className={`flex-1 px-3 py-1.5 text-sm rounded border ${inputClass}`}
        >
          <option value="jsdoc">JSDoc</option>
          <option value="tsdoc">TSDoc</option>
          <option value="docstring">Python Docstring</option>
          <option value="javadoc">JavaDoc</option>
          <option value="markdown">Markdown</option>
        </select>
        <button
          onClick={handleGenerateDocs}
          disabled={isLoading || !isConfigured}
          className="px-4 py-1.5 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? <Icons.Loader /> : <Icons.Play />}
          Generate
        </button>
      </div>

      {/* Results */}
      {docsResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className={`p-3 rounded ${bgSecondary} border ${borderClass}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${textClass}`}>Generated Documentation</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyToClipboard(docsResult.documentation)}
                  className={`p-1 rounded ${hoverClass}`}
                  title="Copy"
                >
                  <Icons.Copy />
                </button>
                {onInsertCode && (
                  <button
                    onClick={() => onInsertCode(docsResult.documentation)}
                    className={`p-1 rounded ${hoverClass}`}
                    title="Insert"
                  >
                    <Icons.Apply />
                  </button>
                )}
              </div>
            </div>
            <pre className={`text-xs font-mono ${textClass} whitespace-pre-wrap overflow-auto max-h-96`}>
              {docsResult.documentation}
            </pre>
          </div>

          {docsResult.params && docsResult.params.length > 0 && (
            <div>
              <h4 className={`text-sm font-medium ${textClass} mb-2`}>Parameters</h4>
              <div className="space-y-1">
                {docsResult.params.map((param, idx) => (
                  <div key={idx} className={`p-2 rounded ${bgSecondary} flex items-start gap-2`}>
                    <code className="text-xs text-blue-400">{param.name}</code>
                    <span className={`text-xs ${mutedClass}`}>({param.type})</span>
                    <span className={`text-xs ${textClass}`}>{param.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {docsResult.examples && docsResult.examples.length > 0 && (
            <div>
              <h4 className={`text-sm font-medium ${textClass} mb-2`}>Examples</h4>
              {docsResult.examples.map((example, idx) => (
                <pre key={idx} className={`p-2 rounded ${bgSecondary} text-xs font-mono ${textClass} overflow-auto`}>
                  {example}
                </pre>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );

  const renderExplainTab = () => (
    <div className="p-3 space-y-4">
      {/* Options */}
      <div className="flex items-center gap-2">
        <select
          value={explainLevel}
          onChange={(e) => setExplainLevel(e.target.value as any)}
          className={`flex-1 px-3 py-1.5 text-sm rounded border ${inputClass}`}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <button
          onClick={handleExplainCode}
          disabled={isLoading || !isConfigured}
          className="px-4 py-1.5 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? <Icons.Loader /> : <Icons.Play />}
          Explain
        </button>
      </div>

      {/* Results */}
      {explainResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Summary */}
          <div className={`p-3 rounded ${bgSecondary} border ${borderClass}`}>
            <h4 className={`text-sm font-medium ${textClass} mb-2`}>Summary</h4>
            <p className={`text-sm ${textClass}`}>{explainResult.summary}</p>
          </div>

          {/* Line by Line */}
          {explainResult.lineByLine.length > 0 && (
            <div>
              <h4 className={`text-sm font-medium ${textClass} mb-2`}>Line-by-Line Explanation</h4>
              <div className="space-y-2 max-h-60 overflow-auto">
                {explainResult.lineByLine.map((line, idx) => (
                  <div key={idx} className={`p-2 rounded ${bgSecondary}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400`}>
                        L{line.lineNumber}
                      </span>
                      <code className={`text-xs font-mono ${mutedClass} truncate flex-1`}>
                        {line.code}
                      </code>
                    </div>
                    <p className={`text-xs ${textClass}`}>{line.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Concepts */}
          {explainResult.concepts.length > 0 && (
            <div>
              <h4 className={`text-sm font-medium ${textClass} mb-2`}>Key Concepts</h4>
              <div className="space-y-2">
                {explainResult.concepts.map((concept, idx) => (
                  <div key={idx} className={`p-2 rounded ${bgSecondary}`}>
                    <span className={`text-sm font-medium ${textClass}`}>{concept.concept}</span>
                    <p className={`text-xs ${mutedClass} mt-1`}>{concept.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Topics */}
          {explainResult.relatedTopics && explainResult.relatedTopics.length > 0 && (
            <div>
              <h4 className={`text-sm font-medium ${textClass} mb-2`}>Related Topics</h4>
              <div className="flex flex-wrap gap-2">
                {explainResult.relatedTopics.map((topic, idx) => (
                  <span key={idx} className={`px-2 py-1 text-xs rounded ${bgSecondary} ${textClass}`}>
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );

  const renderSecurityTab = () => (
    <div className="p-3 space-y-4">
      {/* Actions */}
      <button
        onClick={handleSecurityScan}
        disabled={isLoading || !isConfigured}
        className="w-full px-4 py-2 text-sm rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading ? <Icons.Loader /> : <Icons.Security />}
        Run Security Scan
      </button>

      {/* Results */}
      {securityResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Risk Score */}
          <div className={`p-4 rounded border ${
            securityResult.riskScore >= 70 ? 'bg-red-500/10 border-red-500/30' :
            securityResult.riskScore >= 40 ? 'bg-yellow-500/10 border-yellow-500/30' :
            'bg-green-500/10 border-green-500/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${textClass}`}>Security Risk Score</span>
              <span className={`text-2xl font-bold ${
                securityResult.riskScore >= 70 ? 'text-red-400' :
                securityResult.riskScore >= 40 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {securityResult.riskScore}/100
              </span>
            </div>
            <p className={`text-sm ${mutedClass}`}>{securityResult.summary}</p>
          </div>

          {/* Vulnerabilities */}
          {securityResult.vulnerabilities.length > 0 ? (
            <div>
              <h4 className={`text-sm font-medium ${textClass} mb-2`}>
                Vulnerabilities ({securityResult.vulnerabilities.length})
              </h4>
              <div className="space-y-2">
                {securityResult.vulnerabilities.map((vuln, idx) => {
                  const config = SEVERITY_CONFIG[vuln.severity] || SEVERITY_CONFIG.info;
                  const SeverityIcon = config.icon;
                  return (
                    <div key={idx} className={`p-3 rounded ${config.bg} border ${config.border}`}>
                      <div className="flex items-start gap-2">
                        <SeverityIcon />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${config.text}`}>
                              {vuln.title}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded bg-black/20 ${mutedClass}`}>
                              {vuln.severity.toUpperCase()}
                            </span>
                            {vuln.cwe && (
                              <span className={`text-xs ${mutedClass}`}>{vuln.cwe}</span>
                            )}
                            {vuln.owasp && (
                              <span className={`text-xs ${mutedClass}`}>{vuln.owasp}</span>
                            )}
                          </div>
                          <p className={`text-sm ${textClass} mt-1`}>{vuln.description}</p>
                          {vuln.line && (
                            <p className={`text-xs ${mutedClass} mt-1`}>📍 Line {vuln.line}</p>
                          )}
                          {vuln.fix && (
                            <div className={`mt-2 p-2 rounded bg-black/10`}>
                              <span className={`text-xs font-medium ${textClass}`}>💡 Fix:</span>
                              <p className={`text-xs ${textClass}`}>{vuln.fix}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={`p-4 rounded ${bgSecondary} text-center`}>
              <Icons.Check />
              <p className={`text-sm ${textClass} mt-2`}>No vulnerabilities found!</p>
            </div>
          )}

          {/* Recommendations */}
          {securityResult.recommendations.length > 0 && (
            <div>
              <h4 className={`text-sm font-medium ${textClass} mb-2`}>Recommendations</h4>
              <ul className={`space-y-1 text-sm ${textClass}`}>
                {securityResult.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );

  const renderRefactorTab = () => (
    <div className="p-3 space-y-4">
      {/* Options */}
      <div className="flex items-center gap-2">
        <select
          value={refactorType}
          onChange={(e) => setRefactorType(e.target.value as any)}
          className={`flex-1 px-3 py-1.5 text-sm rounded border ${inputClass}`}
        >
          <option value="simplify">Simplify</option>
          <option value="modernize">Modernize</option>
          <option value="optimize">Optimize Performance</option>
          <option value="extract-function">Extract Functions</option>
        </select>
        <button
          onClick={handleRefactorCode}
          disabled={isLoading || !isConfigured}
          className="px-4 py-1.5 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? <Icons.Loader /> : <Icons.Refactor />}
          Refactor
        </button>
      </div>

      {/* Results */}
      {refactorResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className={`p-3 rounded ${bgSecondary} border ${borderClass}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${textClass}`}>Refactored Code</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyToClipboard(refactorResult)}
                  className={`p-1 rounded ${hoverClass}`}
                  title="Copy"
                >
                  <Icons.Copy />
                </button>
                {onApplyFix && (
                  <button
                    onClick={() => onApplyFix(refactorResult)}
                    className="px-2 py-1 text-xs rounded bg-green-500 text-white hover:bg-green-600"
                    title="Apply"
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>
            <pre className={`text-xs font-mono ${textClass} whitespace-pre-wrap overflow-auto max-h-96`}>
              {refactorResult}
            </pre>
          </div>
        </motion.div>
      )}
    </div>
  );

  const renderSettingsTab = () => (
    <div className="p-3 space-y-4">
      <div>
        <label className={`block text-sm font-medium ${textClass} mb-1`}>AI Provider</label>
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value as AIAssistantProvider);
            const models = aiCodeAssistant.getModels(e.target.value as AIAssistantProvider);
            setModel(models[0] || '');
          }}
          className={`w-full px-3 py-2 rounded border ${inputClass}`}
        >
          {aiCodeAssistant.getProviders().map(p => (
            <option key={p.id} value={p.id}>
              {PROVIDER_ICONS[p.id]} {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={`block text-sm font-medium ${textClass} mb-1`}>Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className={`w-full px-3 py-2 rounded border ${inputClass}`}
        >
          {aiCodeAssistant.getModels(provider).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={`block text-sm font-medium ${textClass} mb-1`}>
          API Key {provider === 'ollama' && '(not required for Ollama)'}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={provider === 'ollama' ? 'Not required' : `Enter your ${provider} API key`}
          className={`w-full px-3 py-2 rounded border ${inputClass}`}
          disabled={provider === 'ollama'}
        />
      </div>

      <button
        onClick={handleConfigure}
        className="w-full px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center gap-2"
      >
        <Icons.Check />
        Save Configuration
      </button>

      {isConfigured && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <Icons.Check />
          AI Assistant configured successfully
        </div>
      )}
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className={`flex flex-col h-full ${bgClass} ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${borderClass}`}>
        <div className="flex items-center gap-2">
          <Icons.Sparkles />
          <span className={`text-sm font-medium ${textClass}`}>AI Assistant</span>
          {isConfigured && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
              {PROVIDER_ICONS[provider]} {model.slice(0, 15)}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${borderClass} overflow-x-auto scrollbar-thin`}>
        {[
          { id: 'review' as AITab, label: 'Review', icon: Icons.Review },
          { id: 'docs' as AITab, label: 'Docs', icon: Icons.Docs },
          { id: 'explain' as AITab, label: 'Explain', icon: Icons.Explain },
          { id: 'security' as AITab, label: 'Security', icon: Icons.Security },
          { id: 'refactor' as AITab, label: 'Refactor', icon: Icons.Refactor },
          { id: 'settings' as AITab, label: 'Settings', icon: Icons.Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium flex items-center gap-1 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? `${activeClass} ${textClass}`
                : `${mutedClass} ${hoverClass}`
            }`}
          >
            <tab.icon />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Not Configured Warning */}
      {!isConfigured && activeTab !== 'settings' && (
        <div className={`p-3 ${bgSecondary} border-b ${borderClass}`}>
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <Icons.Warning />
            <span>Configure AI provider in Settings to use this feature</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-500/10 border-b border-red-500/30">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <Icons.Error />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'review' && renderReviewTab()}
        {activeTab === 'docs' && renderDocsTab()}
        {activeTab === 'explain' && renderExplainTab()}
        {activeTab === 'security' && renderSecurityTab()}
        {activeTab === 'refactor' && renderRefactorTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>

      {/* Current File Info */}
      {activeFile && (
        <div className={`p-2 border-t ${borderClass} ${bgSecondary}`}>
          <div className={`flex items-center gap-2 text-xs ${mutedClass}`}>
            <Icons.Code />
            <span className="truncate">{currentFilename}</span>
            <span>({currentLanguage})</span>
            <span>{currentCode.split('\n').length} lines</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIIntegrationPanel;
