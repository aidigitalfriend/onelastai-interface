/**
 * Professional Code Editor Component
 * Features:
 * - Syntax highlighting for 50+ languages
 * - Multi-cursor editing & smart selection
 * - LSP-like IntelliSense & completions
 * - Undo/Redo with history
 * - Large file support with optimizations
 * - Multiple themes (monokai, dracula, nord, etc.)
 * - Bracket pair colorization
 * - Code folding
 * - Find & Replace with regex
 * - Go to line/symbol
 * - Extension system integration
 * - AI Copilot realtime suggestions
 * - AI Extension tool-based control
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import Editor, { OnMount, OnChange, Monaco } from '@monaco-editor/react';
import type { editor, languages, IDisposable, MarkerSeverity } from 'monaco-editor';
import { useStore } from '../store/useStore';
import { EditorTheme } from '../types';
import { 
  codeIntelligence, 
  Diagnostic, 
  CompletionItem, 
  HoverInfo, 
  DefinitionResult,
  SignatureHelp,
  getLanguageFromFilename 
} from '../services/codeIntelligence';
import { extensionHost, connectEditorToExtensions } from '../services/extensionHost';
import { extensionEvents } from '../services/extensions';
import { aiCopilot, connectCopilotToEditor, injectCopilotStyles } from '../services/aiCopilotExtension';
import { aiExtension, createEditorCapabilities } from '../services/aiExtension';
import { CopilotStatus } from './CopilotStatus';

interface CodeEditorProps {
  className?: string;
  onDiagnosticsChange?: (diagnostics: Diagnostic[]) => void;
  onNavigateToLine?: (line: number, column: number) => void;
}

// Custom themes registry
const CUSTOM_THEMES: Record<string, editor.IStandaloneThemeData> = {
  'monokai': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '88846f', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'f92672' },
      { token: 'string', foreground: 'e6db74' },
      { token: 'number', foreground: 'ae81ff' },
      { token: 'type', foreground: '66d9ef', fontStyle: 'italic' },
      { token: 'function', foreground: 'a6e22e' },
      { token: 'variable', foreground: 'f8f8f2' },
      { token: 'constant', foreground: 'ae81ff' },
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#3e3d32',
      'editor.selectionBackground': '#49483e',
      'editorCursor.foreground': '#f8f8f0',
    }
  },
  'dracula': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff79c6' },
      { token: 'string', foreground: 'f1fa8c' },
      { token: 'number', foreground: 'bd93f9' },
      { token: 'type', foreground: '8be9fd', fontStyle: 'italic' },
      { token: 'function', foreground: '50fa7b' },
      { token: 'variable', foreground: 'f8f8f2' },
    ],
    colors: {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#44475a',
      'editor.selectionBackground': '#44475a',
      'editorCursor.foreground': '#f8f8f0',
    }
  },
  'github-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff7b72' },
      { token: 'string', foreground: 'a5d6ff' },
      { token: 'number', foreground: '79c0ff' },
      { token: 'type', foreground: 'ffa657' },
      { token: 'function', foreground: 'd2a8ff' },
      { token: 'variable', foreground: 'c9d1d9' },
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#c9d1d9',
      'editor.lineHighlightBackground': '#161b22',
      'editor.selectionBackground': '#264f78',
      'editorCursor.foreground': '#c9d1d9',
    }
  },
  'one-dark-pro': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c678dd' },
      { token: 'string', foreground: '98c379' },
      { token: 'number', foreground: 'd19a66' },
      { token: 'type', foreground: 'e5c07b' },
      { token: 'function', foreground: '61afef' },
      { token: 'variable', foreground: 'e06c75' },
    ],
    colors: {
      'editor.background': '#282c34',
      'editor.foreground': '#abb2bf',
      'editor.lineHighlightBackground': '#2c313c',
      'editor.selectionBackground': '#3e4451',
      'editorCursor.foreground': '#528bff',
    }
  },
  'nord': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '616e88', fontStyle: 'italic' },
      { token: 'keyword', foreground: '81a1c1' },
      { token: 'string', foreground: 'a3be8c' },
      { token: 'number', foreground: 'b48ead' },
      { token: 'type', foreground: '8fbcbb' },
      { token: 'function', foreground: '88c0d0' },
      { token: 'variable', foreground: 'd8dee9' },
    ],
    colors: {
      'editor.background': '#2e3440',
      'editor.foreground': '#d8dee9',
      'editor.lineHighlightBackground': '#3b4252',
      'editor.selectionBackground': '#434c5e',
      'editorCursor.foreground': '#d8dee9',
    }
  },
  'solarized-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '586e75', fontStyle: 'italic' },
      { token: 'keyword', foreground: '859900' },
      { token: 'string', foreground: '2aa198' },
      { token: 'number', foreground: 'd33682' },
      { token: 'type', foreground: 'b58900' },
      { token: 'function', foreground: '268bd2' },
      { token: 'variable', foreground: '839496' },
    ],
    colors: {
      'editor.background': '#002b36',
      'editor.foreground': '#839496',
      'editor.lineHighlightBackground': '#073642',
      'editor.selectionBackground': '#073642',
      'editorCursor.foreground': '#839496',
    }
  },
  'material-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '546e7a', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c792ea' },
      { token: 'string', foreground: 'c3e88d' },
      { token: 'number', foreground: 'f78c6c' },
      { token: 'type', foreground: 'ffcb6b' },
      { token: 'function', foreground: '82aaff' },
      { token: 'variable', foreground: 'eeffff' },
    ],
    colors: {
      'editor.background': '#263238',
      'editor.foreground': '#eeffff',
      'editor.lineHighlightBackground': '#00000050',
      'editor.selectionBackground': '#80cbc420',
      'editorCursor.foreground': '#ffcc00',
    }
  },
};

// File icon mapping with colors
const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  tsx: { icon: '⚛', color: '#61dafb' },
  jsx: { icon: '⚛', color: '#61dafb' },
  ts: { icon: 'TS', color: '#3178c6' },
  js: { icon: 'JS', color: '#f7df1e' },
  py: { icon: '🐍', color: '#3776ab' },
  html: { icon: '◇', color: '#e34c26' },
  css: { icon: '#', color: '#264de4' },
  scss: { icon: '#', color: '#cc6699' },
  json: { icon: '{ }', color: '#cbcb41' },
  md: { icon: 'M↓', color: '#ffffff' },
  yaml: { icon: '⚙', color: '#cb171e' },
  yml: { icon: '⚙', color: '#cb171e' },
  xml: { icon: '◇', color: '#f16529' },
  svg: { icon: '◎', color: '#ffb13b' },
  sql: { icon: '⊞', color: '#e38c00' },
  sh: { icon: '$', color: '#4eaa25' },
  bash: { icon: '$', color: '#4eaa25' },
  go: { icon: 'Go', color: '#00add8' },
  rs: { icon: '⚙', color: '#dea584' },
  java: { icon: '☕', color: '#b07219' },
  cpp: { icon: 'C++', color: '#f34b7d' },
  c: { icon: 'C', color: '#555555' },
  php: { icon: '🐘', color: '#777bb4' },
  rb: { icon: '💎', color: '#cc342d' },
  swift: { icon: '🦅', color: '#ffac45' },
  kt: { icon: 'K', color: '#a97bff' },
  vue: { icon: 'V', color: '#41b883' },
  svelte: { icon: 'S', color: '#ff3e00' },
};

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  className = '',
  onDiagnosticsChange,
  onNavigateToLine,
}) => {
  const { 
    openFiles, 
    activeFileId, 
    updateFileContent, 
    closeFile, 
    setActiveFile, 
    editorSettings,
    files,
    createFile: storeCreateFile,
    openFile: storeOpenFile,
  } = useStore();
  
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const disposablesRef = useRef<IDisposable[]>([]);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [selectionInfo, setSelectionInfo] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeFile = openFiles.find(f => f.id === activeFileId);

  // Get file icon and color
  const getFileIcon = useCallback((name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return FILE_ICONS[ext] || { icon: '📄', color: '#858585' };
  }, []);

  // Initialize Monaco with custom themes and language services
  const handleEditorWillMount = useCallback((monaco: Monaco) => {
    // Register custom themes
    Object.entries(CUSTOM_THEMES).forEach(([themeName, themeData]) => {
      monaco.editor.defineTheme(themeName, themeData);
    });

    // Register completion provider for TypeScript/JavaScript
    const tsCompletions = [
      { label: 'console.log', kind: monaco.languages.CompletionItemKind.Function, insertText: 'console.log($1)', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Log output to console' },
      { label: 'async function', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'async function ${1:name}(${2:params}): Promise<${3:void}> {\n\t$0\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Async function declaration' },
      { label: 'interface', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'interface ${1:Name} {\n\t$0\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Interface declaration' },
      { label: 'useState', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'const [${1:state}, set${2:State}] = useState<${3:type}>(${4:initial})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'React useState hook' },
      { label: 'useEffect', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'useEffect(() => {\n\t$1\n\treturn () => {\n\t\t$2\n\t};\n}, [${3:deps}])', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'React useEffect hook' },
      { label: 'arrow function', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'const ${1:name} = (${2:params}) => {\n\t$0\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Arrow function' },
      { label: 'try-catch', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'try {\n\t$1\n} catch (error) {\n\t$2\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Try-catch block' },
    ];

    ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].forEach(lang => {
      monaco.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          return {
            suggestions: tsCompletions.map(item => ({ ...item, range })) as any[],
          };
        },
      });
    });

    // Register Python completions
    monaco.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        return {
          suggestions: [
            { label: 'def', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'def ${1:name}(${2:params}):\n\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Function definition', range },
            { label: 'class', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'class ${1:Name}:\n\tdef __init__(self${2:, params}):\n\t\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Class definition', range },
            { label: 'if __name__', kind: monaco.languages.CompletionItemKind.Snippet, insertText: "if __name__ == '__main__':\n\t${1:main()}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Main entry point', range },
          ] as any[],
        };
      },
    });

    monacoRef.current = monaco;
  }, []);

  // Handle editor mount
  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    editor.focus();

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({ line: e.position.lineNumber, column: e.position.column });
    });

    // Track selection
    editor.onDidChangeCursorSelection((e) => {
      const selection = e.selection;
      if (selection.isEmpty()) {
        setSelectionInfo('');
      } else {
        const selectedText = editor.getModel()?.getValueInRange(selection) || '';
        const lines = selectedText.split('\n').length;
        const chars = selectedText.length;
        setSelectionInfo(`${lines} lines, ${chars} chars selected`);
      }
    });

    // Register keyboard shortcuts for multi-cursor and smart selection
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
      editor.trigger('keyboard', 'editor.action.addSelectionToNextFindMatch', null);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => {
      editor.trigger('keyboard', 'editor.action.selectHighlights', null);
    });

    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.UpArrow, () => {
      editor.trigger('keyboard', 'editor.action.moveLinesUpAction', null);
    });

    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.DownArrow, () => {
      editor.trigger('keyboard', 'editor.action.moveLinesDownAction', null);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK, () => {
      editor.trigger('keyboard', 'editor.action.deleteLines', null);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      editor.trigger('keyboard', 'editor.action.commentLine', null);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      editor.trigger('keyboard', 'editor.action.formatDocument', null);
    });

    // ============================================================================
    // Extension System Integration
    // ============================================================================
    
    // Connect editor to extension host for realtime extension events
    connectEditorToExtensions(editor, monaco);
    
    // ============================================================================
    // AI Copilot Integration (Realtime Suggestions)
    // ============================================================================
    
    // Inject copilot CSS styles
    injectCopilotStyles();
    
    // Connect AI Copilot to editor
    connectCopilotToEditor(editor, monaco);
    
    // ============================================================================
    // AI Extension Integration (Tool-based Control)
    // ============================================================================
    
    // Create editor capabilities for AI Extension
    const editorCapabilities = createEditorCapabilities(
      editor,
      monaco,
      // File operations (simplified - connect to your file store)
      {
        openFile: async (path: string) => {
          // Find file in store and open it
          const findFileByPath = (fileList: any[], targetPath: string): any => {
            for (const file of fileList) {
              if (file.path === targetPath) {
                return file;
              }
              if (file.children) {
                const found = findFileByPath(file.children, targetPath);
                if (found) return found;
              }
            }
            return null;
          };
          const file = findFileByPath(files, path);
          if (file) {
            const openFileData = {
              id: file.id,
              name: file.name,
              path: file.path,
              content: file.content || '',
              language: file.language || 'plaintext',
              isDirty: false,
            };
            storeOpenFile(openFileData);
            return true;
          }
          return false;
        },
        createFile: async (path: string, content: string) => {
          // Create file in store
          const pathParts = path.split('/');
          const fileName = pathParts.pop() || path;
          const parentPath = pathParts.join('/');
          storeCreateFile(parentPath, fileName, content);
          return true;
        },
        deleteFile: async (path: string) => {
          // Delete file from store (this would need to be implemented in store)
          extensionEvents.emit('file:delete', { path });
          return true;
        },
        renameFile: async (oldPath: string, newPath: string) => {
          // Rename file in store (this would need to be implemented in store)
          extensionEvents.emit('file:rename', { oldPath, newPath });
          return true;
        },
        readFile: async (path: string) => {
          // Read from file store
          const findFileByPath = (fileList: any[], targetPath: string): any => {
            for (const file of fileList) {
              if (file.path === targetPath) {
                return file;
              }
              if (file.children) {
                const found = findFileByPath(file.children, targetPath);
                if (found) return found;
              }
            }
            return null;
          };
          const file = findFileByPath(files, path);
          return file ? file.content || '' : null;
        },
        listFiles: async (pattern?: string) => {
          // List files from store
          const getAllFiles = (fileList: any[]): string[] => {
            const result: string[] = [];
            for (const file of fileList) {
              if (file.type === 'file') {
                result.push(file.path);
              }
              if (file.children) {
                result.push(...getAllFiles(file.children));
              }
            }
            return result;
          };
          const allFiles = getAllFiles(files);
          if (pattern) {
            // Simple pattern matching
            return allFiles.filter(path => path.includes(pattern));
          }
          return allFiles;
        },
        getActiveFilePath: () => {
          const model = editor.getModel();
          return model?.uri?.path || null;
        },
      },
      // Terminal operations
      {
        executeCommand: async (command: string, cwd?: string) => {
          extensionEvents.emit('terminal:execute', { command, cwd });
          // Return dummy result - real impl would wait for terminal output
          return { stdout: '', stderr: '', exitCode: 0 };
        },
      },
      // UI operations
      {
        showNotification: (message: string, type: 'info' | 'warning' | 'error') => {
          extensionEvents.emit('ui:notification', { message, type });
        },
        showConfirmDialog: async (message: string, options?: string[]) => {
          // This would show a real dialog
          return confirm(message);
        },
      }
    );
    
    // Connect AI Extension to editor capabilities
    aiExtension.connect(editorCapabilities);
    console.log('[AI Extension] Connected to editor');
    
    // Emit editor.textChanged events for extensions
    editor.onDidChangeModelContent((e) => {
      const model = editor.getModel();
      if (model) {
        extensionEvents.emit('editor:textChanged', {
          content: model.getValue(),
          changes: e.changes.map(c => ({
            range: {
              startLine: c.range.startLineNumber,
              startColumn: c.range.startColumn,
              endLine: c.range.endLineNumber,
              endColumn: c.range.endColumn
            },
            text: c.text
          })),
          languageId: model.getLanguageId(),
          uri: model.uri.toString()
        });
      }
    });
    
    // Emit selection change events for extensions
    editor.onDidChangeCursorSelection((e) => {
      extensionEvents.emit('editor:selectionChanged', {
        selection: {
          startLine: e.selection.startLineNumber,
          startColumn: e.selection.startColumn,
          endLine: e.selection.endLineNumber,
          endColumn: e.selection.endColumn
        },
        secondarySelections: e.secondarySelections.map(s => ({
          startLine: s.startLineNumber,
          startColumn: s.startColumn,
          endLine: s.endLineNumber,
          endColumn: s.endColumn
        }))
      });
    });
    
    // Emit focus events for extensions
    editor.onDidFocusEditorText(() => {
      extensionEvents.emit('editor:focus', { focused: true });
    });
    
    editor.onDidBlurEditorText(() => {
      extensionEvents.emit('editor:focus', { focused: false });
    });
    
    // Emit scroll events for extensions (for features like minimap sync)
    editor.onDidScrollChange((e) => {
      extensionEvents.emit('editor:scroll', {
        scrollTop: e.scrollTop,
        scrollLeft: e.scrollLeft,
        scrollWidth: e.scrollWidth,
        scrollHeight: e.scrollHeight
      });
    });

    // ============================================================================
    // Code Intelligence Integration
    // ============================================================================

    // Convert Diagnostic severity to Monaco severity
    const getSeverity = (severity: string): MarkerSeverity => {
      const MarkerSeverity = monaco.MarkerSeverity;
      switch (severity) {
        case 'error': return MarkerSeverity.Error;
        case 'warning': return MarkerSeverity.Warning;
        case 'info': return MarkerSeverity.Info;
        case 'hint': return MarkerSeverity.Hint;
        default: return MarkerSeverity.Info;
      }
    };

    // Register LSP-powered Completion Provider
    const completionDisposable = monaco.languages.registerCompletionItemProvider(['typescript', 'javascript', 'typescriptreact', 'javascriptreact', 'python', 'css', 'scss', 'html', 'json'], {
      triggerCharacters: ['.', '(', '<', '/', '@', '#', ' '],
      provideCompletionItems: async (model, position, context) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        try {
          const language = model.getLanguageId();
          const uri = model.uri.toString();
          const content = model.getValue();
          
          const completions = await codeIntelligence.getCompletions(
            uri,
            content,
            language,
            { line: position.lineNumber - 1, column: position.column - 1 }
          );

          return {
            suggestions: completions.map(item => ({
              label: item.label,
              kind: getMonacoCompletionKind(monaco, item.kind),
              detail: item.detail || '',
              documentation: item.documentation,
              insertText: item.insertText || item.label,
              insertTextRules: item.insertText?.includes('$') 
                ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet 
                : undefined,
              sortText: item.sortText,
              filterText: item.filterText,
              range,
            })),
          };
        } catch (error) {
          console.error('Completion error:', error);
          return { suggestions: [] };
        }
      },
    });
    disposablesRef.current.push(completionDisposable);

    // Register Hover Provider
    const hoverDisposable = monaco.languages.registerHoverProvider(['typescript', 'javascript', 'typescriptreact', 'javascriptreact', 'python', 'css', 'scss', 'html'], {
      provideHover: async (model, position) => {
        try {
          const language = model.getLanguageId();
          const uri = model.uri.toString();
          const content = model.getValue();
          
          const hover = await codeIntelligence.getHoverInfo(
            uri,
            content,
            language,
            { line: position.lineNumber - 1, column: position.column - 1 }
          );

          if (!hover || hover.contents.length === 0) {
            return null;
          }

          return {
            contents: hover.contents.map(c => ({
              value: typeof c === 'string' ? c : c.value,
              isTrusted: true,
            })),
            range: hover.range ? {
              startLineNumber: hover.range.start.line + 1,
              startColumn: hover.range.start.column + 1,
              endLineNumber: hover.range.end.line + 1,
              endColumn: hover.range.end.column + 1,
            } : undefined,
          };
        } catch (error) {
          console.error('Hover error:', error);
          return null;
        }
      },
    });
    disposablesRef.current.push(hoverDisposable);

    // Register Definition Provider
    const definitionDisposable = monaco.languages.registerDefinitionProvider(['typescript', 'javascript', 'typescriptreact', 'javascriptreact', 'python'], {
      provideDefinition: async (model, position) => {
        try {
          const language = model.getLanguageId();
          const uri = model.uri.toString();
          const content = model.getValue();
          
          const definition = await codeIntelligence.getDefinition(
            uri,
            content,
            language,
            { line: position.lineNumber - 1, column: position.column - 1 }
          );

          if (!definition) {
            return null;
          }

          return {
            uri: model.uri,
            range: {
              startLineNumber: definition.range.start.line + 1,
              startColumn: definition.range.start.column + 1,
              endLineNumber: definition.range.end.line + 1,
              endColumn: definition.range.end.column + 1,
            },
          };
        } catch (error) {
          console.error('Definition error:', error);
          return null;
        }
      },
    });
    disposablesRef.current.push(definitionDisposable);

    // Register Reference Provider
    const referenceDisposable = monaco.languages.registerReferenceProvider(['typescript', 'javascript', 'typescriptreact', 'javascriptreact', 'python'], {
      provideReferences: async (model, position, context) => {
        try {
          const language = model.getLanguageId();
          const uri = model.uri.toString();
          const content = model.getValue();
          
          const references = await codeIntelligence.findReferences(
            uri,
            content,
            language,
            { line: position.lineNumber - 1, column: position.column - 1 }
          );

          return references.map(ref => ({
            uri: model.uri,
            range: {
              startLineNumber: ref.range.start.line + 1,
              startColumn: ref.range.start.column + 1,
              endLineNumber: ref.range.end.line + 1,
              endColumn: ref.range.end.column + 1,
            },
          }));
        } catch (error) {
          console.error('References error:', error);
          return [];
        }
      },
    });
    disposablesRef.current.push(referenceDisposable);

    // Register Signature Help Provider
    const signatureDisposable = monaco.languages.registerSignatureHelpProvider(['typescript', 'javascript', 'typescriptreact', 'javascriptreact', 'python'], {
      signatureHelpTriggerCharacters: ['(', ','],
      signatureHelpRetriggerCharacters: [','],
      provideSignatureHelp: async (model, position, token, context) => {
        try {
          const language = model.getLanguageId();
          const uri = model.uri.toString();
          const content = model.getValue();
          
          const signatureHelp = await codeIntelligence.getSignatureHelp(
            uri,
            content,
            language,
            { line: position.lineNumber - 1, column: position.column - 1 }
          );

          if (!signatureHelp || signatureHelp.signatures.length === 0) {
            return null;
          }

          return {
            value: {
              signatures: signatureHelp.signatures.map(sig => ({
                label: sig.label,
                documentation: sig.documentation,
                parameters: sig.parameters?.map(p => ({
                  label: p.label,
                  documentation: p.documentation,
                })) || [],
              })),
              activeSignature: signatureHelp.activeSignature || 0,
              activeParameter: signatureHelp.activeParameter || 0,
            },
            dispose: () => {},
          };
        } catch (error) {
          console.error('Signature help error:', error);
          return null;
        }
      },
    });
    disposablesRef.current.push(signatureDisposable);

    // Register Document Formatting Provider
    const formatDisposable = monaco.languages.registerDocumentFormattingEditProvider(['typescript', 'javascript', 'typescriptreact', 'javascriptreact', 'python', 'css', 'scss', 'html', 'json'], {
      provideDocumentFormattingEdits: async (model) => {
        try {
          const language = model.getLanguageId();
          const uri = model.uri.toString();
          const content = model.getValue();
          
          const formatted = await codeIntelligence.formatDocument(uri, content, language);
          
          if (formatted === content) {
            return [];
          }

          return [{
            range: model.getFullModelRange(),
            text: formatted,
          }];
        } catch (error) {
          console.error('Format error:', error);
          return [];
        }
      },
    });
    disposablesRef.current.push(formatDisposable);

    // Register Code Action Provider (Quick Fixes, Refactoring)
    const codeActionDisposable = monaco.languages.registerCodeActionProvider(['typescript', 'javascript', 'typescriptreact', 'javascriptreact'], {
      provideCodeActions: async (model, range, context) => {
        try {
          const language = model.getLanguageId();
          const uri = model.uri.toString();
          const content = model.getValue();
          
          const refactorActions = await codeIntelligence.getRefactorActions(
            uri,
            content,
            language,
            {
              start: { line: range.startLineNumber - 1, column: range.startColumn - 1 },
              end: { line: range.endLineNumber - 1, column: range.endColumn - 1 },
            }
          );

          const actions = refactorActions.map(action => ({
            title: action.title,
            kind: action.kind || 'refactor',
            diagnostics: [],
            edit: action.edit ? {
              edits: Object.entries(action.edit.changes).flatMap(([fileUri, edits]) => 
                edits.map(edit => ({
                  resource: model.uri,
                  textEdit: {
                    range: {
                      startLineNumber: edit.range.start.line + 1,
                      startColumn: edit.range.start.column + 1,
                      endLineNumber: edit.range.end.line + 1,
                      endColumn: edit.range.end.column + 1,
                    },
                    text: edit.newText,
                  },
                  versionId: model.getVersionId(),
                }))
              ),
            } : undefined,
          }));

          return { actions, dispose: () => {} };
        } catch (error) {
          console.error('Code action error:', error);
          return { actions: [], dispose: () => {} };
        }
      },
    });
    disposablesRef.current.push(codeActionDisposable);

  }, []);

  // Helper to convert completion kind to Monaco kind
  const getMonacoCompletionKind = useCallback((monaco: Monaco, kind?: string): number => {
    const kinds: Record<string, number> = {
      'Text': monaco.languages.CompletionItemKind.Text,
      'Method': monaco.languages.CompletionItemKind.Method,
      'Function': monaco.languages.CompletionItemKind.Function,
      'Constructor': monaco.languages.CompletionItemKind.Constructor,
      'Field': monaco.languages.CompletionItemKind.Field,
      'Variable': monaco.languages.CompletionItemKind.Variable,
      'Class': monaco.languages.CompletionItemKind.Class,
      'Interface': monaco.languages.CompletionItemKind.Interface,
      'Module': monaco.languages.CompletionItemKind.Module,
      'Property': monaco.languages.CompletionItemKind.Property,
      'Unit': monaco.languages.CompletionItemKind.Unit,
      'Value': monaco.languages.CompletionItemKind.Value,
      'Enum': monaco.languages.CompletionItemKind.Enum,
      'Keyword': monaco.languages.CompletionItemKind.Keyword,
      'Snippet': monaco.languages.CompletionItemKind.Snippet,
      'Color': monaco.languages.CompletionItemKind.Color,
      'File': monaco.languages.CompletionItemKind.File,
      'Reference': monaco.languages.CompletionItemKind.Reference,
      'Folder': monaco.languages.CompletionItemKind.Folder,
      'EnumMember': monaco.languages.CompletionItemKind.EnumMember,
      'Constant': monaco.languages.CompletionItemKind.Constant,
      'Struct': monaco.languages.CompletionItemKind.Struct,
      'Event': monaco.languages.CompletionItemKind.Event,
      'Operator': monaco.languages.CompletionItemKind.Operator,
      'TypeParameter': monaco.languages.CompletionItemKind.TypeParameter,
    };
    return kinds[kind || 'Text'] || monaco.languages.CompletionItemKind.Text;
  }, []);

  // Run diagnostics analysis when file content changes
  useEffect(() => {
    if (!activeFile || !monacoRef.current || !editorRef.current) {
      return;
    }

    // Clear previous timeout
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    // Debounced analysis
    analysisTimeoutRef.current = setTimeout(async () => {
      const monaco = monacoRef.current!;
      const editor = editorRef.current!;
      const model = editor.getModel();
      
      if (!model) return;

      setIsAnalyzing(true);
      
      try {
        const language = getLanguageFromFilename(activeFile.name);
        const uri = activeFile.path;
        
        const diagnostics = await codeIntelligence.analyzeDiagnostics(
          uri,
          activeFile.content,
          language
        );

        // Convert to Monaco markers
        const markers = diagnostics.map(d => ({
          severity: ({
            'error': monaco.MarkerSeverity.Error,
            'warning': monaco.MarkerSeverity.Warning,
            'info': monaco.MarkerSeverity.Info,
            'hint': monaco.MarkerSeverity.Hint,
          })[d.severity] || monaco.MarkerSeverity.Info,
          message: d.message,
          startLineNumber: d.range.start.line + 1,
          startColumn: d.range.start.column + 1,
          endLineNumber: d.range.end.line + 1,
          endColumn: d.range.end.column + 1,
          source: d.source || 'Code Intelligence',
          code: d.code,
        }));

        // Set markers on the model
        monaco.editor.setModelMarkers(model, 'code-intelligence', markers);

        // Notify parent component
        if (onDiagnosticsChange) {
          onDiagnosticsChange(diagnostics);
        }
      } catch (error) {
        console.error('Diagnostics analysis error:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }, 500);

    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [activeFile?.id, activeFile?.content, onDiagnosticsChange]);

  // Cleanup disposables on unmount
  useEffect(() => {
    return () => {
      disposablesRef.current.forEach(d => d.dispose());
      disposablesRef.current = [];
    };
  }, []);

  // Handle content changes
  const handleEditorChange: OnChange = useCallback((value) => {
    if (activeFileId && value !== undefined) {
      updateFileContent(activeFileId, value);
    }
  }, [activeFileId, updateFileContent]);

  // Update editor options when settings change
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const ed = editorRef.current;
      
      // Apply theme
      monacoRef.current.editor.setTheme(editorSettings.theme);
      
      // Apply all editor options
      ed.updateOptions({
        fontSize: editorSettings.fontSize,
        fontFamily: editorSettings.fontFamily,
        tabSize: editorSettings.tabSize,
        wordWrap: editorSettings.wordWrap ? 'on' : 'off',
        minimap: { enabled: editorSettings.minimap },
        lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
        cursorStyle: editorSettings.cursorStyle,
        cursorBlinking: editorSettings.cursorBlinking,
        smoothScrolling: editorSettings.smoothScrolling,
        mouseWheelZoom: editorSettings.mouseWheelZoom,
        multiCursorModifier: editorSettings.multiCursorModifier,
        columnSelection: editorSettings.columnSelection,
        quickSuggestions: editorSettings.quickSuggestions,
        suggestOnTriggerCharacters: editorSettings.suggestOnTriggerCharacters,
        acceptSuggestionOnEnter: editorSettings.acceptSuggestionOnEnter,
        parameterHints: { enabled: editorSettings.parameterHints },
        autoClosingBrackets: editorSettings.autoClosingBrackets,
        autoClosingQuotes: editorSettings.autoClosingQuotes,
        autoIndent: editorSettings.autoIndent,
        formatOnPaste: editorSettings.formatOnPaste,
        formatOnType: editorSettings.formatOnType,
        renderWhitespace: editorSettings.renderWhitespace,
        renderControlCharacters: editorSettings.renderControlCharacters,
        renderLineHighlight: editorSettings.renderLineHighlight,
        guides: editorSettings.guides,
        largeFileOptimizations: editorSettings.largeFileOptimizations,
        maxTokenizationLineLength: editorSettings.maxTokenizationLineLength,
      });
    }
  }, [editorSettings]);

  // Focus editor when active file changes
  useEffect(() => {
    if (editorRef.current && activeFile) {
      editorRef.current.focus();
    }
  }, [activeFileId, activeFile]);

  // Editor options computed from settings
  const editorOptions = useMemo((): editor.IStandaloneEditorConstructionOptions => ({
    fontSize: editorSettings.fontSize,
    fontFamily: editorSettings.fontFamily,
    fontLigatures: true,
    tabSize: editorSettings.tabSize,
    wordWrap: editorSettings.wordWrap ? 'on' : 'off',
    minimap: { 
      enabled: editorSettings.minimap,
      scale: 1,
      showSlider: 'mouseover',
    },
    lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
    
    // Cursor
    cursorStyle: editorSettings.cursorStyle,
    cursorBlinking: editorSettings.cursorBlinking,
    cursorSmoothCaretAnimation: 'on',
    
    // Scrolling
    smoothScrolling: editorSettings.smoothScrolling,
    mouseWheelZoom: editorSettings.mouseWheelZoom,
    scrollBeyondLastLine: false,
    
    // Multi-cursor
    multiCursorModifier: editorSettings.multiCursorModifier,
    columnSelection: editorSettings.columnSelection,
    
    // IntelliSense
    quickSuggestions: editorSettings.quickSuggestions,
    suggestOnTriggerCharacters: editorSettings.suggestOnTriggerCharacters,
    acceptSuggestionOnEnter: editorSettings.acceptSuggestionOnEnter,
    parameterHints: { enabled: editorSettings.parameterHints },
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showClasses: true,
      showFunctions: true,
      showVariables: true,
      showConstants: true,
      showInterfaces: true,
      showModules: true,
      showProperties: true,
      showEvents: true,
      showOperators: true,
      showUnits: true,
      showValues: true,
      showEnumMembers: true,
      insertMode: 'insert',
      filterGraceful: true,
      snippetsPreventQuickSuggestions: false,
    },
    
    // Auto features
    autoClosingBrackets: editorSettings.autoClosingBrackets,
    autoClosingQuotes: editorSettings.autoClosingQuotes,
    autoIndent: editorSettings.autoIndent,
    formatOnPaste: editorSettings.formatOnPaste,
    formatOnType: editorSettings.formatOnType,
    autoSurround: 'languageDefined',
    
    // Display
    renderWhitespace: editorSettings.renderWhitespace,
    renderControlCharacters: editorSettings.renderControlCharacters,
    renderLineHighlight: editorSettings.renderLineHighlight,
    bracketPairColorization: { enabled: editorSettings.bracketPairColorization },
    guides: editorSettings.guides,
    
    // Code folding
    folding: true,
    foldingStrategy: 'indentation',
    foldingHighlight: true,
    showFoldingControls: 'mouseover',
    
    // Find & Replace
    find: {
      addExtraSpaceOnTop: false,
      autoFindInSelection: 'multiline',
      seedSearchStringFromSelection: 'selection',
    },
    
    // Misc
    automaticLayout: true,
    padding: { top: 8, bottom: 8 },
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },
    
    // Performance
    largeFileOptimizations: editorSettings.largeFileOptimizations,
    maxTokenizationLineLength: editorSettings.maxTokenizationLineLength,
    
    // Links
    links: true,
  }), [editorSettings]);

  return (
    <div className={`flex flex-col h-full bg-vscode-bg ${className}`}>
      {/* Tab Bar */}
      <div className="flex items-center h-8 bg-vscode-sidebar border-b border-vscode-border overflow-x-auto scrollbar-thin">
        {openFiles.map((file) => {
          const { icon, color } = getFileIcon(file.name);
          return (
            <div
              key={file.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 border-r border-vscode-border cursor-pointer min-w-fit text-xs group
                ${file.id === activeFileId 
                  ? 'bg-vscode-bg text-white border-t-2 border-t-vscode-accent -mt-[1px]' 
                  : 'text-vscode-textMuted hover:text-white hover:bg-vscode-hover'}`}
              onClick={() => setActiveFile(file.id)}
            >
              <span style={{ color }} className="text-[10px] font-bold">{icon}</span>
              <span className="whitespace-nowrap">{file.name}</span>
              {file.isDirty && <span className="w-2 h-2 rounded-full bg-vscode-accent" />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.id);
                }}
                className="ml-1 p-0.5 text-vscode-textMuted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
        {openFiles.length === 0 && (
          <div className="px-3 py-1.5 text-vscode-textMuted text-xs">
            No files open
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      {activeFile && (
        <div className="flex items-center h-6 px-3 bg-vscode-bg border-b border-vscode-border/50 text-[10px] text-vscode-textMuted">
          <span className="hover:text-white cursor-pointer">{activeFile.path.split('/').slice(0, -1).join(' › ')}</span>
          <span className="mx-1">›</span>
          <span className="text-white">{activeFile.name}</span>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 relative">
        {activeFile ? (
          <Editor
            height="100%"
            language={activeFile.language}
            value={activeFile.content}
            theme={editorSettings.theme}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            beforeMount={handleEditorWillMount}
            options={editorOptions}
            loading={
              <div className="h-full flex items-center justify-center bg-vscode-bg">
                <div className="flex items-center gap-2 text-vscode-textMuted">
                  <div className="w-4 h-4 border-2 border-vscode-accent/30 border-t-vscode-accent rounded-full animate-spin" />
                  <span className="text-sm">Loading editor...</span>
                </div>
              </div>
            }
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-vscode-bg text-vscode-textMuted">
            <div className="text-center max-w-md">
              <svg className="w-16 h-16 mx-auto mb-4 text-vscode-accent/30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              <h2 className="text-lg font-medium text-white mb-2">AI Digital Friend Zone</h2>
              <p className="text-sm mb-4">Select a file to edit or create from templates</p>
              <div className="flex flex-wrap justify-center gap-2 text-[10px]">
                <kbd className="px-2 py-1 bg-vscode-sidebar rounded border border-vscode-border">Ctrl+P</kbd>
                <span>Quick Open</span>
                <kbd className="px-2 py-1 bg-vscode-sidebar rounded border border-vscode-border">Ctrl+Shift+P</kbd>
                <span>Commands</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between h-6 px-3 bg-vscode-sidebar border-t border-vscode-border text-[10px] text-vscode-textMuted">
        <div className="flex items-center gap-3">
          {activeFile && (
            <>
              <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
              {selectionInfo && <span className="text-vscode-accent">{selectionInfo}</span>}
              {isAnalyzing && (
                <span className="flex items-center gap-1 text-vscode-accent">
                  <span className="w-2 h-2 border border-vscode-accent border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeFile && (
            <>
              <span className="hover:text-white cursor-pointer">{activeFile.language}</span>
              <span>UTF-8</span>
              <span>Spaces: {editorSettings.tabSize}</span>
              <span className="flex items-center gap-1 text-green-400" title="Code Intelligence Active">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                LSP
              </span>
              <CopilotStatus />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
