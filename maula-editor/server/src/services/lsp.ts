/**
 * Language Server Protocol (LSP) Service
 * Provides intelligent code analysis, autocomplete, diagnostics, and more
 */

import { logger } from '../utils/logger';

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
  additionalTextEdits?: { range: Range; newText: string }[];
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

export interface FormatOptions {
  tabSize: number;
  insertSpaces: boolean;
  trimTrailingWhitespace?: boolean;
  insertFinalNewline?: boolean;
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

// ============================================================================
// Language-specific Analysis
// ============================================================================

// TypeScript/JavaScript Keywords and Built-ins
const TS_KEYWORDS = [
  'abstract', 'any', 'as', 'async', 'await', 'boolean', 'break', 'case', 'catch',
  'class', 'const', 'constructor', 'continue', 'debugger', 'declare', 'default',
  'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for',
  'from', 'function', 'get', 'if', 'implements', 'import', 'in', 'instanceof',
  'interface', 'keyof', 'let', 'module', 'namespace', 'never', 'new', 'null',
  'number', 'object', 'of', 'package', 'private', 'protected', 'public', 'readonly',
  'require', 'return', 'set', 'static', 'string', 'super', 'switch', 'symbol',
  'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined', 'unique', 'unknown',
  'var', 'void', 'while', 'with', 'yield',
];

const TS_BUILT_INS = [
  'Array', 'Boolean', 'Date', 'Error', 'Function', 'JSON', 'Map', 'Math', 'Number',
  'Object', 'Promise', 'Proxy', 'Reflect', 'RegExp', 'Set', 'String', 'Symbol',
  'WeakMap', 'WeakSet', 'console', 'document', 'window', 'fetch', 'setTimeout',
  'setInterval', 'clearTimeout', 'clearInterval', 'parseInt', 'parseFloat',
];

const REACT_HOOKS = [
  'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo',
  'useRef', 'useImperativeHandle', 'useLayoutEffect', 'useDebugValue', 'useId',
  'useDeferredValue', 'useTransition', 'useSyncExternalStore', 'useInsertionEffect',
];

const PYTHON_KEYWORDS = [
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
  'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for',
  'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or',
  'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
];

const PYTHON_BUILT_INS = [
  'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes', 'callable',
  'chr', 'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod',
  'enumerate', 'eval', 'exec', 'filter', 'float', 'format', 'frozenset', 'getattr',
  'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input', 'int', 'isinstance',
  'issubclass', 'iter', 'len', 'list', 'locals', 'map', 'max', 'memoryview', 'min',
  'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'property', 'range',
  'repr', 'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod',
  'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip',
];

// ============================================================================
// LSP Service Class
// ============================================================================

export class LSPService {
  private documentSymbols: Map<string, SymbolInfo[]> = new Map();
  private documentDiagnostics: Map<string, Diagnostic[]> = new Map();

  constructor() {
    logger.info('LSP Service initialized');
  }

  // ============================================================================
  // Diagnostics (Linting)
  // ============================================================================

  public analyzeDiagnostics(
    uri: string,
    content: string,
    language: string
  ): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const lines = content.split('\n');

    switch (language) {
      case 'typescript':
      case 'typescriptreact':
      case 'javascript':
      case 'javascriptreact':
        this.analyzeTypeScript(lines, diagnostics);
        break;
      case 'python':
        this.analyzePython(lines, diagnostics);
        break;
      case 'css':
      case 'scss':
        this.analyzeCSS(lines, diagnostics);
        break;
      case 'html':
        this.analyzeHTML(lines, diagnostics);
        break;
      case 'json':
        this.analyzeJSON(content, diagnostics);
        break;
    }

    this.documentDiagnostics.set(uri, diagnostics);
    return diagnostics;
  }

  private analyzeTypeScript(lines: string[], diagnostics: Diagnostic[]): void {
    let braceCount = 0;
    let parenCount = 0;
    let bracketCount = 0;
    let inString = false;
    let stringChar = '';
    let inMultiLineComment = false;

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();

      // Skip comments
      if (trimmedLine.startsWith('//')) return;
      if (trimmedLine.startsWith('/*')) inMultiLineComment = true;
      if (trimmedLine.endsWith('*/')) {
        inMultiLineComment = false;
        return;
      }
      if (inMultiLineComment) return;

      // Check for console.log in production code
      if (trimmedLine.includes('console.log') && !trimmedLine.startsWith('//')) {
        const col = line.indexOf('console.log');
        diagnostics.push({
          range: {
            start: { line: lineIndex, column: col },
            end: { line: lineIndex, column: col + 11 },
          },
          severity: 'warning',
          code: 'no-console',
          source: 'eslint',
          message: 'Unexpected console statement',
          quickFixes: [{
            title: 'Remove console.log',
            kind: 'quickfix',
            edit: {
              changes: {
                '': [{
                  range: {
                    start: { line: lineIndex, column: 0 },
                    end: { line: lineIndex, column: line.length },
                  },
                  newText: line.replace(/console\.log\([^)]*\);?/, ''),
                }],
              },
            },
          }],
        });
      }

      // Check for 'var' usage (prefer const/let)
      if (/\bvar\s+/.test(line)) {
        const col = line.indexOf('var');
        diagnostics.push({
          range: {
            start: { line: lineIndex, column: col },
            end: { line: lineIndex, column: col + 3 },
          },
          severity: 'warning',
          code: 'no-var',
          source: 'eslint',
          message: "Unexpected 'var', use 'let' or 'const' instead",
          quickFixes: [{
            title: "Replace 'var' with 'const'",
            kind: 'quickfix',
            edit: {
              changes: {
                '': [{
                  range: {
                    start: { line: lineIndex, column: col },
                    end: { line: lineIndex, column: col + 3 },
                  },
                  newText: 'const',
                }],
              },
            },
          }],
        });
      }

