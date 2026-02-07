/**
 * Editor Bridge Service for Standalone Canvas App
 * Provides API for agent to interact with the code editor
 * 
 * PRODUCTION VERSION: Integrated with Zustand + Auto-save to backend
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { ProjectFile, ProgrammingLanguage, GeneratedApp } from '../types';
import { canvasAppsService } from './canvasAppsService';
import { canvasS3FilesService } from './canvasS3FilesService';

// ==================== TYPE DEFINITIONS ====================

// File node for tree structure
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
  language?: string;
}

// Editor selection info
export interface EditorSelection {
  start: { line: number; column: number };
  end: { line: number; column: number };
  text: string;
}

// Editor cursor position
export interface EditorCursor {
  line: number;
  column: number;
}

// Agent command types for surgical edits
export type AgentCommand =
  | { type: 'insert'; path: string; position: { line: number; column: number }; text: string }
  | { type: 'replace'; path: string; start: { line: number; column: number }; end: { line: number; column: number }; text: string }
  | { type: 'replaceSelection'; text: string }
  | { type: 'createFile'; path: string; content: string }
  | { type: 'deleteFile'; path: string }
  | { type: 'renameFile'; oldPath: string; newPath: string }
  | { type: 'updateFile'; path: string; content: string }
  | { type: 'fullRegenerate'; code: string };

// ==================== ZUSTAND STORE DEFINITION ====================

interface EditorState {
  // File system
  files: Record<string, string>;
  activeFilePath: string;
  unsavedPaths: string[];
  
  // Cursor & Selection
  currentSelection: EditorSelection | null;
  currentCursor: EditorCursor;
  
  // Project metadata
  currentLanguage: ProgrammingLanguage;
  currentProjectId: string | null;
  projectName: string;
  projectPrompt: string;
  
  // Auto-save state
  lastSavedAt: number | null;
  isSaving: boolean;
  saveError: string | null;
}

interface EditorActions {
  // File operations
  getFile: (path: string) => string | undefined;
  updateFile: (path: string, content: string) => boolean;
  createFile: (path: string, content?: string) => boolean;
  deleteFile: (path: string) => boolean;
  renameFile: (oldPath: string, newPath: string) => boolean;
  getAllFilePaths: () => string[];
  getProjectTree: () => FileNode[];
  
  // Cursor & Selection
  insertAt: (path: string, position: { line: number; column: number }, text: string) => boolean;
  insertAtCursor: (text: string) => boolean;
  replaceRange: (path: string, start: { line: number; column: number }, end: { line: number; column: number }, text: string) => boolean;
  replaceSelection: (text: string) => boolean;
  getSelection: () => EditorSelection | null;
  setSelection: (selection: EditorSelection | null) => void;
  getCursor: () => EditorCursor;
  setCursor: (cursor: EditorCursor) => void;
  getActiveFilePath: () => string;
  setActiveFile: (path: string) => boolean;
  
  // Language
  setLanguage: (language: ProgrammingLanguage) => void;
  getLanguage: () => ProgrammingLanguage;
  
  // Code sync
  loadFromCode: (code: string, language?: ProgrammingLanguage) => void;
  toCode: () => string;
  toProjectFiles: () => ProjectFile[];
  
  // State management
  hasUnsavedChanges: () => boolean;
  markSaved: (path: string) => void;
  markAllSaved: () => void;
  clear: () => void;
  
  // Project management
  loadProject: (project: GeneratedApp) => void;
  loadProjectFromS3: (projectId: string) => Promise<boolean>;
  saveToBackend: () => Promise<boolean>;
  syncToS3: () => Promise<boolean>;
  setProjectMeta: (name: string, prompt: string, id?: string) => void;
  
  // Agent context
  getAgentContext: () => string;
}

type EditorStore = EditorState & EditorActions;

// ==================== UTILITY FUNCTIONS ====================

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    html: 'html', htm: 'html',
    css: 'css', scss: 'scss', sass: 'sass', less: 'less',
    js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    json: 'json', md: 'markdown',
    py: 'python', rb: 'ruby', java: 'java', go: 'go', rs: 'rust',
    php: 'php', sql: 'sql', sh: 'bash',
    yml: 'yaml', yaml: 'yaml', xml: 'xml', svg: 'xml',
  };
  return languageMap[ext || ''] || 'plaintext';
}

function getExtensionForLanguage(language: ProgrammingLanguage): string {
  const extMap: Record<string, string> = {
    html: 'html', css: 'css', javascript: 'js', typescript: 'ts',
    react: 'jsx', nextjs: 'tsx', vue: 'vue', svelte: 'svelte',
    python: 'py', java: 'java', go: 'go', rust: 'rs',
    php: 'php', ruby: 'rb', sql: 'sql', json: 'json',
    yaml: 'yaml', markdown: 'md',
  };
  return extMap[language] || 'txt';
}

function buildFileTree(files: Record<string, string>): FileNode[] {
  const root: FileNode[] = [];
  const folders: Map<string, FileNode> = new Map();
  const sortedPaths = Object.keys(files).sort();

  for (const filePath of sortedPaths) {
    const parts = filePath.split('/').filter(Boolean);
    let currentPath = '';
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath += '/' + part;
      const isFile = i === parts.length - 1;

      if (isFile) {
        currentLevel.push({
          name: part,
          path: currentPath,
          type: 'file',
          content: files[filePath],
          language: detectLanguage(part),
        });
      } else {
        let folder = folders.get(currentPath);
        if (!folder) {
          folder = { name: part, path: currentPath, type: 'folder', children: [] };
          folders.set(currentPath, folder);
          currentLevel.push(folder);
        }
        currentLevel = folder.children!;
      }
    }
  }

  return root;
}

// ==================== DEBOUNCED AUTO-SAVE ====================

let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;
const AUTOSAVE_DELAY = 2000; // 2 seconds after last change

function scheduleAutoSave(store: EditorStore) {
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
  }
  
  saveTimeoutId = setTimeout(async () => {
    const hasChanges = store.hasUnsavedChanges();
    const projectId = store.currentProjectId;
    
    if (hasChanges && projectId) {
      console.log('[EditorBridge] Auto-saving project...');
      await store.saveToBackend();
    }
  }, AUTOSAVE_DELAY);
}

// ==================== ZUSTAND STORE ====================

export const useEditorStore = create<EditorStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        files: { '/index.html': '' },
        activeFilePath: '/index.html',
        unsavedPaths: [],
        currentSelection: null,
        currentCursor: { line: 1, column: 1 },
        currentLanguage: 'html' as ProgrammingLanguage,
        currentProjectId: null,
        projectName: 'Untitled',
        projectPrompt: '',
        lastSavedAt: null,
        isSaving: false,
        saveError: null,

        // ==================== FILE OPERATIONS ====================
        
        getFile: (path) => get().files[path],

        updateFile: (path, content) => {
          const { files } = get();
          if (!(path in files)) return false;
          
          set((state) => ({
            files: { ...state.files, [path]: content },
            unsavedPaths: state.unsavedPaths.includes(path) 
              ? state.unsavedPaths 
              : [...state.unsavedPaths, path],
          }));
          
          scheduleAutoSave(get());
          return true;
        },

        createFile: (path, content = '') => {
          const { files } = get();
          if (path in files) return false;
          
          set((state) => ({
            files: { ...state.files, [path]: content },
            unsavedPaths: [...state.unsavedPaths, path],
          }));
          
          scheduleAutoSave(get());
          return true;
        },

        deleteFile: (path) => {
          const { files, activeFilePath } = get();
          if (!(path in files)) return false;
          
          const newFiles = { ...files };
          delete newFiles[path];
          
          const newActivePath = activeFilePath === path 
            ? Object.keys(newFiles)[0] || '/index.html'
            : activeFilePath;
          
          set((state) => ({
            files: newFiles,
            activeFilePath: newActivePath,
            unsavedPaths: state.unsavedPaths.filter(p => p !== path),
          }));
          
          scheduleAutoSave(get());
          return true;
        },

        renameFile: (oldPath, newPath) => {
          const { files, activeFilePath } = get();
          const content = files[oldPath];
          if (content === undefined) return false;
          
          const newFiles = { ...files };
          delete newFiles[oldPath];
          newFiles[newPath] = content;
          
          set((state) => ({
            files: newFiles,
            activeFilePath: activeFilePath === oldPath ? newPath : activeFilePath,
            unsavedPaths: [
              ...state.unsavedPaths.filter(p => p !== oldPath),
              newPath
            ],
          }));
          
          scheduleAutoSave(get());
          return true;
        },

        getAllFilePaths: () => Object.keys(get().files),

        getProjectTree: () => buildFileTree(get().files),

        // ==================== CURSOR & SELECTION ====================

        insertAt: (path, position, text) => {
          const { files } = get();
          const content = files[path];
          if (content === undefined) return false;

          const lines = content.split('\n');
          const lineIndex = position.line - 1;
          
          if (lineIndex < 0 || lineIndex > lines.length) return false;

          if (lineIndex === lines.length) {
            lines.push(text);
          } else {
            const line = lines[lineIndex] || '';
            const colIndex = Math.min(position.column - 1, line.length);
            lines[lineIndex] = line.slice(0, colIndex) + text + line.slice(colIndex);
          }

          return get().updateFile(path, lines.join('\n'));
        },

        insertAtCursor: (text) => {
          const { activeFilePath, currentCursor } = get();
          return get().insertAt(activeFilePath, currentCursor, text);
        },

        replaceRange: (path, start, end, text) => {
          const { files } = get();
          const content = files[path];
          if (content === undefined) return false;

          const lines = content.split('\n');
          const startLine = start.line - 1;
          const endLine = end.line - 1;

          if (startLine < 0 || endLine >= lines.length) return false;

          const beforeStart = lines[startLine].slice(0, start.column - 1);
          const afterEnd = lines[endLine].slice(end.column - 1);

          const newLines = [
            ...lines.slice(0, startLine),
            beforeStart + text + afterEnd,
            ...lines.slice(endLine + 1),
          ];

          return get().updateFile(path, newLines.join('\n'));
        },

        replaceSelection: (text) => {
          const { activeFilePath, currentSelection } = get();
          if (!currentSelection) return false;
          
          return get().replaceRange(
            activeFilePath,
            currentSelection.start,
            currentSelection.end,
            text
          );
        },

        getSelection: () => get().currentSelection,
        
        setSelection: (selection) => set({ currentSelection: selection }),
        
        getCursor: () => get().currentCursor,
        
        setCursor: (cursor) => set({ currentCursor: cursor }),
        
        getActiveFilePath: () => get().activeFilePath,
        
        setActiveFile: (path) => {
          if (!(path in get().files)) return false;
          set({ activeFilePath: path });
          return true;
        },

        // ==================== LANGUAGE ====================

        setLanguage: (language) => set({ currentLanguage: language }),
        
        getLanguage: () => get().currentLanguage,

        // ==================== CODE SYNC ====================

        loadFromCode: (code, language = 'html') => {
          const files: Record<string, string> = {};
          
          if (language === 'html') {
            files['/index.html'] = code;
            
            // Extract substantial inline CSS
            const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
            if (styleMatch && styleMatch[1].trim().length > 100) {
              files['/styles.css'] = styleMatch[1].trim();
            }
            
            // Extract substantial inline JS
            const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
            if (scriptMatch && scriptMatch[1].trim().length > 100 && !scriptMatch[0].includes('src=')) {
              files['/app.js'] = scriptMatch[1].trim();
            }
          } else {
            const ext = getExtensionForLanguage(language);
            files[`/main.${ext}`] = code;
          }

          set({
            files,
            activeFilePath: Object.keys(files)[0],
            currentLanguage: language,
            unsavedPaths: Object.keys(files),
          });
          
          scheduleAutoSave(get());
        },

        toCode: () => {
          const { files, currentLanguage } = get();
          return files['/index.html'] 
            || files[`/main.${getExtensionForLanguage(currentLanguage)}`]
            || Object.values(files)[0]
            || '';
        },

        toProjectFiles: () => {
          const { files } = get();
          return Object.entries(files).map(([path, content]) => ({
            path,
            content,
            language: detectLanguage(path.split('/').pop() || ''),
          }));
        },

        // ==================== STATE MANAGEMENT ====================

        hasUnsavedChanges: () => get().unsavedPaths.length > 0,

        markSaved: (path) => set((state) => ({
          unsavedPaths: state.unsavedPaths.filter(p => p !== path),
        })),

        markAllSaved: () => set({ unsavedPaths: [], lastSavedAt: Date.now() }),

        clear: () => set({
          files: { '/index.html': '' },
          activeFilePath: '/index.html',
          unsavedPaths: [],
          currentSelection: null,
          currentCursor: { line: 1, column: 1 },
          currentProjectId: null,
          projectName: 'Untitled',
          projectPrompt: '',
          lastSavedAt: null,
          saveError: null,
        }),

        // ==================== PROJECT MANAGEMENT ====================

        loadProject: (project) => {
          const files: Record<string, string> = {};
          
          if (project.files && project.files.length > 0) {
            project.files.forEach(f => { files[f.path] = f.content; });
          } else if (project.code) {
            files['/index.html'] = project.code;
          } else {
            files['/index.html'] = '';
          }

          set({
            files,
            activeFilePath: Object.keys(files)[0] || '/index.html',
            currentLanguage: (project.language || 'html') as ProgrammingLanguage,
            currentProjectId: project.id,
            projectName: project.name,
            projectPrompt: project.prompt,
            unsavedPaths: [],
            lastSavedAt: project.timestamp,
          });
        },

        loadProjectFromS3: async (projectId: string) => {
          try {
            console.log('[EditorBridge] Loading project files from S3...');
            const result = await canvasS3FilesService.loadProject(projectId);
            
            if (result.success && result.files && result.files.length > 0) {
              const files: Record<string, string> = {};
              result.files.forEach(f => {
                files[f.path] = typeof f.content === 'string' ? f.content : '';
              });
              
              set({
                files,
                activeFilePath: Object.keys(files)[0] || '/index.html',
                currentProjectId: projectId,
                unsavedPaths: [],
                lastSavedAt: Date.now(),
              });
              
              console.log(`[EditorBridge] Loaded ${result.fileCount} files from S3`);
              return true;
            }
            
            return false;
          } catch (error) {
            console.error('[EditorBridge] Failed to load from S3:', error);
            return false;
          }
        },

        saveToBackend: async () => {
          const state = get();
          
          if (state.isSaving) return false;
          
          set({ isSaving: true, saveError: null });
          
          try {
            const projectFiles = state.toProjectFiles();
            const mainCode = state.toCode();
            
            const appData: GeneratedApp = {
              id: state.currentProjectId || `app_${Date.now()}`,
              name: state.projectName,
              prompt: state.projectPrompt,
              code: mainCode,
              timestamp: Date.now(),
              history: [],
              language: state.currentLanguage,
              files: projectFiles,
            };
            
            let result: GeneratedApp | null;
            
            if (state.currentProjectId) {
              // Update existing project
              result = await canvasAppsService.updateApp(state.currentProjectId, {
                name: appData.name,
                code: appData.code,
                prompt: appData.prompt,
                language: appData.language,
              });
            } else {
              // Create new project
              result = await canvasAppsService.saveApp(appData);
            }
            
            if (result) {
              // Also sync files to S3 for large file support
              const projectId = result.id;
              await state.syncToS3();
              
              set({
                isSaving: false,
                lastSavedAt: Date.now(),
                unsavedPaths: [],
                currentProjectId: projectId,
              });
              console.log('[EditorBridge] Project saved successfully');
              return true;
            } else {
              throw new Error('Failed to save project');
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Save failed';
            console.error('[EditorBridge] Save error:', error);
            set({ isSaving: false, saveError: errorMsg });
            return false;
          }
        },

        syncToS3: async () => {
          const state = get();
          const projectId = state.currentProjectId;
          
          if (!projectId) {
            console.log('[EditorBridge] No project ID, skipping S3 sync');
            return false;
          }
          
          try {
            const files = state.toProjectFiles();
            const result = await canvasS3FilesService.syncFiles(projectId, files);
            
            if (result.success) {
              console.log(`[EditorBridge] Synced ${result.saved} files to S3`);
              return true;
            } else {
              console.warn(`[EditorBridge] S3 sync partial: ${result.saved} saved, ${result.failed} failed`);
              return false;
            }
          } catch (error) {
            console.error('[EditorBridge] S3 sync error:', error);
            return false;
          }
        },

        setProjectMeta: (name, prompt, id) => set({
          projectName: name,
          projectPrompt: prompt,
          ...(id ? { currentProjectId: id } : {}),
        }),

        // ==================== AGENT CONTEXT ====================

        getAgentContext: () => {
          const state = get();
          const context: string[] = [];
          
          context.push(`Language: ${state.currentLanguage}`);
          context.push(`Active file: ${state.activeFilePath}`);
          context.push(`Cursor: Line ${state.currentCursor.line}, Column ${state.currentCursor.column}`);
          
          if (state.currentSelection) {
            context.push(`Selection: Lines ${state.currentSelection.start.line}-${state.currentSelection.end.line}`);
            context.push(`Selected text:\n\`\`\`\n${state.currentSelection.text}\n\`\`\``);
          }
          
          const activeContent = state.files[state.activeFilePath];
          if (activeContent) {
            const lines = activeContent.split('\n');
            const numberedLines = lines.map((line, i) => `${i + 1}: ${line}`).join('\n');
            const lang = detectLanguage(state.activeFilePath);
            context.push(`\nActive file content:\n\`\`\`${lang}\n${numberedLines}\n\`\`\``);
          }
          
          const otherFiles = Object.keys(state.files).filter(p => p !== state.activeFilePath);
          if (otherFiles.length > 0) {
            context.push(`\nOther project files: ${otherFiles.join(', ')}`);
          }
          
          return context.join('\n');
        },
      }),
      {
        name: 'editor-bridge-storage',
        partialize: (state) => ({
          files: state.files,
          activeFilePath: state.activeFilePath,
          currentLanguage: state.currentLanguage,
          currentProjectId: state.currentProjectId,
          projectName: state.projectName,
          projectPrompt: state.projectPrompt,
          lastSavedAt: state.lastSavedAt,
        }),
      }
    )
  )
);

// ==================== SINGLETON BRIDGE FOR BACKWARDS COMPATIBILITY ====================

/**
 * EditorBridge - Wrapper class for backwards compatibility
 * Delegates all calls to the Zustand store
 */
