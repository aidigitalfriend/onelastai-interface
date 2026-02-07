/**
 * HistoryPanel — Project version history & code snapshots
 * Browse, compare, and restore previous versions
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, RotateCcw, Eye, ChevronRight, Sparkles, Save, Code, FileText, Diff } from 'lucide-react';

export interface HistoryEntry {
  id: string;
  type: 'generation' | 'edit' | 'deploy' | 'auto-save' | 'restore';
  title: string;
  description?: string;
  timestamp: string;
  snapshot?: string;       // full code snapshot
  prompt?: string;         // AI prompt that generated this
  model?: string;          // AI model used
  filesChanged?: string[];
  diff?: { additions: number; deletions: number };
}

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onRestore?: (entry: HistoryEntry) => void;
  onPreview?: (entry: HistoryEntry) => void;
  onCompare?: (entryA: HistoryEntry, entryB: HistoryEntry) => void;
  className?: string;
}

const typeConfig: Record<HistoryEntry['type'], { icon: React.ElementType; color: string; label: string }> = {
  generation: { icon: Sparkles, color: 'text-violet-400', label: 'AI Generated' },
  edit: { icon: Code, color: 'text-blue-400', label: 'Manual Edit' },
  deploy: { icon: Save, color: 'text-emerald-400', label: 'Deployed' },
  'auto-save': { icon: Clock, color: 'text-zinc-500', label: 'Auto-saved' },
  restore: { icon: RotateCcw, color: 'text-amber-400', label: 'Restored' },
};

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  entries,
  onRestore,
  onPreview,
  onCompare,
  className = '',
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const handleSelect = useCallback((entry: HistoryEntry) => {
    if (compareMode) {
      setCompareIds((prev) => {
        if (prev.includes(entry.id)) {
          return prev.filter((id) => id !== entry.id);
        }
        if (prev.length >= 2) {
          return [prev[1], entry.id];
        }
        return [...prev, entry.id];
      });
    } else {
      setSelectedId(selectedId === entry.id ? null : entry.id);
    }
  }, [compareMode, selectedId]);

  const handleCompare = useCallback(() => {
    if (compareIds.length === 2 && onCompare) {
      const a = entries.find((e) => e.id === compareIds[0]);
      const b = entries.find((e) => e.id === compareIds[1]);
      if (a && b) onCompare(a, b);
    }
  }, [compareIds, entries, onCompare]);

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  // Group entries by date
  const groupedEntries = entries.reduce<Record<string, HistoryEntry[]>>((acc, entry) => {
    const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  return (
    <div className={`flex flex-col h-full bg-zinc-950 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-200">History</h3>
            <p className="text-[10px] text-zinc-500">{entries.length} snapshots</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onCompare && (
            <button
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareIds([]);
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                compareMode
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              <Diff className="w-3 h-3 inline mr-1" />
              Compare
            </button>
          )}
        </div>
      </div>

      {/* Compare bar */}
      {compareMode && compareIds.length === 2 && (
        <div className="px-3 py-2 bg-violet-500/5 border-b border-zinc-800/50">
          <button
            onClick={handleCompare}
            className="w-full px-3 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded-lg text-xs font-semibold hover:bg-violet-500/30 transition-all"
          >
            Compare Selected ({compareIds.length}/2)
          </button>
        </div>
      )}

      {/* History list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
            <Clock className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No history yet</p>
            <p className="text-[10px] text-zinc-600 mt-1">Changes will appear here</p>
          </div>
        ) : (
          Object.entries(groupedEntries).map(([date, dateEntries]) => (
            <div key={date}>
              <div className="px-3 py-1.5 bg-zinc-900/30 sticky top-0 z-10">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{date}</span>
              </div>

              {dateEntries.map((entry, i) => {
                const config = typeConfig[entry.type];
                const Icon = config.icon;
                const isSelected = selectedId === entry.id;
                const isCompareSelected = compareIds.includes(entry.id);

                return (
                  <div key={entry.id}>
                    <button
                      onClick={() => handleSelect(entry)}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 hover:bg-zinc-900/40 transition-colors text-left ${
                        isSelected ? 'bg-zinc-900/40' : ''
                      } ${isCompareSelected ? 'bg-violet-500/5 border-l-2 border-violet-500' : ''}`}
                    >
                      {/* Timeline */}
                      <div className="flex flex-col items-center shrink-0 pt-0.5">
                        <div className={`w-7 h-7 rounded-lg ${
                          isCompareSelected ? 'bg-violet-500/20 border-violet-500/30' : 'bg-zinc-900/50 border-zinc-800'
                        } border flex items-center justify-center`}>
                          <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                        </div>
                        {i < dateEntries.length - 1 && (
                          <div className="w-[1px] flex-1 bg-zinc-800 mt-1 min-h-[8px]" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-200 font-medium truncate">{entry.title}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                            entry.type === 'generation' ? 'bg-violet-500/15 text-violet-400' :
                            entry.type === 'deploy' ? 'bg-emerald-500/15 text-emerald-400' :
                            'bg-zinc-900/50 text-zinc-500'
                          }`}>
                            {config.label}
                          </span>
                        </div>

                        {entry.description && (
                          <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{entry.description}</p>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-zinc-600">{formatTime(entry.timestamp)}</span>
                          {entry.diff && (
                            <span className="text-[9px]">
                              <span className="text-emerald-400/60">+{entry.diff.additions}</span>
                              {' '}
                              <span className="text-red-400/60">-{entry.diff.deletions}</span>
                            </span>
                          )}
                          {entry.model && (
                            <span className="text-[9px] text-zinc-600">{entry.model}</span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className={`w-3 h-3 text-zinc-700 shrink-0 mt-1 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isSelected && !compareMode && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-b border-zinc-800/50"
                        >
                          <div className="px-3 py-2 pl-12 space-y-2">
                            {entry.prompt && (
                              <div className="text-[10px] text-zinc-500 bg-zinc-900/30 rounded-lg p-2">
                                <span className="text-violet-400/60 font-semibold">Prompt: </span>{entry.prompt}
                              </div>
                            )}

                            {entry.filesChanged && entry.filesChanged.length > 0 && (
                              <div className="text-[10px] text-zinc-500">
                                <span className="font-semibold">Files: </span>
                                {entry.filesChanged.join(', ')}
                              </div>
                            )}

                            <div className="flex gap-2">
                              {onPreview && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onPreview(entry); }}
                                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all"
                                >
                                  <Eye className="w-3 h-3" /> Preview
                                </button>
                              )}
                              {onRestore && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onRestore(entry); }}
                                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-all"
                                >
                                  <RotateCcw className="w-3 h-3" /> Restore
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;
