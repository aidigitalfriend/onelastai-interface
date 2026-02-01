/**
 * AI Copilot Extension Service
 * 
 * Implements realtime AI integration as an extension:
 * - Event-driven triggers from editor
 * - Context building with smart snippets
 * - Non-blocking API calls with debounce/cancel
 * - Ghost text / inline suggestions
 * - Continuous feedback loop
 * 
 * Architecture:
 * Editor UI ↔ AI Extension (this) ↔ AI API (remote)
 */

import { extensionEvents } from './extensions';
import { extensionHost } from './extensionHost';
import { aiService } from './ai';
import type { AIConfig, ChatMessage } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface CompletionContext {
  // Code context
  codeBeforeCursor: string;
  codeAfterCursor: string;
  currentLine: string;
  
  // Position
  cursorLine: number;
  cursorColumn: number;
  
  // File info
  language: string;
  filePath: string;
  
  // Editor state
  selectedText: string;
  visibleRange: { startLine: number; endLine: number };
}

export interface CompletionSuggestion {
  id: string;
  text: string;
  displayText: string;
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  confidence: number;
  source: 'copilot' | 'local';
}

export interface CopilotState {
  enabled: boolean;
  status: 'idle' | 'thinking' | 'suggesting' | 'error';
  currentSuggestion: CompletionSuggestion | null;
  lastRequestId: string | null;
  errorMessage: string | null;
}

type CopilotStatusCallback = (state: CopilotState) => void;

// =============================================================================
// AI Copilot Extension Class
// =============================================================================

class AICopilotExtension {
  private state: CopilotState = {
    enabled: true,
    status: 'idle',
    currentSuggestion: null,
    lastRequestId: null,
    errorMessage: null,
  };

  // Debounce & cancellation
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceMs = 300; // Wait 300ms after typing stops
  private abortController: AbortController | null = null;
  private requestCounter = 0;

  // Editor reference (set by connectToEditor)
  private editorRef: any = null;
  private monacoRef: any = null;

  // Ghost text decoration
  private ghostTextDecoration: string[] = [];

  // Status callbacks
  private statusCallbacks: Set<CopilotStatusCallback> = new Set();

  // AI config (use default, can be customized)
  private aiConfig: AIConfig = {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    apiKey: '',
    temperature: 0.2, // Low temperature for code completion
    maxTokens: 256,
  };

  constructor() {
    this.setupEventListeners();
  }

  // =========================================================================
  // Public API
  // =========================================================================

  /** Enable/disable copilot */
  setEnabled(enabled: boolean) {
    this.state.enabled = enabled;
    this.notifyStatusChange();
    
    if (!enabled) {
      this.clearSuggestion();
    }
  }

  /** Check if enabled */
  isEnabled(): boolean {
    return this.state.enabled;
  }

  /** Get current state */
  getState(): CopilotState {
    return { ...this.state };
  }

