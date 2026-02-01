/**
 * AI Copilot Service - VS Code-like AI Integration
 * Full file operations, code editing, command execution, inline suggestions
 */

import { AIProvider } from '../types';

// ============== TYPES ==============

export interface CopilotConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  enableInlineSuggestions?: boolean;
  enableAutoComplete?: boolean;
  enableCodeActions?: boolean;
}

export interface FileOperation {
  type: 'create' | 'edit' | 'delete' | 'rename' | 'move';
  path: string;
  newPath?: string;  // For rename/move
  content?: string;
  searchReplace?: {
    search: string;
    replace: string;
  };
  diff?: {
    oldContent: string;
    newContent: string;
  };
}

export interface TerminalCommand {
  command: string;
  cwd?: string;
  background?: boolean;
  expectOutput?: boolean;
}

export interface CodeSuggestion {
  id: string;
  text: string;
  insertText: string;
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  kind: 'completion' | 'snippet' | 'refactor' | 'fix';
  documentation?: string;
  score?: number;
}

export interface CodeAction {
  id: string;
  title: string;
  kind: 'quickfix' | 'refactor' | 'source' | 'organizeImports';
  edit?: FileOperation[];
  command?: TerminalCommand;
  isPreferred?: boolean;
}

export interface DiagnosticInfo {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  code?: string;
  source?: string;
}

export interface CopilotCallbacks {
  onToken?: (token: string) => void;
  onFileOperation?: (operation: FileOperation) => void;
  onCommand?: (command: TerminalCommand) => void;
  onSuggestion?: (suggestion: CodeSuggestion) => void;
  onDiagnostic?: (diagnostic: DiagnosticInfo) => void;
  onComplete?: (response: string) => void;
  onError?: (error: Error) => void;
  onProgress?: (message: string, percent: number) => void;
}

// ============== API ENDPOINTS ==============

const API_ENDPOINTS: Record<AIProvider, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  mistral: 'https://api.mistral.ai/v1',
  groq: 'https://api.groq.com/openai/v1',
  xai: 'https://api.x.ai/v1',
  cerebras: 'https://api.cerebras.ai/v1',
  huggingface: 'https://api-inference.huggingface.co/models',
  ollama: 'http://localhost:11434/api',
};

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-2.0-flash-exp',
  mistral: 'mistral-large-latest',
  groq: 'llama-3.3-70b-versatile',
  xai: 'grok-2-latest',
  cerebras: 'llama-3.3-70b',
  huggingface: 'meta-llama/Llama-3.2-3B-Instruct',
  ollama: 'llama3.2',
};

// ============== COPILOT SYSTEM PROMPT ==============

const COPILOT_SYSTEM_PROMPT = `You are an expert AI coding assistant (like GitHub Copilot) integrated into "Maula IDE". You have FULL access to:
- Create, edit, delete, rename, and move files
- Execute terminal commands
- Run npm/yarn/pnpm commands
- Install packages
- Build and deploy projects

## CAPABILITIES

### File Operations
Use these XML tags to perform file operations:

**Create a new file:**
<file_create path="src/components/Button.tsx">
// Complete file content here
</file_create>

**Edit an existing file (full replacement):**
<file_edit path="src/App.tsx">
// Complete new file content
</file_edit>

**Edit with search/replace (for partial edits):**
<file_search_replace path="src/App.tsx">
<search>
const oldCode = 'something';
</search>
<replace>
const newCode = 'better';
</replace>
</file_search_replace>

**Delete a file:**
<file_delete path="src/old-file.ts" />

**Rename a file:**
<file_rename from="src/OldName.tsx" to="src/NewName.tsx" />

**Move a file:**
<file_move from="src/utils/helper.ts" to="src/lib/helper.ts" />

### Terminal Commands
**Run a command:**
<terminal_run>npm install express</terminal_run>

**Run in background:**
<terminal_background>npm run dev</terminal_background>

**Run with working directory:**
<terminal_run cwd="./backend">npm start</terminal_run>

### Package Management
<npm_install>express cors helmet</npm_install>
<npm_install dev>typescript @types/node</npm_install>
<npm_uninstall>lodash</npm_uninstall>
<npm_run>build</npm_run>

### Git Operations
<git_init />
<git_add>.</git_add>
<git_commit message="feat: add new feature" />
<git_push />
<git_pull />
<git_checkout branch="feature/new" create="true" />

## RULES

1. **Always provide COMPLETE code** - never use placeholders like "...", "// rest of code", etc.
2. **Include ALL imports** - every file must have all necessary imports
3. **Create files in order** - config files first, then dependencies, then main files
4. **Use modern syntax** - ES6+, TypeScript strict, React hooks
5. **Follow best practices** - clean code, proper error handling, type safety
6. **Keep responses focused** - explain briefly, then show the code
7. **Test your logic** - ensure the code you write would actually work

## INLINE SUGGESTIONS

When asked for inline code completion, return suggestions in this format:
<suggestion score="0.95" kind="completion">
suggested code here
</suggestion>

## CODE ACTIONS

When asked to fix or refactor code, use:
<code_action kind="quickfix" title="Fix import">
<file_edit path="src/App.tsx">
// corrected code
</file_edit>
</code_action>

## DIAGNOSTICS

Report issues you find:
<diagnostic file="src/App.tsx" line="15" severity="error">
Missing semicolon
</diagnostic>

Remember: You are a powerful coding assistant. Users expect you to write complete, working code and execute operations automatically.`;

