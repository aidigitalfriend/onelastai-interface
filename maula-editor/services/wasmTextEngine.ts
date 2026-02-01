// WebAssembly Text Engine Service
// High-performance text rendering and processing engine

export interface TextBuffer {
  id: string;
  content: Uint8Array;
  encoding: BufferEncoding;
  lineCount: number;
  byteLength: number;
  modified: boolean;
  version: number;
}

export type BufferEncoding = 'utf-8' | 'utf-16' | 'utf-32' | 'ascii' | 'latin1';

export interface LineInfo {
  lineNumber: number;
  startOffset: number;
  endOffset: number;
  length: number;
  text: string;
  lineEnding: LineEnding;
}

export type LineEnding = 'LF' | 'CRLF' | 'CR' | 'none';

export interface TextRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface TextEdit {
  range: TextRange;
  text: string;
}

export interface SyntaxToken {
  type: TokenType;
  start: number;
  end: number;
  line: number;
  column: number;
  modifiers: TokenModifier[];
}

export type TokenType = 
  | 'keyword' 
  | 'identifier' 
  | 'string' 
  | 'number' 
  | 'comment'
  | 'operator' 
  | 'punctuation' 
  | 'function' 
  | 'variable'
  | 'class' 
  | 'interface' 
  | 'type' 
  | 'namespace'
  | 'enum' 
  | 'enumMember' 
  | 'property' 
  | 'method'
  | 'parameter' 
  | 'decorator' 
  | 'regexp' 
  | 'macro';

export type TokenModifier = 
  | 'declaration' 
  | 'definition' 
  | 'readonly' 
  | 'static'
  | 'deprecated' 
  | 'abstract' 
  | 'async' 
  | 'modification'
  | 'documentation' 
  | 'defaultLibrary';

export interface FoldingRange {
  startLine: number;
  endLine: number;
  kind: FoldingKind;
  isCollapsed: boolean;
}

export type FoldingKind = 'comment' | 'imports' | 'region' | 'function' | 'class' | 'block';

export interface BracketPair {
  open: { line: number; column: number; char: string };
  close: { line: number; column: number; char: string };
  depth: number;
}

export interface SearchResult {
  line: number;
  column: number;
  length: number;
  matchText: string;
  context: string;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string[];
  type: 'add' | 'remove' | 'context';
}

export interface TextMetrics {
  totalLines: number;
  totalCharacters: number;
  totalBytes: number;
  longestLine: number;
  averageLineLength: number;
  blankLines: number;
  codeLines: number;
  commentLines: number;
}

export interface RenderInstruction {
  type: 'text' | 'highlight' | 'decoration' | 'cursor' | 'selection';
  line: number;
  startColumn: number;
  endColumn: number;
  style?: RenderStyle;
  text?: string;
}

export interface RenderStyle {
  foreground?: string;
  background?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  opacity?: number;
}

export interface ViewportInfo {
  startLine: number;
  endLine: number;
  visibleLines: number;
  scrollTop: number;
  scrollLeft: number;
  lineHeight: number;
  charWidth: number;
}

export interface WasmModule {
  ready: boolean;
  memory: WebAssembly.Memory | null;
  exports: WasmExports | null;
  instance: WebAssembly.Instance | null;
}

export interface WasmExports {
  // Memory management
  allocate: (size: number) => number;
  deallocate: (ptr: number, size: number) => void;
  
  // Text operations
  createBuffer: () => number;
  destroyBuffer: (bufferPtr: number) => void;
  setContent: (bufferPtr: number, textPtr: number, len: number) => void;
  getContent: (bufferPtr: number, outPtr: number) => number;
  
  // Line operations
  getLineCount: (bufferPtr: number) => number;
  getLine: (bufferPtr: number, lineNum: number, outPtr: number) => number;
  getLineLength: (bufferPtr: number, lineNum: number) => number;
  
  // Editing operations
  insert: (bufferPtr: number, offset: number, textPtr: number, len: number) => void;
  delete: (bufferPtr: number, start: number, end: number) => void;
  replace: (bufferPtr: number, start: number, end: number, textPtr: number, len: number) => void;
  
