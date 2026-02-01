/**
 * Code Intelligence Service
 * Frontend service for LSP-like features including:
 * - Autocomplete
 * - Go to Definition
 * - Find References
 * - Signature Help
 * - Diagnostics/Linting
 * - Code Formatting
 * - Refactoring
 */

// ============================================================================
// Types
// ============================================================================

export interface Position {
  line: number;
  column: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface Diagnostic {
  range: Range;
  severity: 'error' | 'warning' | 'info' | 'hint';
  code?: string | number;
  source: string;
  message: string;
  relatedInformation?: { location: Location; message: string }[];
  quickFixes?: QuickFix[];
}

export interface CompletionItem {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  documentation?: string;
  insertText: string;
  insertTextFormat?: 'plainText' | 'snippet';
  sortText?: string;
  filterText?: string;
  preselect?: boolean;
  textEdit?: {
    range: Range;
    newText: string;
  };
}

export enum CompletionItemKind {
  Text = 1,
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Unit = 11,
  Value = 12,
  Enum = 13,
  Keyword = 14,
  Snippet = 15,
  Color = 16,
  File = 17,
  Reference = 18,
  Folder = 19,
  EnumMember = 20,
  Constant = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25,
}

export interface SignatureHelp {
  signatures: SignatureInformation[];
  activeSignature: number;
  activeParameter: number;
}

export interface SignatureInformation {
  label: string;
  documentation?: string;
  parameters: ParameterInformation[];
}

export interface ParameterInformation {
  label: string;
  documentation?: string;
}

export interface HoverInfo {
  contents: string[];
  range?: Range;
}

export interface DefinitionResult {
  uri: string;
  range: Range;
}

export interface ReferenceResult {
  uri: string;
  range: Range;
  isDefinition?: boolean;
}

export interface QuickFix {
  title: string;
  kind: string;
  edit: WorkspaceEdit;
  isPreferred?: boolean;
}

export interface WorkspaceEdit {
  changes: { [uri: string]: TextEdit[] };
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface RefactorAction {
  title: string;
  kind: string;
  edit?: WorkspaceEdit;
  command?: {
    title: string;
    command: string;
    arguments?: any[];
  };
}

export interface SymbolInfo {
  name: string;
  kind: SymbolKind;
  range: Range;
  selectionRange: Range;
  children?: SymbolInfo[];
}

export enum SymbolKind {
  File = 1,
  Module = 2,
  Namespace = 3,
  Package = 4,
  Class = 5,
  Method = 6,
  Property = 7,
  Field = 8,
  Constructor = 9,
  Enum = 10,
  Interface = 11,
  Function = 12,
  Variable = 13,
  Constant = 14,
  String = 15,
  Number = 16,
  Boolean = 17,
  Array = 18,
  Object = 19,
  Key = 20,
  Null = 21,
  EnumMember = 22,
  Struct = 23,
  Event = 24,
  Operator = 25,
  TypeParameter = 26,
}

export interface FormatOptions {
  tabSize: number;
  insertSpaces: boolean;
  trimTrailingWhitespace?: boolean;
  insertFinalNewline?: boolean;
}

export interface AnalysisResult {
  diagnostics: Diagnostic[];
  symbols: SymbolInfo[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
    hintCount: number;
    symbolCount: number;
  };
}

// ============================================================================
// API Configuration
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// ============================================================================
// Helper Functions
// ============================================================================

async function apiRequest<T>(endpoint: string, body: any): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}/lsp${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`LSP API Error (${endpoint}):`, error);
    throw error;
  }
}

// ============================================================================
// Language Mapping
// ============================================================================

const FILE_EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescriptreact',
  js: 'javascript',
  jsx: 'javascriptreact',
  py: 'python',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  json: 'json',
  md: 'markdown',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  sql: 'sql',
  sh: 'shellscript',
  bash: 'shellscript',
  go: 'go',
  rs: 'rust',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  php: 'php',
  rb: 'ruby',
  swift: 'swift',
  kt: 'kotlin',
  vue: 'vue',
  svelte: 'svelte',
};

export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return FILE_EXTENSION_TO_LANGUAGE[ext] || 'plaintext';
}

// ============================================================================
// Code Intelligence Service Class
// ============================================================================

class CodeIntelligenceService {
  private diagnosticsCache: Map<string, Diagnostic[]> = new Map();
  private symbolsCache: Map<string, SymbolInfo[]> = new Map();
  private analysisDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Map<string, Set<(diagnostics: Diagnostic[]) => void>> = new Map();

