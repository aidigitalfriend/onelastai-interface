/**
 * useTerminal — Terminal session management hook
 * Wraps terminalStore for convenient usage
 */
import { useCallback } from 'react';
import { useTerminalStore } from '../stores/terminalStore';

export function useTerminal() {
  const store = useTerminalStore();

  const createTerminal = useCallback((name?: string) => {
    return store.createSession(name);
  }, [store]);

  const executeCommand = useCallback(async (terminalId: string, command: string) => {
    store.addOutput(terminalId, { terminalId, type: 'stdout', text: `$ ${command}` });

    // In real implementation, this sends to sandbox WebSocket
    // For now simulate output
    await new Promise((r) => setTimeout(r, 300));
    store.addOutput(terminalId, { terminalId, type: 'stdout', text: `Executing: ${command}` });
  }, [store]);

  const writeToTerminal = useCallback((terminalId: string, text: string, type: 'stdout' | 'stderr' | 'system' = 'stdout') => {
    store.addOutput(terminalId, { terminalId, type, text });
  }, [store]);

  return {
    sessions: store.sessions,
    activeSessionId: store.activeSessionId,
    outputs: store.outputs,
    isVisible: store.isVisible,
    height: store.height,
    createTerminal,
    closeTerminal: store.closeSession,
    setActiveSession: store.setActiveSession,
    executeCommand,
    writeToTerminal,
    clearOutput: store.clearOutput,
    toggleVisible: store.toggleVisible,
    setHeight: store.setHeight,
    renameSession: store.renameSession,
  };
}
