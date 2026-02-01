/**
 * AI Code Assistant Service
 * ==========================
 * Comprehensive AI-powered coding assistance including:
 * - Code completion & generation
 * - AI code review
 * - Documentation generation
 * - Inline explanations
 * - Security scanning
 * 
 * Supports multiple providers: OpenAI, Anthropic, Cerebras, Groq, xAI
 */

import { AIProvider, AIConfig, ChatMessage } from '../types';

// ============================================================================
// Types
// ============================================================================

export type AIAssistantProvider = 'openai' | 'anthropic' | 'cerebras' | 'groq' | 'xai' | 'gemini' | 'ollama';

export interface AIAssistantConfig {
  provider: AIAssistantProvider;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CodeCompletionRequest {
  code: string;
  language: string;
  cursorPosition: { line: number; column: number };
  prefix: string;
  suffix: string;
  filename?: string;
}

export interface CodeCompletionResult {
  suggestions: CompletionSuggestion[];
  cacheHit?: boolean;
}

export interface CompletionSuggestion {
  text: string;
  displayText: string;
  insertText: string;
  kind: 'snippet' | 'function' | 'variable' | 'class' | 'keyword' | 'text';
  detail?: string;
  documentation?: string;
  sortText?: string;
}

export interface CodeReviewRequest {
  code: string;
  language: string;
  filename?: string;
  context?: string;
  reviewType?: 'full' | 'security' | 'performance' | 'style' | 'bugs';
}

export interface CodeReviewResult {
  summary: string;
  score: number; // 0-100
  issues: CodeReviewIssue[];
  suggestions: CodeReviewSuggestion[];
  metrics?: CodeMetrics;
}

export interface CodeReviewIssue {
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  code?: string;
  source: string;
  fix?: string;
}

export interface CodeReviewSuggestion {
  title: string;
  description: string;
  before?: string;
  after?: string;
  impact: 'high' | 'medium' | 'low';
}

export interface CodeMetrics {
  complexity: number;
  maintainability: number;
  testability: number;
  linesOfCode: number;
  commentRatio: number;
}

export interface DocumentationRequest {
  code: string;
  language: string;
  style?: 'jsdoc' | 'tsdoc' | 'docstring' | 'javadoc' | 'markdown';
  includeExamples?: boolean;
  includeTypes?: boolean;
}

export interface DocumentationResult {
  documentation: string;
  summary: string;
  params?: ParamDoc[];
  returns?: string;
  examples?: string[];
  throws?: string[];
}

export interface ParamDoc {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
  defaultValue?: string;
}

export interface ExplanationRequest {
  code: string;
  language: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  focusArea?: 'logic' | 'syntax' | 'concepts' | 'all';
}

export interface ExplanationResult {
  summary: string;
  lineByLine: LineExplanation[];
  concepts: ConceptExplanation[];
  relatedTopics?: string[];
}

export interface LineExplanation {
  lineNumber: number;
  code: string;
  explanation: string;
}

export interface ConceptExplanation {
  concept: string;
  description: string;
  examples?: string[];
}

export interface SecurityScanRequest {
  code: string;
  language: string;
  filename?: string;
  scanType?: 'all' | 'owasp' | 'cwe' | 'custom';
}

export interface SecurityScanResult {
  vulnerabilities: SecurityVulnerability[];
  riskScore: number; // 0-100, higher = more risk
  summary: string;
  recommendations: string[];
}

export interface SecurityVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  line?: number;
  column?: number;
  cwe?: string;
  owasp?: string;
  fix?: string;
  references?: string[];
}

export interface RefactorRequest {
  code: string;
  language: string;
  refactorType: 'extract-function' | 'rename' | 'inline' | 'simplify' | 'modernize' | 'optimize';
  selection?: { startLine: number; endLine: number };
  newName?: string;
}

export interface RefactorResult {
  refactoredCode: string;
  changes: RefactorChange[];
  explanation: string;
}

export interface RefactorChange {
  type: 'replace' | 'insert' | 'delete';
  startLine: number;
  endLine: number;
  oldText?: string;
  newText?: string;
}

// ============================================================================
// Provider Configurations
// ============================================================================

