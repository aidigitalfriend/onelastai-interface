/**
 * CANVAS STUDIO - EDITOR BRIDGE
 * Provides a complete interface between the AI Agent and the Editor
 * 
 * This bridge gives the agent full access to:
 * - Multi-file project management
 * - Cursor and selection awareness
 * - Fine-grained edit operations
 * - File tree navigation
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'folder';
  language?: string;
  children?: FileNode[];
  content?: string;
  isOpen?: boolean;
  isModified?: boolean;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface Selection {
  start: CursorPosition;
  end: CursorPosition;
  text: string;
}

export interface EditorState {
  activeFile: string | null;
  cursor: CursorPosition;
  selection: Selection | null;
  files: Map<string, string>;
  openFiles: string[];
  projectTree: FileNode[];
  language: string;
  isDirty: boolean;
}

export interface EditOperation {
  type: 'insert' | 'delete' | 'replace' | 'replaceAll';
  path?: string;
  position?: CursorPosition;
  range?: { start: CursorPosition; end: CursorPosition };
  text?: string;
  searchPattern?: string;
  replaceWith?: string;
}

// Agent mode types
export type AgentMode = 'chat' | 'dev' | 'review';

// Message types for UI
export interface UIMessage {
  type: 'info' | 'warning' | 'error';
  text: string;
  timestamp: number;
}

// Symbol info for code intelligence
export interface SymbolInfo {
  name: string;
  kind: 'function' | 'class' | 'variable' | 'interface' | 'type' | 'method' | 'property';
  location: { line: number; column: number };
  path: string;
}

// Diff types
export interface DiffResult {
  hunks: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: string[];
  }>;
  additions: number;
  deletions: number;
}

// Error/Log types
export interface EditorError {
  path: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface LogEntry {
  timestamp: number;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export interface EditorBridgeAPI {
  // ===== FILE OPERATIONS =====
  getFile: (path: string) => string | null;
  writeFile: (path: string, content: string) => void;
  updateFile: (path: string, diff: string) => boolean;
  createFile: (path: string, content: string, language?: string) => void;
  deleteFile: (path: string) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  fileExists: (path: string) => boolean;
  
  // ===== DIRECTORY OPERATIONS =====
  listFiles: (directory: string) => string[];
  getProjectTree: () => FileNode[];
  getAllFiles: () => Map<string, string>;
  getOpenFiles: () => string[];
  getActiveFile: () => string | null;
  setActiveFile: (path: string) => void;
  openFile: (path: string) => void;
  
  // ===== CURSOR & SELECTION =====
  getCursorPosition: () => CursorPosition;
  setCursorPosition: (position: CursorPosition) => void;
  getSelection: () => Selection | null;
  setSelection: (start: CursorPosition, end: CursorPosition) => void;
  replaceSelection: (text: string) => void;
  insertAtCursor: (text: string) => void;
  
  // ===== EDIT OPERATIONS =====
  insertAt: (position: CursorPosition, text: string) => void;
  replaceRange: (start: CursorPosition, end: CursorPosition, text: string) => void;
  replaceAll: (searchPattern: string, replaceWith: string) => void;
  deleteLine: (lineNumber: number) => void;
  deleteLines: (startLine: number, endLine: number) => void;
  applyEdits: (operations: EditOperation[]) => void;
  
  // ===== SEARCH =====
  searchInFiles: (query: string) => Array<{ path: string; line: number; text: string; match: string }>;
  findFileByName: (name: string) => string[];
  
  // ===== CODE INTELLIGENCE =====
  getLanguage: (path?: string) => string;
  setLanguage: (lang: string) => void;
  getSymbols: (path: string) => SymbolInfo[];
  findReferences: (symbol: string) => Array<{ path: string; line: number; column: number }>;
  goToDefinition: (symbol: string) => { path: string; line: number; column: number } | null;
  
  // ===== COMMANDS & EXECUTION =====
  runCommand: (command: string) => Promise<{ success: boolean; output: string; error?: string }>;
  runTests: () => Promise<{ passed: number; failed: number; errors: string[] }>;
  getErrors: () => EditorError[];
  getLogs: () => LogEntry[];
  clearLogs: () => void;
  
  // ===== DIFF OPERATIONS =====
  generateDiff: (oldCode: string, newCode: string) => DiffResult;
  showDiff: (path: string, diff: DiffResult) => void;
  applyDiff: (path: string, diff: DiffResult) => boolean;
  
  // ===== PROJECT INFO =====
  getDependencies: () => Record<string, string>;
  getPackageJson: () => Record<string, any> | null;
  getConfigFiles: () => string[];
  getEnvInfo: () => { nodeVersion?: string; npmVersion?: string; env: Record<string, string> };
  
  // ===== MEMORY/STATE PERSISTENCE =====
  saveMemory: (key: string, value: any) => void;
  getMemory: (key: string) => any;
  clearMemory: () => void;
  
  // ===== PERMISSIONS =====
  requestApproval: (action: string, details?: string) => Promise<boolean>;
  checkPermission: (action: string) => boolean;
  
  // ===== UI MESSAGES =====
  showMessage: (text: string) => void;
  showWarning: (text: string) => void;
  showError: (text: string) => void;
  askUser: (question: string) => Promise<string | null>;
  
  // ===== AGENT STATE =====
  setMode: (mode: AgentMode) => void;
  getMode: () => AgentMode;
  getAgentState: () => {
    mode: AgentMode;
    isRunning: boolean;
    currentTask: string | null;
    memory: Record<string, any>;
  };
  cancelTask: () => void;
  
  // ===== STATE =====
  getState: () => EditorState;
  isDirty: () => boolean;
  markClean: () => void;
  
  // ===== UNDO/REDO =====
  undo: () => void;
  redo: () => void;
  
  // ===== EVENTS =====
  onChange: (callback: (state: EditorState) => void) => () => void;
  onMessage: (callback: (message: UIMessage) => void) => () => void;
}

// ============================================================================
// EDITOR BRIDGE IMPLEMENTATION
// ============================================================================

export class EditorBridge implements EditorBridgeAPI {
  private files: Map<string, string> = new Map();
  private openFiles: string[] = [];
  private activeFile: string | null = null;
  private cursor: CursorPosition = { line: 1, column: 1 };
  private selection: Selection | null = null;
  private language: string = 'html';
  private dirty: boolean = false;
  private undoStack: Map<string, string[]> = new Map();
  private redoStack: Map<string, string[]> = new Map();
  private listeners: Set<(state: EditorState) => void> = new Set();
  private messageListeners: Set<(message: UIMessage) => void> = new Set();
  
  // Agent state
  private agentMode: AgentMode = 'chat';
  private isRunning: boolean = false;
  private currentTask: string | null = null;
  private memory: Map<string, any> = new Map();
  private permissions: Set<string> = new Set(['read', 'write', 'create', 'delete']);
  private logs: LogEntry[] = [];
  private errors: EditorError[] = [];
  private approvalHandler: ((action: string, details?: string) => Promise<boolean>) | null = null;
  private questionHandler: ((question: string) => Promise<string | null>) | null = null;
  
  constructor(initialFiles?: Record<string, string>) {
    if (initialFiles) {
      Object.entries(initialFiles).forEach(([path, content]) => {
        this.files.set(path, content);
        this.undoStack.set(path, []);
        this.redoStack.set(path, []);
      });
      
      // Set first file as active
      const firstFile = Object.keys(initialFiles)[0];
      if (firstFile) {
        this.activeFile = firstFile;
        this.openFiles = [firstFile];
        this.language = this.detectLanguage(firstFile);
      }
    }
  }
  
  // ========== FILE OPERATIONS ==========
  
  getFile(path: string): string | null {
    return this.files.get(path) || null;
  }
  
  setFile(path: string, content: string): void {
    // Save to undo stack
    const currentContent = this.files.get(path);
    if (currentContent !== undefined) {
      const stack = this.undoStack.get(path) || [];
      stack.push(currentContent);
      this.undoStack.set(path, stack.slice(-50)); // Keep last 50 states
      this.redoStack.set(path, []); // Clear redo on new edit
    }
    
    this.files.set(path, content);
    this.dirty = true;
    this.notifyListeners();
  }
  
  createFile(path: string, content: string = '', language?: string): void {
    this.files.set(path, content);
    this.undoStack.set(path, []);
    this.redoStack.set(path, []);
    this.openFiles.push(path);
    this.activeFile = path;
    this.language = language || this.detectLanguage(path);
    this.dirty = true;
    this.notifyListeners();
  }
  
  deleteFile(path: string): void {
    this.files.delete(path);
    this.undoStack.delete(path);
    this.redoStack.delete(path);
    this.openFiles = this.openFiles.filter(f => f !== path);
    
    if (this.activeFile === path) {
      this.activeFile = this.openFiles[0] || null;
      if (this.activeFile) {
        this.language = this.detectLanguage(this.activeFile);
      }
    }
    
    this.notifyListeners();
  }
  
  renameFile(oldPath: string, newPath: string): void {
    const content = this.files.get(oldPath);
    if (content !== undefined) {
      this.files.delete(oldPath);
      this.files.set(newPath, content);
      
      // Transfer undo/redo stacks
      const undoHistory = this.undoStack.get(oldPath) || [];
      const redoHistory = this.redoStack.get(oldPath) || [];
      this.undoStack.delete(oldPath);
      this.redoStack.delete(oldPath);
      this.undoStack.set(newPath, undoHistory);
      this.redoStack.set(newPath, redoHistory);
      
      // Update open files
      this.openFiles = this.openFiles.map(f => f === oldPath ? newPath : f);
      
      if (this.activeFile === oldPath) {
        this.activeFile = newPath;
        this.language = this.detectLanguage(newPath);
      }
      
      this.notifyListeners();
    }
  }
  
  // ========== MULTI-FILE OPERATIONS ==========
  
  getAllFiles(): Map<string, string> {
    return new Map(this.files);
  }
  
  getOpenFiles(): string[] {
    return [...this.openFiles];
  }
  
  getActiveFile(): string | null {
    return this.activeFile;
  }
  
  setActiveFile(path: string): void {
    if (this.files.has(path)) {
      this.activeFile = path;
      if (!this.openFiles.includes(path)) {
        this.openFiles.push(path);
      }
      this.language = this.detectLanguage(path);
      this.cursor = { line: 1, column: 1 };
      this.selection = null;
      this.notifyListeners();
    }
  }
  
  // ========== PROJECT TREE ==========
  
  getProjectTree(): FileNode[] {
    const tree: FileNode[] = [];
    const folders: Map<string, FileNode> = new Map();
    
    // Sort files by path
    const sortedPaths = Array.from(this.files.keys()).sort();
    
    for (const path of sortedPaths) {
      const parts = path.split('/').filter(p => p);
      let currentPath = '';
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (isFile) {
          const node: FileNode = {
            path: path,
            name: part,
            type: 'file',
            language: this.detectLanguage(path),
            content: this.files.get(path),
            isOpen: this.openFiles.includes(path),
            isModified: this.dirty && path === this.activeFile,
          };
          
          // Find parent folder
          const parentPath = parts.slice(0, -1).join('/');
          if (parentPath && folders.has(parentPath)) {
            const parent = folders.get(parentPath)!;
            parent.children = parent.children || [];
            parent.children.push(node);
          } else {
            tree.push(node);
          }
        } else {
          // Create folder if not exists
          if (!folders.has(currentPath)) {
            const folderNode: FileNode = {
              path: currentPath,
              name: part,
              type: 'folder',
              children: [],
            };
            folders.set(currentPath, folderNode);
            
            // Find parent folder
            const parentPath = parts.slice(0, i).join('/');
            if (parentPath && folders.has(parentPath)) {
              const parent = folders.get(parentPath)!;
              parent.children = parent.children || [];
              parent.children.push(folderNode);
            } else if (i === 0) {
              tree.push(folderNode);
            }
          }
        }
      }
    }
    
    return tree;
  }
  
  // ========== CURSOR & SELECTION ==========
  
  getCursor(): CursorPosition {
    return { ...this.cursor };
  }
  
  setCursor(position: CursorPosition): void {
    this.cursor = { ...position };
    this.selection = null;
    this.notifyListeners();
  }
  
  getSelection(): Selection | null {
    return this.selection ? { ...this.selection } : null;
  }
  
  setSelection(start: CursorPosition, end: CursorPosition): void {
    if (!this.activeFile) return;
    
    const content = this.files.get(this.activeFile) || '';
    const lines = content.split('\n');
    
    // Extract selected text
    let selectedText = '';
    if (start.line === end.line) {
      const line = lines[start.line - 1] || '';
      selectedText = line.substring(start.column - 1, end.column - 1);
    } else {
      const startLine = lines[start.line - 1] || '';
      selectedText = startLine.substring(start.column - 1) + '\n';
      
      for (let i = start.line; i < end.line - 1; i++) {
        selectedText += (lines[i] || '') + '\n';
      }
      
      const endLine = lines[end.line - 1] || '';
      selectedText += endLine.substring(0, end.column - 1);
    }
    
    this.selection = {
      start: { ...start },
      end: { ...end },
      text: selectedText,
    };
    this.cursor = { ...end };
    this.notifyListeners();
  }
  
  // ========== EDIT OPERATIONS ==========
  
  insertAt(position: CursorPosition, text: string): void {
    if (!this.activeFile) return;
    
    const content = this.files.get(this.activeFile) || '';
    const lines = content.split('\n');
    
    const lineIndex = Math.max(0, Math.min(position.line - 1, lines.length - 1));
    const line = lines[lineIndex] || '';
    const colIndex = Math.max(0, Math.min(position.column - 1, line.length));
    
    const newLine = line.substring(0, colIndex) + text + line.substring(colIndex);
    lines[lineIndex] = newLine;
    
    this.setFile(this.activeFile, lines.join('\n'));
    
    // Update cursor position
    const insertedLines = text.split('\n');
    if (insertedLines.length > 1) {
      this.cursor = {
        line: position.line + insertedLines.length - 1,
        column: insertedLines[insertedLines.length - 1].length + 1,
      };
    } else {
      this.cursor = {
        line: position.line,
        column: position.column + text.length,
      };
    }
  }
  
  insertAtCursor(text: string): void {
    this.insertAt(this.cursor, text);
  }
  
  getSelectedText(): string {
    if (!this.selection) return '';
    return this.selection.text || '';
  }

  replaceSelection(text: string): void {
    if (!this.activeFile || !this.selection) {
      this.insertAtCursor(text);
      return;
    }
    
    this.replaceRange(this.selection.start, this.selection.end, text);
    this.selection = null;
  }
  
  replaceRange(start: CursorPosition, end: CursorPosition, text: string): void {
    if (!this.activeFile) return;
    
    const content = this.files.get(this.activeFile) || '';
    const lines = content.split('\n');
    
    // Calculate start and end offsets
    let startOffset = 0;
    for (let i = 0; i < start.line - 1 && i < lines.length; i++) {
      startOffset += lines[i].length + 1; // +1 for newline
    }
    startOffset += Math.min(start.column - 1, (lines[start.line - 1] || '').length);
    
    let endOffset = 0;
    for (let i = 0; i < end.line - 1 && i < lines.length; i++) {
      endOffset += lines[i].length + 1;
    }
    endOffset += Math.min(end.column - 1, (lines[end.line - 1] || '').length);
    
    // Replace
    const newContent = content.substring(0, startOffset) + text + content.substring(endOffset);
    this.setFile(this.activeFile, newContent);
    
    // Update cursor
    const insertedLines = text.split('\n');
    if (insertedLines.length > 1) {
      this.cursor = {
        line: start.line + insertedLines.length - 1,
        column: insertedLines[insertedLines.length - 1].length + 1,
      };
    } else {
      this.cursor = {
        line: start.line,
        column: start.column + text.length,
      };
    }
  }
  
  replaceAll(searchPattern: string, replaceWith: string): void {
    if (!this.activeFile) return;
    
    const content = this.files.get(this.activeFile) || '';
    const newContent = content.split(searchPattern).join(replaceWith);
    this.setFile(this.activeFile, newContent);
  }
  
  deleteLine(lineNumber: number): void {
    this.deleteLines(lineNumber, lineNumber);
  }
  
  deleteLines(startLine: number, endLine: number): void {
    if (!this.activeFile) return;
    
    const content = this.files.get(this.activeFile) || '';
    const lines = content.split('\n');
    
    const start = Math.max(0, startLine - 1);
    const end = Math.min(lines.length, endLine);
    
    lines.splice(start, end - start);
    
    this.setFile(this.activeFile, lines.join('\n'));
    this.cursor = { line: Math.max(1, startLine), column: 1 };
  }
  
  // ========== BULK OPERATIONS ==========
  
  applyEdits(operations: EditOperation[]): void {
    // Sort operations by position (reverse order so later positions are edited first)
    const sortedOps = [...operations].sort((a, b) => {
      const aLine = a.position?.line || a.range?.start.line || 0;
      const bLine = b.position?.line || b.range?.start.line || 0;
      if (aLine !== bLine) return bLine - aLine;
      
      const aCol = a.position?.column || a.range?.start.column || 0;
      const bCol = b.position?.column || b.range?.start.column || 0;
      return bCol - aCol;
    });
    
    for (const op of sortedOps) {
      if (op.path) {
        this.setActiveFile(op.path);
      }
      
      switch (op.type) {
        case 'insert':
          if (op.position && op.text) {
            this.insertAt(op.position, op.text);
          }
          break;
          
        case 'delete':
          if (op.range) {
            this.replaceRange(op.range.start, op.range.end, '');
          }
          break;
          
        case 'replace':
          if (op.range && op.text !== undefined) {
            this.replaceRange(op.range.start, op.range.end, op.text);
          }
          break;
          
        case 'replaceAll':
          if (op.searchPattern !== undefined && op.replaceWith !== undefined) {
            this.replaceAll(op.searchPattern, op.replaceWith);
          }
          break;
      }
    }
  }
  
  // ========== STATE ==========
  
  getState(): EditorState {
    return {
      activeFile: this.activeFile,
      cursor: { ...this.cursor },
      selection: this.selection ? { ...this.selection } : null,
      files: new Map(this.files),
      openFiles: [...this.openFiles],
      projectTree: this.getProjectTree(),
      language: this.language,
      isDirty: this.dirty,
    };
  }
  
  getLanguage(): string {
    return this.language;
  }
  
  setLanguage(lang: string): void {
    this.language = lang;
    this.notifyListeners();
  }
  
  isDirty(): boolean {
    return this.dirty;
  }
  
  markClean(): void {
    this.dirty = false;
    this.notifyListeners();
  }
  
  // ========== UNDO/REDO ==========
  
  undo(): void {
    if (!this.activeFile) return;
    
    const stack = this.undoStack.get(this.activeFile) || [];
    if (stack.length === 0) return;
    
    const currentContent = this.files.get(this.activeFile) || '';
    const previousContent = stack.pop()!;
    
    // Save current to redo stack
    const redoStack = this.redoStack.get(this.activeFile) || [];
    redoStack.push(currentContent);
    this.redoStack.set(this.activeFile, redoStack);
    
    // Restore previous
    this.files.set(this.activeFile, previousContent);
    this.notifyListeners();
  }
  
  redo(): void {
    if (!this.activeFile) return;
    
    const stack = this.redoStack.get(this.activeFile) || [];
    if (stack.length === 0) return;
    
    const currentContent = this.files.get(this.activeFile) || '';
    const nextContent = stack.pop()!;
    
    // Save current to undo stack
    const undoStack = this.undoStack.get(this.activeFile) || [];
    undoStack.push(currentContent);
    this.undoStack.set(this.activeFile, undoStack);
    
    // Apply redo
    this.files.set(this.activeFile, nextContent);
    this.notifyListeners();
  }
  
  // ========== EVENTS ==========
  
  onChange(callback: (state: EditorState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  onMessage(callback: (message: UIMessage) => void): () => void {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }
  
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(callback => callback(state));
  }
  
  private notifyMessage(message: UIMessage): void {
    this.messageListeners.forEach(callback => callback(message));
  }
  
  // ========== FILE EXISTS & UPDATE ==========
  
  fileExists(path: string): boolean {
    return this.files.has(path);
  }
  
  writeFile(path: string, content: string): void {
    this.setFile(path, content);
  }
  
  updateFile(path: string, diff: string): boolean {
    try {
      const currentContent = this.files.get(path);
      if (currentContent === undefined) return false;
      
      // Simple patch: append diff lines that start with +, remove lines that start with -
      const lines = currentContent.split('\n');
      const diffLines = diff.split('\n');
      
      for (const line of diffLines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          lines.push(line.substring(1));
        }
      }
      
      this.setFile(path, lines.join('\n'));
      return true;
    } catch {
      return false;
    }
  }
  
  // ========== DIRECTORY OPERATIONS ==========
  
  listFiles(directory: string): string[] {
    const normalizedDir = directory.endsWith('/') ? directory : directory + '/';
    const result: string[] = [];
    
    this.files.forEach((_, path) => {
      if (directory === '/' || directory === '' || path.startsWith(normalizedDir)) {
        result.push(path);
      }
    });
    
    return result;
  }
  
  openFile(path: string): void {
    if (this.files.has(path)) {
      this.setActiveFile(path);
    }
  }
  
  // ========== CURSOR ALIASES ==========
  
  getCursorPosition(): CursorPosition {
    return this.getCursor();
  }
  
  setCursorPosition(position: CursorPosition): void {
    this.setCursor(position);
  }
  
  // ========== SEARCH ==========
  
  searchInFiles(query: string): Array<{ path: string; line: number; text: string; match: string }> {
    const results: Array<{ path: string; line: number; text: string; match: string }> = [];
    const lowerQuery = query.toLowerCase();
    
    this.files.forEach((content, path) => {
      const lines = content.split('\n');
      lines.forEach((lineText, index) => {
        const lowerLine = lineText.toLowerCase();
        if (lowerLine.includes(lowerQuery)) {
          results.push({
            path,
            line: index + 1,
            text: lineText.trim(),
            match: query
          });
        }
      });
    });
    
    return results;
  }
  
  findFileByName(name: string): string[] {
    const results: string[] = [];
    const lowerName = name.toLowerCase();
    
    this.files.forEach((_, path) => {
      const fileName = path.split('/').pop()?.toLowerCase() || '';
      if (fileName.includes(lowerName)) {
        results.push(path);
      }
    });
    
    return results;
  }
  
  // ========== CODE INTELLIGENCE ==========
  
  getSymbols(path: string): SymbolInfo[] {
    const content = this.files.get(path);
    if (!content) return [];
    
    const symbols: SymbolInfo[] = [];
    const lines = content.split('\n');
    
    // Simple regex-based symbol detection
    const patterns = [
      { regex: /function\s+(\w+)/g, kind: 'function' as const },
      { regex: /class\s+(\w+)/g, kind: 'class' as const },
      { regex: /const\s+(\w+)\s*=/g, kind: 'variable' as const },
      { regex: /let\s+(\w+)\s*=/g, kind: 'variable' as const },
      { regex: /interface\s+(\w+)/g, kind: 'interface' as const },
      { regex: /type\s+(\w+)\s*=/g, kind: 'type' as const },
      { regex: /(\w+)\s*\([^)]*\)\s*{/g, kind: 'method' as const },
    ];
    
    lines.forEach((line, lineIndex) => {
      for (const { regex, kind } of patterns) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(line)) !== null) {
          symbols.push({
            name: match[1],
            kind,
            location: { line: lineIndex + 1, column: match.index + 1 },
            path
          });
        }
      }
    });
    
    return symbols;
  }
  
  findReferences(symbol: string): Array<{ path: string; line: number; column: number }> {
    const references: Array<{ path: string; line: number; column: number }> = [];
    
    this.files.forEach((content, path) => {
      const lines = content.split('\n');
      lines.forEach((line, lineIndex) => {
        let index = 0;
        while ((index = line.indexOf(symbol, index)) !== -1) {
          references.push({
            path,
            line: lineIndex + 1,
            column: index + 1
          });
          index += symbol.length;
        }
      });
    });
    
    return references;
  }
  
  goToDefinition(symbol: string): { path: string; line: number; column: number } | null {
    // Look for definition patterns
    const defPatterns = [
      new RegExp(`function\\s+${symbol}\\s*\\(`),
      new RegExp(`class\\s+${symbol}`),
      new RegExp(`const\\s+${symbol}\\s*=`),
      new RegExp(`let\\s+${symbol}\\s*=`),
      new RegExp(`interface\\s+${symbol}`),
      new RegExp(`type\\s+${symbol}\\s*=`),
    ];
    
    for (const [path, content] of this.files.entries()) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const pattern of defPatterns) {
          const match = lines[i].match(pattern);
          if (match) {
            return { path, line: i + 1, column: match.index! + 1 };
          }
        }
      }
    }
    
    return null;
  }
  
  // ========== COMMANDS & EXECUTION ==========
  
  async runCommand(command: string): Promise<{ success: boolean; output: string; error?: string }> {
    this.addLog('info', `Running command: ${command}`);
    
    // Simulate command execution (in browser environment)
    try {
      // For now, just log the command
      this.addLog('log', `Command executed: ${command}`);
      return { success: true, output: `Simulated output for: ${command}` };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  }
  
  async runTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
    this.addLog('info', 'Running tests...');
    // Simulate test execution
    return { passed: 0, failed: 0, errors: ['Test runner not implemented in browser'] };
  }
  
  getErrors(): EditorError[] {
    return [...this.errors];
  }
  
  getLogs(): LogEntry[] {
    return [...this.logs];
  }
  
  clearLogs(): void {
    this.logs = [];
  }
  
  private addLog(level: LogEntry['level'], message: string, data?: any): void {
    this.logs.push({ timestamp: Date.now(), level, message, data });
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500);
    }
  }
  
  // ========== DIFF OPERATIONS ==========
  
  generateDiff(oldCode: string, newCode: string): DiffResult {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    
    let additions = 0;
    let deletions = 0;
    const diffLines: string[] = [];
    
    // Simple line-by-line diff
    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];
      
      if (oldLine === newLine) {
        diffLines.push(' ' + (oldLine || ''));
      } else {
        if (oldLine !== undefined) {
          diffLines.push('-' + oldLine);
          deletions++;
        }
        if (newLine !== undefined) {
          diffLines.push('+' + newLine);
          additions++;
        }
      }
    }
    
    return {
      hunks: [{
        oldStart: 1,
        oldLines: oldLines.length,
        newStart: 1,
        newLines: newLines.length,
        lines: diffLines
      }],
      additions,
      deletions
    };
  }
  
  showDiff(path: string, diff: DiffResult): void {
    this.showMessage(`Diff for ${path}: +${diff.additions} -${diff.deletions} lines`);
  }
  
  applyDiff(path: string, diff: DiffResult): boolean {
    try {
      const currentContent = this.files.get(path) || '';
      const newLines: string[] = [];
      
      for (const hunk of diff.hunks) {
        for (const line of hunk.lines) {
          if (line.startsWith(' ') || line.startsWith('+')) {
            newLines.push(line.substring(1));
          }
          // Lines starting with '-' are removed (not added to newLines)
        }
      }
      
      this.setFile(path, newLines.join('\n'));
      return true;
    } catch {
      return false;
    }
  }
  
  // ========== PROJECT INFO ==========
  
  getDependencies(): Record<string, string> {
    const packageJson = this.getPackageJson();
    if (!packageJson) return {};
    
    return {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {})
    };
  }
  
  getPackageJson(): Record<string, any> | null {
    const content = this.files.get('package.json') || this.files.get('/package.json');
    if (!content) return null;
    
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  
  getConfigFiles(): string[] {
    const configPatterns = [
      'package.json', 'tsconfig.json', 'vite.config', 'webpack.config',
      '.eslintrc', '.prettierrc', 'tailwind.config', 'postcss.config',
      '.env', 'next.config', 'nuxt.config'
    ];
    
    const configs: string[] = [];
    this.files.forEach((_, path) => {
      const fileName = path.split('/').pop() || '';
      if (configPatterns.some(p => fileName.includes(p))) {
        configs.push(path);
      }
    });
    
    return configs;
  }
  
  getEnvInfo(): { nodeVersion?: string; npmVersion?: string; env: Record<string, string> } {
    const envFile = this.files.get('.env') || this.files.get('/.env') || '';
    const env: Record<string, string> = {};
    
    envFile.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#')) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
    
    return { env };
  }
  
  // ========== MEMORY/STATE PERSISTENCE ==========
  
  saveMemory(key: string, value: any): void {
    this.memory.set(key, value);
  }
  
  getMemory(key: string): any {
    return this.memory.get(key);
  }
  
  clearMemory(): void {
    this.memory.clear();
  }
  
  // ========== PERMISSIONS ==========
  
  setApprovalHandler(handler: (action: string, details?: string) => Promise<boolean>): void {
    this.approvalHandler = handler;
  }
  
  setQuestionHandler(handler: (question: string) => Promise<string | null>): void {
    this.questionHandler = handler;
  }
  
  async requestApproval(action: string, details?: string): Promise<boolean> {
    if (this.approvalHandler) {
      return this.approvalHandler(action, details);
    }
    
    // Default: auto-approve safe actions
    const safeActions = ['read', 'view', 'search', 'list'];
    return safeActions.includes(action.toLowerCase());
  }
  
  checkPermission(action: string): boolean {
    return this.permissions.has(action.toLowerCase());
  }
  
  // ========== UI MESSAGES ==========
  
  showMessage(text: string): void {
    const message: UIMessage = { type: 'info', text, timestamp: Date.now() };
    this.notifyMessage(message);
    this.addLog('info', text);
  }
  
  showWarning(text: string): void {
    const message: UIMessage = { type: 'warning', text, timestamp: Date.now() };
    this.notifyMessage(message);
    this.addLog('warn', text);
  }
  
  showError(text: string): void {
    const message: UIMessage = { type: 'error', text, timestamp: Date.now() };
    this.notifyMessage(message);
    this.addLog('error', text);
  }
  
  async askUser(question: string): Promise<string | null> {
    if (this.questionHandler) {
      return this.questionHandler(question);
    }
    return window.prompt(question);
  }
  
  // ========== AGENT STATE ==========
  
  setMode(mode: AgentMode): void {
    this.agentMode = mode;
    this.notifyListeners();
  }
  
  getMode(): AgentMode {
    return this.agentMode;
  }
  
  getAgentState(): {
    mode: AgentMode;
    isRunning: boolean;
    currentTask: string | null;
    memory: Record<string, any>;
  } {
    const memoryObj: Record<string, any> = {};
    this.memory.forEach((value, key) => {
      memoryObj[key] = value;
    });
    
    return {
      mode: this.agentMode,
      isRunning: this.isRunning,
      currentTask: this.currentTask,
      memory: memoryObj
    };
  }
  
  cancelTask(): void {
    this.isRunning = false;
    this.currentTask = null;
    this.showMessage('Task cancelled');
  }
  
  setTask(task: string): void {
    this.currentTask = task;
    this.isRunning = true;
  }
  
  completeTask(): void {
    this.currentTask = null;
    this.isRunning = false;
  }

  // ========== HELPERS ==========
  
  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      'html': 'html',
      'htm': 'html',
      'tsx': 'react',
      'jsx': 'react',
      'ts': 'typescript',
      'js': 'javascript',
      'mjs': 'javascript',
      'cjs': 'javascript',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'kts': 'kotlin',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'c': 'cpp',
      'h': 'cpp',
      'hpp': 'cpp',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'css': 'css',
      'scss': 'css',
      'less': 'css',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'xml': 'xml',
      'md': 'markdown',
      'mdx': 'markdown',
      'dockerfile': 'shell',
      'makefile': 'shell',
    };
    return langMap[ext] || 'text';
  }
  
  // ========== SERIALIZATION FOR AGENT ==========
  
  /**
   * Get a serializable snapshot of the editor state for sending to the agent
   */
  getAgentContext(): {
    activeFile: string | null;
    cursor: CursorPosition;
    selection: Selection | null;
    files: Record<string, string>;
    fileList: string[];
    projectTree: FileNode[];
    language: string;
  } {
    const filesObj: Record<string, string> = {};
    this.files.forEach((content, path) => {
      filesObj[path] = content;
    });
    
    return {
      activeFile: this.activeFile,
      cursor: this.cursor,
      selection: this.selection,
      files: filesObj,
      fileList: Array.from(this.files.keys()),
      projectTree: this.getProjectTree(),
      language: this.language,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

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
