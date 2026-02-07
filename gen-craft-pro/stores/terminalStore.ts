/**
 * Terminal Store — Zustand state for terminal sessions
 * Supports multiple terminal instances with full lifecycle
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface TerminalSession {
  id: string;
  name: string;
  isActive: boolean;
  isConnected: boolean;
  createdAt: number;
  cwd: string;
  shellType: 'bash' | 'zsh' | 'sh' | 'powershell' | 'cmd';
  scrollback: string[];
  exitCode?: number;
}

export interface TerminalOutput {
  id: string;
  terminalId: string;
  type: 'stdout' | 'stderr' | 'system';
  text: string;
  timestamp: number;
}

interface TerminalStoreState {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  outputs: Map<string, TerminalOutput[]>;
  isVisible: boolean;
  height: number;
  maxSessions: number;
}

interface TerminalStoreActions {
  createSession: (name?: string, cwd?: string) => string;
  closeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  addOutput: (terminalId: string, output: Omit<TerminalOutput, 'id' | 'timestamp'>) => void;
  clearOutput: (terminalId: string) => void;
  setConnected: (id: string, connected: boolean) => void;
  setExitCode: (id: string, code: number) => void;
  setVisible: (visible: boolean) => void;
  toggleVisible: () => void;
  setHeight: (h: number) => void;
  renameSession: (id: string, name: string) => void;
}

let sessionCounter = 0;

export const useTerminalStore = create<TerminalStoreState & TerminalStoreActions>()(
  subscribeWithSelector((set, get) => ({
    sessions: [],
    activeSessionId: null,
    outputs: new Map(),
    isVisible: false,
    height: 240,
    maxSessions: 5,

    createSession: (name, cwd = '/') => {
      const id = `term_${++sessionCounter}_${Date.now()}`;
      const session: TerminalSession = {
        id,
        name: name || `Terminal ${sessionCounter}`,
        isActive: true,
        isConnected: false,
        createdAt: Date.now(),
        cwd,
        shellType: 'bash',
        scrollback: [],
      };
      set((s) => ({
        sessions: [...s.sessions, session],
        activeSessionId: id,
        outputs: new Map(s.outputs).set(id, []),
        isVisible: true,
      }));
      return id;
    },

    closeSession: (id) =>
      set((s) => {
        const newSessions = s.sessions.filter((sess) => sess.id !== id);
        const newOutputs = new Map(s.outputs);
        newOutputs.delete(id);
        return {
          sessions: newSessions,
          outputs: newOutputs,
          activeSessionId: s.activeSessionId === id ? (newSessions[0]?.id || null) : s.activeSessionId,
          isVisible: newSessions.length > 0 ? s.isVisible : false,
        };
      }),

    setActiveSession: (id) => set({ activeSessionId: id }),

    addOutput: (terminalId, output) =>
      set((s) => {
        const newOutputs = new Map(s.outputs);
        const existing = newOutputs.get(terminalId) || [];
        newOutputs.set(terminalId, [
          ...existing,
          { ...output, id: `out_${Date.now()}_${Math.random().toString(36).slice(2)}`, timestamp: Date.now() },
        ]);
        return { outputs: newOutputs };
      }),

    clearOutput: (terminalId) =>
      set((s) => {
        const newOutputs = new Map(s.outputs);
        newOutputs.set(terminalId, []);
        return { outputs: newOutputs };
      }),

    setConnected: (id, connected) =>
      set((s) => ({
        sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, isConnected: connected } : sess)),
      })),

    setExitCode: (id, code) =>
      set((s) => ({
        sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, exitCode: code, isActive: false } : sess)),
      })),

    setVisible: (visible) => set({ isVisible: visible }),
    toggleVisible: () => set((s) => ({ isVisible: !s.isVisible })),
    setHeight: (h) => set({ height: Math.max(100, Math.min(600, h)) }),
    renameSession: (id, name) =>
      set((s) => ({
        sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, name } : sess)),
      })),
  }))
);
