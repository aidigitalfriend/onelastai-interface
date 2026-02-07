/**
 * CodeEditor Component for Standalone Canvas App
 * Editable code editor with selection/cursor tracking
 * 
 * This is the STANDALONE version at /canvas-app/
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { editorBridge, EditorSelection, EditorCursor } from '../services/editorBridge';

interface CodeEditorProps {
  filePath: string;
  darkMode?: boolean;
  readOnly?: boolean;
  onSave?: (content: string) => void;
  onChange?: (content: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  filePath,
  darkMode = true,
  readOnly = false,
  onSave,
  onChange,
}) => {
  const [localCode, setLocalCode] = useState('');
  const [isModified, setIsModified] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Load file content when filePath changes
  useEffect(() => {
    const content = editorBridge.getFile(filePath);
    if (content !== undefined) {
      setLocalCode(content);
      setIsModified(false);
    } else {
      // File doesn't exist, create it
      editorBridge.createFile(filePath, '');
      setLocalCode('');
      setIsModified(false);
    }
    editorBridge.setActiveFile(filePath);
  }, [filePath]);

  // Handle code changes
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setLocalCode(newCode);
    setIsModified(true);
    onChange?.(newCode);
  }, [onChange]);

  // Update cursor and selection in editorBridge
  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    
    // Calculate line and column from position
    const getLineCol = (pos: number): { line: number; column: number } => {
      const textBefore = value.substring(0, pos);
      const lines = textBefore.split('\n');
      return {
        line: lines.length,
        column: (lines[lines.length - 1]?.length || 0) + 1,
      };
    };

    const startPos = getLineCol(selectionStart);
    const endPos = getLineCol(selectionEnd);

    // Update cursor
    editorBridge.setCursor(startPos);

    // Update selection if text is selected
    if (selectionStart !== selectionEnd) {
      const selectedText = value.substring(selectionStart, selectionEnd);
      editorBridge.setSelection({
        start: startPos,
        end: endPos,
        text: selectedText,
      });
    } else {
      editorBridge.setSelection(null);
    }
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;

    // Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart, selectionEnd } = textarea;
      const newCode = localCode.substring(0, selectionStart) + '  ' + localCode.substring(selectionEnd);
      setLocalCode(newCode);
      setIsModified(true);
      
      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
      }, 0);
    }

    // Cmd/Ctrl + S to save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (!readOnly) {
        editorBridge.updateFile(filePath, localCode);
        editorBridge.markSaved(filePath);
        setIsModified(false);
        onSave?.(localCode);
      }
    }

    // Cmd/Ctrl + D to duplicate line
    if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
      e.preventDefault();
      const { selectionStart, selectionEnd, value } = textarea;
      
      // Find current line boundaries
      let lineStart = selectionStart;
      while (lineStart > 0 && value[lineStart - 1] !== '\n') lineStart--;
      
      let lineEnd = selectionEnd;
      while (lineEnd < value.length && value[lineEnd] !== '\n') lineEnd++;
      
      const line = value.substring(lineStart, lineEnd);
      const newCode = value.substring(0, lineEnd) + '\n' + line + value.substring(lineEnd);
      setLocalCode(newCode);
      setIsModified(true);
    }
  }, [localCode, filePath, readOnly, onSave]);

  // Sync scroll between textarea and line numbers
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Calculate line numbers
  const lineCount = localCode.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  // Get current cursor info for status bar
  const [cursorInfo, setCursorInfo] = useState({ line: 1, column: 1 });
  
  useEffect(() => {
    const updateCursorInfo = (cursor: EditorCursor) => {
      setCursorInfo(cursor);
    };
    editorBridge.onCursorChange(updateCursorInfo);
  }, []);

  // Get language from file extension for display
  const getLanguageLabel = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const labels: Record<string, string> = {
      html: 'HTML',
      css: 'CSS',
      js: 'JavaScript',
      jsx: 'React JSX',
      ts: 'TypeScript',
      tsx: 'React TSX',
      json: 'JSON',
      md: 'Markdown',
      py: 'Python',
      java: 'Java',
      go: 'Go',
      rs: 'Rust',
    };
    return labels[ext || ''] || ext?.toUpperCase() || 'Text';
  };

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}>
      {/* Editor content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Line numbers */}
        <div
          ref={lineNumbersRef}
          className={`absolute left-0 top-0 bottom-0 w-12 overflow-hidden select-none ${
            darkMode ? 'bg-zinc-950 border-r border-zinc-800' : 'bg-zinc-50 border-r border-zinc-200'
          }`}
        >
          <div className="py-4 pr-2 text-right">
            {lineNumbers.map((num) => (
              <div
                key={num}
                className={`text-xs leading-relaxed px-2 ${
                  num === cursorInfo.line
                    ? darkMode
                    ? 'text-blue-400 bg-zinc-800/50'
                    : 'text-blue-600 bg-blue-50'
                    : darkMode
                      ? 'text-zinc-600'
                      : 'text-zinc-400'
                }`}
                style={{ height: '1.5rem' }}
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        {/* Editable textarea */}
        <textarea
          ref={textareaRef}
          value={localCode}
          onChange={handleCodeChange}
          onSelect={handleSelectionChange}
          onClick={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          readOnly={readOnly}
          spellCheck={false}
          aria-label="Code editor"
          title="Code editor - Edit your code here"
          className={`absolute inset-0 pl-14 pr-4 py-4 font-mono text-sm leading-relaxed resize-none outline-none ${
            darkMode 
              ? 'bg-transparent text-zinc-200 caret-blue-400' 
              : 'bg-transparent text-zinc-800 caret-blue-600'
          } ${readOnly ? 'cursor-default' : ''}`}
          style={{ 
            tabSize: 2,
            lineHeight: '1.5rem',
          }}
        />
      </div>

      {/* Status bar */}
      <div className={`flex items-center justify-between px-4 py-1.5 text-xs border-t ${
        darkMode 
          ? 'bg-zinc-950 border-zinc-800 text-zinc-500' 
          : 'bg-zinc-50 border-zinc-200 text-zinc-500'
      }`}>
        <div className="flex items-center gap-4">
          <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>
            {getLanguageLabel(filePath)}
          </span>
          <span>Ln {cursorInfo.line}, Col {cursorInfo.column}</span>
          {editorBridge.getSelection() && (
            <span>({editorBridge.getSelection()?.text.length} selected)</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isModified && (
            <span className={`px-2 py-0.5 rounded text-xs ${
              darkMode 
                ? 'bg-yellow-500/20 text-yellow-400' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              Modified
            </span>
          )}
          <span className="opacity-50">
            {readOnly ? 'Read Only' : 'Ctrl+S to save'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
