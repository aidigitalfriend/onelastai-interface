/**
 * TerminalService — Terminal WebSocket connection manager
 * Connects xterm.js to sandbox containers via WebSocket
 * 
 * Phase 2: Real terminal sessions in sandbox containers
 */

export interface TerminalSession {
  id: string;
  sandboxId: string;
  ws: WebSocket | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  cols: number;
  rows: number;
}

export type TerminalDataHandler = (data: string) => void;
export type TerminalStatusHandler = (status: TerminalSession['status']) => void;

class TerminalService {
  private sessions = new Map<string, TerminalSession>();
  private dataHandlers = new Map<string, Set<TerminalDataHandler>>();
  private statusHandlers = new Map<string, Set<TerminalStatusHandler>>();
  private reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Connect a terminal session to a sandbox
   */
  connect(sessionId: string, sandboxId: string, cols = 80, rows = 24): TerminalSession {
    // Close existing session if any
    this.disconnect(sessionId);

    const session: TerminalSession = {
      id: sessionId,
      sandboxId,
      ws: null,
      status: 'connecting',
      cols,
      rows,
    };

    this.sessions.set(sessionId, session);
    this.notifyStatus(sessionId, 'connecting');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/sandbox/${sandboxId}/terminal`;
      
      const ws = new WebSocket(wsUrl);
      session.ws = ws;

      ws.onopen = () => {
        session.status = 'connected';
        this.notifyStatus(sessionId, 'connected');

        // Send initial terminal size
        ws.send(JSON.stringify({
          type: 'resize',
          cols,
          rows,
        }));
      };

      ws.onmessage = (event) => {
        const handlers = this.dataHandlers.get(sessionId);
        if (handlers) {
          handlers.forEach((handler) => handler(event.data));
        }
      };

      ws.onclose = () => {
        session.status = 'disconnected';
        session.ws = null;
        this.notifyStatus(sessionId, 'disconnected');

        // Auto-reconnect after 3 seconds
        this.scheduleReconnect(sessionId, sandboxId, cols, rows);
      };

      ws.onerror = () => {
        session.status = 'error';
        this.notifyStatus(sessionId, 'error');
      };
    } catch (e) {
      session.status = 'error';
      this.notifyStatus(sessionId, 'error');
    }

    return session;
  }

  /**
   * Send data to terminal (user keystrokes)
   */
  send(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (session?.ws?.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify({
        type: 'data',
        data,
      }));
    }
  }

  /**
   * Resize terminal
   */
  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.cols = cols;
      session.rows = rows;

      if (session.ws?.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'resize',
          cols,
          rows,
        }));
      }
    }
  }

  /**
   * Disconnect a terminal session
   */
  disconnect(sessionId: string): void {
    const timer = this.reconnectTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(sessionId);
    }

    const session = this.sessions.get(sessionId);
    if (session?.ws) {
      session.ws.close();
      session.ws = null;
    }

    this.sessions.delete(sessionId);
    this.dataHandlers.delete(sessionId);
    this.statusHandlers.delete(sessionId);
  }

  /**
   * Register a data handler for incoming terminal data
   */
  onData(sessionId: string, handler: TerminalDataHandler): () => void {
    if (!this.dataHandlers.has(sessionId)) {
      this.dataHandlers.set(sessionId, new Set());
    }
    this.dataHandlers.get(sessionId)!.add(handler);

    return () => {
      this.dataHandlers.get(sessionId)?.delete(handler);
    };
  }

  /**
   * Register a status handler
   */
  onStatus(sessionId: string, handler: TerminalStatusHandler): () => void {
    if (!this.statusHandlers.has(sessionId)) {
      this.statusHandlers.set(sessionId, new Set());
    }
    this.statusHandlers.get(sessionId)!.add(handler);

    return () => {
      this.statusHandlers.get(sessionId)?.delete(handler);
    };
  }

  /**
   * Get session status
   */
  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Disconnect all sessions
   */
  disconnectAll(): void {
    for (const sessionId of this.sessions.keys()) {
      this.disconnect(sessionId);
    }
  }

  private notifyStatus(sessionId: string, status: TerminalSession['status']): void {
    const handlers = this.statusHandlers.get(sessionId);
    if (handlers) {
      handlers.forEach((handler) => handler(status));
    }
  }

  private scheduleReconnect(sessionId: string, sandboxId: string, cols: number, rows: number): void {
    const timer = setTimeout(() => {
      if (this.sessions.has(sessionId)) {
        console.log(`[TerminalService] Reconnecting session ${sessionId}...`);
        this.connect(sessionId, sandboxId, cols, rows);
      }
    }, 3000);

    this.reconnectTimers.set(sessionId, timer);
  }
}

export const terminalService = new TerminalService();
export default terminalService;
