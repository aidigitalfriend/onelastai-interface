/**
 * EditorStatusBar — Bottom status bar with language, line:col, git branch
 * Gorgeous gradient accents with fiber-smooth transitions
 */
import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Check, AlertTriangle, XCircle, Wifi, WifiOff, Braces } from 'lucide-react';
import { useEditorSettingsStore } from '../../stores/editorStore';

interface EditorStatusBarProps {
  language?: string;
  encoding?: string;
  gitBranch?: string;
  gitStatus?: 'clean' | 'dirty' | 'detached';
  isConnected?: boolean;
  isSaving?: boolean;
}

const EditorStatusBar: React.FC<EditorStatusBarProps> = ({
  language = 'TypeScript',
  encoding = 'UTF-8',
  gitBranch = 'main',
  gitStatus = 'clean',
  isConnected = true,
  isSaving = false,
}) => {
  const cursor = useEditorSettingsStore((s) => s.cursor);
  const problems = useEditorSettingsStore((s) => s.problems);
  const settings = useEditorSettingsStore((s) => s.settings);
  const toggleProblems = useEditorSettingsStore((s) => s.toggleProblems);

  const errors = problems.filter((p) => p.severity === 'error').length;
  const warnings = problems.filter((p) => p.severity === 'warning').length;

  return (
    <div className="h-[24px] shrink-0 flex items-center justify-between px-3 bg-zinc-950 border-t border-zinc-800/50 text-[10px] font-medium select-none">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Git branch */}
        <div className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors">
          <GitBranch className="w-3 h-3" />
          <span>{gitBranch}</span>
          {gitStatus === 'dirty' && <span className="text-amber-400">*</span>}
        </div>

        {/* Problems */}
        <button
          onClick={toggleProblems}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors"
        >
          {errors > 0 && (
            <span className="flex items-center gap-0.5 text-red-400">
              <XCircle className="w-3 h-3" /> {errors}
            </span>
          )}
          {warnings > 0 && (
            <span className="flex items-center gap-0.5 text-amber-400">
              <AlertTriangle className="w-3 h-3" /> {warnings}
            </span>
          )}
          {errors === 0 && warnings === 0 && (
            <span className="flex items-center gap-0.5 text-emerald-400/60">
              <Check className="w-3 h-3" /> 0
            </span>
          )}
        </button>

        {/* Saving indicator */}
        {isSaving && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-violet-400 flex items-center gap-1"
          >
            <div className="w-2 h-2 border border-violet-400 border-t-transparent rounded-full animate-spin" />
            Saving...
          </motion.span>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 text-zinc-500">
        {/* Cursor position */}
        <span className="hover:text-zinc-300 cursor-pointer transition-colors">
          Ln {cursor.line}, Col {cursor.column}
        </span>

        {/* Tab size */}
        <span className="hover:text-zinc-300 cursor-pointer transition-colors flex items-center gap-1">
          <Braces className="w-3 h-3" />
          Spaces: {settings.tabSize}
        </span>

        {/* Encoding */}
        <span className="hover:text-zinc-300 cursor-pointer transition-colors">{encoding}</span>

        {/* Language */}
        <span className="hover:text-zinc-300 cursor-pointer transition-colors px-1.5 py-0.5 rounded bg-zinc-900/40 border border-zinc-800/50">
          {language}
        </span>

        {/* Connection status */}
        <span className={`flex items-center gap-1 ${isConnected ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
          {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        </span>
      </div>
    </div>
  );
};

export default EditorStatusBar;
