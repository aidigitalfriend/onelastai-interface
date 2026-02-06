/**
 * USE COLLABORATION HOOK - React hook for real-time collaboration
 * Integrates Y.js collaboration with React state
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CollaborationService,
  CollaborationState,
  CollaborationOptions,
  Collaborator,
  createCollaborationService,
  destroyCollaborationService,
  getCollaborationService,
} from './collaborationService';

// ============================================================================
// TYPES
// ============================================================================

export interface UseCollaborationOptions {
  projectSlug: string | null;
  userName: string;
  userColor?: string;
  userAvatar?: string;
  enabled?: boolean;
  onSync?: () => void;
  onCollaboratorJoin?: (collaborator: Collaborator) => void;
  onCollaboratorLeave?: (collaborator: Collaborator) => void;
}

export interface UseCollaborationReturn {
  // State
  isConnected: boolean;
  isSynced: boolean;
  collaborators: Collaborator[];
  error: string | null;
  
  // File operations
  getFile: (path: string) => string;
  setFile: (path: string, content: string) => void;
  onFileChange: (path: string, callback: (content: string) => void) => () => void;
  
  // Cursor/selection
  setCursor: (file: string, line: number, column: number) => void;
  setSelection: (file: string, start: { line: number; column: number }, end: { line: number; column: number }) => void;
  clearCursor: () => void;
  
  // Control
  connect: () => void;
  disconnect: () => void;
  
  // Service access
  service: CollaborationService | null;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useCollaboration(options: UseCollaborationOptions): UseCollaborationReturn {
  const { projectSlug, userName, userColor, userAvatar, enabled = true, onSync, onCollaboratorJoin, onCollaboratorLeave } = options;
  
  const [state, setState] = useState<CollaborationState>({
    isConnected: false,
    isSynced: false,
    collaborators: [],
    error: null,
  });
  
  const serviceRef = useRef<CollaborationService | null>(null);
  const isInitializedRef = useRef(false);
  
  // Initialize collaboration service
  const connect = useCallback(() => {
    if (!projectSlug || !userName || !enabled) return;
    
    // Prevent double initialization
    if (isInitializedRef.current && serviceRef.current?.isConnected()) return;
    
    const service = createCollaborationService({
      projectSlug,
      userName,
      userColor,
      userAvatar,
      onSync,
      onCollaboratorJoin,
      onCollaboratorLeave,
    });
    
    serviceRef.current = service;
    isInitializedRef.current = true;
    
    // Subscribe to state changes
    service.onStateChange((newState) => {
      setState(newState);
    });
    
    // Connect
    service.connect();
    
    console.log('[useCollaboration] Connected for project:', projectSlug);
  }, [projectSlug, userName, userColor, userAvatar, enabled, onSync, onCollaboratorJoin, onCollaboratorLeave]);
  
  // Disconnect
  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      isInitializedRef.current = false;
    }
  }, []);
  
  // Auto-connect when projectSlug changes
  useEffect(() => {
    if (projectSlug && enabled) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [projectSlug, enabled]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyCollaborationService();
    };
  }, []);
  
  // File operations
  const getFile = useCallback((path: string): string => {
    return serviceRef.current?.getFile(path) || '';
  }, []);
  
  const setFile = useCallback((path: string, content: string): void => {
    serviceRef.current?.setFile(path, content);
  }, []);
  
  const onFileChange = useCallback((path: string, callback: (content: string) => void): () => void => {
    if (!serviceRef.current) return () => {};
    return serviceRef.current.onFileChange(path, callback);
  }, []);
  
  // Cursor operations
  const setCursor = useCallback((file: string, line: number, column: number): void => {
    serviceRef.current?.setCursor(file, line, column);
  }, []);
  
  const setSelection = useCallback((
    file: string,
    start: { line: number; column: number },
    end: { line: number; column: number }
  ): void => {
    serviceRef.current?.setSelection(file, start.line, start.column, end.line, end.column);
  }, []);
  
  const clearCursor = useCallback((): void => {
    serviceRef.current?.clearCursor();
  }, []);
  
  return {
    // State
    isConnected: state.isConnected,
    isSynced: state.isSynced,
    collaborators: state.collaborators,
    error: state.error,
    
    // File operations
    getFile,
    setFile,
    onFileChange,
    
    // Cursor/selection
    setCursor,
    setSelection,
    clearCursor,
    
    // Control
    connect,
    disconnect,
    
    // Service access
    service: serviceRef.current,
  };
}

// ============================================================================
// COLLABORATOR AVATAR COMPONENT
// ============================================================================

interface CollaboratorAvatarProps {
  collaborator: Collaborator;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export function CollaboratorAvatar({ collaborator, size = 'md', showName = false }: CollaboratorAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  };
  
  const initials = collaborator.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white shadow-lg`}
        style={{
          backgroundColor: collaborator.color,
          boxShadow: `0 0 10px ${collaborator.color}40`,
        }}
        title={collaborator.name}
      >
        {collaborator.avatar ? (
          <img
            src={collaborator.avatar}
            alt={collaborator.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      {showName && (
        <span className="text-xs text-gray-400">{collaborator.name}</span>
      )}
    </div>
  );
}

// ============================================================================
// COLLABORATORS BAR COMPONENT
// ============================================================================

interface CollaboratorsBarProps {
  collaborators: Collaborator[];
  isConnected: boolean;
  maxVisible?: number;
}

export function CollaboratorsBar({ collaborators, isConnected, maxVisible = 5 }: CollaboratorsBarProps) {
  const visibleCollaborators = collaborators.slice(0, maxVisible);
  const hiddenCount = collaborators.length - maxVisible;
  
  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-gray-500"></div>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Offline</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      {/* Connection status */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <span className="text-[10px] text-emerald-400 uppercase tracking-wider">Live</span>
      </div>
      
      {/* Collaborator avatars */}
      {collaborators.length > 0 && (
        <div className="flex items-center -space-x-2">
          {visibleCollaborators.map((collaborator) => (
            <CollaboratorAvatar
              key={collaborator.id}
              collaborator={collaborator}
              size="sm"
            />
          ))}
          {hiddenCount > 0 && (
            <div
              className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-300 font-bold border-2 border-gray-900"
              title={`${hiddenCount} more`}
            >
              +{hiddenCount}
            </div>
          )}
        </div>
      )}
      
      {collaborators.length === 0 && (
        <span className="text-[10px] text-gray-500">Solo editing</span>
      )}
    </div>
  );
}

// ============================================================================
// CURSOR OVERLAY COMPONENT
// ============================================================================

interface RemoteCursorProps {
  collaborator: Collaborator;
  lineHeight: number;
  charWidth: number;
}

export function RemoteCursor({ collaborator, lineHeight, charWidth }: RemoteCursorProps) {
  if (!collaborator.cursor) return null;
  
  const top = (collaborator.cursor.line - 1) * lineHeight;
  const left = collaborator.cursor.column * charWidth;
  
  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        top: `${top}px`,
        left: `${left}px`,
      }}
    >
      {/* Cursor line */}
      <div
        className="w-0.5 animate-pulse"
        style={{
          height: `${lineHeight}px`,
          backgroundColor: collaborator.color,
          boxShadow: `0 0 4px ${collaborator.color}`,
        }}
      />
      {/* Name label */}
      <div
        className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[9px] font-bold text-white whitespace-nowrap"
        style={{
          backgroundColor: collaborator.color,
        }}
      >
        {collaborator.name}
      </div>
    </div>
  );
}

export default useCollaboration;