// ============== COPILOT SERVICE CLASS ==============

export class CopilotService {
  private config: CopilotConfig;
  private isStreaming: boolean = false;
  private abortController: AbortController | null = null;
  private buffer: string = '';

  constructor(config: Partial<CopilotConfig> = {}) {
    this.config = {
      provider: config.provider || 'openai',
      model: config.model || DEFAULT_MODELS[config.provider || 'openai'],
      apiKey: config.apiKey || '',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 4096,
      enableInlineSuggestions: config.enableInlineSuggestions ?? true,
      enableAutoComplete: config.enableAutoComplete ?? true,
      enableCodeActions: config.enableCodeActions ?? true,
    };
  }

  // Update configuration
  setConfig(config: Partial<CopilotConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get current configuration
  getConfig(): CopilotConfig {
    return { ...this.config };
  }

  // ============== CHAT / STREAMING ==============

  async chat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    callbacks: CopilotCallbacks
  ): Promise<string> {
    if (this.isStreaming) {
      throw new Error('Already streaming');
    }

    this.isStreaming = true;
    this.buffer = '';
    this.abortController = new AbortController();

    // Add system prompt
    const fullMessages = [
      { role: 'system' as const, content: COPILOT_SYSTEM_PROMPT },
      ...messages,
    ];

    try {
      callbacks.onProgress?.('Connecting to AI...', 0);
      
      const response = await this.callProvider(fullMessages, callbacks);
      
      // Parse operations from response
      const operations = this.parseFileOperations(response);
      const commands = this.parseTerminalCommands(response);
      
      // Execute operations
      for (const op of operations) {
        callbacks.onFileOperation?.(op);
      }
      
      for (const cmd of commands) {
        callbacks.onCommand?.(cmd);
      }
      
      callbacks.onComplete?.(this.cleanResponse(response));
      return this.cleanResponse(response);
      
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      this.isStreaming = false;
      this.abortController = null;
    }
  }

  // Call AI provider with streaming
  private async callProvider(
    messages: Array<{ role: string; content: string }>,
    callbacks: CopilotCallbacks
  ): Promise<string> {
    const { provider, model, apiKey, temperature, maxTokens } = this.config;
    
    // Use backend proxy if no API key (production)
    if (!apiKey) {
      return this.callBackend(messages, callbacks);
    }

    switch (provider) {
      case 'openai':
      case 'groq':
      case 'xai':
      case 'cerebras':
        return this.callOpenAICompatible(messages, callbacks);
      case 'anthropic':
        return this.callAnthropic(messages, callbacks);
      case 'gemini':
        return this.callGemini(messages, callbacks);
      case 'ollama':
        return this.callOllama(messages, callbacks);
      default:
        return this.callBackend(messages, callbacks);
    }
  }

