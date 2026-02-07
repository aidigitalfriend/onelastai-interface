/**
 * SearchReplace — Find/replace across files with gorgeous UI
 * Supports regex, case-sensitive, whole word matching
 */
import React, { useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Replace, CaseSensitive, Regex, WholeWord, ChevronDown, ChevronUp, X, FileCode } from 'lucide-react';
import { useEditorSettingsStore } from '../../stores/editorStore';

interface SearchReplaceProps {
  onSearch?: (query: string, flags: { isRegex: boolean; isCaseSensitive: boolean; isWholeWord: boolean }) => void;
  onReplace?: (search: string, replace: string) => void;
  onReplaceAll?: (search: string, replace: string) => void;
  onNavigateResult?: (file: string, line: number, column: number) => void;
  className?: string;
}

const SearchReplace: React.FC<SearchReplaceProps> = ({
  onSearch,
  onReplace,
  onReplaceAll,
  onNavigateResult,
  className = '',
}) => {
  const search = useEditorSettingsStore((s) => s.search);
  const setSearchQuery = useEditorSettingsStore((s) => s.setSearchQuery);
  const setReplaceWith = useEditorSettingsStore((s) => s.setReplaceWith);
  const updateSearchFlags = useEditorSettingsStore((s) => s.updateSearchFlags);
  const toggleSearch = useEditorSettingsStore((s) => s.toggleSearch);
  const nextMatch = useEditorSettingsStore((s) => s.nextMatch);
  const prevMatch = useEditorSettingsStore((s) => s.prevMatch);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showReplace, setShowReplace] = React.useState(false);

  useEffect(() => {
    if (search.isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [search.isOpen]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    onSearch?.(query, {
      isRegex: search.isRegex,
      isCaseSensitive: search.isCaseSensitive,
      isWholeWord: search.isWholeWord,
    });
  }, [setSearchQuery, onSearch, search]);

  if (!search.isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={`bg-zinc-900 border-b border-zinc-800 overflow-hidden ${className}`}
      >
        <div className="p-2 space-y-2">
          {/* Search row */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReplace(!showReplace)}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
            >
              {showReplace ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5 rotate-90" />}
            </button>

            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                ref={inputRef}
                type="text"
                value={search.query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:border-violet-500/30 focus:ring-1 focus:ring-violet-500/20 outline-none transition-all"
              />
            </div>

            {/* Match flags */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => updateSearchFlags({ isCaseSensitive: !search.isCaseSensitive })}
                className={`p-1.5 rounded-md transition-all ${search.isCaseSensitive ? 'bg-violet-500/20 text-violet-300' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                title="Match Case"
              >
                <CaseSensitive className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => updateSearchFlags({ isWholeWord: !search.isWholeWord })}
                className={`p-1.5 rounded-md transition-all ${search.isWholeWord ? 'bg-violet-500/20 text-violet-300' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                title="Whole Word"
              >
                <WholeWord className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => updateSearchFlags({ isRegex: !search.isRegex })}
                className={`p-1.5 rounded-md transition-all ${search.isRegex ? 'bg-violet-500/20 text-violet-300' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                title="Regular Expression"
              >
                <Regex className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Match count */}
            {search.matchCount > 0 && (
              <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                {search.currentMatch + 1}/{search.matchCount}
              </span>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={prevMatch} className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={nextMatch} className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <button onClick={toggleSearch} className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Replace row */}
          <AnimatePresence>
            {showReplace && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 pl-7"
              >
                <div className="flex-1 relative">
                  <Replace className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={search.replaceWith}
                    onChange={(e) => setReplaceWith(e.target.value)}
                    placeholder="Replace..."
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:border-violet-500/30 focus:ring-1 focus:ring-violet-500/20 outline-none transition-all"
                  />
                </div>

                <button
                  onClick={() => onReplace?.(search.query, search.replaceWith)}
                  className="px-3 py-1.5 text-[10px] font-medium bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all shrink-0"
                >
                  Replace
                </button>
                <button
                  onClick={() => onReplaceAll?.(search.query, search.replaceWith)}
                  className="px-3 py-1.5 text-[10px] font-medium bg-violet-500/10 border border-violet-500/20 rounded-lg text-violet-400 hover:bg-violet-500/20 transition-all shrink-0"
                >
                  Replace All
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search results */}
        {search.results.length > 0 && (
          <div className="max-h-[200px] overflow-y-auto border-t border-zinc-800/50 custom-scrollbar">
            {search.results.map((result, i) => (
              <button
                key={`${result.path}-${result.line}-${i}`}
                onClick={() => onNavigateResult?.(result.path, result.line, result.column)}
                className={`w-full flex items-center gap-2 px-3 py-1 hover:bg-zinc-900/40 transition-colors text-left ${
                  i === search.currentMatch ? 'bg-violet-500/10' : ''
                }`}
              >
                <FileCode className="w-3 h-3 text-zinc-600 shrink-0" />
                <span className="text-[10px] text-zinc-400 truncate flex-1">{result.text}</span>
                <span className="text-[10px] text-zinc-600 font-mono shrink-0">
                  {result.path.split('/').pop()}:{result.line}
                </span>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default SearchReplace;
