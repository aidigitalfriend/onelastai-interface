/**
 * MonacoEditor — Full Monaco editor with multi-file, multi-tab support
 * Gorgeous dark theme, fiber-optimized re-renders via Zustand selectors
 */
import React, { useCallback, useRef, useEffect } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { useEditorSettingsStore } from '../../stores/editorStore';

interface MonacoEditorProps {
  filePath: string;
  content: string;
  language?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  onCursorChange?: (line: number, column: number) => void;
  className?: string;
}

// GenCraft Pro dark theme
const GENCRAFT_THEME: MonacoEditor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '4b5563', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c084fc' },
    { token: 'string', foreground: '34d399' },
    { token: 'number', foreground: 'fb923c' },
    { token: 'type', foreground: '22d3ee' },
    { token: 'function', foreground: '60a5fa' },
    { token: 'variable', foreground: 'e5e7eb' },
    { token: 'operator', foreground: 'f472b6' },
    { token: 'tag', foreground: 'f472b6' },
    { token: 'attribute.name', foreground: '60a5fa' },
    { token: 'attribute.value', foreground: '34d399' },
    { token: 'delimiter', foreground: '71717a' },
    { token: 'regexp', foreground: 'eab308' },
    { token: 'annotation', foreground: 'eab308' },
    { token: 'constant', foreground: 'fb923c' },
  ],
  colors: {
    'editor.background': '#09090b',
    'editor.foreground': '#d4d4d8',
    'editor.lineHighlightBackground': '#ffffff04',
    'editor.selectionBackground': '#7c3aed25',
    'editor.selectionHighlightBackground': '#7c3aed10',
    'editor.findMatchBackground': '#3b82f625',
    'editor.findMatchHighlightBackground': '#3b82f610',
    'editorCursor.foreground': '#a78bfa',
    'editorLineNumber.foreground': '#3f3f46',
    'editorLineNumber.activeForeground': '#a1a1aa',
    'editorIndentGuide.background': '#27272a',
    'editorIndentGuide.activeBackground': '#3f3f46',
    'editorBracketMatch.background': '#7c3aed15',
    'editorBracketMatch.border': '#7c3aed40',
    'editorWidget.background': '#18181b',
    'editorWidget.border': '#27272a',
    'editorSuggestWidget.background': '#18181b',
    'editorSuggestWidget.border': '#27272a',
    'editorSuggestWidget.selectedBackground': '#7c3aed15',
    'editorHoverWidget.background': '#18181b',
    'editorHoverWidget.border': '#27272a',
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.background': '#ffffff08',
    'scrollbarSlider.hoverBackground': '#ffffff12',
    'scrollbarSlider.activeBackground': '#7c3aed30',
    'minimap.background': '#09090b',
  },
};

const detectLanguage = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    html: 'html', css: 'css', scss: 'scss', less: 'less',
    json: 'json', md: 'markdown', py: 'python', rb: 'ruby',
    java: 'java', go: 'go', rs: 'rust', php: 'php',
    sql: 'sql', sh: 'shell', yaml: 'yaml', yml: 'yaml',
    xml: 'xml', svg: 'xml', vue: 'html', svelte: 'html',
  };
  return map[ext] || 'plaintext';
};

const MonacoEditorComponent: React.FC<MonacoEditorProps> = ({
  filePath,
  content,
  language,
  readOnly = false,
  onChange,
  onSave,
  onCursorChange,
  className = '',
}) => {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const settings = useEditorSettingsStore((s) => s.settings);
  const setCursor = useEditorSettingsStore((s) => s.setCursor);

  const detectedLang = language || detectLanguage(filePath);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Register GenCraft Pro theme
    monaco.editor.defineTheme('gencraft-dark', GENCRAFT_THEME);
    monaco.editor.setTheme('gencraft-dark');

    // Save shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const value = editor.getValue();
      onSave?.(value);
    });

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursor({ line: e.position.lineNumber, column: e.position.column });
      onCursorChange?.(e.position.lineNumber, e.position.column);
    });

    // Focus editor
    editor.focus();
  }, [onSave, onCursorChange, setCursor]);

  const handleChange: OnChange = useCallback((value) => {
    if (value !== undefined) onChange?.(value);
  }, [onChange]);

  // Update editor options when settings change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers,
        bracketPairColorization: { enabled: settings.bracketPairColorization },
        readOnly,
      });
    }
  }, [settings, readOnly]);

  return (
    <div className={`h-full w-full relative ${className}`}>
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent z-10" />

      <Editor
        height="100%"
        language={detectedLang}
        value={content}
        theme="gencraft-dark"
        onChange={handleChange}
        onMount={handleMount}
        loading={
          <div className="h-full w-full bg-zinc-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
              <p className="text-xs text-zinc-600">Loading editor...</p>
            </div>
          </div>
        }
        options={{
          fontSize: settings.fontSize,
          fontFamily: settings.fontFamily,
          tabSize: settings.tabSize,
          wordWrap: settings.wordWrap,
          minimap: { enabled: settings.minimap },
          lineNumbers: settings.lineNumbers,
          bracketPairColorization: { enabled: settings.bracketPairColorization },
          readOnly,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          renderWhitespace: 'boundary',
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          suggestFontSize: 12,
          suggestLineHeight: 24,
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          renderLineHighlight: 'line',
          folding: true,
          foldingHighlight: false,
          guides: { indentation: true, bracketPairs: true },
          colorDecorators: true,
          linkedEditing: true,
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          formatOnPaste: true,
        }}
      />
    </div>
  );
};

export default MonacoEditorComponent;
