/**
 * NEURAL-CHAT CANVAS APP - EDITOR BRIDGE
 * Standalone editor state management for Canvas App
 * NOTE: This is completely independent from canvas-studio
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  language?: string;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface Selection {
  start: CursorPosition;
  end: CursorPosition;
}

export interface EditorState {
  activeFile: string | null;
  files: Map<string, string>;
  fileLanguages: Map<string, string>;
  cursor: CursorPosition;
  selection: Selection | null;
  projectTree: FileNode[];
  language: string;
  isDirty: boolean;
}

export interface EditOperation {
  type: 'insert' | 'delete' | 'replace';
  position?: CursorPosition;
  endPosition?: CursorPosition;
  text?: string;
  length?: number;
}

export interface EditorBridgeAPI {
  // File operations
  getFile(path: string): string | null;
  setFile(path: string, content: string): void;
  createFile(path: string, content: string, language?: string): void;
  deleteFile(path: string): void;
  renameFile(oldPath: string, newPath: string): void;
  setActiveFile(path: string): void;
  
  // Cursor & Selection
  getCursor(): CursorPosition;
  setCursor(position: CursorPosition): void;
  getSelection(): Selection | null;
  setSelection(start: CursorPosition, end: CursorPosition): void;
  getSelectedText(): string | null;
  
  // Edit operations
  insertAt(position: CursorPosition, text: string): void;
  insertAtCursor(text: string): void;
  replaceSelection(text: string): void;
  replaceRange(start: CursorPosition, end: CursorPosition, text: string): void;
  replaceAll(searchPattern: string, replaceWith: string): void;
  deleteLine(lineNumber: number): void;
  deleteLines(startLine: number, endLine: number): void;
  
  // Batch operations
  applyEdits(operations: EditOperation[]): void;
  
  // Undo/Redo
  undo(): void;
  redo(): void;
  
  // Project structure
  getProjectTree(): FileNode[];
  
  // State
  getState(): EditorState;
  isDirty(): boolean;
  markClean(): void;
  
  // Serialization for agent
  getAgentContext(): {
    activeFile: string | null;
    activeContent: string | null;
    cursor: CursorPosition;
    selection: Selection | null;
    selectedText: string | null;
    projectTree: FileNode[];
    fileCount: number;
    language: string;
  };
}

// ============================================
// EDITOR BRIDGE IMPLEMENTATION
// ============================================

export class EditorBridge implements EditorBridgeAPI {
  private files: Map<string, string> = new Map();
  private fileLanguages: Map<string, string> = new Map();
  private activeFile: string | null = null;
  private cursor: CursorPosition = { line: 1, column: 1 };
  private selection: Selection | null = null;
  private isDirtyFlag: boolean = false;
  private undoStack: Array<{ files: Map<string, string>; activeFile: string | null }> = [];
  private redoStack: Array<{ files: Map<string, string>; activeFile: string | null }> = [];
  private maxUndoLevels: number = 50;
  private changeListeners: Set<(state: EditorState) => void> = new Set();

  constructor(initialFiles?: Record<string, string>) {
    if (initialFiles) {
      Object.entries(initialFiles).forEach(([path, content]) => {
        this.files.set(path, content);
        this.fileLanguages.set(path, this.detectLanguage(path));
      });
      const firstFile = Object.keys(initialFiles)[0];
      if (firstFile) {
        this.activeFile = firstFile;
      }
    }
  }

  // ============================================
  // CHANGE NOTIFICATION
  // ============================================
  
  onChange(listener: (state: EditorState) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyChange(): void {
    const state = this.getState();
    this.changeListeners.forEach(listener => listener(state));
  }

  private saveUndoState(): void {
    this.undoStack.push({
      files: new Map(this.files),
      activeFile: this.activeFile,
    });
    if (this.undoStack.length > this.maxUndoLevels) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.isDirtyFlag = true;
  }

  // ============================================
  // FILE OPERATIONS
  // ============================================

  getFile(path: string): string | null {
    return this.files.get(path) || null;
  }

  setFile(path: string, content: string): void {
    this.saveUndoState();
    this.files.set(path, content);
    if (!this.fileLanguages.has(path)) {
      this.fileLanguages.set(path, this.detectLanguage(path));
    }
    this.notifyChange();
  }

  createFile(path: string, content: string = '', language?: string): void {
    if (this.files.has(path)) {
      console.warn(`File ${path} already exists`);
      return;
    }
    this.saveUndoState();
    this.files.set(path, content);
    this.fileLanguages.set(path, language || this.detectLanguage(path));
    this.notifyChange();
  }

  deleteFile(path: string): void {
    if (!this.files.has(path)) {
      console.warn(`File ${path} does not exist`);
      return;
    }
    this.saveUndoState();
    this.files.delete(path);
    this.fileLanguages.delete(path);
    if (this.activeFile === path) {
      const remaining = Array.from(this.files.keys());
      this.activeFile = remaining.length > 0 ? remaining[0] : null;
    }
    this.notifyChange();
  }

  renameFile(oldPath: string, newPath: string): void {
    const content = this.files.get(oldPath);
    if (content === undefined) {
      console.warn(`File ${oldPath} does not exist`);
      return;
    }
    this.saveUndoState();
    this.files.delete(oldPath);
    this.files.set(newPath, content);
    const language = this.fileLanguages.get(oldPath);
    this.fileLanguages.delete(oldPath);
    this.fileLanguages.set(newPath, language || this.detectLanguage(newPath));
    if (this.activeFile === oldPath) {
      this.activeFile = newPath;
    }
    this.notifyChange();
  }

  setActiveFile(path: string): void {
    if (!this.files.has(path)) {
      console.warn(`File ${path} does not exist`);
      return;
    }
    this.activeFile = path;
    this.cursor = { line: 1, column: 1 };
    this.selection = null;
    this.notifyChange();
  }

  // ============================================
  // CURSOR & SELECTION
  // ============================================

  getCursor(): CursorPosition {
    return { ...this.cursor };
  }

  setCursor(position: CursorPosition): void {
    this.cursor = { ...position };
    this.selection = null;
    this.notifyChange();
  }

  getSelection(): Selection | null {
    return this.selection ? {
      start: { ...this.selection.start },
      end: { ...this.selection.end },
    } : null;
  }

  setSelection(start: CursorPosition, end: CursorPosition): void {
    this.selection = {
      start: { ...start },
      end: { ...end },
    };
    this.cursor = { ...end };
    this.notifyChange();
  }

  getSelectedText(): string | null {
    if (!this.selection || !this.activeFile) return null;
    const content = this.files.get(this.activeFile);
    if (!content) return null;

    const lines = content.split('\n');
    const { start, end } = this.selection;

    if (start.line === end.line) {
      return lines[start.line - 1]?.substring(start.column - 1, end.column - 1) || null;
    }

    const selectedLines: string[] = [];
    for (let i = start.line; i <= end.line; i++) {
      const line = lines[i - 1] || '';
      if (i === start.line) {
        selectedLines.push(line.substring(start.column - 1));
      } else if (i === end.line) {
        selectedLines.push(line.substring(0, end.column - 1));
      } else {
        selectedLines.push(line);
      }
    }
    return selectedLines.join('\n');
  }

  // ============================================
  // EDIT OPERATIONS
  // ============================================

  insertAt(position: CursorPosition, text: string): void {
    if (!this.activeFile) return;
    const content = this.files.get(this.activeFile);
    if (content === undefined) return;

    this.saveUndoState();
    const lines = content.split('\n');
    const lineIndex = position.line - 1;
    
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      const colIndex = Math.min(position.column - 1, line.length);
      lines[lineIndex] = line.slice(0, colIndex) + text + line.slice(colIndex);
    } else if (lineIndex >= lines.length) {
      while (lines.length < lineIndex) {
        lines.push('');
      }
      lines.push(text);
    }

    this.files.set(this.activeFile, lines.join('\n'));
    
    const insertedLines = text.split('\n');
    if (insertedLines.length === 1) {
      this.cursor = {
        line: position.line,
        column: position.column + text.length,
      };
    } else {
      this.cursor = {
        line: position.line + insertedLines.length - 1,
        column: insertedLines[insertedLines.length - 1].length + 1,
      };
    }
    
    this.notifyChange();
  }

  insertAtCursor(text: string): void {
    this.insertAt(this.cursor, text);
  }

  replaceSelection(text: string): void {
    if (!this.selection || !this.activeFile) {
      this.insertAtCursor(text);
      return;
    }
    this.replaceRange(this.selection.start, this.selection.end, text);
  }

  replaceRange(start: CursorPosition, end: CursorPosition, text: string): void {
    if (!this.activeFile) return;
    const content = this.files.get(this.activeFile);
    if (content === undefined) return;

    this.saveUndoState();
    const lines = content.split('\n');
    
    const startLineIdx = start.line - 1;
    const endLineIdx = end.line - 1;
    
    if (startLineIdx < 0 || endLineIdx >= lines.length) return;

    const beforeText = lines[startLineIdx].substring(0, start.column - 1);
    const afterText = lines[endLineIdx].substring(end.column - 1);
    
    const newContent = beforeText + text + afterText;
    const newLines = newContent.split('\n');
    
    lines.splice(startLineIdx, endLineIdx - startLineIdx + 1, ...newLines);
    
    this.files.set(this.activeFile, lines.join('\n'));
    this.selection = null;
    
    const insertedLines = text.split('\n');
    if (insertedLines.length === 1) {
      this.cursor = {
        line: start.line,
        column: start.column + text.length,
      };
    } else {
      this.cursor = {
        line: start.line + insertedLines.length - 1,
        column: insertedLines[insertedLines.length - 1].length + 1,
      };
    }
    
    this.notifyChange();
  }

  replaceAll(searchPattern: string, replaceWith: string): void {
    if (!this.activeFile) return;
    const content = this.files.get(this.activeFile);
    if (content === undefined) return;

    this.saveUndoState();
    const newContent = content.split(searchPattern).join(replaceWith);
    this.files.set(this.activeFile, newContent);
    this.notifyChange();
  }

  deleteLine(lineNumber: number): void {
    this.deleteLines(lineNumber, lineNumber);
  }

  deleteLines(startLine: number, endLine: number): void {
    if (!this.activeFile) return;
    const content = this.files.get(this.activeFile);
    if (content === undefined) return;

    this.saveUndoState();
    const lines = content.split('\n');
    const startIdx = startLine - 1;
    const endIdx = endLine - 1;
    
    if (startIdx >= 0 && endIdx < lines.length && startIdx <= endIdx) {
      lines.splice(startIdx, endIdx - startIdx + 1);
      this.files.set(this.activeFile, lines.join('\n'));
      this.cursor = {
        line: Math.min(startLine, lines.length || 1),
        column: 1,
      };
    }
    
    this.notifyChange();
  }

  applyEdits(operations: EditOperation[]): void {
    operations.forEach(op => {
      switch (op.type) {
        case 'insert':
          if (op.position && op.text) {
            this.insertAt(op.position, op.text);
          }
          break;
        case 'delete':
          if (op.position && op.endPosition) {
            this.replaceRange(op.position, op.endPosition, '');
          }
          break;
        case 'replace':
          if (op.position && op.endPosition && op.text !== undefined) {
            this.replaceRange(op.position, op.endPosition, op.text);
          }
          break;
      }
    });
  }

  // ============================================
  // UNDO/REDO
  // ============================================

  undo(): void {
    if (this.undoStack.length === 0) return;
    
    this.redoStack.push({
      files: new Map(this.files),
      activeFile: this.activeFile,
    });
    
    const prevState = this.undoStack.pop()!;
    this.files = prevState.files;
    this.activeFile = prevState.activeFile;
    this.notifyChange();
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    
    this.undoStack.push({
      files: new Map(this.files),
      activeFile: this.activeFile,
    });
    
    const nextState = this.redoStack.pop()!;
    this.files = nextState.files;
    this.activeFile = nextState.activeFile;
    this.notifyChange();
  }

  // ============================================
  // PROJECT STRUCTURE
  // ============================================

  getProjectTree(): FileNode[] {
    const paths = Array.from(this.files.keys()).sort();
    const root: FileNode[] = [];
    
    paths.forEach(path => {
      const parts = path.split('/');
      let current = root;
      
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const existingNode = current.find(n => n.name === part);
        
        if (existingNode) {
          if (!isFile && existingNode.children) {
            current = existingNode.children;
          }
        } else {
          const newNode: FileNode = {
            name: part,
            path: parts.slice(0, index + 1).join('/'),
            isDirectory: !isFile,
            children: isFile ? undefined : [],
            language: isFile ? this.fileLanguages.get(path) : undefined,
          };
          current.push(newNode);
          if (!isFile && newNode.children) {
            current = newNode.children;
          }
        }
      });
    });
    
    return root;
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  getState(): EditorState {
    return {
      activeFile: this.activeFile,
      files: new Map(this.files),
      fileLanguages: new Map(this.fileLanguages),
      cursor: { ...this.cursor },
      selection: this.selection ? {
        start: { ...this.selection.start },
        end: { ...this.selection.end },
      } : null,
      projectTree: this.getProjectTree(),
      language: this.activeFile ? (this.fileLanguages.get(this.activeFile) || 'plaintext') : 'plaintext',
      isDirty: this.isDirtyFlag,
    };
  }

  isDirty(): boolean {
    return this.isDirtyFlag;
  }

  markClean(): void {
    this.isDirtyFlag = false;
    this.notifyChange();
  }

  // ============================================
  // AGENT CONTEXT SERIALIZATION
  // ============================================

  getAgentContext(): {
    activeFile: string | null;
    activeContent: string | null;
    cursor: CursorPosition;
    selection: Selection | null;
    selectedText: string | null;
    projectTree: FileNode[];
    fileCount: number;
    language: string;
  } {
    return {
      activeFile: this.activeFile,
      activeContent: this.activeFile ? (this.files.get(this.activeFile) || null) : null,
      cursor: { ...this.cursor },
      selection: this.getSelection(),
      selectedText: this.getSelectedText(),
      projectTree: this.getProjectTree(),
      fileCount: this.files.size,
      language: this.activeFile ? (this.fileLanguages.get(this.activeFile) || 'plaintext') : 'plaintext',
    };
  }

  // ============================================
  // UTILITIES
  // ============================================

  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'md': 'markdown',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'cs': 'csharp',
      'rb': 'ruby',
      'php': 'php',
      'swift': 'swift',
      'kt': 'kotlin',
      'r': 'r',
      'vue': 'vue',
      'svelte': 'svelte',
    };
    return languageMap[ext] || 'plaintext';
  }
}

// ============================================
// SINGLETON & FACTORY
// ============================================

let editorBridgeInstance: EditorBridge | null = null;

export function getEditorBridge(): EditorBridge {
  if (!editorBridgeInstance) {
    editorBridgeInstance = new EditorBridge();
  }
  return editorBridgeInstance;
}

export function createEditorBridge(initialFiles?: Record<string, string>): EditorBridge {
  editorBridgeInstance = new EditorBridge(initialFiles);
  return editorBridgeInstance;
}

export default EditorBridge;
