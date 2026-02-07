/**
 * useProject — Project state management hook
 * Wraps projectStore for convenient component usage
 */
import { useCallback } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { GeneratedApp } from '../types';

export function useProject() {
  const store = useProjectStore();

  const loadProject = useCallback((project: GeneratedApp) => {
    store.setCurrentProject(project);
    // Parse code into files
    if (project.code) {
      const files = parseCodeToFiles(project.code);
      store.setFiles(files);
      const firstFile = Object.keys(files)[0] || null;
      if (firstFile) {
        store.openFile(firstFile);
      }
    }
  }, [store]);

  const saveProject = useCallback(async () => {
    const { currentProject, files } = useProjectStore.getState();
    if (!currentProject) return false;

    store.setSaving(true);
    try {
      const code = filesToCode(files);
      const updated = { ...currentProject, code, timestamp: Date.now() };
      store.setCurrentProject(updated);
      store.markAllSaved();
      return true;
    } catch (e) {
      store.setError('Failed to save project');
      return false;
    } finally {
      store.setSaving(false);
    }
  }, [store]);

  return {
    // Project
    currentProject: store.currentProject,
    projects: store.projects,
    isLoading: store.isLoading,
    isSaving: store.isSaving,
    error: store.error,
    loadProject,
    saveProject,
    setCurrentProject: store.setCurrentProject,
    addProject: store.addProject,
    removeProject: store.removeProject,
    setProjects: store.setProjects,

    // Files
    files: store.files,
    fileTree: store.fileTree,
    activeFilePath: store.activeFilePath,
    openFiles: store.openFiles,
    modifiedFiles: store.modifiedFiles,
    setFiles: store.setFiles,
    updateFile: store.updateFile,
    createFile: store.createFile,
    deleteFile: store.deleteFile,
    renameFile: store.renameFile,
    setActiveFilePath: store.setActiveFilePath,
    openFile: store.openFile,
    closeFile: store.closeFile,

    // Generation
    isGenerating: store.isGenerating,
    generationProgress: store.generationProgress,
    setGenerating: store.setGenerating,
    setGenerationProgress: store.setGenerationProgress,
    reset: store.reset,
  };
}

/** Parse a single code string into a files map */
function parseCodeToFiles(code: string): Record<string, string> {
  const files: Record<string, string> = {};

  // Try to parse multi-file format: === filename ===
  const fileBlockRegex = /^={3,}\s*(.+?)\s*={3,}$/gm;
  const matches = [...code.matchAll(fileBlockRegex)];

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const fileName = matches[i][1].trim();
      const startIdx = matches[i].index! + matches[i][0].length;
      const endIdx = i + 1 < matches.length ? matches[i + 1].index! : code.length;
      files[`/${fileName}`] = code.slice(startIdx, endIdx).trim();
    }
  } else {
    // Single file — detect type
    if (code.includes('import React') || code.includes('from "react"') || code.includes("from 'react'")) {
      files['/App.tsx'] = code;
    } else if (code.trim().startsWith('<!DOCTYPE') || code.trim().startsWith('<html')) {
      files['/index.html'] = code;
    } else {
      files['/index.html'] = code;
    }
  }

  return files;
}

/** Convert files map back to single code string */
function filesToCode(files: Record<string, string>): string {
  const paths = Object.keys(files).sort();
  if (paths.length === 1) return files[paths[0]];

  return paths
    .map((path) => {
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return `=== ${cleanPath} ===\n${files[path]}`;
    })
    .join('\n\n');
}