const PROVIDER_CONFIGS: Record<AIAssistantProvider, { 
  baseUrl: string; 
  models: string[];
  defaultModel: string;
  headers: (apiKey: string) => Record<string, string>;
}> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini'],
    defaultModel: 'gpt-4o-mini',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    defaultModel: 'claude-3-5-sonnet-20241022',
    headers: (apiKey) => ({
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    }),
  },
  cerebras: {
    baseUrl: 'https://api.cerebras.ai/v1',
    models: ['llama-3.3-70b', 'llama-3.1-8b', 'llama-3.1-70b'],
    defaultModel: 'llama-3.3-70b',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    defaultModel: 'llama-3.3-70b-versatile',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
  },
  xai: {
    baseUrl: 'https://api.x.ai/v1',
    models: ['grok-2', 'grok-2-mini', 'grok-beta'],
    defaultModel: 'grok-2',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    defaultModel: 'gemini-2.0-flash',
    headers: () => ({
      'Content-Type': 'application/json',
    }),
  },
  ollama: {
    baseUrl: 'http://localhost:11434/api',
    models: ['llama3.2', 'codellama', 'deepseek-coder', 'qwen2.5-coder', 'mistral'],
    defaultModel: 'codellama',
    headers: () => ({
      'Content-Type': 'application/json',
    }),
  },
};

// ============================================================================
// System Prompts
// ============================================================================

const COMPLETION_PROMPT = `You are an expert code completion assistant. Given the code context, provide intelligent completions.

Rules:
1. Complete code naturally based on context
2. Follow the existing code style and conventions
3. Provide multiple suggestions when applicable
4. Include proper indentation
5. Consider imports and dependencies

Return completions as JSON array:
[{"text": "completion text", "kind": "function|variable|snippet", "detail": "brief description"}]`;

const CODE_REVIEW_PROMPT = `You are an expert code reviewer. Analyze the code and provide:
1. Overall quality score (0-100)
2. Issues found (bugs, bad practices, security concerns)
3. Improvement suggestions
4. Code metrics if applicable

Be specific with line numbers. Focus on:
- Logic errors and potential bugs
- Security vulnerabilities
- Performance issues
- Code style and best practices
- Maintainability

Return JSON:
{
  "summary": "brief summary",
  "score": 85,
  "issues": [{"severity": "warning", "message": "...", "line": 10, "source": "style"}],
  "suggestions": [{"title": "...", "description": "...", "impact": "medium"}],
  "metrics": {"complexity": 5, "maintainability": 80, "testability": 70, "linesOfCode": 50, "commentRatio": 0.15}
}`;

const DOCUMENTATION_PROMPT = `You are an expert technical writer. Generate comprehensive documentation for the given code.

Include:
1. Summary description
2. Parameter documentation with types
3. Return value documentation
4. Usage examples
5. Edge cases and exceptions

Use the specified documentation style (JSDoc, TSDoc, Docstring, etc.).
Return well-formatted documentation that can be directly inserted into the code.`;

const EXPLANATION_PROMPT = `You are an expert programming teacher. Explain the given code in a clear, educational manner.

Provide:
1. High-level summary
2. Line-by-line explanation
3. Key concepts used
4. Related topics for further learning

Adjust complexity based on the specified level (beginner/intermediate/advanced).
Be thorough but concise.`;

const SECURITY_SCAN_PROMPT = `You are a security expert. Analyze the code for vulnerabilities.

Check for:
1. OWASP Top 10 vulnerabilities
2. CWE common weaknesses
3. Language-specific security issues
4. Injection attacks (SQL, XSS, Command)
5. Authentication/Authorization issues
6. Cryptographic weaknesses
7. Data exposure risks
8. Dependency vulnerabilities

Return JSON:
{
  "vulnerabilities": [{
    "id": "SEC-001",
    "severity": "high",
    "title": "SQL Injection",
    "description": "...",
    "line": 25,
    "cwe": "CWE-89",
    "owasp": "A03:2021",
    "fix": "Use parameterized queries"
  }],
  "riskScore": 65,
  "summary": "Found 3 vulnerabilities...",
  "recommendations": ["Use prepared statements", "Sanitize user input"]
}`;