  // OpenAI-compatible API (works for OpenAI, Groq, xAI, Cerebras)
  private async callOpenAICompatible(
    messages: Array<{ role: string; content: string }>,
    callbacks: CopilotCallbacks
  ): Promise<string> {
    const { provider, model, apiKey, temperature, maxTokens } = this.config;
    const endpoint = API_ENDPOINTS[provider];

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${error}`);
    }

    return this.processSSEStream(response, callbacks);
  }

  // Anthropic Claude API
  private async callAnthropic(
    messages: Array<{ role: string; content: string }>,
    callbacks: CopilotCallbacks
  ): Promise<string> {
    const { model, apiKey, temperature, maxTokens } = this.config;
    
    // Extract system message
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemMessage,
        messages: chatMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        stream: true,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API Error: ${error}`);
    }

    return this.processAnthropicStream(response, callbacks);
  }

  // Google Gemini API
  private async callGemini(
    messages: Array<{ role: string; content: string }>,
    callbacks: CopilotCallbacks
  ): Promise<string> {
    const { model, apiKey, temperature, maxTokens } = this.config;
    
    // Convert messages to Gemini format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find(m => m.role === 'system')?.content;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
        signal: this.abortController?.signal,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API Error: ${error}`);
    }

    return this.processGeminiStream(response, callbacks);
  }

  // Ollama (local)
  private async callOllama(
    messages: Array<{ role: string; content: string }>,
    callbacks: CopilotCallbacks
  ): Promise<string> {
    const { model, temperature } = this.config;

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: { temperature },
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      throw new Error('Ollama not running or model not found');
    }

    return this.processOllamaStream(response, callbacks);
  }

  // Backend proxy (production)
  private async callBackend(
    messages: Array<{ role: string; content: string }>,
    callbacks: CopilotCallbacks
  ): Promise<string> {
    const API_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? `${window.location.origin}/api`
      : 'http://localhost:4000/api';

    const response = await fetch(`${API_URL}/ai/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        provider: this.config.provider,
        model: this.config.model,
        temperature: this.config.temperature,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      // Fallback to non-streaming
      const fallbackResponse = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          provider: this.config.provider,
          model: this.config.model,
          temperature: this.config.temperature,
        }),
      });
      
      if (!fallbackResponse.ok) {
        throw new Error('Backend API error');
      }
      
      const data = await fallbackResponse.json();
      const content = data.response || data.content || '';
      callbacks.onToken?.(content);
      return content;
    }

    return this.processSSEStream(response, callbacks);
  }

  // ============== STREAM PROCESSORS ==============

  private async processSSEStream(
    response: Response,
    callbacks: CopilotCallbacks
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content || '';
              if (content) {
                fullContent += content;
                callbacks.onToken?.(content);
                this.processBufferForOperations(content, callbacks);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  private async processAnthropicStream(
    response: Response,
    callbacks: CopilotCallbacks
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.type === 'content_block_delta') {
                const content = json.delta?.text || '';
                if (content) {
                  fullContent += content;
                  callbacks.onToken?.(content);
                  this.processBufferForOperations(content, callbacks);
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  private async processGeminiStream(
    response: Response,
    callbacks: CopilotCallbacks
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Try to parse complete JSON objects
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const json = JSON.parse(line);
              const content = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (content) {
                fullContent += content;
                callbacks.onToken?.(content);
                this.processBufferForOperations(content, callbacks);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  private async processOllamaStream(
    response: Response,
    callbacks: CopilotCallbacks
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            const content = json.message?.content || '';
            if (content) {
              fullContent += content;
              callbacks.onToken?.(content);
              this.processBufferForOperations(content, callbacks);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  // Process streaming buffer for real-time operations
  private processBufferForOperations(token: string, callbacks: CopilotCallbacks): void {
    this.buffer += token;
    
    // Check for completed file operations in buffer
    const createMatch = this.buffer.match(/<file_create\s+path="([^"]+)">([\s\S]*?)<\/file_create>/);
    if (createMatch) {
      callbacks.onFileOperation?.({
        type: 'create',
        path: createMatch[1],
        content: createMatch[2].trim(),
      });
      this.buffer = this.buffer.replace(createMatch[0], '');
    }

    const editMatch = this.buffer.match(/<file_edit\s+path="([^"]+)">([\s\S]*?)<\/file_edit>/);
    if (editMatch) {
      callbacks.onFileOperation?.({
        type: 'edit',
        path: editMatch[1],
        content: editMatch[2].trim(),
      });
      this.buffer = this.buffer.replace(editMatch[0], '');
    }

    const deleteMatch = this.buffer.match(/<file_delete\s+path="([^"]+)"\s*\/>/);
    if (deleteMatch) {
      callbacks.onFileOperation?.({
        type: 'delete',
        path: deleteMatch[1],
      });
      this.buffer = this.buffer.replace(deleteMatch[0], '');
    }

    const terminalMatch = this.buffer.match(/<terminal_run(?:\s+cwd="([^"]+)")?>([\s\S]*?)<\/terminal_run>/);
    if (terminalMatch) {
      callbacks.onCommand?.({
        command: terminalMatch[2].trim(),
        cwd: terminalMatch[1],
      });
      this.buffer = this.buffer.replace(terminalMatch[0], '');
    }
  }

  // ============== PARSING ==============

  parseFileOperations(response: string): FileOperation[] {
    const operations: FileOperation[] = [];

    // Create files
    const createRegex = /<file_create\s+path="([^"]+)">([\s\S]*?)<\/file_create>/g;
    let match;
    while ((match = createRegex.exec(response)) !== null) {
      operations.push({
        type: 'create',
        path: match[1],
        content: match[2].trim(),
      });
    }

    // Edit files (full replacement)
    const editRegex = /<file_edit\s+path="([^"]+)">([\s\S]*?)<\/file_edit>/g;
    while ((match = editRegex.exec(response)) !== null) {
      operations.push({
        type: 'edit',
        path: match[1],
        content: match[2].trim(),
      });
    }

    // Search/Replace edits
    const searchReplaceRegex = /<file_search_replace\s+path="([^"]+)">\s*<search>([\s\S]*?)<\/search>\s*<replace>([\s\S]*?)<\/replace>\s*<\/file_search_replace>/g;
    while ((match = searchReplaceRegex.exec(response)) !== null) {
      operations.push({
        type: 'edit',
        path: match[1],
        searchReplace: {
          search: match[2].trim(),
          replace: match[3].trim(),
        },
      });
    }

    // Delete files
    const deleteRegex = /<file_delete\s+path="([^"]+)"\s*\/>/g;
    while ((match = deleteRegex.exec(response)) !== null) {
      operations.push({
        type: 'delete',
        path: match[1],
      });
    }

    // Rename files
    const renameRegex = /<file_rename\s+from="([^"]+)"\s+to="([^"]+)"\s*\/>/g;
    while ((match = renameRegex.exec(response)) !== null) {
      operations.push({
        type: 'rename',
        path: match[1],
        newPath: match[2],
      });
    }

    // Move files
    const moveRegex = /<file_move\s+from="([^"]+)"\s+to="([^"]+)"\s*\/>/g;
    while ((match = moveRegex.exec(response)) !== null) {
      operations.push({
        type: 'move',
        path: match[1],
        newPath: match[2],
      });
    }

    // Dyad-style tags (compatibility)
    const dyadWriteRegex = /<dyad-write\s+path="([^"]+)"[^>]*>([\s\S]*?)<\/dyad-write>/g;
    while ((match = dyadWriteRegex.exec(response)) !== null) {
      operations.push({
        type: 'create',
        path: match[1],
        content: match[2].trim(),
      });
    }

    return operations;
  }

  parseTerminalCommands(response: string): TerminalCommand[] {
    const commands: TerminalCommand[] = [];

    // Basic terminal run
    const terminalRegex = /<terminal_run(?:\s+cwd="([^"]+)")?>([\s\S]*?)<\/terminal_run>/g;
    let match;
    while ((match = terminalRegex.exec(response)) !== null) {
      commands.push({
        command: match[2].trim(),
        cwd: match[1],
      });
    }

    // Background terminal
    const bgRegex = /<terminal_background(?:\s+cwd="([^"]+)")?>([\s\S]*?)<\/terminal_background>/g;
    while ((match = bgRegex.exec(response)) !== null) {
      commands.push({
        command: match[2].trim(),
        cwd: match[1],
        background: true,
      });
    }

    // NPM commands
    const npmInstallRegex = /<npm_install(?:\s+dev)?>([\s\S]*?)<\/npm_install>/g;
    while ((match = npmInstallRegex.exec(response)) !== null) {
      const isDev = match[0].includes('dev');
      const packages = match[1].trim();
      commands.push({
        command: `npm install ${isDev ? '--save-dev ' : ''}${packages}`,
      });
    }

    const npmRunRegex = /<npm_run>([\s\S]*?)<\/npm_run>/g;
    while ((match = npmRunRegex.exec(response)) !== null) {
      commands.push({
        command: `npm run ${match[1].trim()}`,
      });
    }

    // Dyad-style terminal
    const dyadTerminalRegex = /<dyad-terminal>([\s\S]*?)<\/dyad-terminal>/g;
    while ((match = dyadTerminalRegex.exec(response)) !== null) {
      commands.push({
        command: match[1].trim(),
      });
    }

    return commands;
  }

  cleanResponse(response: string): string {
    return response
      .replace(/<file_create\s+path="[^"]+">[\s\S]*?<\/file_create>/g, '')
      .replace(/<file_edit\s+path="[^"]+">[\s\S]*?<\/file_edit>/g, '')
      .replace(/<file_search_replace\s+path="[^"]+">\s*<search>[\s\S]*?<\/search>\s*<replace>[\s\S]*?<\/replace>\s*<\/file_search_replace>/g, '')
      .replace(/<file_delete\s+path="[^"]+"\s*\/>/g, '')
      .replace(/<file_rename\s+from="[^"]+"\s+to="[^"]+"\s*\/>/g, '')
      .replace(/<file_move\s+from="[^"]+"\s+to="[^"]+"\s*\/>/g, '')
      .replace(/<terminal_run(?:\s+cwd="[^"]+")?>([\s\S]*?)<\/terminal_run>/g, '`$1`')
      .replace(/<terminal_background(?:\s+cwd="[^"]+")?>([\s\S]*?)<\/terminal_background>/g, '`$1` (background)')
      .replace(/<npm_install(?:\s+dev)?>([\s\S]*?)<\/npm_install>/g, '`npm install $1`')
      .replace(/<npm_run>([\s\S]*?)<\/npm_run>/g, '`npm run $1`')
      .replace(/<dyad-write\s+path="[^"]+"[^>]*>[\s\S]*?<\/dyad-write>/g, '')
      .replace(/<dyad-terminal>[\s\S]*?<\/dyad-terminal>/g, '')
      .replace(/<dyad-command[^>]*><\/dyad-command>/g, '')
      .replace(/<suggestion[^>]*>[\s\S]*?<\/suggestion>/g, '')
      .replace(/<code_action[^>]*>[\s\S]*?<\/code_action>/g, '')
      .replace(/<diagnostic[^>]*>[\s\S]*?<\/diagnostic>/g, '')
      .trim();
  }

  // ============== INLINE SUGGESTIONS ==============

  async getInlineSuggestion(
    code: string,
    cursorPosition: { line: number; column: number },
    language: string,
    context?: {
      beforeCursor: string;
      afterCursor: string;
      filePath?: string;
    }
  ): Promise<CodeSuggestion[]> {
    const prompt = `Complete the following ${language} code. The cursor is at line ${cursorPosition.line}, column ${cursorPosition.column}.

Current file content:
\`\`\`${language}
${code}
\`\`\`

${context?.beforeCursor ? `Code before cursor:\n${context.beforeCursor}` : ''}

Provide 1-3 inline completion suggestions. Return ONLY the completion text in <suggestion> tags:
<suggestion score="0.9" kind="completion">completion text here</suggestion>`;

    try {
      const response = await this.chat(
        [{ role: 'user', content: prompt }],
        { onToken: () => {} }
      );

      const suggestions: CodeSuggestion[] = [];
      const suggestionRegex = /<suggestion\s+score="([^"]+)"\s+kind="([^"]+)">([\s\S]*?)<\/suggestion>/g;
      let match;

      while ((match = suggestionRegex.exec(response)) !== null) {
        suggestions.push({
          id: crypto.randomUUID(),
          text: match[3].trim(),
          insertText: match[3].trim(),
          range: {
            startLine: cursorPosition.line,
            startColumn: cursorPosition.column,
            endLine: cursorPosition.line,
            endColumn: cursorPosition.column,
          },
          kind: match[2] as 'completion',
          score: parseFloat(match[1]),
        });
      }

      return suggestions.sort((a, b) => (b.score || 0) - (a.score || 0));
    } catch (error) {
      console.error('Inline suggestion error:', error);
      return [];
    }
  }

  // ============== CODE ACTIONS ==============

  async getCodeActions(
    code: string,
    selection: { startLine: number; endLine: number },
    diagnostics: DiagnosticInfo[]
  ): Promise<CodeAction[]> {
    const prompt = `Analyze this code and provide fix/refactor actions for the selection (lines ${selection.startLine}-${selection.endLine}).

Code:
\`\`\`
${code}
\`\`\`

${diagnostics.length > 0 ? `Diagnostics:\n${diagnostics.map(d => `- Line ${d.line}: ${d.message}`).join('\n')}` : ''}

Provide code actions as:
<code_action kind="quickfix|refactor" title="Description">
<file_edit path="current-file">
corrected code
</file_edit>
</code_action>`;

    try {
      const response = await this.chat(
        [{ role: 'user', content: prompt }],
        { onToken: () => {} }
      );

      const actions: CodeAction[] = [];
      const actionRegex = /<code_action\s+kind="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/code_action>/g;
      let match;

      while ((match = actionRegex.exec(response)) !== null) {
        const editContent = match[3];
        const fileOps = this.parseFileOperations(editContent);

        actions.push({
          id: crypto.randomUUID(),
          title: match[2],
          kind: match[1] as 'quickfix' | 'refactor',
          edit: fileOps,
        });
      }

      return actions;
    } catch (error) {
      console.error('Code action error:', error);
      return [];
    }
  }

  // ============== EXPLAIN CODE ==============

  async explainCode(code: string, language: string): Promise<string> {
    const prompt = `Explain this ${language} code clearly and concisely:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. What this code does (1-2 sentences)
2. Key concepts used
3. Any potential issues or improvements`;

    const response = await this.chat(
      [{ role: 'user', content: prompt }],
      { onToken: () => {} }
    );

    return this.cleanResponse(response);
  }

  // ============== FIX ERROR ==============

  async fixError(
    code: string,
    error: string,
    filePath: string
  ): Promise<{ explanation: string; operations: FileOperation[] }> {
    const prompt = `Fix this error in ${filePath}:

Error: ${error}

Code:
\`\`\`
${code}
\`\`\`

Provide the fix using <file_edit> tags and briefly explain what was wrong.`;

    let explanation = '';
    const operations: FileOperation[] = [];

    await this.chat(
      [{ role: 'user', content: prompt }],
      {
        onToken: () => {},
        onFileOperation: (op) => operations.push(op),
        onComplete: (response) => { explanation = response; },
      }
    );

    return { explanation, operations };
  }

  // ============== REFACTOR ==============

  async refactorCode(
    code: string,
    instruction: string,
    filePath: string
  ): Promise<{ explanation: string; operations: FileOperation[] }> {
    const prompt = `Refactor this code according to: "${instruction}"

File: ${filePath}
\`\`\`
${code}
\`\`\`

Use <file_edit> tags to show the refactored code.`;

    let explanation = '';
    const operations: FileOperation[] = [];

    await this.chat(
      [{ role: 'user', content: prompt }],
      {
        onToken: () => {},
        onFileOperation: (op) => operations.push(op),
        onComplete: (response) => { explanation = response; },
      }
    );

    return { explanation, operations };
  }

  // ============== GENERATE CODE ==============

  async generateCode(
    description: string,
    options?: {
      language?: string;
      framework?: string;
      existingFiles?: Array<{ path: string; content: string }>;
    }
  ): Promise<{ response: string; operations: FileOperation[]; commands: TerminalCommand[] }> {
    let contextInfo = '';
    if (options?.existingFiles?.length) {
      contextInfo = '\n\nExisting project files:\n' + 
        options.existingFiles.map(f => `${f.path}`).join('\n');
    }

    const prompt = `${description}

${options?.language ? `Language: ${options.language}` : ''}
${options?.framework ? `Framework: ${options.framework}` : ''}
${contextInfo}

Create all necessary files using <file_create> tags and include any terminal commands needed.`;

    const operations: FileOperation[] = [];
    const commands: TerminalCommand[] = [];
    let response = '';

    await this.chat(
      [{ role: 'user', content: prompt }],
      {
        onToken: () => {},
        onFileOperation: (op) => operations.push(op),
        onCommand: (cmd) => commands.push(cmd),
        onComplete: (r) => { response = r; },
      }
    );

    return { response, operations, commands };
  }

  // ============== CANCEL ==============

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.isStreaming = false;
    }
  }

  isCurrentlyStreaming(): boolean {
    return this.isStreaming;
  }
}

// Export singleton instance
export const copilotService = new CopilotService();

// Export types
export type { CopilotConfig, CopilotCallbacks };