  // Search operations
  search: (bufferPtr: number, patternPtr: number, patternLen: number, caseSensitive: number) => number;
  searchRegex: (bufferPtr: number, patternPtr: number, patternLen: number) => number;
  
  // Tokenization
  tokenize: (bufferPtr: number, langPtr: number, outPtr: number) => number;
  
  // Diff operations
  diff: (buffer1Ptr: number, buffer2Ptr: number, outPtr: number) => number;
}

type EventCallback = (event: { type: string; data: any }) => void;

class WebAssemblyTextEngine {
  private wasmModule: WasmModule;
  private buffers: Map<string, TextBuffer> = new Map();
  private tokenCache: Map<string, SyntaxToken[]> = new Map();
  private foldingCache: Map<string, FoldingRange[]> = new Map();
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private encoder: TextEncoder;
  private decoder: TextDecoder;
  private bufferIdCounter: number = 0;

  // Token patterns for syntax highlighting
  private tokenPatterns: Map<string, RegExp[]> = new Map();

  constructor() {
    this.wasmModule = {
      ready: false,
      memory: null,
      exports: null,
      instance: null,
    };
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
    this.initializeTokenPatterns();
    this.initializeWasm();
  }

  private async initializeWasm(): Promise<void> {
    // Simulate WASM module initialization
    // In production, this would load actual WebAssembly binary
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Create simulated memory
    this.wasmModule.memory = new WebAssembly.Memory({ initial: 256, maximum: 16384 });
    this.wasmModule.ready = true;
    
    this.emit('wasm:ready', { memory: this.wasmModule.memory });
  }

  private initializeTokenPatterns(): void {
    // TypeScript/JavaScript
    this.tokenPatterns.set('typescript', [
      /\b(const|let|var|function|class|interface|type|enum|namespace|module|import|export|from|as|default|extends|implements|constructor|new|this|super|static|public|private|protected|readonly|abstract|async|await|return|if|else|switch|case|break|continue|for|while|do|try|catch|finally|throw|typeof|instanceof|in|of|void|null|undefined|true|false|never|unknown|any|number|string|boolean|symbol|bigint|object)\b/g,
      /"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|`[^`\\]*(?:\\.[^`\\]*)*`/g,
      /\/\/.*$|\/\*[\s\S]*?\*\//gm,
      /\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?:n)?\b/g,
      /[+\-*/%=<>!&|^~?:]+/g,
      /[{}()\[\];,.:]/g,
      /\b[A-Z][a-zA-Z0-9]*\b/g,
      /@[a-zA-Z]+/g,
    ]);