  // ============================================================================
  // Diagnostics
  // ============================================================================

  /**
   * Analyze document and get diagnostics
   */
  async analyzeDiagnostics(
    uri: string,
    content: string,
    language: string
  ): Promise<Diagnostic[]> {
    try {
      const result = await apiRequest<{ diagnostics: Diagnostic[] }>('/diagnostics', {
        uri,
        content,
        language,
      });

      this.diagnosticsCache.set(uri, result.diagnostics);
      this.notifyListeners(uri, result.diagnostics);

      return result.diagnostics;
    } catch (error) {
      // Fallback to local analysis
      return this.analyzeLocally(content, language);
    }
  }

  /**
   * Get cached diagnostics for a file
   */
  getCachedDiagnostics(uri: string): Diagnostic[] {
    return this.diagnosticsCache.get(uri) || [];
  }

  /**
   * Subscribe to diagnostics updates for a file
   */
  subscribeToDiagnostics(
    uri: string,
    callback: (diagnostics: Diagnostic[]) => void
  ): () => void {
    if (!this.listeners.has(uri)) {
      this.listeners.set(uri, new Set());
    }
    this.listeners.get(uri)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(uri)?.delete(callback);
    };
  }

  private notifyListeners(uri: string, diagnostics: Diagnostic[]): void {
    this.listeners.get(uri)?.forEach(callback => callback(diagnostics));
  }

  /**
   * Debounced analysis - call this on every content change
   */
  analyzeWithDebounce(
    uri: string,
    content: string,
    language: string,
    delay: number = 500
  ): void {
    // Clear existing timer
    const existingTimer = this.analysisDebounceTimers.get(uri);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.analyzeDiagnostics(uri, content, language);
      this.analysisDebounceTimers.delete(uri);
    }, delay);

    this.analysisDebounceTimers.set(uri, timer);
  }

  // ============================================================================
  // Autocomplete
  // ============================================================================

  /**
   * Get completion items at position
   */
  async getCompletions(
    uri: string,
    content: string,
    position: Position,
    language: string
  ): Promise<CompletionItem[]> {
    try {
      const result = await apiRequest<{ completions: CompletionItem[] }>('/completions', {
        uri,
        content,
        position,
        language,
      });

      return result.completions;
    } catch (error) {
      // Fallback to local completions
      return this.getLocalCompletions(content, position, language);
    }
  }

  // ============================================================================
  // Hover Information
  // ============================================================================

  /**
   * Get hover information at position
   */
  async getHoverInfo(
    uri: string,
    content: string,
    position: Position,
    language: string
  ): Promise<HoverInfo | null> {
    try {
      const result = await apiRequest<{ hover: HoverInfo | null }>('/hover', {
        uri,
        content,
        position,
        language,
      });

      return result.hover;
    } catch (error) {
      return null;
    }
  }

  // ============================================================================
  // Go to Definition
  // ============================================================================

  /**
   * Get definition location for symbol at position
   */
  async getDefinition(
    uri: string,
    content: string,
    position: Position,
    language: string
  ): Promise<DefinitionResult | null> {
    try {
      const result = await apiRequest<{ definition: DefinitionResult | null }>('/definition', {
        uri,
        content,
        position,
        language,
      });

      return result.definition;
    } catch (error) {
      return null;
    }
  }

  // ============================================================================
  // Find References
  // ============================================================================

  /**
   * Find all references to symbol at position
   */
  async findReferences(
    uri: string,
    content: string,
    position: Position,
    language: string
  ): Promise<ReferenceResult[]> {
    try {
      const result = await apiRequest<{ references: ReferenceResult[] }>('/references', {
        uri,
        content,
        position,
        language,
      });

      return result.references;
    } catch (error) {
      return [];
    }
  }

  // ============================================================================
  // Signature Help
  // ============================================================================

  /**
   * Get signature help for function call at position
   */
  async getSignatureHelp(
    uri: string,
    content: string,
    position: Position,
    language: string
  ): Promise<SignatureHelp | null> {
    try {
      const result = await apiRequest<{ signatureHelp: SignatureHelp | null }>('/signature', {
        uri,
        content,
        position,
        language,
      });

      return result.signatureHelp;
    } catch (error) {
      return null;
    }
  }

  // ============================================================================
  // Document Symbols
  // ============================================================================

  /**
   * Get all symbols in document
   */
  async getDocumentSymbols(
    uri: string,
    content: string,
    language: string
  ): Promise<SymbolInfo[]> {
    try {
      const result = await apiRequest<{ symbols: SymbolInfo[] }>('/symbols', {
        uri,
        content,
        language,
      });

      this.symbolsCache.set(uri, result.symbols);
      return result.symbols;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get cached symbols for a file
   */
  getCachedSymbols(uri: string): SymbolInfo[] {
    return this.symbolsCache.get(uri) || [];
  }

  // ============================================================================
  // Code Formatting
  // ============================================================================

  /**
   * Format document
   */
  async formatDocument(
    content: string,
    language: string,
    options?: Partial<FormatOptions>
  ): Promise<string> {
    try {
      const result = await apiRequest<{ edits: TextEdit[] }>('/format', {
        content,
        language,
        options: {
          tabSize: options?.tabSize ?? 2,
          insertSpaces: options?.insertSpaces ?? true,
          trimTrailingWhitespace: options?.trimTrailingWhitespace ?? true,
          insertFinalNewline: options?.insertFinalNewline ?? true,
        },
      });

      // Apply edits to get formatted content
      if (result.edits.length > 0) {
        return result.edits[0].newText;
      }

      return content;
    } catch (error) {
      // Fallback to local formatting
      return this.formatLocally(content, language, options);
    }
  }

  // ============================================================================
  // Refactoring
  // ============================================================================

  /**
   * Get available refactoring actions for selection
   */
  async getRefactorActions(
    uri: string,
    content: string,
    range: Range,
    language: string
  ): Promise<RefactorAction[]> {
    try {
      const result = await apiRequest<{ actions: RefactorAction[] }>('/refactor', {
        uri,
        content,
        range,
        language,
      });

      return result.actions;
    } catch (error) {
      return [];
    }
  }

  // ============================================================================
  // Rename Symbol
  // ============================================================================

  /**
   * Rename symbol throughout document
   */
  async renameSymbol(
    uri: string,
    content: string,
    position: Position,
    newName: string,
    language: string
  ): Promise<WorkspaceEdit | null> {
    try {
      const result = await apiRequest<{ workspaceEdit: WorkspaceEdit | null }>('/rename', {
        uri,
        content,
        position,
        newName,
        language,
      });

      return result.workspaceEdit;
    } catch (error) {
      return null;
    }
  }

  // ============================================================================
  // Quick Fix
  // ============================================================================

  /**
   * Apply a quick fix
   */
  applyQuickFix(content: string, quickFix: QuickFix): string {
    let result = content;
    const edits = Object.values(quickFix.edit.changes).flat();

    // Sort edits in reverse order to apply from end to start
    edits.sort((a, b) => {
      if (a.range.start.line !== b.range.start.line) {
        return b.range.start.line - a.range.start.line;
      }
      return b.range.start.column - a.range.start.column;
    });

    const lines = result.split('\n');

    for (const edit of edits) {
      const startLine = edit.range.start.line;
      const endLine = edit.range.end.line;

      if (startLine === endLine) {
        const line = lines[startLine];
        lines[startLine] =
          line.substring(0, edit.range.start.column) +
          edit.newText +
          line.substring(edit.range.end.column);
      } else {
        // Multi-line edit
        const startLineContent = lines[startLine].substring(0, edit.range.start.column);
        const endLineContent = lines[endLine].substring(edit.range.end.column);
        const newContent = startLineContent + edit.newText + endLineContent;
        lines.splice(startLine, endLine - startLine + 1, ...newContent.split('\n'));
      }
    }

    return lines.join('\n');
  }

  // ============================================================================
  // Full Analysis
  // ============================================================================

  /**
   * Perform full analysis on a document
   */
  async analyzeDocument(
    uri: string,
    content: string,
    language: string
  ): Promise<AnalysisResult> {
    try {
      const result = await apiRequest<AnalysisResult>('/analyze', {
        uri,
        content,
        language,
      });

      this.diagnosticsCache.set(uri, result.diagnostics);
      this.symbolsCache.set(uri, result.symbols);
      this.notifyListeners(uri, result.diagnostics);

      return result;
    } catch (error) {
      const diagnostics = this.analyzeLocally(content, language);
      return {
        diagnostics,
        symbols: [],
        summary: {
          errorCount: diagnostics.filter(d => d.severity === 'error').length,
          warningCount: diagnostics.filter(d => d.severity === 'warning').length,
          infoCount: diagnostics.filter(d => d.severity === 'info').length,
          hintCount: diagnostics.filter(d => d.severity === 'hint').length,
          symbolCount: 0,
        },
      };
    }
  }

  // ============================================================================
  // Local Fallback Analysis
  // ============================================================================

  private analyzeLocally(content: string, language: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const lines = content.split('\n');

    if (language === 'typescript' || language === 'typescriptreact' ||
        language === 'javascript' || language === 'javascriptreact') {
      
      lines.forEach((line, lineIndex) => {
        // Check for console.log
        if (line.includes('console.log') && !line.trim().startsWith('//')) {
          const col = line.indexOf('console.log');
          diagnostics.push({
            range: {
              start: { line: lineIndex, column: col },
              end: { line: lineIndex, column: col + 11 },
            },
            severity: 'warning',
            code: 'no-console',
            source: 'local-lint',
            message: 'Unexpected console statement',
          });
        }

        // Check for var
        if (/\bvar\s+/.test(line)) {
          const col = line.indexOf('var');
          diagnostics.push({
            range: {
              start: { line: lineIndex, column: col },
              end: { line: lineIndex, column: col + 3 },
            },
            severity: 'warning',
            code: 'no-var',
            source: 'local-lint',
            message: "Use 'const' or 'let' instead of 'var'",
          });
        }

        // Check for trailing whitespace
        if (line.endsWith(' ') || line.endsWith('\t')) {
          diagnostics.push({
            range: {
              start: { line: lineIndex, column: line.trimEnd().length },
              end: { line: lineIndex, column: line.length },
            },
            severity: 'hint',
            code: 'no-trailing-spaces',
            source: 'local-lint',
            message: 'Trailing whitespace',
          });
        }
      });
    }

    if (language === 'json') {
      try {
        JSON.parse(content);
      } catch (error: any) {
        diagnostics.push({
          range: {
            start: { line: 0, column: 0 },
            end: { line: 0, column: 1 },
          },
          severity: 'error',
          code: 'json-parse-error',
          source: 'json',
          message: error.message,
        });
      }
    }

    return diagnostics;
  }

  // ============================================================================
  // Local Fallback Completions
  // ============================================================================

  private getLocalCompletions(
    content: string,
    position: Position,
    language: string
  ): CompletionItem[] {
    const completions: CompletionItem[] = [];

    if (language === 'typescript' || language === 'typescriptreact' ||
        language === 'javascript' || language === 'javascriptreact') {
      
      // Keywords
      const keywords = ['const', 'let', 'function', 'async', 'await', 'return',
        'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'export', 'import'];
      
      keywords.forEach(keyword => {
        completions.push({
          label: keyword,
          kind: CompletionItemKind.Keyword,
          insertText: keyword,
          detail: 'Keyword',
        });
      });

      // Common snippets
      completions.push(
        {
          label: 'log',
          kind: CompletionItemKind.Snippet,
          insertText: "console.log('$1', $2);",
          insertTextFormat: 'snippet',
          detail: 'Console log',
        },
        {
          label: 'func',
          kind: CompletionItemKind.Snippet,
          insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}',
          insertTextFormat: 'snippet',
          detail: 'Function declaration',
        }
      );
    }

    return completions;
  }

  // ============================================================================
  // Local Fallback Formatting
  // ============================================================================

  private formatLocally(
    content: string,
    language: string,
    options?: Partial<FormatOptions>
  ): string {
    const tabSize = options?.tabSize ?? 2;
    const insertSpaces = options?.insertSpaces ?? true;
    const indent = insertSpaces ? ' '.repeat(tabSize) : '\t';

    if (language === 'json') {
      try {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, tabSize);
      } catch {
        return content;
      }
    }

    // Basic formatting for other languages
    const lines = content.split('\n');
    let indentLevel = 0;
    const result: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      if (trimmed) {
        result.push(indent.repeat(indentLevel) + trimmed);
      } else {
        result.push('');
      }

      const openCount = (trimmed.match(/[{[(]/g) || []).length;
      const closeCount = (trimmed.match(/[}\])]/g) || []).length;
      indentLevel += openCount - closeCount;
      indentLevel = Math.max(0, indentLevel);
    }

    return result.join('\n');
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.diagnosticsCache.clear();
    this.symbolsCache.clear();
  }

  /**
   * Clear cache for specific file
   */
  clearFileCache(uri: string): void {
    this.diagnosticsCache.delete(uri);
    this.symbolsCache.delete(uri);
  }
}

// Export singleton instance
export const codeIntelligence = new CodeIntelligenceService();

// Export types and enums
export default CodeIntelligenceService;
