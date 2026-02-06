/**
 * USE AUTO-SAVE HOOK - Automatic project persistence for Canvas Studio
 * Debounced auto-save with status tracking
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { workspaceService, ProjectFile, EditorState, SaveResult } from './workspaceService';

// ============================================================================
// TYPES
// ============================================================================

export interface AutoSaveStatus {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: Date | null;
  error: string | null;
  pendingChanges: boolean;
}

export interface UseAutoSaveOptions {
  /** Project slug - if null, auto-save is disabled */
  slug: string | null;
  /** Debounce delay in ms (default: 2000) */
  debounceMs?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Callback when save completes */
  onSave?: (result: SaveResult) => void;
  /** Callback when save fails */
  onError?: (error: string) => void;
}

export interface UseAutoSaveReturn {
  /** Current save status */
  status: AutoSaveStatus;
  /** Trigger save now (bypasses debounce) */
  saveNow: () => Promise<SaveResult>;
  /** Mark that changes were made (triggers debounced save) */
  markChanged: () => void;
  /** Reset pending changes without saving */
  resetPending: () => void;
  /** Set the project slug (for when project is first created) */
  setSlug: (slug: string) => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useAutoSave(
  getFiles: () => ProjectFile[],
  getEditorState: () => EditorState,
  getMainFile: () => string,
  options: UseAutoSaveOptions
): UseAutoSaveReturn {
  const { debounceMs = 2000, enabled = true, onSave, onError } = options;
  
  const [slug, setSlug] = useState<string | null>(options.slug);
  const [status, setStatus] = useState<AutoSaveStatus>({
    status: 'idle',
    lastSavedAt: null,
    error: null,
    pendingChanges: false,
  });
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const pendingRef = useRef(false);
  
  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  
  // Update slug when options change
  useEffect(() => {
    if (options.slug && options.slug !== slug) {
      setSlug(options.slug);
    }
  }, [options.slug]);
  
  // Perform save
  const performSave = useCallback(async (): Promise<SaveResult> => {
    if (!slug || !enabled) {
      return { success: false, error: 'No project slug or auto-save disabled' };
    }
    
    if (isSavingRef.current) {
      pendingRef.current = true;
      return { success: false, error: 'Save already in progress' };
    }
    
    isSavingRef.current = true;
    setStatus(prev => ({ ...prev, status: 'saving' }));
    
    try {
      const files = getFiles();
      const editorState = getEditorState();
      const mainFile = getMainFile();
      
      if (files.length === 0) {
        isSavingRef.current = false;
        return { success: false, error: 'No files to save' };
      }
      
      const result = await workspaceService.save(slug, {
        files,
        editorState,
        mainFile,
      });
      
      if (result.success) {
        const savedAt = new Date();
        setStatus({
          status: 'saved',
          lastSavedAt: savedAt,
          error: null,
          pendingChanges: false,
        });
        
        onSave?.(result);
        
        // If there were pending changes during save, save again
        if (pendingRef.current) {
          pendingRef.current = false;
          setTimeout(() => performSave(), 500);
        }
      } else {
        setStatus(prev => ({
          ...prev,
          status: 'error',
          error: result.error || 'Save failed',
        }));
        onError?.(result.error || 'Save failed');
      }
      
      isSavingRef.current = false;
      return result;
    } catch (error: any) {
      isSavingRef.current = false;
      const errorMsg = error.message || 'Unknown error';
      setStatus(prev => ({
        ...prev,
        status: 'error',
        error: errorMsg,
      }));
      onError?.(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [slug, enabled, getFiles, getEditorState, getMainFile, onSave, onError]);
  
  // Save now (bypasses debounce)
  const saveNow = useCallback(async (): Promise<SaveResult> => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    return performSave();
  }, [performSave]);
  
  // Mark that changes were made (triggers debounced save)
  const markChanged = useCallback(() => {
    if (!enabled || !slug) return;
    
    setStatus(prev => ({ ...prev, pendingChanges: true }));
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new debounced save
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);
  }, [enabled, slug, debounceMs, performSave]);
  
  // Reset pending without saving
  const resetPending = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    pendingRef.current = false;
    setStatus(prev => ({ ...prev, pendingChanges: false }));
  }, []);
  
  return {
    status,
    saveNow,
    markChanged,
    resetPending,
    setSlug,
  };
}

// ============================================================================
// AUTO-SAVE STATUS COMPONENT
// ============================================================================

export function AutoSaveIndicator({ status }: { status: AutoSaveStatus }) {
  const getStatusDisplay = () => {
    switch (status.status) {
      case 'saving':
        return { text: 'Saving...', color: 'text-yellow-500', icon: '⏳' };
      case 'saved':
        const timeAgo = status.lastSavedAt 
          ? formatTimeAgo(status.lastSavedAt)
          : 'just now';
        return { text: `Saved ${timeAgo}`, color: 'text-green-500', icon: '✓' };
      case 'error':
        return { text: status.error || 'Save failed', color: 'text-red-500', icon: '⚠' };
      default:
        if (status.pendingChanges) {
          return { text: 'Unsaved changes', color: 'text-orange-500', icon: '●' };
        }
        return { text: 'All changes saved', color: 'text-gray-500', icon: '✓' };
    }
  };
  
  const { text, color, icon } = getStatusDisplay();
  
  return (
    <div className={`flex items-center gap-1 text-xs ${color}`}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default useAutoSave;