      // Check for == instead of ===
      if (/[^=!<>]==[^=]/.test(line) || /^==/.test(line)) {
        const col = line.indexOf('==');
        if (col !== -1 && line[col + 2] !== '=') {
          diagnostics.push({
            range: {
              start: { line: lineIndex, column: col },
              end: { line: lineIndex, column: col + 2 },
            },
            severity: 'warning',
            code: 'eqeqeq',
            source: 'eslint',
            message: "Expected '===' and instead saw '=='",
            quickFixes: [{
              title: "Replace '==' with '==='",
              kind: 'quickfix',
              edit: {
                changes: {
                  '': [{
                    range: {
                      start: { line: lineIndex, column: col },
                      end: { line: lineIndex, column: col + 2 },
                    },
                    newText: '===',
                  }],
                },
              },
            }],
          });
        }
      }

      // Check for != instead of !==
      if (/[^!]!=[^=]/.test(line) || /^!=/.test(line)) {
        const col = line.indexOf('!=');
        if (col !== -1 && line[col + 2] !== '=') {
          diagnostics.push({
            range: {
              start: { line: lineIndex, column: col },
              end: { line: lineIndex, column: col + 2 },
            },
            severity: 'warning',
            code: 'eqeqeq',
            source: 'eslint',
            message: "Expected '!==' and instead saw '!='",
            quickFixes: [{
              title: "Replace '!=' with '!=='",
              kind: 'quickfix',
              edit: {
                changes: {
                  '': [{
                    range: {
                      start: { line: lineIndex, column: col },
                      end: { line: lineIndex, column: col + 2 },
                    },
                    newText: '!==',
                  }],
                },
              },
            }],
          });
        }
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
          source: 'eslint',
          message: 'Trailing whitespace',
          quickFixes: [{
            title: 'Remove trailing whitespace',
            kind: 'quickfix',
            edit: {
              changes: {
                '': [{
                  range: {
                    start: { line: lineIndex, column: 0 },
                    end: { line: lineIndex, column: line.length },
                  },
                  newText: line.trimEnd(),
                }],
              },
            },
          }],
        });
      }

      // Check for async without await
      if (trimmedLine.includes('async') && trimmedLine.includes('function')) {
        // Simple check - would need more sophisticated parsing for accuracy
        // This is a simplified check
      }

      // Count brackets for balance checking
      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (inString) {
          if (char === stringChar && line[i - 1] !== '\\') {
            inString = false;
          }
          continue;
        }

        if (char === '"' || char === "'" || char === '`') {
          inString = true;
          stringChar = char;
          continue;
        }

        switch (char) {
          case '{': braceCount++; break;
          case '}': braceCount--; break;
          case '(': parenCount++; break;
          case ')': parenCount--; break;
          case '[': bracketCount++; break;
          case ']': bracketCount--; break;
        }
      }

      // Check for unused imports (simplified)
      if (trimmedLine.startsWith('import ') && trimmedLine.includes('from')) {
        // Would need full AST parsing for accurate unused import detection
      }
    });

    // Report unbalanced brackets at end
    if (braceCount !== 0) {
      diagnostics.push({
        range: {
          start: { line: lines.length - 1, column: 0 },
          end: { line: lines.length - 1, column: lines[lines.length - 1]?.length || 0 },
        },
        severity: 'error',
        code: 'bracket-mismatch',
        source: 'lsp',
        message: braceCount > 0 ? 'Missing closing brace' : 'Extra closing brace',
      });
    }
  }

  private analyzePython(lines: string[], diagnostics: Diagnostic[]): void {
    let indentStack: number[] = [0];

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;

      // Check indentation
      const indent = line.search(/\S/);
      if (indent !== -1 && indent % 4 !== 0) {
        diagnostics.push({
          range: {
            start: { line: lineIndex, column: 0 },
            end: { line: lineIndex, column: indent },
          },
          severity: 'warning',
          code: 'E111',
          source: 'pycodestyle',
          message: 'Indentation is not a multiple of four',
        });
      }

      // Check for print statements (Python 2 style)
      if (/^print\s+[^(]/.test(trimmedLine)) {
        diagnostics.push({
          range: {
            start: { line: lineIndex, column: 0 },
            end: { line: lineIndex, column: 5 },
          },
          severity: 'error',
          code: 'E999',
          source: 'pycodestyle',
          message: "Missing parentheses in call to 'print'",
        });
      }

      // Check for lines too long (> 79 chars)
      if (line.length > 79) {
        diagnostics.push({
          range: {
            start: { line: lineIndex, column: 79 },
            end: { line: lineIndex, column: line.length },
          },
          severity: 'warning',
          code: 'E501',
          source: 'pycodestyle',
          message: `Line too long (${line.length} > 79 characters)`,
        });
      }

      // Check for multiple statements on one line
      if (trimmedLine.includes(';') && !trimmedLine.includes("'") && !trimmedLine.includes('"')) {
        const col = line.indexOf(';');
        diagnostics.push({
          range: {
            start: { line: lineIndex, column: col },
            end: { line: lineIndex, column: col + 1 },
          },
          severity: 'warning',
          code: 'E702',
          source: 'pycodestyle',
          message: 'Multiple statements on one line (semicolon)',
        });
      }

      // Check for trailing whitespace
      if (line.endsWith(' ') || line.endsWith('\t')) {
        diagnostics.push({
          range: {
            start: { line: lineIndex, column: line.trimEnd().length },
            end: { line: lineIndex, column: line.length },
          },
          severity: 'warning',
          code: 'W291',
          source: 'pycodestyle',
          message: 'Trailing whitespace',
        });
      }
    });
  }

  private analyzeCSS(lines: string[], diagnostics: Diagnostic[]): void {
    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();

      // Check for !important
      if (trimmedLine.includes('!important')) {
        const col = line.indexOf('!important');
        diagnostics.push({
          range: {
            start: { line: lineIndex, column: col },
            end: { line: lineIndex, column: col + 10 },
          },
          severity: 'warning',
          code: 'no-important',
          source: 'stylelint',
          message: "Avoid using '!important'",
        });
      }

      // Check for vendor prefixes (might need autoprefixer)
      const vendorPrefixes = ['-webkit-', '-moz-', '-ms-', '-o-'];
      for (const prefix of vendorPrefixes) {
        if (trimmedLine.includes(prefix)) {
          const col = line.indexOf(prefix);
          diagnostics.push({
            range: {
              start: { line: lineIndex, column: col },
              end: { line: lineIndex, column: col + prefix.length },
            },
            severity: 'info',
            code: 'vendor-prefix',
            source: 'stylelint',
            message: 'Consider using autoprefixer instead of manual vendor prefixes',
          });
          break;
        }
      }
    });
  }

  private analyzeHTML(lines: string[], diagnostics: Diagnostic[]): void {
    const tagStack: { tag: string; line: number }[] = [];
    const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];

    lines.forEach((line, lineIndex) => {
      // Check for deprecated tags
      const deprecatedTags = ['center', 'font', 'strike', 'marquee', 'blink'];
      for (const tag of deprecatedTags) {
        const regex = new RegExp(`<${tag}[>\\s]`, 'i');
        if (regex.test(line)) {
          const col = line.toLowerCase().indexOf(`<${tag}`);
          diagnostics.push({
            range: {
              start: { line: lineIndex, column: col },
              end: { line: lineIndex, column: col + tag.length + 1 },
            },
            severity: 'warning',
            code: 'no-deprecated-tag',
            source: 'htmlhint',
            message: `Tag <${tag}> is deprecated`,
          });
        }
      }

      // Check for missing alt on img tags
      if (/<img\s/.test(line) && !/alt=/.test(line)) {
        const col = line.indexOf('<img');
        diagnostics.push({
          range: {
            start: { line: lineIndex, column: col },
            end: { line: lineIndex, column: col + 4 },
          },
          severity: 'warning',
          code: 'img-alt',
          source: 'htmlhint',
          message: 'Images should have an alt attribute for accessibility',
        });
      }
    });
  }

  private analyzeJSON(content: string, diagnostics: Diagnostic[]): void {
    try {
      JSON.parse(content);
    } catch (error: any) {
      // Parse error message to get position
      const match = error.message.match(/position (\d+)/);
      let line = 0;
      let column = 0;
      
      if (match) {
        const position = parseInt(match[1]);
        const beforeError = content.substring(0, position);
        const lines = beforeError.split('\n');
        line = lines.length - 1;
        column = lines[lines.length - 1].length;
      }

      diagnostics.push({
        range: {
          start: { line, column },
          end: { line, column: column + 1 },
        },
        severity: 'error',
        code: 'json-parse-error',
        source: 'json',
        message: error.message,
      });
    }
  }

  // ============================================================================
  // Autocomplete
  // ============================================================================

  public getCompletions(
    uri: string,
    content: string,
    position: Position,
    language: string
  ): CompletionItem[] {
    const lines = content.split('\n');
    const currentLine = lines[position.line] || '';
    const textBeforeCursor = currentLine.substring(0, position.column);
    const wordMatch = textBeforeCursor.match(/[\w$]+$/);
    const prefix = wordMatch ? wordMatch[0] : '';

    let completions: CompletionItem[] = [];

    switch (language) {
      case 'typescript':
      case 'typescriptreact':
      case 'javascript':
      case 'javascriptreact':
        completions = this.getTypeScriptCompletions(content, position, prefix, language.includes('react'));
        break;
      case 'python':
        completions = this.getPythonCompletions(content, position, prefix);
        break;
      case 'css':
      case 'scss':
        completions = this.getCSSCompletions(content, position, prefix);
        break;
      case 'html':
        completions = this.getHTMLCompletions(content, position, prefix);
        break;
    }

    // Filter by prefix
    if (prefix) {
      completions = completions.filter(c => 
        c.label.toLowerCase().startsWith(prefix.toLowerCase())
      );
    }

    return completions.slice(0, 50); // Limit results
  }

  private getTypeScriptCompletions(
    content: string,
    position: Position,
    prefix: string,
    isReact: boolean
  ): CompletionItem[] {
    const completions: CompletionItem[] = [];

    // Keywords
    TS_KEYWORDS.forEach(keyword => {
      completions.push({
        label: keyword,
        kind: CompletionItemKind.Keyword,
        insertText: keyword,
        detail: 'Keyword',
      });
    });

    // Built-ins
    TS_BUILT_INS.forEach(builtin => {
      completions.push({
        label: builtin,
        kind: CompletionItemKind.Class,
        insertText: builtin,
        detail: 'Built-in',
      });
    });

    // React hooks if React file
    if (isReact) {
      REACT_HOOKS.forEach(hook => {
        completions.push({
          label: hook,
          kind: CompletionItemKind.Function,
          insertText: hook,
          detail: 'React Hook',
          documentation: `React ${hook} hook`,
        });
      });
    }

    // Extract symbols from current file
    const symbols = this.extractSymbols(content, 'typescript');
    symbols.forEach(symbol => {
      completions.push({
        label: symbol.name,
        kind: this.symbolKindToCompletionKind(symbol.kind),
        insertText: symbol.name,
        detail: SymbolKind[symbol.kind],
      });
    });

    // Snippets
    completions.push(
      {
        label: 'func',
        kind: CompletionItemKind.Snippet,
        insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}',
        insertTextFormat: 'snippet',
        detail: 'Function declaration',
        documentation: 'Creates a function declaration',
      },
      {
        label: 'afunc',
        kind: CompletionItemKind.Snippet,
        insertText: 'async function ${1:name}(${2:params}): Promise<${3:void}> {\n\t$0\n}',
        insertTextFormat: 'snippet',
        detail: 'Async function declaration',
      },
      {
        label: 'arrow',
        kind: CompletionItemKind.Snippet,
        insertText: 'const ${1:name} = (${2:params}) => {\n\t$0\n};',
        insertTextFormat: 'snippet',
        detail: 'Arrow function',
      },
      {
        label: 'iface',
        kind: CompletionItemKind.Snippet,
        insertText: 'interface ${1:Name} {\n\t${2:property}: ${3:type};\n}',
        insertTextFormat: 'snippet',
        detail: 'Interface declaration',
      },
      {
        label: 'trycatch',
        kind: CompletionItemKind.Snippet,
        insertText: 'try {\n\t$1\n} catch (error) {\n\t$2\n}',
        insertTextFormat: 'snippet',
        detail: 'Try-catch block',
      },
      {
        label: 'import',
        kind: CompletionItemKind.Snippet,
        insertText: "import { $1 } from '$2';",
        insertTextFormat: 'snippet',
        detail: 'Import statement',
      },
      {
        label: 'log',
        kind: CompletionItemKind.Snippet,
        insertText: "console.log('$1', $2);",
        insertTextFormat: 'snippet',
        detail: 'Console.log',
      }
    );

    if (isReact) {
      completions.push(
        {
          label: 'rfc',
          kind: CompletionItemKind.Snippet,
          insertText: "import React from 'react';\n\ninterface ${1:Component}Props {\n\t$2\n}\n\nexport const ${1:Component}: React.FC<${1:Component}Props> = ({ $3 }) => {\n\treturn (\n\t\t<div>\n\t\t\t$0\n\t\t</div>\n\t);\n};",
          insertTextFormat: 'snippet',
          detail: 'React Functional Component',
        },
        {
          label: 'useState',
          kind: CompletionItemKind.Snippet,
          insertText: 'const [${1:state}, set${2:State}] = useState<${3:type}>(${4:initial});',
          insertTextFormat: 'snippet',
          detail: 'useState hook',
        },
        {
          label: 'useEffect',
          kind: CompletionItemKind.Snippet,
          insertText: 'useEffect(() => {\n\t$1\n\treturn () => {\n\t\t$2\n\t};\n}, [$3]);',
          insertTextFormat: 'snippet',
          detail: 'useEffect hook',
        }
      );
    }

    return completions;
  }

  private getPythonCompletions(
    content: string,
    position: Position,
    prefix: string
  ): CompletionItem[] {
    const completions: CompletionItem[] = [];

    // Keywords
    PYTHON_KEYWORDS.forEach(keyword => {
      completions.push({
        label: keyword,
        kind: CompletionItemKind.Keyword,
        insertText: keyword,
        detail: 'Keyword',
      });
    });

    // Built-ins
    PYTHON_BUILT_INS.forEach(builtin => {
      completions.push({
        label: builtin,
        kind: CompletionItemKind.Function,
        insertText: builtin,
        detail: 'Built-in',
      });
    });

    // Snippets
    completions.push(
      {
        label: 'def',
        kind: CompletionItemKind.Snippet,
        insertText: 'def ${1:name}(${2:params}):\n\t${3:pass}',
        insertTextFormat: 'snippet',
        detail: 'Function definition',
      },
      {
        label: 'class',
        kind: CompletionItemKind.Snippet,
        insertText: 'class ${1:Name}:\n\tdef __init__(self${2:, params}):\n\t\t${3:pass}',
        insertTextFormat: 'snippet',
        detail: 'Class definition',
      },
      {
        label: 'main',
        kind: CompletionItemKind.Snippet,
        insertText: "if __name__ == '__main__':\n\t${1:main()}",
        insertTextFormat: 'snippet',
        detail: 'Main entry point',
      },
      {
        label: 'try',
        kind: CompletionItemKind.Snippet,
        insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as e:\n\t${3:pass}',
        insertTextFormat: 'snippet',
        detail: 'Try-except block',
      },
      {
        label: 'with',
        kind: CompletionItemKind.Snippet,
        insertText: "with ${1:open('file')} as ${2:f}:\n\t${3:pass}",
        insertTextFormat: 'snippet',
        detail: 'With statement',
      }
    );

    return completions;
  }

  private getCSSCompletions(
    content: string,
    position: Position,
    prefix: string
  ): CompletionItem[] {
    const properties = [
      'display', 'position', 'top', 'right', 'bottom', 'left', 'width', 'height',
      'min-width', 'max-width', 'min-height', 'max-height', 'margin', 'padding',
      'border', 'border-radius', 'background', 'background-color', 'color',
      'font-size', 'font-weight', 'font-family', 'line-height', 'text-align',
      'flex', 'flex-direction', 'justify-content', 'align-items', 'gap',
      'grid', 'grid-template-columns', 'grid-template-rows', 'grid-gap',
      'transition', 'transform', 'animation', 'opacity', 'z-index', 'overflow',
      'cursor', 'box-shadow', 'text-shadow', 'filter', 'backdrop-filter',
    ];

    return properties.map(prop => ({
      label: prop,
      kind: CompletionItemKind.Property,
      insertText: `${prop}: $1;`,
      insertTextFormat: 'snippet' as const,
      detail: 'CSS Property',
    }));
  }

  private getHTMLCompletions(
    content: string,
    position: Position,
    prefix: string
  ): CompletionItem[] {
    const tags = [
      'div', 'span', 'p', 'a', 'button', 'input', 'form', 'label',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'footer', 'nav',
      'section', 'article', 'aside', 'main', 'ul', 'ol', 'li',
      'table', 'tr', 'td', 'th', 'thead', 'tbody', 'img', 'video', 'audio',
      'canvas', 'svg', 'iframe', 'script', 'style', 'link', 'meta',
    ];

    return tags.map(tag => ({
      label: tag,
      kind: CompletionItemKind.Property,
      insertText: `<${tag}>$1</${tag}>`,
      insertTextFormat: 'snippet' as const,
      detail: 'HTML Tag',
    }));
  }

  private symbolKindToCompletionKind(kind: SymbolKind): CompletionItemKind {
    switch (kind) {
      case SymbolKind.Function:
      case SymbolKind.Method:
        return CompletionItemKind.Function;
      case SymbolKind.Class:
        return CompletionItemKind.Class;
      case SymbolKind.Interface:
        return CompletionItemKind.Interface;
      case SymbolKind.Variable:
        return CompletionItemKind.Variable;
      case SymbolKind.Constant:
        return CompletionItemKind.Constant;
      case SymbolKind.Enum:
        return CompletionItemKind.Enum;
      default:
        return CompletionItemKind.Text;
    }
  }

  // ============================================================================
  // Hover Information
  // ============================================================================

  public getHoverInfo(
    uri: string,
    content: string,
    position: Position,
    language: string
  ): HoverInfo | null {
    const lines = content.split('\n');
    const line = lines[position.line];
    if (!line) return null;

    // Get word at position
    const wordMatch = this.getWordAtPosition(line, position.column);
    if (!wordMatch) return null;

    const { word, start, end } = wordMatch;
    const contents: string[] = [];

    // Check if it's a keyword
    if (language === 'typescript' || language === 'javascript' ||
        language === 'typescriptreact' || language === 'javascriptreact') {
      if (TS_KEYWORDS.includes(word)) {
        contents.push(`**Keyword:** \`${word}\``);
        contents.push(this.getKeywordDescription(word));
      } else if (TS_BUILT_INS.includes(word)) {
        contents.push(`**Built-in:** \`${word}\``);
        contents.push(this.getBuiltInDescription(word));
      } else if (REACT_HOOKS.includes(word)) {
        contents.push(`**React Hook:** \`${word}\``);
        contents.push(this.getReactHookDescription(word));
      }
    }

    if (language === 'python') {
      if (PYTHON_KEYWORDS.includes(word)) {
        contents.push(`**Keyword:** \`${word}\``);
      } else if (PYTHON_BUILT_INS.includes(word)) {
        contents.push(`**Built-in Function:** \`${word}\``);
      }
    }

    // Try to find definition in file
    const symbols = this.extractSymbols(content, language);
    const symbol = symbols.find(s => s.name === word);
    if (symbol) {
      contents.push(`**${SymbolKind[symbol.kind]}:** \`${word}\``);
      contents.push(`Defined at line ${symbol.range.start.line + 1}`);
    }

    if (contents.length === 0) return null;

    return {
      contents,
      range: {
        start: { line: position.line, column: start },
        end: { line: position.line, column: end },
      },
    };
  }

  private getWordAtPosition(line: string, column: number): { word: string; start: number; end: number } | null {
    let start = column;
    let end = column;

    while (start > 0 && /[\w$]/.test(line[start - 1])) {
      start--;
    }
    while (end < line.length && /[\w$]/.test(line[end])) {
      end++;
    }

    if (start === end) return null;

    return {
      word: line.substring(start, end),
      start,
      end,
    };
  }

  private getKeywordDescription(keyword: string): string {
    const descriptions: Record<string, string> = {
      'async': 'Declares an asynchronous function',
      'await': 'Pauses execution until a Promise is resolved',
      'const': 'Declares a constant variable',
      'let': 'Declares a block-scoped variable',
      'function': 'Declares a function',
      'class': 'Declares a class',
      'interface': 'Declares an interface type',
      'type': 'Declares a type alias',
      'import': 'Imports modules or bindings',
      'export': 'Exports modules or bindings',
      'return': 'Returns a value from a function',
      'if': 'Conditional statement',
      'for': 'Loop statement',
      'while': 'Loop statement',
    };
    return descriptions[keyword] || 'TypeScript/JavaScript keyword';
  }

  private getBuiltInDescription(name: string): string {
    const descriptions: Record<string, string> = {
      'Array': 'Built-in array constructor',
      'Object': 'Built-in object constructor',
      'Promise': 'Represents asynchronous operation',
      'Map': 'Collection of keyed data items',
      'Set': 'Collection of unique values',
      'console': 'Console object for logging',
      'JSON': 'JSON parsing and serialization',
      'Math': 'Mathematical constants and functions',
      'Date': 'Date and time handling',
      'fetch': 'Fetch API for network requests',
    };
    return descriptions[name] || 'Built-in object or function';
  }

  private getReactHookDescription(hook: string): string {
    const descriptions: Record<string, string> = {
      'useState': 'State Hook - adds state to function components',
      'useEffect': 'Effect Hook - performs side effects',
      'useContext': 'Context Hook - subscribes to React context',
      'useReducer': 'Reducer Hook - manages complex state logic',
      'useCallback': 'Callback Hook - memoizes callbacks',
      'useMemo': 'Memo Hook - memoizes expensive computations',
      'useRef': 'Ref Hook - creates mutable ref object',
      'useLayoutEffect': 'Layout Effect Hook - runs synchronously after DOM mutations',
    };
    return descriptions[hook] || 'React Hook';
  }

  // ============================================================================
  // Go to Definition
  // ============================================================================

  public getDefinition(
    uri: string,
    content: string,
    position: Position,
    language: string
  ): DefinitionResult | null {
    const lines = content.split('\n');
    const line = lines[position.line];
    if (!line) return null;

    const wordMatch = this.getWordAtPosition(line, position.column);
    if (!wordMatch) return null;

    const { word } = wordMatch;
    const symbols = this.extractSymbols(content, language);
    const symbol = symbols.find(s => s.name === word);

    if (symbol) {
      return {
        uri,
        range: symbol.selectionRange,
      };
    }

    return null;
  }

  // ============================================================================
  // Find References
  // ============================================================================

  public findReferences(
    uri: string,
    content: string,
    position: Position,
    language: string
  ): ReferenceResult[] {
    const lines = content.split('\n');
    const line = lines[position.line];
    if (!line) return [];

    const wordMatch = this.getWordAtPosition(line, position.column);
    if (!wordMatch) return [];

    const { word } = wordMatch;
    const references: ReferenceResult[] = [];

    // Search for all occurrences of the word
    const wordRegex = new RegExp(`\\b${word}\\b`, 'g');
    
    lines.forEach((lineContent, lineIndex) => {
      let match;
      while ((match = wordRegex.exec(lineContent)) !== null) {
        references.push({
          uri,
          range: {
            start: { line: lineIndex, column: match.index },
            end: { line: lineIndex, column: match.index + word.length },
          },
          isDefinition: lineIndex === position.line && match.index === wordMatch.start,
        });
      }
    });

    return references;
  }

  // ============================================================================
  // Signature Help
  // ============================================================================

  public getSignatureHelp(
    uri: string,
    content: string,
    position: Position,
    language: string
  ): SignatureHelp | null {
    const lines = content.split('\n');
    const line = lines[position.line];
    if (!line) return null;

    const textBeforeCursor = line.substring(0, position.column);
    
    // Find the function call
    const funcCallMatch = textBeforeCursor.match(/(\w+)\s*\([^)]*$/);
    if (!funcCallMatch) return null;

    const funcName = funcCallMatch[1];

    // Get signature info based on known functions
    const signature = this.getKnownSignature(funcName, language);
    if (!signature) return null;

    // Count parameters
    const paramsText = textBeforeCursor.substring(textBeforeCursor.lastIndexOf('(') + 1);
    const paramCount = (paramsText.match(/,/g) || []).length;

    return {
      signatures: [signature],
      activeSignature: 0,
      activeParameter: Math.min(paramCount, signature.parameters.length - 1),
    };
  }

  private getKnownSignature(funcName: string, language: string): SignatureInformation | null {
    const signatures: Record<string, SignatureInformation> = {
      'useState': {
        label: 'useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>]',
        documentation: 'Returns a stateful value, and a function to update it.',
        parameters: [
          { label: 'initialState', documentation: 'The initial state value or a function that returns it' },
        ],
      },
      'useEffect': {
        label: 'useEffect(effect: EffectCallback, deps?: DependencyList): void',
        documentation: 'Accepts a function that contains imperative, possibly effectful code.',
        parameters: [
          { label: 'effect', documentation: 'Function containing side effect logic' },
          { label: 'deps', documentation: 'Optional array of dependencies' },
        ],
      },
      'useCallback': {
        label: 'useCallback<T extends Function>(callback: T, deps: DependencyList): T',
        documentation: 'Returns a memoized callback.',
        parameters: [
          { label: 'callback', documentation: 'The callback function to memoize' },
          { label: 'deps', documentation: 'Array of dependencies' },
        ],
      },
      'useMemo': {
        label: 'useMemo<T>(factory: () => T, deps: DependencyList): T',
        documentation: 'Returns a memoized value.',
        parameters: [
          { label: 'factory', documentation: 'Function that computes the value' },
          { label: 'deps', documentation: 'Array of dependencies' },
        ],
      },
      'fetch': {
        label: 'fetch(input: RequestInfo, init?: RequestInit): Promise<Response>',
        documentation: 'Fetches a resource from the network.',
        parameters: [
          { label: 'input', documentation: 'URL or Request object' },
          { label: 'init', documentation: 'Optional request options' },
        ],
      },
      'setTimeout': {
        label: 'setTimeout(handler: TimerHandler, timeout?: number, ...arguments: any[]): number',
        documentation: 'Sets a timer which executes a function once after the timer expires.',
        parameters: [
          { label: 'handler', documentation: 'Function to execute' },
          { label: 'timeout', documentation: 'Delay in milliseconds' },
          { label: '...arguments', documentation: 'Additional arguments passed to handler' },
        ],
      },
      'map': {
        label: 'map<U>(callbackfn: (value: T, index: number, array: T[]) => U): U[]',
        documentation: 'Creates a new array with results of calling a function on every element.',
        parameters: [
          { label: 'callbackfn', documentation: 'Function that produces an element of the new Array' },
        ],
      },
      'filter': {
        label: 'filter(predicate: (value: T, index: number, array: T[]) => boolean): T[]',
        documentation: 'Creates a new array with elements that pass the test.',
        parameters: [
          { label: 'predicate', documentation: 'Function to test each element' },
        ],
      },
      'reduce': {
        label: 'reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U',
        documentation: 'Applies a function against an accumulator and each element to reduce to a single value.',
        parameters: [
          { label: 'callbackfn', documentation: 'Function to execute on each element' },
          { label: 'initialValue', documentation: 'Initial value for the accumulator' },
        ],
      },
    };

    return signatures[funcName] || null;
  }

  // ============================================================================
  // Symbol Extraction
  // ============================================================================

  public extractSymbols(content: string, language: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    const lines = content.split('\n');

    switch (language) {
      case 'typescript':
      case 'typescriptreact':
      case 'javascript':
      case 'javascriptreact':
        this.extractTypeScriptSymbols(lines, symbols);
        break;
      case 'python':
        this.extractPythonSymbols(lines, symbols);
        break;
    }

    return symbols;
  }

  private extractTypeScriptSymbols(lines: string[], symbols: SymbolInfo[]): void {
    const patterns = [
      { regex: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/, kind: SymbolKind.Function },
      { regex: /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/, kind: SymbolKind.Function },
      { regex: /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/, kind: SymbolKind.Class },
      { regex: /(?:export\s+)?interface\s+(\w+)/, kind: SymbolKind.Interface },
      { regex: /(?:export\s+)?type\s+(\w+)/, kind: SymbolKind.Interface },
      { regex: /(?:export\s+)?enum\s+(\w+)/, kind: SymbolKind.Enum },
      { regex: /(?:export\s+)?const\s+(\w+)\s*[:=](?!\s*(?:async\s+)?\()/, kind: SymbolKind.Constant },
    ];

    lines.forEach((line, lineIndex) => {
      for (const { regex, kind } of patterns) {
        const match = line.match(regex);
        if (match) {
          const name = match[1];
          const column = line.indexOf(name);
          symbols.push({
            name,
            kind,
            range: {
              start: { line: lineIndex, column: 0 },
              end: { line: lineIndex, column: line.length },
            },
            selectionRange: {
              start: { line: lineIndex, column },
              end: { line: lineIndex, column: column + name.length },
            },
          });
          break;
        }
      }
    });
  }

  private extractPythonSymbols(lines: string[], symbols: SymbolInfo[]): void {
    const patterns = [
      { regex: /^(?:async\s+)?def\s+(\w+)/, kind: SymbolKind.Function },
      { regex: /^class\s+(\w+)/, kind: SymbolKind.Class },
    ];

    lines.forEach((line, lineIndex) => {
      const trimmed = line.trimStart();
      for (const { regex, kind } of patterns) {
        const match = trimmed.match(regex);
        if (match) {
          const name = match[1];
          const column = line.indexOf(name);
          symbols.push({
            name,
            kind,
            range: {
              start: { line: lineIndex, column: 0 },
              end: { line: lineIndex, column: line.length },
            },
            selectionRange: {
              start: { line: lineIndex, column },
              end: { line: lineIndex, column: column + name.length },
            },
          });
          break;
        }
      }
    });
  }

  // ============================================================================
  // Code Formatting
  // ============================================================================

  public formatDocument(
    content: string,
    language: string,
    options: FormatOptions
  ): TextEdit[] {
    const edits: TextEdit[] = [];
    const lines = content.split('\n');
    let formattedContent = '';

    switch (language) {
      case 'typescript':
      case 'typescriptreact':
      case 'javascript':
      case 'javascriptreact':
        formattedContent = this.formatTypeScript(content, options);
        break;
      case 'json':
        formattedContent = this.formatJSON(content, options);
        break;
      case 'css':
      case 'scss':
        formattedContent = this.formatCSS(content, options);
        break;
      case 'html':
        formattedContent = this.formatHTML(content, options);
        break;
      case 'python':
        formattedContent = this.formatPython(content, options);
        break;
      default:
        formattedContent = content;
    }

    // Return full document edit
    if (formattedContent !== content) {
      edits.push({
        range: {
          start: { line: 0, column: 0 },
          end: { line: lines.length - 1, column: lines[lines.length - 1]?.length || 0 },
        },
        newText: formattedContent,
      });
    }

    return edits;
  }

  private formatTypeScript(content: string, options: FormatOptions): string {
    const lines = content.split('\n');
    const indent = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
    let indentLevel = 0;
    const result: string[] = [];

    for (let line of lines) {
      let trimmed = line.trim();

      // Adjust indent for closing brackets at start of line
      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // Build indented line
      if (trimmed) {
        result.push(indent.repeat(indentLevel) + trimmed);
      } else {
        result.push('');
      }

      // Adjust indent for next line
      const openCount = (trimmed.match(/[{[(]/g) || []).length;
      const closeCount = (trimmed.match(/[}\])]/g) || []).length;
      indentLevel += openCount - closeCount;
      indentLevel = Math.max(0, indentLevel);

      // Handle specific patterns that don't use brackets
      if (trimmed.endsWith(':') && !trimmed.includes('?') && !trimmed.includes('return')) {
        // Could be object property with value on next line
      }
    }

    // Trim trailing whitespace
    if (options.trimTrailingWhitespace) {
      for (let i = 0; i < result.length; i++) {
        result[i] = result[i].trimEnd();
      }
    }

    // Insert final newline
    let formatted = result.join('\n');
    if (options.insertFinalNewline && !formatted.endsWith('\n')) {
      formatted += '\n';
    }

    return formatted;
  }

  private formatJSON(content: string, options: FormatOptions): string {
    try {
      const parsed = JSON.parse(content);
      const indent = options.insertSpaces ? options.tabSize : '\t';
      return JSON.stringify(parsed, null, indent);
    } catch {
      return content;
    }
  }

  private formatCSS(content: string, options: FormatOptions): string {
    const indent = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
    let result = content;

    // Format selectors
    result = result.replace(/\s*{\s*/g, ' {\n' + indent);
    result = result.replace(/\s*}\s*/g, '\n}\n\n');
    result = result.replace(/;\s*/g, ';\n' + indent);
    result = result.replace(/\n\s*\n/g, '\n');
    result = result.replace(new RegExp(indent + '}', 'g'), '}');

    if (options.trimTrailingWhitespace) {
      result = result.split('\n').map(l => l.trimEnd()).join('\n');
    }

    return result.trim();
  }

  private formatHTML(content: string, options: FormatOptions): string {
    const indent = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
    let result = content;

    // Simple formatting - add newlines around tags
    result = result.replace(/></g, '>\n<');
    
    // Indent nested tags
    const lines = result.split('\n');
    let indentLevel = 0;
    const formatted: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check for closing tags
      if (trimmed.startsWith('</')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      formatted.push(indent.repeat(indentLevel) + trimmed);

      // Check for opening tags (not self-closing)
      if (trimmed.match(/<[a-z][^/>]*>$/i) && !trimmed.match(/<(br|hr|img|input|meta|link|area|base|col|embed|source|track|wbr)/i)) {
        indentLevel++;
      }
    }

    return formatted.join('\n');
  }

  private formatPython(content: string, options: FormatOptions): string {
    const lines = content.split('\n');
    const result: string[] = [];

    for (const line of lines) {
      let formatted = line;

      // Trim trailing whitespace
      if (options.trimTrailingWhitespace) {
        formatted = formatted.trimEnd();
      }

      result.push(formatted);
    }

    // Ensure two blank lines between top-level definitions
    // This is a simplified version

    let final = result.join('\n');
    if (options.insertFinalNewline && !final.endsWith('\n')) {
      final += '\n';
    }

    return final;
  }

  // ============================================================================
  // Refactoring
  // ============================================================================

  public getRefactorActions(
    uri: string,
    content: string,
    range: Range,
    language: string
  ): RefactorAction[] {
    const actions: RefactorAction[] = [];
    const lines = content.split('\n');
    const selectedText = this.getTextInRange(lines, range);

    // Extract Function/Method
    if (selectedText.trim() && range.start.line !== range.end.line) {
      actions.push({
        title: 'Extract to function',
        kind: 'refactor.extract.function',
        command: {
          title: 'Extract Function',
          command: 'lsp.extractFunction',
          arguments: [uri, range, selectedText],
        },
      });
    }

    // Extract Variable
    if (selectedText.trim() && !selectedText.includes('\n')) {
      actions.push({
        title: 'Extract to constant',
        kind: 'refactor.extract.constant',
        command: {
          title: 'Extract Constant',
          command: 'lsp.extractConstant',
          arguments: [uri, range, selectedText],
        },
      });
    }

    // Rename Symbol
    const wordMatch = this.getWordAtPosition(lines[range.start.line] || '', range.start.column);
    if (wordMatch) {
      actions.push({
        title: `Rename '${wordMatch.word}'`,
        kind: 'refactor.rename',
        command: {
          title: 'Rename Symbol',
          command: 'lsp.rename',
          arguments: [uri, range.start, wordMatch.word],
        },
      });
    }

    // Convert arrow function to regular function
    if (selectedText.includes('=>')) {
      actions.push({
        title: 'Convert to regular function',
        kind: 'refactor.rewrite.arrow-to-function',
        command: {
          title: 'Convert to Function',
          command: 'lsp.convertArrowToFunction',
          arguments: [uri, range],
        },
      });
    }

    // Convert regular function to arrow function
    if (selectedText.includes('function ')) {
      actions.push({
        title: 'Convert to arrow function',
        kind: 'refactor.rewrite.function-to-arrow',
        command: {
          title: 'Convert to Arrow Function',
          command: 'lsp.convertFunctionToArrow',
          arguments: [uri, range],
        },
      });
    }

    return actions;
  }

  private getTextInRange(lines: string[], range: Range): string {
    if (range.start.line === range.end.line) {
      return lines[range.start.line]?.substring(range.start.column, range.end.column) || '';
    }

    const result: string[] = [];
    for (let i = range.start.line; i <= range.end.line; i++) {
      const line = lines[i] || '';
      if (i === range.start.line) {
        result.push(line.substring(range.start.column));
      } else if (i === range.end.line) {
        result.push(line.substring(0, range.end.column));
      } else {
        result.push(line);
      }
    }
    return result.join('\n');
  }

  // ============================================================================
  // Rename Symbol
  // ============================================================================

  public renameSymbol(
    uri: string,
    content: string,
    position: Position,
    newName: string,
    language: string
  ): WorkspaceEdit | null {
    const lines = content.split('\n');
    const line = lines[position.line];
    if (!line) return null;

    const wordMatch = this.getWordAtPosition(line, position.column);
    if (!wordMatch) return null;

    const { word } = wordMatch;
    const edits: TextEdit[] = [];
    const wordRegex = new RegExp(`\\b${word}\\b`, 'g');

    lines.forEach((lineContent, lineIndex) => {
      let match;
      while ((match = wordRegex.exec(lineContent)) !== null) {
        edits.push({
          range: {
            start: { line: lineIndex, column: match.index },
            end: { line: lineIndex, column: match.index + word.length },
          },
          newText: newName,
        });
      }
    });

    return {
      changes: {
        [uri]: edits,
      },
    };
  }
}

// Export singleton instance
export const lspService = new LSPService();