  /** Subscribe to status changes */
  onStatusChange(callback: CopilotStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  /** Configure AI provider */
  configure(config: Partial<AIConfig>) {
    this.aiConfig = { ...this.aiConfig, ...config };
  }

  /** Set debounce delay */
  setDebounceMs(ms: number) {
    this.debounceMs = Math.max(100, Math.min(ms, 2000));
  }

  /** Connect to Monaco editor */
  connectToEditor(editor: any, monaco: any) {
    this.editorRef = editor;
    this.monacoRef = monaco;
    
    // Register inline completions provider
    this.registerInlineCompletionProvider(monaco);
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts(editor, monaco);
    
    console.log('[AI Copilot] Connected to editor');
  }

  /** Manually trigger completion */
  async triggerCompletion() {
    if (!this.editorRef || !this.state.enabled) return;
    
    const context = this.buildContext();
    if (context) {
      await this.requestCompletion(context);
    }
  }

  /** Accept current suggestion */
  acceptSuggestion() {
    if (!this.state.currentSuggestion || !this.editorRef) return;
    
    const suggestion = this.state.currentSuggestion;
    const editor = this.editorRef;
    
    // Insert the suggestion text
    const position = editor.getPosition();
    if (position) {
      editor.executeEdits('ai-copilot', [{
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
        text: suggestion.text,
      }]);
      
      // Move cursor to end of insertion
      const newPosition = editor.getPosition();
      if (newPosition) {
        editor.setPosition(newPosition);
      }
    }
    
    this.clearSuggestion();
    extensionEvents.emit('copilot:suggestionAccepted', suggestion);
  }

  /** Dismiss current suggestion */
  dismissSuggestion() {
    this.clearSuggestion();
    extensionEvents.emit('copilot:suggestionDismissed');
  }

  /** Get next suggestion (cycle through alternatives) */
  nextSuggestion() {
    // TODO: Implement cycling through multiple suggestions
    extensionEvents.emit('copilot:nextSuggestion');
  }

  /** Get previous suggestion */
  previousSuggestion() {
    // TODO: Implement cycling through multiple suggestions
    extensionEvents.emit('copilot:previousSuggestion');
  }

  // =========================================================================
  // Event Listeners (editor → extension)
  // =========================================================================

  private setupEventListeners() {
    // Text changed - main trigger for completions
    extensionEvents.on('editor:textChanged', (data: any) => {
      if (!this.state.enabled) return;
      this.handleTextChange(data);
    });

    // Selection changed - may need to clear suggestion
    extensionEvents.on('editor:selectionChanged', (data: any) => {
      if (!this.state.enabled) return;
      this.handleSelectionChange(data);
    });

    // Focus lost - clear suggestion
    extensionEvents.on('editor:focus', (data: { focused: boolean }) => {
      if (!data.focused) {
        this.clearSuggestion();
      }
    });

    // File opened - might want to pre-analyze
    extensionEvents.on('file:opened', (data: any) => {
      // Could pre-warm the AI with file context
    });
  }

  // =========================================================================
  // Text Change Handler (with debounce)
  // =========================================================================

  private handleTextChange(data: any) {
    // Cancel any pending request
    this.cancelPendingRequest();
    
    // Clear old suggestion
    this.clearGhostText();
    
    // Check if this is a meaningful change that should trigger completion
    if (!this.shouldTriggerCompletion(data)) {
      return;
    }
    
    // Debounce - wait for user to stop typing
    this.debounceTimer = setTimeout(() => {
      const context = this.buildContext();
      if (context) {
        this.requestCompletion(context);
      }
    }, this.debounceMs);
  }

  private handleSelectionChange(data: any) {
    // If cursor moved significantly, clear suggestion
    if (this.state.currentSuggestion) {
      // Simple heuristic: if selection is not empty, clear
      if (data.selection.startLine !== data.selection.endLine ||
          data.selection.startColumn !== data.selection.endColumn) {
        this.clearSuggestion();
      }
    }
  }

  private shouldTriggerCompletion(data: any): boolean {
    // Don't trigger on deletions (usually)
    if (data.changes && data.changes.length > 0) {
      const change = data.changes[0];
      // If text was deleted and nothing added, skip
      if (!change.text || change.text.length === 0) {
        return false;
      }
      // Don't trigger on newlines alone (wait for content)
      if (change.text === '\n' || change.text === '\r\n') {
        return true; // Actually, do trigger on newline for next-line suggestion
      }
    }
    
    return true;
  }

  // =========================================================================
  // Context Building (critical step)
  // =========================================================================

  private buildContext(): CompletionContext | null {
    if (!this.editorRef) return null;
    
    const editor = this.editorRef;
    const model = editor.getModel();
    if (!model) return null;
    
    const position = editor.getPosition();
    if (!position) return null;
    
    const lineCount = model.getLineCount();
    const cursorLine = position.lineNumber;
    const cursorColumn = position.column;
    
    // Get code before cursor (up to 50 lines for context)
    const startLine = Math.max(1, cursorLine - 50);
    const beforeRange = {
      startLineNumber: startLine,
      startColumn: 1,
      endLineNumber: cursorLine,
      endColumn: cursorColumn,
    };
    const codeBeforeCursor = model.getValueInRange(beforeRange);
    
    // Get code after cursor (up to 10 lines for context)
    const endLine = Math.min(lineCount, cursorLine + 10);
    const afterRange = {
      startLineNumber: cursorLine,
      startColumn: cursorColumn,
      endLineNumber: endLine,
      endColumn: model.getLineMaxColumn(endLine),
    };
    const codeAfterCursor = model.getValueInRange(afterRange);
    
    // Current line
    const currentLine = model.getLineContent(cursorLine);
    
    // Selection
    const selection = editor.getSelection();
    let selectedText = '';
    if (selection && !selection.isEmpty()) {
      selectedText = model.getValueInRange(selection);
    }
    
    // Visible range
    const visibleRanges = editor.getVisibleRanges();
    const visibleRange = visibleRanges.length > 0 
      ? { startLine: visibleRanges[0].startLineNumber, endLine: visibleRanges[0].endLineNumber }
      : { startLine: 1, endLine: lineCount };
    
    // Language
    const language = model.getLanguageId() || 'plaintext';
    
    // File path
    const filePath = model.uri?.path || 'untitled';
    
    return {
      codeBeforeCursor,
      codeAfterCursor,
      currentLine,
      cursorLine,
      cursorColumn,
      language,
      filePath,
      selectedText,
      visibleRange,
    };
  }

  // =========================================================================
  // AI Request (non-blocking with cancellation)
  // =========================================================================

  private async requestCompletion(context: CompletionContext) {
    // Generate unique request ID
    const requestId = `req-${++this.requestCounter}-${Date.now()}`;
    this.state.lastRequestId = requestId;
    
    // Create abort controller for cancellation
    this.abortController = new AbortController();
    
    // Update state
    this.state.status = 'thinking';
    this.notifyStatusChange();
    
    try {
      // Build the prompt
      const prompt = this.buildCompletionPrompt(context);
      
      // Make AI request
      const messages: ChatMessage[] = [
        { id: `copilot-${requestId}`, role: 'user', content: prompt, timestamp: Date.now() }
      ];
      
      // Check if request was cancelled
      if (this.abortController.signal.aborted) {
        return;
      }
      
      const response = await aiService.sendMessage(this.aiConfig, messages);
      
      // Check if this request is still valid
      if (this.state.lastRequestId !== requestId || this.abortController.signal.aborted) {
        console.log('[AI Copilot] Request outdated, discarding');
        return;
      }
      
      // Validate response
      if (!response.content || response.content.trim().length === 0) {
        this.state.status = 'idle';
        this.notifyStatusChange();
        return;
      }
      
      // Parse the suggestion
      const suggestion = this.parseSuggestion(response.content, context, requestId);
      
      if (suggestion) {
        // Validate cursor hasn't moved
        if (this.isCursorAtExpectedPosition(context)) {
          this.state.currentSuggestion = suggestion;
          this.state.status = 'suggesting';
          this.showGhostText(suggestion);
          extensionEvents.emit('copilot:suggestionReady', suggestion);
        } else {
          console.log('[AI Copilot] Cursor moved, discarding suggestion');
        }
      }
      
    } catch (error: any) {
      // Silent failure - AI is optional
      console.error('[AI Copilot] Request error:', error.message);
      this.state.status = 'error';
      this.state.errorMessage = error.message;
    }
    
    this.notifyStatusChange();
  }

  private buildCompletionPrompt(context: CompletionContext): string {
    return `You are a code completion AI. Complete the code at the cursor position.

RULES:
- Return ONLY the completion text, no explanations
- Complete naturally from cursor position
- Match the code style and indentation
- Keep completions concise (1-3 lines usually)
- If unsure, return empty string

FILE: ${context.filePath}
LANGUAGE: ${context.language}

CODE BEFORE CURSOR:
\`\`\`${context.language}
${context.codeBeforeCursor.slice(-1500)}
\`\`\`

CODE AFTER CURSOR:
\`\`\`${context.language}
${context.codeAfterCursor.slice(0, 200)}
\`\`\`

Complete the code starting from where the cursor is. Return ONLY the completion text:`;
  }

  private parseSuggestion(
    content: string, 
    context: CompletionContext, 
    requestId: string
  ): CompletionSuggestion | null {
    // Clean up the response
    let text = content.trim();
    
    // Remove code fences if present
    text = text.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
    
    // Remove leading/trailing whitespace but preserve internal formatting
    text = text.trim();
    
    if (!text || text.length === 0) {
      return null;
    }
    
    // Limit suggestion length
    if (text.length > 500) {
      text = text.slice(0, 500);
      // Try to cut at a natural boundary
      const lastNewline = text.lastIndexOf('\n');
      if (lastNewline > 200) {
        text = text.slice(0, lastNewline);
      }
    }
    
    return {
      id: requestId,
      text,
      displayText: text.length > 100 ? text.slice(0, 100) + '...' : text,
      range: {
        startLine: context.cursorLine,
        startColumn: context.cursorColumn,
        endLine: context.cursorLine,
        endColumn: context.cursorColumn,
      },
      confidence: 0.8,
      source: 'copilot',
    };
  }

  private isCursorAtExpectedPosition(context: CompletionContext): boolean {
    if (!this.editorRef) return false;
    
    const position = this.editorRef.getPosition();
    if (!position) return false;
    
    // Allow some tolerance (user might have typed a bit more)
    return position.lineNumber === context.cursorLine &&
           Math.abs(position.column - context.cursorColumn) <= 5;
  }

  // =========================================================================
  // Ghost Text Rendering
  // =========================================================================

  private showGhostText(suggestion: CompletionSuggestion) {
    if (!this.editorRef || !this.monacoRef) return;
    
    const editor = this.editorRef;
    const monaco = this.monacoRef;
    
    // Clear existing decorations
    this.clearGhostText();
    
    const position = editor.getPosition();
    if (!position) return;
    
    // Create ghost text decoration
    this.ghostTextDecoration = editor.deltaDecorations([], [{
      range: {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      },
      options: {
        after: {
          content: suggestion.text.split('\n')[0], // First line only for inline
          inlineClassName: 'ai-copilot-ghost-text',
        },
        className: 'ai-copilot-suggestion-line',
      },
    }]);
  }

  private clearGhostText() {
    if (!this.editorRef || this.ghostTextDecoration.length === 0) return;
    
    this.editorRef.deltaDecorations(this.ghostTextDecoration, []);
    this.ghostTextDecoration = [];
  }

  // =========================================================================
  // Inline Completion Provider (Monaco native)
  // =========================================================================

  private registerInlineCompletionProvider(monaco: any) {
    // Register as inline completion provider for all languages
    monaco.languages.registerInlineCompletionsProvider('*', {
      provideInlineCompletions: async (model: any, position: any, context: any, token: any) => {
        // Don't provide if copilot is disabled
        if (!this.state.enabled) return { items: [] };
        
        // If we have a current suggestion at this position, return it
        if (this.state.currentSuggestion) {
          const suggestion = this.state.currentSuggestion;
          
          return {
            items: [{
              insertText: suggestion.text,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              },
            }],
          };
        }
        
        return { items: [] };
      },
      
      freeInlineCompletions: () => {
        // Cleanup if needed
      },
    });
  }