    // Python
    this.tokenPatterns.set('python', [
      /\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|pass|break|continue|and|or|not|in|is|lambda|True|False|None|global|nonlocal|assert|raise|del|async|await)\b/g,
      /"""[\s\S]*?"""|'''[\s\S]*?'''|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'/g,
      /#.*$/gm,
      /\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?:j)?\b/g,
      /[+\-*/%=<>!&|^~@:]+/g,
      /[{}()\[\];,.:]/g,
      /@[a-zA-Z_][a-zA-Z0-9_]*/g,
    ]);

    // Rust
    this.tokenPatterns.set('rust', [
      /\b(fn|let|mut|const|static|struct|enum|trait|impl|type|where|use|mod|pub|crate|self|super|if|else|match|for|while|loop|break|continue|return|async|await|move|unsafe|extern|ref|dyn|box|in|as|true|false)\b/g,
      /"[^"\\]*(?:\\.[^"\\]*)*"|r#*"[\s\S]*?"#*|'[^'\\]*'/g,
      /\/\/.*$|\/\*[\s\S]*?\*\//gm,
      /\b\d+(?:_\d+)*(?:\.\d+(?:_\d+)*)?(?:[eE][+-]?\d+)?(?:i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64)?\b/g,
      /[+\-*/%=<>!&|^~?:]+|->|=>/g,
      /[{}()\[\];,.:]/g,
      /#!?\[[^\]]*\]/g,
    ]);

    // HTML
    this.tokenPatterns.set('html', [
      /<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s+[^>]*)?\/?>/g,
      /"[^"]*"|'[^']*'/g,
      /<!--[\s\S]*?-->/g,
      /&[a-zA-Z]+;|&#\d+;|&#x[0-9a-fA-F]+;/g,
    ]);

    // CSS
    this.tokenPatterns.set('css', [
      /@[a-zA-Z-]+/g,
      /[.#][a-zA-Z_-][a-zA-Z0-9_-]*/g,
      /"[^"]*"|'[^']*'/g,
      /\/\*[\s\S]*?\*\//g,
      /#[0-9a-fA-F]{3,8}\b/g,
      /\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|vmin|vmax|deg|rad|turn|s|ms)?\b/g,
      /[{}();:,]/g,
    ]);

    // JSON
    this.tokenPatterns.set('json', [
      /"[^"\\]*(?:\\.[^"\\]*)*"/g,
      /\b(?:true|false|null)\b/g,
      /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
      /[{}\[\]:,]/g,
    ]);
  }

  // Buffer Management
  createBuffer(content: string = '', encoding: BufferEncoding = 'utf-8'): string {
    const id = `buffer_${++this.bufferIdCounter}`;
    const encoded = this.encoder.encode(content);
    const lines = content.split(/\r\n|\r|\n/);
    
    const buffer: TextBuffer = {
      id,
      content: encoded,
      encoding,
      lineCount: lines.length,
      byteLength: encoded.byteLength,
      modified: false,
      version: 1,
    };

    this.buffers.set(id, buffer);
    this.emit('buffer:created', { bufferId: id });
    return id;
  }

  destroyBuffer(bufferId: string): void {
    if (this.buffers.has(bufferId)) {
      this.buffers.delete(bufferId);
      this.tokenCache.delete(bufferId);
      this.foldingCache.delete(bufferId);
      this.emit('buffer:destroyed', { bufferId });
    }
  }

  getBuffer(bufferId: string): TextBuffer | undefined {
    return this.buffers.get(bufferId);
  }

  setContent(bufferId: string, content: string): void {
    const buffer = this.buffers.get(bufferId);
    if (!buffer) return;

    const encoded = this.encoder.encode(content);
    const lines = content.split(/\r\n|\r|\n/);
    
    buffer.content = encoded;
    buffer.lineCount = lines.length;
    buffer.byteLength = encoded.byteLength;
    buffer.modified = true;
    buffer.version++;

    // Invalidate caches
    this.tokenCache.delete(bufferId);
    this.foldingCache.delete(bufferId);

    this.emit('buffer:changed', { bufferId, version: buffer.version });
  }

  getContent(bufferId: string): string {
    const buffer = this.buffers.get(bufferId);
    if (!buffer) return '';
    return this.decoder.decode(buffer.content);
  }

  // Line Operations
  getLineCount(bufferId: string): number {
    return this.buffers.get(bufferId)?.lineCount || 0;
  }

  getLine(bufferId: string, lineNumber: number): LineInfo | null {
    const content = this.getContent(bufferId);
    if (!content) return null;

    const lines = content.split(/\r\n|\r|\n/);
    if (lineNumber < 0 || lineNumber >= lines.length) return null;

    let startOffset = 0;
    for (let i = 0; i < lineNumber; i++) {
      startOffset += lines[i].length + 1; // +1 for line ending
    }

    const lineText = lines[lineNumber];
    const endOffset = startOffset + lineText.length;

    // Detect line ending
    let lineEnding: LineEnding = 'none';
    const fullContent = content;
    if (fullContent[endOffset] === '\r' && fullContent[endOffset + 1] === '\n') {
      lineEnding = 'CRLF';
    } else if (fullContent[endOffset] === '\r') {
      lineEnding = 'CR';
    } else if (fullContent[endOffset] === '\n') {
      lineEnding = 'LF';
    }

    return {
      lineNumber,
      startOffset,
      endOffset,
      length: lineText.length,
      text: lineText,
      lineEnding,
    };
  }

  getLines(bufferId: string, startLine: number, endLine: number): LineInfo[] {
    const lines: LineInfo[] = [];
    for (let i = startLine; i <= endLine; i++) {
      const line = this.getLine(bufferId, i);
      if (line) lines.push(line);
    }
    return lines;
  }

  // Edit Operations (simulated high-performance)
  insert(bufferId: string, line: number, column: number, text: string): void {
    const content = this.getContent(bufferId);
    const lines = content.split(/\r\n|\r|\n/);
    
    if (line < 0 || line >= lines.length) return;
    
    const lineText = lines[line];
    const col = Math.min(column, lineText.length);
    lines[line] = lineText.slice(0, col) + text + lineText.slice(col);
    
    this.setContent(bufferId, lines.join('\n'));
    this.emit('buffer:insert', { bufferId, line, column, text });
  }

  delete(bufferId: string, range: TextRange): void {
    const content = this.getContent(bufferId);
    const lines = content.split(/\r\n|\r|\n/);
    
    const { startLine, startColumn, endLine, endColumn } = range;
    
    if (startLine === endLine) {
      // Single line deletion
      lines[startLine] = 
        lines[startLine].slice(0, startColumn) + 
        lines[startLine].slice(endColumn);
    } else {
      // Multi-line deletion
      const startText = lines[startLine].slice(0, startColumn);
      const endText = lines[endLine].slice(endColumn);
      lines[startLine] = startText + endText;
      lines.splice(startLine + 1, endLine - startLine);
    }
    
    this.setContent(bufferId, lines.join('\n'));
    this.emit('buffer:delete', { bufferId, range });
  }

  replace(bufferId: string, range: TextRange, text: string): void {
    this.delete(bufferId, range);
    this.insert(bufferId, range.startLine, range.startColumn, text);
    this.emit('buffer:replace', { bufferId, range, text });
  }

  applyEdits(bufferId: string, edits: TextEdit[]): void {
    // Sort edits in reverse order to apply from end to start
    const sortedEdits = [...edits].sort((a, b) => {
      if (b.range.startLine !== a.range.startLine) {
        return b.range.startLine - a.range.startLine;
      }
      return b.range.startColumn - a.range.startColumn;
    });

    for (const edit of sortedEdits) {
      this.replace(bufferId, edit.range, edit.text);
    }
    
    this.emit('buffer:editsApplied', { bufferId, editCount: edits.length });
  }

  // Tokenization (simulated WASM-accelerated)
  tokenize(bufferId: string, language: string): SyntaxToken[] {
    // Check cache
    const cacheKey = `${bufferId}:${language}`;
    if (this.tokenCache.has(cacheKey)) {
      return this.tokenCache.get(cacheKey)!;
    }

    const content = this.getContent(bufferId);
    const tokens: SyntaxToken[] = [];
    const patterns = this.tokenPatterns.get(language) || this.tokenPatterns.get('typescript')!;

    const lines = content.split('\n');
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const lineText = lines[lineNum];
      const lineTokens = this.tokenizeLine(lineText, lineNum, patterns);
      tokens.push(...lineTokens);
    }

    // Sort by position
    tokens.sort((a, b) => {
      if (a.line !== b.line) return a.line - b.line;
      return a.start - b.start;
    });

    // Cache results
    this.tokenCache.set(cacheKey, tokens);
    
    return tokens;
  }

  private tokenizeLine(text: string, lineNum: number, patterns: RegExp[]): SyntaxToken[] {
    const tokens: SyntaxToken[] = [];
    const tokenTypes: TokenType[] = [
      'keyword', 'string', 'comment', 'number', 'operator', 
      'punctuation', 'class', 'decorator'
    ];

    patterns.forEach((pattern, index) => {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        tokens.push({
          type: tokenTypes[index] || 'identifier',
          start: match.index,
          end: match.index + match[0].length,
          line: lineNum,
          column: match.index,
          modifiers: [],
        });
      }
    });

    return tokens;
  }

  // Syntax Highlighting Rendering
  getHighlightedRanges(bufferId: string, language: string, viewport: ViewportInfo): RenderInstruction[] {
    const tokens = this.tokenize(bufferId, language);
    const instructions: RenderInstruction[] = [];

    const colorMap: Record<TokenType, string> = {
      keyword: '#C586C0',
      identifier: '#9CDCFE',
      string: '#CE9178',
      number: '#B5CEA8',
      comment: '#6A9955',
      operator: '#D4D4D4',
      punctuation: '#D4D4D4',
      function: '#DCDCAA',
      variable: '#9CDCFE',
      class: '#4EC9B0',
      interface: '#4EC9B0',
      type: '#4EC9B0',
      namespace: '#4EC9B0',
      enum: '#4EC9B0',
      enumMember: '#4FC1FF',
      property: '#9CDCFE',
      method: '#DCDCAA',
      parameter: '#9CDCFE',
      decorator: '#DCDCAA',
      regexp: '#D16969',
      macro: '#569CD6',
    };

    for (const token of tokens) {
      if (token.line >= viewport.startLine && token.line <= viewport.endLine) {
        instructions.push({
          type: 'highlight',
          line: token.line,
          startColumn: token.column,
          endColumn: token.column + (token.end - token.start),
          style: {
            foreground: colorMap[token.type] || '#D4D4D4',
          },
        });
      }
    }

    return instructions;
  }

  // Folding Ranges
  computeFoldingRanges(bufferId: string, language: string): FoldingRange[] {
    const cacheKey = `${bufferId}:${language}:folding`;
    if (this.foldingCache.has(cacheKey)) {
      return this.foldingCache.get(cacheKey)!;
    }

    const content = this.getContent(bufferId);
    const lines = content.split('\n');
    const ranges: FoldingRange[] = [];
    const stack: { line: number; indent: number; kind: FoldingKind }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const indent = line.length - line.trimStart().length;

      // Detect block starts
      if (trimmed.endsWith('{') || trimmed.endsWith(':')) {
        stack.push({
          line: i,
          indent,
          kind: this.detectFoldingKind(trimmed),
        });
      }

      // Detect block ends
      if (trimmed.startsWith('}') || (trimmed === '' && stack.length > 0)) {
        while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
          const start = stack.pop()!;
          if (i > start.line) {
            ranges.push({
              startLine: start.line,
              endLine: i,
              kind: start.kind,
              isCollapsed: false,
            });
          }
        }
      }

      // Import blocks
      if (trimmed.startsWith('import ') && i > 0 && !lines[i - 1].trim().startsWith('import ')) {
        let endLine = i;
        while (endLine < lines.length - 1 && lines[endLine + 1].trim().startsWith('import ')) {
          endLine++;
        }
        if (endLine > i) {
          ranges.push({
            startLine: i,
            endLine,
            kind: 'imports',
            isCollapsed: false,
          });
        }
      }

      // Region comments
      if (trimmed.startsWith('// #region') || trimmed.startsWith('//#region')) {
        stack.push({ line: i, indent: 0, kind: 'region' });
      }
      if (trimmed.startsWith('// #endregion') || trimmed.startsWith('//#endregion')) {
        const regionStart = stack.pop();
        if (regionStart && regionStart.kind === 'region') {
          ranges.push({
            startLine: regionStart.line,
            endLine: i,
            kind: 'region',
            isCollapsed: false,
          });
        }
      }
    }

    // Cache results
    this.foldingCache.set(cacheKey, ranges);
    
    return ranges;
  }

  private detectFoldingKind(line: string): FoldingKind {
    if (line.includes('function') || line.includes('def ') || line.includes('fn ')) {
      return 'function';
    }
    if (line.includes('class ') || line.includes('struct ') || line.includes('interface ')) {
      return 'class';
    }
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('#')) {
      return 'comment';
    }
    return 'block';
  }

  // Bracket Matching
  findMatchingBracket(bufferId: string, line: number, column: number): BracketPair | null {
    const content = this.getContent(bufferId);
    const lines = content.split('\n');
    
    if (line < 0 || line >= lines.length) return null;
    
    const char = lines[line][column];
    const brackets: Record<string, string> = {
      '(': ')', ')': '(',
      '[': ']', ']': '[',
      '{': '}', '}': '{',
      '<': '>', '>': '<',
    };

    if (!brackets[char]) return null;

    const isOpen = ['(', '[', '{', '<'].includes(char);
    const matchChar = brackets[char];
    let depth = 0;

    if (isOpen) {
      // Search forward
      for (let l = line; l < lines.length; l++) {
        const startCol = l === line ? column : 0;
        for (let c = startCol; c < lines[l].length; c++) {
          const ch = lines[l][c];
          if (ch === char) depth++;
          else if (ch === matchChar) {
            depth--;
            if (depth === 0) {
              return {
                open: { line, column, char },
                close: { line: l, column: c, char: matchChar },
                depth: 0,
              };
            }
          }
        }
      }
    } else {
      // Search backward
      for (let l = line; l >= 0; l--) {
        const startCol = l === line ? column : lines[l].length - 1;
        for (let c = startCol; c >= 0; c--) {
          const ch = lines[l][c];
          if (ch === char) depth++;
          else if (ch === matchChar) {
            depth--;
            if (depth === 0) {
              return {
                open: { line: l, column: c, char: matchChar },
                close: { line, column, char },
                depth: 0,
              };
            }
          }
        }
      }
    }

    return null;
  }

  findAllBracketPairs(bufferId: string): BracketPair[] {
    const content = this.getContent(bufferId);
    const lines = content.split('\n');
    const pairs: BracketPair[] = [];
    const stack: { line: number; column: number; char: string; depth: number }[] = [];
    const brackets: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
    
    let globalDepth = 0;

    for (let l = 0; l < lines.length; l++) {
      for (let c = 0; c < lines[l].length; c++) {
        const char = lines[l][c];
        
        if (brackets[char]) {
          globalDepth++;
          stack.push({ line: l, column: c, char, depth: globalDepth });
        } else if (Object.values(brackets).includes(char)) {
          const openBracket = Object.keys(brackets).find(k => brackets[k] === char);
          for (let i = stack.length - 1; i >= 0; i--) {
            if (stack[i].char === openBracket) {
              const open = stack.splice(i, 1)[0];
              pairs.push({
                open: { line: open.line, column: open.column, char: open.char },
                close: { line: l, column: c, char },
                depth: open.depth,
              });
              break;
            }
          }
        }
      }
    }

    return pairs;
  }

  // Search
  search(bufferId: string, query: string, options: {
    caseSensitive?: boolean;
    wholeWord?: boolean;
    regex?: boolean;
  } = {}): SearchResult[] {
    const content = this.getContent(bufferId);
    const lines = content.split('\n');
    const results: SearchResult[] = [];

    let pattern: RegExp;
    try {
      if (options.regex) {
        pattern = new RegExp(query, options.caseSensitive ? 'g' : 'gi');
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordPattern = options.wholeWord ? `\\b${escaped}\\b` : escaped;
        pattern = new RegExp(wordPattern, options.caseSensitive ? 'g' : 'gi');
      }
    } catch {
      return [];
    }

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const lineText = lines[lineNum];
      let match;
      
      while ((match = pattern.exec(lineText)) !== null) {
        results.push({
          line: lineNum,
          column: match.index,
          length: match[0].length,
          matchText: match[0],
          context: lineText,
        });
      }
    }

    return results;
  }

  // Diff
  diff(bufferId1: string, bufferId2: string): DiffHunk[] {
    const content1 = this.getContent(bufferId1);
    const content2 = this.getContent(bufferId2);
    
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');
    
    const hunks: DiffHunk[] = [];
    
    // Simple diff algorithm (LCS-based would be better for production)
    let i = 0, j = 0;
    
    while (i < lines1.length || j < lines2.length) {
      if (i >= lines1.length) {
        // Additions at the end
        hunks.push({
          oldStart: i + 1,
          oldLines: 0,
          newStart: j + 1,
          newLines: lines2.length - j,
          content: lines2.slice(j).map(l => `+ ${l}`),
          type: 'add',
        });
        break;
      }
      
      if (j >= lines2.length) {
        // Deletions at the end
        hunks.push({
          oldStart: i + 1,
          oldLines: lines1.length - i,
          newStart: j + 1,
          newLines: 0,
          content: lines1.slice(i).map(l => `- ${l}`),
          type: 'remove',
        });
        break;
      }
      
      if (lines1[i] === lines2[j]) {
        // Context line
        i++;
        j++;
      } else {
        // Find next matching line
        let foundOld = lines1.slice(i + 1).findIndex(l => l === lines2[j]);
        let foundNew = lines2.slice(j + 1).findIndex(l => l === lines1[i]);
        
        if (foundOld >= 0 && (foundNew < 0 || foundOld <= foundNew)) {
          // Lines deleted
          hunks.push({
            oldStart: i + 1,
            oldLines: foundOld + 1,
            newStart: j + 1,
            newLines: 0,
            content: lines1.slice(i, i + foundOld + 1).map(l => `- ${l}`),
            type: 'remove',
          });
          i += foundOld + 1;
        } else if (foundNew >= 0) {
          // Lines added
          hunks.push({
            oldStart: i + 1,
            oldLines: 0,
            newStart: j + 1,
            newLines: foundNew + 1,
            content: lines2.slice(j, j + foundNew + 1).map(l => `+ ${l}`),
            type: 'add',
          });
          j += foundNew + 1;
        } else {
          // Changed line
          hunks.push({
            oldStart: i + 1,
            oldLines: 1,
            newStart: j + 1,
            newLines: 1,
            content: [`- ${lines1[i]}`, `+ ${lines2[j]}`],
            type: 'remove',
          });
          i++;
          j++;
        }
      }
    }

    return hunks;
  }

  // Metrics
  computeMetrics(bufferId: string): TextMetrics {
    const content = this.getContent(bufferId);
    const lines = content.split('\n');
    const buffer = this.buffers.get(bufferId);
    
    let blankLines = 0;
    let commentLines = 0;
    let longestLine = 0;
    let totalChars = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      totalChars += line.length;
      
      if (line.length > longestLine) {
        longestLine = line.length;
      }
      
      if (trimmed === '') {
        blankLines++;
      } else if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
        commentLines++;
      }
    }

    return {
      totalLines: lines.length,
      totalCharacters: totalChars,
      totalBytes: buffer?.byteLength || 0,
      longestLine,
      averageLineLength: Math.round(totalChars / lines.length),
      blankLines,
      codeLines: lines.length - blankLines - commentLines,
      commentLines,
    };
  }

  // Large File Handling
  createVirtualizedView(bufferId: string, viewport: ViewportInfo): {
    lines: LineInfo[];
    totalLines: number;
    hasMore: boolean;
  } {
    const buffer = this.buffers.get(bufferId);
    if (!buffer) {
      return { lines: [], totalLines: 0, hasMore: false };
    }

    const lines = this.getLines(bufferId, viewport.startLine, viewport.endLine);
    
    return {
      lines,
      totalLines: buffer.lineCount,
      hasMore: viewport.endLine < buffer.lineCount - 1,
    };
  }

  // WASM Status
  isReady(): boolean {
    return this.wasmModule.ready;
  }

  getMemoryUsage(): { used: number; total: number } {
    if (!this.wasmModule.memory) {
      return { used: 0, total: 0 };
    }
    
    const total = this.wasmModule.memory.buffer.byteLength;
    let used = 0;
    
    this.buffers.forEach(buffer => {
      used += buffer.byteLength;
    });

    return { used, total };
  }

  // Event System
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(cb => cb({ type: event, data }));
    this.listeners.get('*')?.forEach(cb => cb({ type: event, data }));
  }
}

export const wasmTextEngine = new WebAssemblyTextEngine();
export default wasmTextEngine;
