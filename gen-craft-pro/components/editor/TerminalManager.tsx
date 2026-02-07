/**
 * TerminalManager — Multi-terminal tab management
 * Create, switch, close terminal sessions with gorgeous UI
 */
import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Terminal as TerminalIcon, ChevronDown, Trash2 } from 'lucide-react';
import { useTerminalStore } from '../../stores/terminalStore';
import Terminal from './Terminal';

interface TerminalManagerProps {
  className?: string;
}

const TerminalManager: React.FC<TerminalManagerProps> = ({ className = '' }) => {
  const sessions = useTerminalStore((s) => s.sessions);
  const activeSessionId = useTerminalStore((s) => s.activeSessionId);
  const createSession = useTerminalStore((s) => s.createSession);
  const closeSession = useTerminalStore((s) => s.closeSession);
  const setActiveSession = useTerminalStore((s) => s.setActiveSession);

  const handleCreate = useCallback(() => {
    createSession();
  }, [createSession]);

  const handleClose = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    closeSession(id);
  }, [closeSession]);

  return (
    <div className={`flex flex-col h-full bg-zinc-950 ${className}`}>
      {/* Terminal tab bar */}
      <div className="flex items-center h-[32px] bg-zinc-950 border-b border-zinc-800/50 px-1 shrink-0">
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto custom-scrollbar">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveSession(session.id)}
              className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-all ${
                activeSessionId === session.id
                  ? 'bg-zinc-800/50 text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
              }`}
            >
              <TerminalIcon className="w-3 h-3" />
              <span>{session.name}</span>
              {session.isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
              )}
              <button
                onClick={(e) => handleClose(e, session.id)}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </button>
          ))}
        </div>

        {/* New terminal button */}
        <button
          onClick={handleCreate}
          className="p-1.5 rounded-md text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all shrink-0 ml-1"
          title="New Terminal"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Terminal content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeSessionId && sessions.find((s) => s.id === activeSessionId) ? (
            <motion.div
              key={activeSessionId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0"
            >
              <Terminal sessionId={activeSessionId} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-zinc-600"
            >
              <TerminalIcon className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-xs mb-3">No terminal sessions</p>
              <button
                onClick={handleCreate}
                className="px-4 py-2 text-xs font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/20 transition-all"
              >
                <Plus className="w-3 h-3 inline mr-1.5" />
                New Terminal
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TerminalManager;