class EditorBridgeWrapper {
  // File operations
  getFile(path: string) { return useEditorStore.getState().getFile(path); }
  updateFile(path: string, content: string) { return useEditorStore.getState().updateFile(path, content); }
  createFile(path: string, content?: string) { return useEditorStore.getState().createFile(path, content); }
  deleteFile(path: string) { return useEditorStore.getState().deleteFile(path); }
  renameFile(oldPath: string, newPath: string) { return useEditorStore.getState().renameFile(oldPath, newPath); }
  getAllFilePaths() { return useEditorStore.getState().getAllFilePaths(); }
  getProjectTree() { return useEditorStore.getState().getProjectTree(); }
  createFolder(_path: string) { return true; } // Folders are virtual
  
  // Cursor & Selection
  insertAt(path: string, position: { line: number; column: number }, text: string) {
    return useEditorStore.getState().insertAt(path, position, text);
  }
  insertAtCursor(text: string) { return useEditorStore.getState().insertAtCursor(text); }
  replaceRange(path: string, start: { line: number; column: number }, end: { line: number; column: number }, text: string) {
    return useEditorStore.getState().replaceRange(path, start, end, text);
  }
  replaceSelection(text: string) { return useEditorStore.getState().replaceSelection(text); }
  getSelection() { return useEditorStore.getState().getSelection(); }
  setSelection(selection: EditorSelection | null) { useEditorStore.getState().setSelection(selection); }
  getCursor() { return useEditorStore.getState().getCursor(); }
  setCursor(cursor: EditorCursor) { useEditorStore.getState().setCursor(cursor); }
  getActiveFilePath() { return useEditorStore.getState().getActiveFilePath(); }
  setActiveFile(path: string) { return useEditorStore.getState().setActiveFile(path); }
  