const REFACTOR_PROMPT = `You are an expert code refactoring assistant. Improve the given code while maintaining functionality.

Focus on:
1. Clarity and readability
2. Performance optimization
3. Modern language features
4. DRY principles
5. SOLID principles

Return the refactored code with explanations of changes made.`;

// ============================================================================
// AI Code Assistant Class
// ============================================================================

class AICodeAssistantService {
  private config: AIAssistantConfig | null = null;
  private cache: Map<string, { result: any; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Configure the AI assistant
   */
  configure(config: AIAssistantConfig): void {
    this.config = config;
  }

  /**
   * Get available providers
   */
  getProviders(): { id: AIAssistantProvider; name: string; models: string[] }[] {
    return [
      { id: 'openai', name: 'OpenAI', models: PROVIDER_CONFIGS.openai.models },
      { id: 'anthropic', name: 'Anthropic', models: PROVIDER_CONFIGS.anthropic.models },
      { id: 'cerebras', name: 'Cerebras', models: PROVIDER_CONFIGS.cerebras.models },
      { id: 'groq', name: 'Groq', models: PROVIDER_CONFIGS.groq.models },
      { id: 'xai', name: 'xAI', models: PROVIDER_CONFIGS.xai.models },
      { id: 'gemini', name: 'Google Gemini', models: PROVIDER_CONFIGS.gemini.models },
      { id: 'ollama', name: 'Ollama (Local)', models: PROVIDER_CONFIGS.ollama.models },
    ];
  }

  /**
   * Get models for a provider
   */
  getModels(provider: AIAssistantProvider): string[] {
    return PROVIDER_CONFIGS[provider]?.models || [];
  }

  // ============================================================================
  // Core API Call Method
  // ============================================================================

  private async callAPI(
    systemPrompt: string,
    userPrompt: string,
    config?: Partial<AIAssistantConfig>
  ): Promise<string> {
    const activeConfig = { ...this.config, ...config } as AIAssistantConfig;
    
    if (!activeConfig?.apiKey && activeConfig?.provider !== 'ollama') {
      throw new Error(`API key required for ${activeConfig?.provider || 'unknown provider'}`);
    }

    const providerConfig = PROVIDER_CONFIGS[activeConfig.provider];
    if (!providerConfig) {
      throw new Error(`Unknown provider: ${activeConfig.provider}`);
    }

    const model = activeConfig.model || providerConfig.defaultModel;
    const temperature = activeConfig.temperature ?? 0.3;
    const maxTokens = activeConfig.maxTokens ?? 4096;

    // Provider-specific API calls
    switch (activeConfig.provider) {
      case 'gemini':
        return this.callGemini(activeConfig.apiKey, model, systemPrompt, userPrompt, temperature, maxTokens);
      case 'anthropic':
        return this.callAnthropic(activeConfig.apiKey, model, systemPrompt, userPrompt, temperature, maxTokens);
      case 'ollama':
        return this.callOllama(model, systemPrompt, userPrompt, temperature);
      default:
        // OpenAI-compatible API (OpenAI, Cerebras, Groq, xAI)
        return this.callOpenAICompatible(
          providerConfig.baseUrl,
          activeConfig.apiKey,
          model,
          systemPrompt,
          userPrompt,
          temperature,
          maxTokens,
          providerConfig.headers(activeConfig.apiKey)
        );
    }
  }

  private async callOpenAICompatible(
    baseUrl: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number,
    headers: Record<string, string>
  ): Promise<string> {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private async callGemini(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async callAnthropic(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  private async callOllama(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    temperature: number
  ): Promise<string> {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        stream: false,
        options: { temperature },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response || '';
  }

  // ============================================================================
  // Code Completion
  // ============================================================================

  async getCompletions(request: CodeCompletionRequest): Promise<CodeCompletionResult> {
    const cacheKey = `completion:${request.prefix.slice(-100)}:${request.language}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return { ...cached, cacheHit: true };

    const prompt = `Language: ${request.language}
File: ${request.filename || 'untitled'}
Cursor at line ${request.cursorPosition.line}, column ${request.cursorPosition.column}

Code before cursor:
\`\`\`${request.language}
${request.prefix.slice(-500)}
\`\`\`

Code after cursor:
\`\`\`${request.language}
${request.suffix.slice(0, 200)}
\`\`\`

Provide 3-5 intelligent completions.`;

    try {
      const response = await this.callAPI(COMPLETION_PROMPT, prompt);
      const suggestions = this.parseJSONResponse<CompletionSuggestion[]>(response) || [];
      
      const result: CodeCompletionResult = {
        suggestions: suggestions.map(s => ({
          text: s.text || '',
          displayText: s.displayText || s.text || '',
          insertText: s.insertText || s.text || '',
          kind: s.kind || 'text',
          detail: s.detail,
          documentation: s.documentation,
        })),
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[AI Completion] Error:', error);
      return { suggestions: [] };
    }
  }

  // ============================================================================
  // Code Review
  // ============================================================================

  async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResult> {
    const prompt = `Review the following ${request.language} code:

${request.context ? `Context: ${request.context}\n\n` : ''}
File: ${request.filename || 'untitled'}
Review Type: ${request.reviewType || 'full'}

\`\`\`${request.language}
${request.code}
\`\`\`

Provide a comprehensive code review.`;

    try {
      const response = await this.callAPI(CODE_REVIEW_PROMPT, prompt);
      return this.parseJSONResponse<CodeReviewResult>(response) || {
        summary: 'Unable to parse review results',
        score: 0,
        issues: [],
        suggestions: [],
      };
    } catch (error) {
      console.error('[AI Review] Error:', error);
      throw error;
    }
  }

  // ============================================================================
  // Documentation Generation
  // ============================================================================

  async generateDocumentation(request: DocumentationRequest): Promise<DocumentationResult> {
    const prompt = `Generate ${request.style || 'jsdoc'} documentation for this ${request.language} code:

\`\`\`${request.language}
${request.code}
\`\`\`

${request.includeExamples ? 'Include usage examples.' : ''}
${request.includeTypes ? 'Include type annotations.' : ''}

Return the complete documentation that can be inserted before the code.`;

    try {
      const response = await this.callAPI(DOCUMENTATION_PROMPT, prompt);
      
      // Parse structured response or return raw documentation
      const parsed = this.parseJSONResponse<DocumentationResult>(response);
      if (parsed) return parsed;

      return {
        documentation: response,
        summary: response.split('\n')[0] || 'Documentation generated',
      };
    } catch (error) {
      console.error('[AI Documentation] Error:', error);
      throw error;
    }
  }

  // ============================================================================
  // Code Explanation
  // ============================================================================

  async explainCode(request: ExplanationRequest): Promise<ExplanationResult> {
    const prompt = `Explain this ${request.language} code for a ${request.level || 'intermediate'} developer:

\`\`\`${request.language}
${request.code}
\`\`\`

Focus on: ${request.focusArea || 'all aspects'}

Provide:
1. A high-level summary
2. Line-by-line explanations
3. Key programming concepts used

Return as JSON:
{
  "summary": "...",
  "lineByLine": [{"lineNumber": 1, "code": "...", "explanation": "..."}],
  "concepts": [{"concept": "...", "description": "..."}],
  "relatedTopics": ["..."]
}`;

    try {
      const response = await this.callAPI(EXPLANATION_PROMPT, prompt);
      return this.parseJSONResponse<ExplanationResult>(response) || {
        summary: response,
        lineByLine: [],
        concepts: [],
      };
    } catch (error) {
      console.error('[AI Explanation] Error:', error);
      throw error;
    }
  }

  // ============================================================================
  // Security Scanning
  // ============================================================================

  async scanSecurity(request: SecurityScanRequest): Promise<SecurityScanResult> {
    const prompt = `Perform a security scan on this ${request.language} code:

File: ${request.filename || 'untitled'}
Scan Type: ${request.scanType || 'all'}

\`\`\`${request.language}
${request.code}
\`\`\`

Check for all security vulnerabilities including OWASP Top 10 and CWE common weaknesses.`;

    try {
      const response = await this.callAPI(SECURITY_SCAN_PROMPT, prompt);
      return this.parseJSONResponse<SecurityScanResult>(response) || {
        vulnerabilities: [],
        riskScore: 0,
        summary: 'Unable to parse security scan results',
        recommendations: [],
      };
    } catch (error) {
      console.error('[AI Security] Error:', error);
      throw error;
    }
  }

  // ============================================================================
  // Code Refactoring
  // ============================================================================

  async refactorCode(request: RefactorRequest): Promise<RefactorResult> {
    const selectionInfo = request.selection 
      ? `Focus on lines ${request.selection.startLine}-${request.selection.endLine}.`
      : '';

    const prompt = `Refactor this ${request.language} code.

Refactor Type: ${request.refactorType}
${request.newName ? `New name: ${request.newName}` : ''}
${selectionInfo}

\`\`\`${request.language}
${request.code}
\`\`\`

Return the refactored code and explain the changes.`;

    try {
      const response = await this.callAPI(REFACTOR_PROMPT, prompt);
      
      // Extract code block from response
      const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
      const refactoredCode = codeMatch ? codeMatch[1].trim() : request.code;
      const explanation = response.replace(/```[\w]*\n[\s\S]*?```/g, '').trim();

      return {
        refactoredCode,
        changes: [],
        explanation,
      };
    } catch (error) {
      console.error('[AI Refactor] Error:', error);
      throw error;
    }
  }

  // ============================================================================
  // Quick Actions
  // ============================================================================

  async generateTests(code: string, language: string, framework?: string): Promise<string> {
    const prompt = `Generate comprehensive unit tests for this ${language} code using ${framework || 'the standard testing framework'}:

\`\`\`${language}
${code}
\`\`\`

Include:
- Happy path tests
- Edge cases
- Error handling tests
- Mocking if needed`;

    return this.callAPI(
      'You are an expert test engineer. Generate comprehensive, well-structured tests.',
      prompt
    );
  }

  async optimizeCode(code: string, language: string): Promise<string> {
    const prompt = `Optimize this ${language} code for better performance:

\`\`\`${language}
${code}
\`\`\`

Focus on:
- Time complexity
- Space complexity
- Memory usage
- Modern language features`;

    return this.callAPI(
      'You are a performance optimization expert. Improve code efficiency.',
      prompt
    );
  }

  async fixBugs(code: string, language: string, errorMessage?: string): Promise<string> {
    const prompt = `Fix the bugs in this ${language} code:

\`\`\`${language}
${code}
\`\`\`

${errorMessage ? `Error message: ${errorMessage}` : ''}

Identify and fix all bugs, explaining each fix.`;

    return this.callAPI(
      'You are an expert debugger. Find and fix all bugs in the code.',
      prompt
    );
  }

  async convertLanguage(code: string, fromLang: string, toLang: string): Promise<string> {
    const prompt = `Convert this ${fromLang} code to ${toLang}:

\`\`\`${fromLang}
${code}
\`\`\`

Maintain the same functionality and follow ${toLang} best practices.`;

    return this.callAPI(
      'You are an expert polyglot programmer. Convert code between languages.',
      prompt
    );
  }

  // ============================================================================
  // Inline Suggestions (for editor integration)
  // ============================================================================

  async getInlineSuggestion(
    code: string,
    language: string,
    position: { line: number; column: number }
  ): Promise<string | null> {
    const lines = code.split('\n');
    const currentLine = lines[position.line - 1] || '';
    const prefix = currentLine.slice(0, position.column);

    // Quick pattern-based suggestions for common cases
    if (prefix.endsWith('//')) {
      return ' TODO: ';
    }
    if (prefix.match(/^\s*if\s*\(/)) {
      return ' {\n  \n}';
    }
    if (prefix.match(/^\s*for\s*\(/)) {
      return 'let i = 0; i < length; i++) {\n  \n}';
    }

    // Use AI for more complex suggestions
    try {
      const response = await this.getCompletions({
        code,
        language,
        cursorPosition: position,
        prefix: lines.slice(0, position.line).join('\n'),
        suffix: lines.slice(position.line).join('\n'),
      });

      return response.suggestions[0]?.insertText || null;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private parseJSONResponse<T>(response: string): T | null {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch {
      return null;
    }
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }
    return null;
  }

  private setCache(key: string, result: any): void {
    this.cache.set(key, { result, timestamp: Date.now() });
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const aiCodeAssistant = new AICodeAssistantService();
export default aiCodeAssistant;
