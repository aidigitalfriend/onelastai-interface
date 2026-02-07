/**
 * ConsolePanel — Browser console output viewer
 * Shows console.log, warn, error output from the preview iframe
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, AlertTriangle, XCircle, Info, Trash2, Filter, ChevronDown, Search } from 'lucide-react';

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface ConsoleEntry {
  id: string;
  level: ConsoleLevel;
  message: string;
  timestamp: string;
  count?: number;
  source?: string;
  lineNumber?: number;
  args?: any[];
}

interface ConsolePanelProps {
  entries: ConsoleEntry[];
  onClear?: () => void;
  className?: string;
}

const levelConfig: Record<ConsoleLevel, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  log: { icon: Terminal, color: 'text-zinc-400', bg: 'bg-transparent', label: 'Log' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/5', label: 'Info' },
  warn: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/5', label: 'Warn' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/5', label: 'Error' },
  debug: { icon: Terminal, color: 'text-zinc-500', bg: 'bg-transparent', label: 'Debug' },
};

const ConsolePanel: React.FC<ConsolePanelProps> = ({ entries, onClear, className = '' }) => {
  const [filter, setFilter] = useState<ConsoleLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const filteredEntries = entries.filter((entry) => {
    if (filter !== 'all' && entry.level !== filter) return false;
    if (searchQuery && !entry.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const levelCounts = {
    all: entries.length,
    log: entries.filter((e) => e.level === 'log').length,
    info: entries.filter((e) => e.level === 'info').length,
    warn: entries.filter((e) => e.level === 'warn').length,
    error: entries.filter((e) => e.level === 'error').length,
    debug: entries.filter((e) => e.level === 'debug').length,
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries.length, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  }, []);

  const formatValue = (val: any): string => {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val, null, 2);
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  return (
    <div className={`flex flex-col h-full bg-zinc-950 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-800/40 shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold text-zinc-400 mr-2">Console</span>

          {/* Level filters */}
          {(['all', 'error', 'warn', 'info', 'log'] as const).map((level) => {
            const count = levelCounts[level];
            const isActive = filter === level;
            return (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                  isActive
                    ? level === 'error' ? 'bg-red-500/15 text-red-400'
                    : level === 'warn' ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-violet-500/15 text-violet-300'
                    : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
                {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1 rounded text-zinc-500 hover:text-zinc-300 transition-all ${showSearch ? 'bg-violet-500/10 text-violet-400' : ''}`}
          >
            <Search className="w-3 h-3" />
          </button>
          <button
            onClick={onClear}
            className="p-1 rounded text-zinc-500 hover:text-red-400 transition-all"
            title="Clear console"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-zinc-800/40 overflow-hidden"
          >
            <div className="px-2 py-1.5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter console output..."
                autoFocus
                className="w-full px-2 py-1 bg-zinc-900/50 border border-zinc-800/60 rounded text-[11px] text-zinc-300 placeholder-zinc-600 focus:border-violet-500/30 outline-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Console output */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[11px]"
      >
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <Terminal className="w-6 h-6 mb-2 opacity-30" />
            <p className="text-[11px]">No console output</p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const config = levelConfig[entry.level];
            const Icon = config.icon;

            return (
              <div
                key={entry.id}
                className={`flex items-start gap-2 px-3 py-1 ${config.bg} border-b border-zinc-800/20 hover:bg-zinc-900/50 transition-colors group`}
              >
                <Icon className={`w-3 h-3 ${config.color} shrink-0 mt-0.5`} />
                <pre className={`flex-1 ${config.color} whitespace-pre-wrap break-all leading-relaxed`}>
                  {entry.message}
                  {entry.args?.map((arg, i) => (
                    <span key={i} className="ml-1 text-zinc-500">{formatValue(arg)}</span>
                  ))}
                </pre>
                {entry.count && entry.count > 1 && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-[9px] font-bold">
                    {entry.count}
                  </span>
                )}
                <span className="shrink-0 text-[9px] text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConsolePanel;
