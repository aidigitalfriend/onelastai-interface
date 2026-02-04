/**
 * NEURAL-CHAT CANVAS APP - USE EDITOR BRIDGE HOOK
 * React hook for using the Editor Bridge in components
 * NOTE: This is completely independent from canvas-studio
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  EditorBridge, 
  EditorState, 
  CursorPosition, 
  Selection,
  FileNode,
  EditOperation,
  createEditorBridge,
  getEditorBridge,
} from './editorBridge';

export interface UseEditorBridgeReturn {
  // State
  state: EditorState;
  activeFile: string | null;
  cursor: CursorPosition;
  selection: Selection | null;
  files: Map<string, string>;
  fileList: string[];
  projectTree: FileNode[];
  language: string;
  isDirty: boolean;
  
  // File operations
  getFile: (path: string) => string | null;
  setFile: (path: string, content: string) => void;
  createFile: (path: string, content?: string, language?: string) => void;
  deleteFile: (path: string) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  setActiveFile: (path: string) => void;
  
  // Edit operations
  insertAt: (position: CursorPosition, text: string) => void;
  insertAtCursor: (text: string) => void;
  replaceSelection: (text: string) => void;
  replaceRange: (start: CursorPosition, end: CursorPosition, text: string) => void;
  replaceAll: (searchPattern: string, replaceWith: string) => void;
  deleteLine: (lineNumber: number) => void;
  deleteLines: (startLine: number, endLine: number) => void;
  applyEdits: (operations: EditOperation[]) => void;
  
  // Cursor & Selection
  setCursor: (position: CursorPosition) => void;
  setSelection: (start: CursorPosition, end: CursorPosition) => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  
  // Utility
  markClean: () => void;
  getAgentContext: () => ReturnType<EditorBridge['getAgentContext']>;
  
  // Bridge instance
  bridge: EditorBridge;
}

export function useEditorBridge(initialFiles?: Record<string, string>): UseEditorBridgeReturn {
  // Initialize or get existing bridge
  const bridge = useMemo(() => {
    if (initialFiles) {
      return createEditorBridge(initialFiles);
    }
    return getEditorBridge();
  }, []);
  
  // Track state
  const [state, setState] = useState<EditorState>(() => bridge.getState());
  
  // Subscribe to changes
  useEffect(() => {
    const unsubscribe = bridge.onChange((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, [bridge]);
  
  // Sync initial files if provided
  useEffect(() => {
    if (initialFiles) {
      Object.entries(initialFiles).forEach(([path, content]) => {
        if (!bridge.getFile(path)) {
          bridge.createFile(path, content);
        }
      });
    }
  }, [initialFiles, bridge]);
  
  // Memoized values
  const fileList = useMemo(() => Array.from(state.files.keys()), [state.files]);
  
  // Wrapped methods
  const getFile = useCallback((path: string) => bridge.getFile(path), [bridge]);
  const setFile = useCallback((path: string, content: string) => bridge.setFile(path, content), [bridge]);
  const createFile = useCallback((path: string, content?: string, language?: string) => bridge.createFile(path, content || '', language), [bridge]);
  const deleteFile = useCallback((path: string) => bridge.deleteFile(path), [bridge]);
  const renameFile = useCallback((oldPath: string, newPath: string) => bridge.renameFile(oldPath, newPath), [bridge]);
  const setActiveFile = useCallback((path: string) => bridge.setActiveFile(path), [bridge]);
  
  const insertAt = useCallback((position: CursorPosition, text: string) => bridge.insertAt(position, text), [bridge]);
  const insertAtCursor = useCallback((text: string) => bridge.insertAtCursor(text), [bridge]);
  const replaceSelection = useCallback((text: string) => bridge.replaceSelection(text), [bridge]);
  const replaceRange = useCallback((start: CursorPosition, end: CursorPosition, text: string) => bridge.replaceRange(start, end, text), [bridge]);
  const replaceAll = useCallback((searchPattern: string, replaceWith: string) => bridge.replaceAll(searchPattern, replaceWith), [bridge]);
  const deleteLine = useCallback((lineNumber: number) => bridge.deleteLine(lineNumber), [bridge]);
  const deleteLines = useCallback((startLine: number, endLine: number) => bridge.deleteLines(startLine, endLine), [bridge]);
  const applyEdits = useCallback((operations: EditOperation[]) => bridge.applyEdits(operations), [bridge]);
  
  const setCursor = useCallback((position: CursorPosition) => bridge.setCursor(position), [bridge]);
  const setSelection = useCallback((start: CursorPosition, end: CursorPosition) => bridge.setSelection(start, end), [bridge]);
  
  const undo = useCallback(() => bridge.undo(), [bridge]);
  const redo = useCallback(() => bridge.redo(), [bridge]);
  const markClean = useCallback(() => bridge.markClean(), [bridge]);
  const getAgentContext = useCallback(() => bridge.getAgentContext(), [bridge]);
  
  return {
    // State
    state,
    activeFile: state.activeFile,
    cursor: state.cursor,
    selection: state.selection,
    files: state.files,
    fileList,
    projectTree: state.projectTree,
    language: state.language,
    isDirty: state.isDirty,
    
    // File operations
    getFile,
    setFile,
    createFile,
    deleteFile,
    renameFile,
    setActiveFile,
    
    // Edit operations
    insertAt,
    insertAtCursor,
    replaceSelection,
    replaceRange,
    replaceAll,
    deleteLine,
    deleteLines,
    applyEdits,
    
    // Cursor & Selection
    setCursor,
    setSelection,
    
    // Undo/Redo
    undo,
    redo,
    
    // Utility
    markClean,
    getAgentContext,
    
    // Bridge instance
    bridge,
  };
}

export default useEditorBridge;
