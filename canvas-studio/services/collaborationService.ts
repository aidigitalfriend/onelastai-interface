/**
 * COLLABORATION SERVICE - Real-time collaboration using Y.js
 * Provides CRDT-based document sync and presence awareness
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';

// ============================================================================
// TYPES
// ============================================================================

export interface Collaborator {
  id: number;
  name: string;
  color: string;
  avatar?: string;
  cursor?: {
    file: string;
    line: number;
    column: number;
  };
  selection?: {
    file: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  lastActivity: number;
}

export interface CollaborationState {
  isConnected: boolean;
  isSynced: boolean;
  collaborators: Collaborator[];
  error: string | null;
}

export interface CollaborationOptions {
  projectSlug: string;
  userName: string;
  userColor?: string;
  userAvatar?: string;
  onSync?: () => void;
  onCollaboratorJoin?: (collaborator: Collaborator) => void;
  onCollaboratorLeave?: (collaborator: Collaborator) => void;
  onFileChange?: (path: string, content: string) => void;
}

// ============================================================================
// COLORS FOR COLLABORATORS
// ============================================================================

const COLLABORATOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF4500',
];

function getRandomColor(): string {
  return COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)];
}

// ============================================================================
// COLLABORATION SERVICE CLASS
// ============================================================================

export class CollaborationService {
  private doc: Y.Doc;
  private provider: WebsocketProvider | null = null;
  private awareness: Awareness | null = null;
  private options: CollaborationOptions;
  private state: CollaborationState = {
    isConnected: false,
    isSynced: false,
    collaborators: [],
    error: null,
  };
  private stateListeners: Set<(state: CollaborationState) => void> = new Set();
  private fileListeners: Map<string, Set<(content: string) => void>> = new Map();

  constructor(options: CollaborationOptions) {
    this.options = {
      ...options,
      userColor: options.userColor || getRandomColor(),
    };
    this.doc = new Y.Doc();
  }

  // ============================================================================
  // CONNECTION
  // ============================================================================

  connect(): void {
    const wsUrl = this.getWebSocketUrl();
    
    try {
      this.provider = new WebsocketProvider(
        wsUrl,
        this.options.projectSlug,
        this.doc,
        { connect: true }
      );

      this.awareness = this.provider.awareness;

      // Set local user state
      this.awareness.setLocalState({
        id: this.awareness.clientID,
        name: this.options.userName,
        color: this.options.userColor,
        avatar: this.options.userAvatar,
        cursor: null,
        selection: null,
        lastActivity: Date.now(),
      });

      // Connection events
      this.provider.on('status', ({ status }: { status: string }) => {
        this.updateState({
          isConnected: status === 'connected',
          error: status === 'disconnected' ? 'Connection lost' : null,
        });
      });

      this.provider.on('sync', (isSynced: boolean) => {
        this.updateState({ isSynced });
        if (isSynced && this.options.onSync) {
          this.options.onSync();
        }
      });

      // Awareness events
      this.awareness.on('change', () => {
        this.updateCollaborators();
      });

      console.log('[Collab] Connected to', wsUrl, 'for', this.options.projectSlug);
    } catch (error) {
      console.error('[Collab] Connection error:', error);
      this.updateState({
        isConnected: false,
        error: 'Failed to connect to collaboration server',
      });
    }
  }

  disconnect(): void {
    if (this.provider) {
      this.provider.disconnect();
      this.provider.destroy();
      this.provider = null;
    }
    this.awareness = null;
    this.updateState({
      isConnected: false,
      isSynced: false,
      collaborators: [],
    });
    console.log('[Collab] Disconnected');
  }

  private getWebSocketUrl(): string {
    const isProduction = window.location.hostname !== 'localhost';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = isProduction 
      ? 'maula.onelastai.co'
      : `localhost:3200`;
    return `${protocol}//${host}/collaboration`;
  }

  // ============================================================================
  // FILE SYNCHRONIZATION
  // ============================================================================

  getFile(path: string): string {
    const filesMap = this.doc.getMap('files');
    const yText = filesMap.get(path) as Y.Text | undefined;
    return yText ? yText.toString() : '';
  }

  setFile(path: string, content: string): void {
    const filesMap = this.doc.getMap('files');
    
    // Use Y.Text for efficient character-level sync
    let yText = filesMap.get(path) as Y.Text | undefined;
    if (!yText) {
      yText = new Y.Text();
      filesMap.set(path, yText);
    }
    
    // Replace all content
    this.doc.transact(() => {
      yText!.delete(0, yText!.length);
      yText!.insert(0, content);
    });
  }

  insertText(path: string, index: number, text: string): void {
    const filesMap = this.doc.getMap('files');
    const yText = filesMap.get(path) as Y.Text | undefined;
    
    if (yText) {
      yText.insert(index, text);
    }
  }

  deleteText(path: string, index: number, length: number): void {
    const filesMap = this.doc.getMap('files');
    const yText = filesMap.get(path) as Y.Text | undefined;
    
    if (yText) {
      yText.delete(index, length);
    }
  }

  onFileChange(path: string, callback: (content: string) => void): () => void {
    const filesMap = this.doc.getMap('files');
    
    // Add listener
    if (!this.fileListeners.has(path)) {
      this.fileListeners.set(path, new Set());
    }
    this.fileListeners.get(path)!.add(callback);
    
    // Observe changes
    const observer = () => {
      const yText = filesMap.get(path) as Y.Text | undefined;
      if (yText) {
        callback(yText.toString());
      }
    };
    
    filesMap.observe(observer);
    
    // Return unsubscribe function
    return () => {
      this.fileListeners.get(path)?.delete(callback);
      filesMap.unobserve(observer);
    };
  }

  getFileList(): string[] {
    const filesMap = this.doc.getMap('files');
    return Array.from(filesMap.keys());
  }

  deleteFile(path: string): void {
    const filesMap = this.doc.getMap('files');
    filesMap.delete(path);
  }

  // ============================================================================
  // CURSOR & SELECTION AWARENESS
  // ============================================================================

  setCursor(file: string, line: number, column: number): void {
    if (!this.awareness) return;
    
    const state = this.awareness.getLocalState() || {};
    this.awareness.setLocalState({
      ...state,
      cursor: { file, line, column },
      lastActivity: Date.now(),
    });
  }

  setSelection(
    file: string,
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number
  ): void {
    if (!this.awareness) return;
    
    const state = this.awareness.getLocalState() || {};
    this.awareness.setLocalState({
      ...state,
      selection: { file, startLine, startColumn, endLine, endColumn },
      lastActivity: Date.now(),
    });
  }

  clearCursor(): void {
    if (!this.awareness) return;
    
    const state = this.awareness.getLocalState() || {};
    this.awareness.setLocalState({
      ...state,
      cursor: null,
      selection: null,
    });
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  private updateState(updates: Partial<CollaborationState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyStateListeners();
  }

  private updateCollaborators(): void {
    if (!this.awareness) return;
    
    const states = this.awareness.getStates();
    const previousCollaborators = this.state.collaborators;
    
    const collaborators: Collaborator[] = [];
    states.forEach((state, clientId) => {
      if (clientId !== this.awareness!.clientID && state.name) {
        collaborators.push({
          id: clientId,
          name: state.name,
          color: state.color || '#888',
          avatar: state.avatar,
          cursor: state.cursor,
          selection: state.selection,
          lastActivity: state.lastActivity || Date.now(),
        });
      }
    });
    
    // Check for joins/leaves
    const previousIds = new Set(previousCollaborators.map(c => c.id));
    const currentIds = new Set(collaborators.map(c => c.id));
    
    collaborators.forEach(c => {
      if (!previousIds.has(c.id) && this.options.onCollaboratorJoin) {
        this.options.onCollaboratorJoin(c);
      }
    });
    
    previousCollaborators.forEach(c => {
      if (!currentIds.has(c.id) && this.options.onCollaboratorLeave) {
        this.options.onCollaboratorLeave(c);
      }
    });
    
    this.updateState({ collaborators });
  }

  private notifyStateListeners(): void {
    this.stateListeners.forEach(listener => listener(this.state));
  }

  onStateChange(callback: (state: CollaborationState) => void): () => void {
    this.stateListeners.add(callback);
    callback(this.state); // Immediate callback with current state
    
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  getState(): CollaborationState {
    return this.state;
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  getLocalClientId(): number | null {
    return this.awareness?.clientID ?? null;
  }

  isConnected(): boolean {
    return this.state.isConnected;
  }

  isSynced(): boolean {
    return this.state.isSynced;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let collaborationInstance: CollaborationService | null = null;

export function getCollaborationService(): CollaborationService | null {
  return collaborationInstance;
}

export function createCollaborationService(options: CollaborationOptions): CollaborationService {
  if (collaborationInstance) {
    collaborationInstance.disconnect();
  }
  collaborationInstance = new CollaborationService(options);
  return collaborationInstance;
}

export function destroyCollaborationService(): void {
  if (collaborationInstance) {
    collaborationInstance.disconnect();
    collaborationInstance = null;
  }
}

export default CollaborationService;
