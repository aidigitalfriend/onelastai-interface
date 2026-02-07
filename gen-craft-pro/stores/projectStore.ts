/**
 * Project Store — Zustand state for the current project
 * Fiber-optimized with subscribeWithSelector for granular re-renders
 */
import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import { GeneratedApp, ProgrammingLanguage, FileNode } from '../types';

export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  language: ProgrammingLanguage;
  framework: string;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
}

export interface ProjectState {
  // Current project
  currentProject: GeneratedApp | null;
  projectMeta: ProjectMeta | null;
  projects: GeneratedApp[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Project files
  files: Record<string, string>;
  fileTree: FileNode[];
  activeFilePath: string | null;
  openFiles: string[];
  modifiedFiles: Set<string>;

  // Generation
  isGenerating: boolean;
  generationProgress: string;
  generationStep: number;
  totalSteps: number;
}

export interface ProjectActions {
  // Project lifecycle
  setCurrentProject: (project: GeneratedApp | null) => void;
  setProjectMeta: (meta: ProjectMeta | null) => void;
  addProject: (project: GeneratedApp) => void;
  removeProject: (id: string) => void;
  setProjects: (projects: GeneratedApp[]) => void;

  // File operations
  setFiles: (files: Record<string, string>) => void;
  updateFile: (path: string, content: string) => void;
  createFile: (path: string, content?: string) => void;
  deleteFile: (path: string) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  setActiveFilePath: (path: string | null) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setFileTree: (tree: FileNode[]) => void;
  markFileSaved: (path: string) => void;
  markAllSaved: () => void;

  // Generation state
  setGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (msg: string, step?: number, total?: number) => void;

  // UI State
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: ProjectState = {
  currentProject: null,
  projectMeta: null,
  projects: [],
  isLoading: false,
  isSaving: false,
  error: null,
  files: {},
  fileTree: [],
  activeFilePath: null,
  openFiles: [],
  modifiedFiles: new Set(),
  isGenerating: false,
  generationProgress: '',
  generationStep: 0,
  totalSteps: 0,
};

export const useProjectStore = create<ProjectState & ProjectActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Project lifecycle
    setCurrentProject: (project) => set({ currentProject: project }),
    setProjectMeta: (meta) => set({ projectMeta: meta }),
    addProject: (project) => set((s) => ({ projects: [project, ...s.projects] })),
    removeProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
    setProjects: (projects) => set({ projects }),

    // File operations
    setFiles: (files) => set({ files }),
    updateFile: (path, content) =>
      set((s) => {
        const newModified = new Set(s.modifiedFiles);
        newModified.add(path);
        return { files: { ...s.files, [path]: content }, modifiedFiles: newModified };
      }),
    createFile: (path, content = '') =>
      set((s) => ({
        files: { ...s.files, [path]: content },
        openFiles: s.openFiles.includes(path) ? s.openFiles : [...s.openFiles, path],
        activeFilePath: path,
      })),
    deleteFile: (path) =>
      set((s) => {
        const { [path]: _, ...rest } = s.files;
        const newModified = new Set(s.modifiedFiles);
        newModified.delete(path);
        return {
          files: rest,
          openFiles: s.openFiles.filter((f) => f !== path),
          activeFilePath: s.activeFilePath === path ? (s.openFiles.filter((f) => f !== path)[0] || null) : s.activeFilePath,
          modifiedFiles: newModified,
        };
      }),
    renameFile: (oldPath, newPath) =>
      set((s) => {
        const content = s.files[oldPath];
        const { [oldPath]: _, ...rest } = s.files;
        return {
          files: { ...rest, [newPath]: content || '' },
          openFiles: s.openFiles.map((f) => (f === oldPath ? newPath : f)),
          activeFilePath: s.activeFilePath === oldPath ? newPath : s.activeFilePath,
        };
      }),
    setActiveFilePath: (path) => set({ activeFilePath: path }),
    openFile: (path) =>
      set((s) => ({
        openFiles: s.openFiles.includes(path) ? s.openFiles : [...s.openFiles, path],
        activeFilePath: path,
      })),
    closeFile: (path) =>
      set((s) => ({
        openFiles: s.openFiles.filter((f) => f !== path),
        activeFilePath: s.activeFilePath === path ? (s.openFiles.filter((f) => f !== path)[0] || null) : s.activeFilePath,
      })),
    setFileTree: (tree) => set({ fileTree: tree }),
    markFileSaved: (path) =>
      set((s) => {
        const newModified = new Set(s.modifiedFiles);
        newModified.delete(path);
        return { modifiedFiles: newModified };
      }),
    markAllSaved: () => set({ modifiedFiles: new Set() }),

    // Generation
    setGenerating: (isGenerating) => set({ isGenerating }),
    setGenerationProgress: (msg, step, total) =>
      set({ generationProgress: msg, generationStep: step ?? 0, totalSteps: total ?? 0 }),

    // UI
    setLoading: (loading) => set({ isLoading: loading }),
    setSaving: (saving) => set({ isSaving: saving }),
    setError: (error) => set({ error }),
    reset: () => set(initialState),
  }))
);