  // Language
  setLanguage(language: ProgrammingLanguage) { useEditorStore.getState().setLanguage(language); }
  getLanguage() { return useEditorStore.getState().getLanguage(); }
  
  // Code sync
  loadFromCode(code: string, language?: ProgrammingLanguage) {
    useEditorStore.getState().loadFromCode(code, language);
  }
  toCode() { return useEditorStore.getState().toCode(); }
  toProjectFiles() { return useEditorStore.getState().toProjectFiles(); }
  
  // State
  hasUnsavedChanges() { return useEditorStore.getState().hasUnsavedChanges(); }
  markSaved(path: string) { useEditorStore.getState().markSaved(path); }
  markAllSaved() { useEditorStore.getState().markAllSaved(); }
  clear() { useEditorStore.getState().clear(); }
  
  // Project
  loadProject(project: GeneratedApp) { useEditorStore.getState().loadProject(project); }
  loadProjectFromS3(projectId: string) { return useEditorStore.getState().loadProjectFromS3(projectId); }
  saveToBackend() { return useEditorStore.getState().saveToBackend(); }
  syncToS3() { return useEditorStore.getState().syncToS3(); }
  setProjectMeta(name: string, prompt: string, id?: string) {
    useEditorStore.getState().setProjectMeta(name, prompt, id);
  }
  
  // Agent context
  getAgentContext() { return useEditorStore.getState().getAgentContext(); }
  
  // Event listeners (using Zustand subscribe)
  onFileChange(listener: (path: string, content: string) => void) {
    return useEditorStore.subscribe(
      (state) => state.files,
      (files, prevFiles) => {
        for (const path of Object.keys(files)) {
          if (files[path] !== prevFiles[path]) {
            listener(path, files[path]);
          }
        }
      }
    );
  }
  
  onSelectionChange(listener: (selection: EditorSelection | null) => void) {
    return useEditorStore.subscribe(
      (state) => state.currentSelection,
      listener
    );
  }
  
  onCursorChange(listener: (cursor: EditorCursor) => void) {
    return useEditorStore.subscribe(
      (state) => state.currentCursor,
      listener
    );
  }
}

// Export singleton instance for backwards compatibility
export const editorBridge = new EditorBridgeWrapper();
export default editorBridge;