  // =========================================================================
  // Keyboard Shortcuts
  // =========================================================================

  private setupKeyboardShortcuts(editor: any, monaco: any) {
    // Tab to accept suggestion
    editor.addCommand(monaco.KeyCode.Tab, () => {
      if (this.state.currentSuggestion) {
        this.acceptSuggestion();
      } else {
        // Default tab behavior
        editor.trigger('keyboard', 'tab', null);
      }
    }, 'editorTextFocus && !suggestWidgetVisible');
    
    // Escape to dismiss suggestion
    editor.addCommand(monaco.KeyCode.Escape, () => {
      if (this.state.currentSuggestion) {
        this.dismissSuggestion();
      }
    }, 'editorTextFocus');
    
    // Alt+] for next suggestion
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.BracketRight, () => {
      this.nextSuggestion();
    });
    
    // Alt+[ for previous suggestion
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.BracketLeft, () => {
      this.previousSuggestion();
    });
    
    // Ctrl+Space to manually trigger
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      this.triggerCompletion();
    });
  }

  // =========================================================================
  // Cancellation & Cleanup
  // =========================================================================

  private cancelPendingRequest() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private clearSuggestion() {
    this.state.currentSuggestion = null;
    this.state.status = 'idle';
    this.clearGhostText();
    this.notifyStatusChange();
  }

  private notifyStatusChange() {
    this.statusCallbacks.forEach(cb => cb(this.getState()));
  }

  // =========================================================================
  // Dispose
  // =========================================================================

  dispose() {
    this.cancelPendingRequest();
    this.clearGhostText();
    this.statusCallbacks.clear();
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const aiCopilot = new AICopilotExtension();

// =============================================================================
// Helper: Connect Copilot to Editor
// =============================================================================

export function connectCopilotToEditor(editor: any, monaco: any) {
  aiCopilot.connectToEditor(editor, monaco);
}

// =============================================================================
// CSS for Ghost Text (inject into document)
// =============================================================================

export function injectCopilotStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('ai-copilot-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ai-copilot-styles';
  style.textContent = `
    .ai-copilot-ghost-text {
      color: #6b7280 !important;
      font-style: italic;
      opacity: 0.6;
    }
    
    .ai-copilot-suggestion-line {
      background-color: rgba(59, 130, 246, 0.05);
    }
    
    /* Status indicator */
    .ai-copilot-status {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
    }
    
    .ai-copilot-status.thinking {
      color: #f59e0b;
    }
    
    .ai-copilot-status.suggesting {
      color: #10b981;
    }
    
    .ai-copilot-status.error {
      color: #ef4444;
    }
    
    .ai-copilot-status.idle {
      color: #6b7280;
    }
    
    /* Spinner animation */
    @keyframes copilot-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .ai-copilot-spinner {
      animation: copilot-spin 1s linear infinite;
    }
  `;
  document.head.appendChild(style);
}
