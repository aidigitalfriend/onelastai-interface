/**
 * AI Extension Layer
 * 
 * This is the BRAIN + CONTROLLER between Editor and AI Backend.
 * 
 * Architecture (NEVER mix these):
 * ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
 * │   Editor Core   │ ←── │  AI Extension   │ ←── │   AI Backend    │
 * │  (hands/tools)  │     │ (brain/control) │     │   (thinking)    │
 * └─────────────────┘     └─────────────────┘     └─────────────────┘
 * 
 * Key Rules:
 * - Editor Core: NEVER contains AI logic, only provides capabilities
 * - AI Extension: Validates, decides, controls what AI can do
 * - AI Backend: Only receives context, returns suggestions/plans
 * 
 * AI NEVER directly edits anything.
 * Flow: AI → suggestion → Extension validates → Editor applies
 */

import { extensionEvents } from './extensions';
import { aiService } from './ai';
import type { AIConfig, ChatMessage } from '../types';

// =============================================================================
// PART 1: TOOL DEFINITIONS (What AI can request)
// =============================================================================

/**
 * Tool definitions exposed to AI
 * AI can REQUEST to use these - Extension APPROVES and EXECUTES
 */
export interface AITool {
  name: string;
  description: string;
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required: boolean;
  }[];
  requiresConfirmation: boolean; // User consent required?
  dangerous: boolean; // Can cause data loss?
}

export const AI_TOOLS: AITool[] = [
  // === Text Operations ===
  {
    name: 'replaceLines',
    description: 'Replace lines in the active file with new content',
    parameters: [
      { name: 'startLine', type: 'number', description: 'Start line number (1-indexed)', required: true },
      { name: 'endLine', type: 'number', description: 'End line number (1-indexed, inclusive)', required: true },
      { name: 'newContent', type: 'string', description: 'New content to replace with', required: true },
    ],
    requiresConfirmation: false,
    dangerous: false,
  },
  {
    name: 'insertAt',
    description: 'Insert text at a specific position',
    parameters: [
      { name: 'line', type: 'number', description: 'Line number to insert at', required: true },
      { name: 'column', type: 'number', description: 'Column position', required: true },
      { name: 'text', type: 'string', description: 'Text to insert', required: true },
    ],
    requiresConfirmation: false,
    dangerous: false,
  },
  {
    name: 'deleteRange',
    description: 'Delete text in a range',
    parameters: [
      { name: 'startLine', type: 'number', description: 'Start line', required: true },
      { name: 'startColumn', type: 'number', description: 'Start column', required: true },
      { name: 'endLine', type: 'number', description: 'End line', required: true },
      { name: 'endColumn', type: 'number', description: 'End column', required: true },
    ],
    requiresConfirmation: false,
    dangerous: false,
  },
  {
    name: 'appendToFile',
    description: 'Append content to the end of the file',
    parameters: [
      { name: 'content', type: 'string', description: 'Content to append', required: true },
    ],
    requiresConfirmation: false,
    dangerous: false,
  },

  // === File Operations ===
  {
    name: 'createFile',
    description: 'Create a new file with content',
    parameters: [
      { name: 'path', type: 'string', description: 'File path relative to workspace', required: true },
      { name: 'content', type: 'string', description: 'File content', required: true },
    ],
    requiresConfirmation: true,
    dangerous: false,
  },
  {
    name: 'deleteFile',
    description: 'Delete a file from the workspace',
    parameters: [
      { name: 'path', type: 'string', description: 'File path to delete', required: true },
    ],
    requiresConfirmation: true,
    dangerous: true,
  },
  {
    name: 'renameFile',
    description: 'Rename or move a file',
    parameters: [
      { name: 'oldPath', type: 'string', description: 'Current file path', required: true },
      { name: 'newPath', type: 'string', description: 'New file path', required: true },
    ],
    requiresConfirmation: true,
    dangerous: false,
  },
  {
    name: 'readFile',
    description: 'Read contents of a file',
    parameters: [
      { name: 'path', type: 'string', description: 'File path to read', required: true },
    ],
    requiresConfirmation: false,
    dangerous: false,
  },

  // === Build & Run ===
  {
    name: 'runCommand',
    description: 'Run a terminal command',
    parameters: [
      { name: 'command', type: 'string', description: 'Command to execute', required: true },
      { name: 'cwd', type: 'string', description: 'Working directory', required: false },
    ],
    requiresConfirmation: true,
    dangerous: true,
  },
  {
    name: 'runBuild',
    description: 'Run the project build command',
    parameters: [],
    requiresConfirmation: true,
    dangerous: false,
  },
  {
    name: 'runTests',
    description: 'Run the project test suite',
    parameters: [
      { name: 'testPattern', type: 'string', description: 'Test file pattern', required: false },
    ],
    requiresConfirmation: false,
    dangerous: false,
  },

  // === Navigation ===
  {
    name: 'openFile',
    description: 'Open a file in the editor',
    parameters: [
      { name: 'path', type: 'string', description: 'File path to open', required: true },
      { name: 'line', type: 'number', description: 'Line to jump to', required: false },
    ],
    requiresConfirmation: false,
    dangerous: false,
  },
  {
    name: 'goToLine',
    description: 'Move cursor to a specific line',
    parameters: [
      { name: 'line', type: 'number', description: 'Line number', required: true },
      { name: 'column', type: 'number', description: 'Column number', required: false },
    ],
    requiresConfirmation: false,
    dangerous: false,
  },

  // === Search ===
  {
    name: 'searchInFiles',
    description: 'Search for text across workspace files',
    parameters: [
      { name: 'query', type: 'string', description: 'Search query', required: true },
      { name: 'isRegex', type: 'boolean', description: 'Use regex', required: false },
      { name: 'includePattern', type: 'string', description: 'File pattern to include', required: false },
    ],
    requiresConfirmation: false,
    dangerous: false,
  },
  {
    name: 'findAndReplace',
    description: 'Find and replace text in the active file',
    parameters: [
      { name: 'find', type: 'string', description: 'Text to find', required: true },
      { name: 'replace', type: 'string', description: 'Replacement text', required: true },
      { name: 'isRegex', type: 'boolean', description: 'Use regex', required: false },
      { name: 'replaceAll', type: 'boolean', description: 'Replace all occurrences', required: false },
    ],
    requiresConfirmation: false,
    dangerous: false,
  },

  // === UI ===
  {
    name: 'showMessage',
    description: 'Show a notification message to the user',
    parameters: [
      { name: 'message', type: 'string', description: 'Message to show', required: true },
      { name: 'type', type: 'string', description: 'Message type: info, warning, error', required: false },
    ],
    requiresConfirmation: false,
    dangerous: false,
  },
  {
    name: 'askConfirmation',
    description: 'Ask user for confirmation',
    parameters: [
      { name: 'question', type: 'string', description: 'Question to ask', required: true },
      { name: 'options', type: 'array', description: 'Options to choose from', required: false },
    ],
    requiresConfirmation: false,
    dangerous: false,
  },
];

// =============================================================================
// PART 2: ACTION TYPES (What AI outputs)
// =============================================================================

/**
 * AI outputs action requests - NEVER direct edits
 */
export interface AIAction {
  id: string;
  action: string;
  args: Record<string, any>;
  reasoning?: string;
}

export interface AIActionPlan {
  planId: string;
  description: string;
  actions: AIAction[];
  requiresConfirmation: boolean;
  estimatedImpact: 'low' | 'medium' | 'high';
}

export interface ActionResult {
  actionId: string;
  success: boolean;
  result?: any;
  error?: string;
}

export interface PlanExecutionResult {
  planId: string;
  success: boolean;
  results: ActionResult[];
  undoAvailable: boolean;
}

// =============================================================================
// PART 3: EDITOR CAPABILITY INTERFACE (Safe access to editor)
// =============================================================================

/**
 * These are the ONLY things AI Extension can do to the editor.
 * Editor Core provides these capabilities - Extension calls them.
 */
export interface EditorCapabilities {
  // Text operations
  getText(): string;
  getLine(lineNumber: number): string;
  getLineCount(): number;
  getSelection(): { text: string; startLine: number; endLine: number } | null;
  
  // Edit operations (always go through editor for undo support)
  executeEdits(edits: Array<{
    range: { startLine: number; startColumn: number; endLine: number; endColumn: number };
    text: string;
  }>): boolean;
  
  // File operations
  getActiveFilePath(): string | null;
  openFile(path: string): Promise<boolean>;
  createFile(path: string, content: string): Promise<boolean>;
  deleteFile(path: string): Promise<boolean>;
  renameFile(oldPath: string, newPath: string): Promise<boolean>;
  readFile(path: string): Promise<string | null>;
  listFiles(pattern?: string): Promise<string[]>;
  
  // Navigation
  setCursorPosition(line: number, column: number): void;
  revealLine(line: number): void;
  
  // Terminal
  executeCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  
  // UI
  showNotification(message: string, type: 'info' | 'warning' | 'error'): void;
  showConfirmDialog(message: string, options?: string[]): Promise<string | boolean>;
  
  // Undo
  pushUndoStop(): void;
  undo(): void;
  redo(): void;
}

// =============================================================================
// PART 4: AI EXTENSION CLASS (The Brain + Controller)
// =============================================================================

type PermissionLevel = 'readonly' | 'edit' | 'full';
type ActionApprovalCallback = (action: AIAction) => Promise<boolean>;

class AIExtensionController {
  private editorCapabilities: EditorCapabilities | null = null;
  private permissionLevel: PermissionLevel = 'edit';
  private actionHistory: AIAction[] = [];
  private undoStack: AIActionPlan[] = [];
  private approvalCallback: ActionApprovalCallback | null = null;
  private isExecuting = false;
  
  // AI config
  private aiConfig: AIConfig = {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    apiKey: '',
    temperature: 0.3,
    maxTokens: 2048,
  };

  constructor() {
    this.setupEventListeners();
  }

  // =========================================================================
  // Initialization
  // =========================================================================

  /**
   * Connect to editor capabilities
   * Editor Core provides these - Extension uses them
   */
  connect(capabilities: EditorCapabilities) {
    this.editorCapabilities = capabilities;
    console.log('[AI Extension] Connected to editor capabilities');
  }

  /**
   * Set permission level for AI
   */
  setPermissionLevel(level: PermissionLevel) {
    this.permissionLevel = level;
    console.log(`[AI Extension] Permission level set to: ${level}`);
  }

  /**
   * Set approval callback for dangerous actions
   */
  setApprovalCallback(callback: ActionApprovalCallback) {
    this.approvalCallback = callback;
  }

  /**
   * Configure AI backend
   */
  configureAI(config: Partial<AIConfig>) {
    this.aiConfig = { ...this.aiConfig, ...config };
  }

  // =========================================================================
  // Main Entry Point: AI Request Processing
  // =========================================================================

  /**
   * Process a user request through AI
   * This is the main entry point for AI interactions
   */
  async processRequest(userRequest: string, context?: string): Promise<AIActionPlan | null> {
    if (!this.editorCapabilities) {
      throw new Error('AI Extension not connected to editor');
    }

    // Step 1: Gather context from editor
    const editorContext = this.gatherContext();
    
    // Step 2: Build prompt with tools and context
    const prompt = this.buildPrompt(userRequest, editorContext, context);
    
    // Step 3: Send to AI backend
    const messages: ChatMessage[] = [
      { id: `ai-ext-${Date.now()}`, role: 'user', content: prompt, timestamp: Date.now() }
    ];
    
    try {
      const response = await aiService.sendMessage(this.aiConfig, messages);
      
      // Step 4: Parse AI response into action plan
      const plan = this.parseAIResponse(response.content);
      
      if (plan) {
        // Step 5: Validate the plan
        const validationResult = this.validatePlan(plan);
        if (!validationResult.valid) {
          console.error('[AI Extension] Plan validation failed:', validationResult.errors);
          return null;
        }
        
        return plan;
      }
      
      return null;
    } catch (error: any) {
      console.error('[AI Extension] AI request failed:', error.message);
      return null;
    }
  }

  /**
   * Execute an action plan
   * This is where AI requests become editor changes
   */
  async executePlan(plan: AIActionPlan): Promise<PlanExecutionResult> {
    if (!this.editorCapabilities) {
      return {
        planId: plan.planId,
        success: false,
        results: [],
        undoAvailable: false,
      };
    }

    if (this.isExecuting) {
      throw new Error('Another plan is currently executing');
    }

    this.isExecuting = true;
    const results: ActionResult[] = [];
    
    try {
      // Push undo stop before making changes
      this.editorCapabilities.pushUndoStop();
      
      // Check if plan needs confirmation
      if (plan.requiresConfirmation) {
        const approved = await this.requestPlanApproval(plan);
        if (!approved) {
          return {
            planId: plan.planId,
            success: false,
            results: [{ actionId: 'plan', success: false, error: 'User rejected plan' }],
            undoAvailable: false,
          };
        }
      }

      // Execute each action
      for (const action of plan.actions) {
        const result = await this.executeAction(action);
        results.push(result);
        
        // Stop on first failure
        if (!result.success) {
          break;
        }
        
        // Record in history
        this.actionHistory.push(action);
      }

      // Push undo stop after changes
      this.editorCapabilities.pushUndoStop();
      
      // Save plan for potential undo
      this.undoStack.push(plan);

      const allSucceeded = results.every(r => r.success);
      
      return {
        planId: plan.planId,
        success: allSucceeded,
        results,
        undoAvailable: true,
      };
      
    } finally {
      this.isExecuting = false;
    }
  }

  // =========================================================================
  // Action Execution (Extension validates and executes)
  // =========================================================================

  private async executeAction(action: AIAction): Promise<ActionResult> {
    const editor = this.editorCapabilities!;
    
    // Check permissions
    const tool = AI_TOOLS.find(t => t.name === action.action);
    if (!tool) {
      return { actionId: action.id, success: false, error: `Unknown action: ${action.action}` };
    }
    
    // Check if action requires confirmation
    if (tool.requiresConfirmation && this.approvalCallback) {
      const approved = await this.approvalCallback(action);
      if (!approved) {
        return { actionId: action.id, success: false, error: 'Action rejected by user' };
      }
    }
    
    // Check permission level
    if (this.permissionLevel === 'readonly' && tool.dangerous) {
      return { actionId: action.id, success: false, error: 'Insufficient permissions' };
    }

    try {
      switch (action.action) {
        // === Text Operations ===
        case 'replaceLines': {
          const { startLine, endLine, newContent } = action.args;
          const success = editor.executeEdits([{
            range: {
              startLine,
              startColumn: 1,
              endLine,
              endColumn: editor.getLine(endLine)?.length + 1 || 1,
            },
            text: newContent,
          }]);
          return { actionId: action.id, success, result: { linesReplaced: endLine - startLine + 1 } };
        }

        case 'insertAt': {
          const { line, column, text } = action.args;
          const success = editor.executeEdits([{
            range: { startLine: line, startColumn: column, endLine: line, endColumn: column },
            text,
          }]);
          return { actionId: action.id, success, result: { inserted: text.length } };
        }

        case 'deleteRange': {
          const { startLine, startColumn, endLine, endColumn } = action.args;
          const success = editor.executeEdits([{
            range: { startLine, startColumn, endLine, endColumn },
            text: '',
          }]);
          return { actionId: action.id, success };
        }

        case 'appendToFile': {
          const { content } = action.args;
          const lineCount = editor.getLineCount();
          const lastLine = editor.getLine(lineCount);
          const success = editor.executeEdits([{
            range: {
              startLine: lineCount,
              startColumn: lastLine.length + 1,
              endLine: lineCount,
              endColumn: lastLine.length + 1,
            },
            text: '\n' + content,
          }]);
          return { actionId: action.id, success };
        }

        // === File Operations ===
        case 'createFile': {
          const { path, content } = action.args;
          const success = await editor.createFile(path, content);
          return { actionId: action.id, success, result: { path } };
        }

        case 'deleteFile': {
          const { path } = action.args;
          const success = await editor.deleteFile(path);
          return { actionId: action.id, success, result: { path } };
        }

        case 'renameFile': {
          const { oldPath, newPath } = action.args;
          const success = await editor.renameFile(oldPath, newPath);
          return { actionId: action.id, success, result: { oldPath, newPath } };
        }

        case 'readFile': {
          const { path } = action.args;
          const content = await editor.readFile(path);
          return { actionId: action.id, success: content !== null, result: { content } };
        }

        // === Build & Run ===
        case 'runCommand': {
          const { command, cwd } = action.args;
          const result = await editor.executeCommand(command, cwd);
          return { 
            actionId: action.id, 
            success: result.exitCode === 0, 
            result,
          };
        }

        case 'runBuild': {
          const result = await editor.executeCommand('npm run build');
          return { actionId: action.id, success: result.exitCode === 0, result };
        }

        case 'runTests': {
          const { testPattern } = action.args;
          const cmd = testPattern ? `npm test -- ${testPattern}` : 'npm test';
          const result = await editor.executeCommand(cmd);
          return { actionId: action.id, success: result.exitCode === 0, result };
        }

        // === Navigation ===
        case 'openFile': {
          const { path, line } = action.args;
          const success = await editor.openFile(path);
          if (success && line) {
            editor.setCursorPosition(line, 1);
            editor.revealLine(line);
          }
          return { actionId: action.id, success };
        }

        case 'goToLine': {
          const { line, column } = action.args;
          editor.setCursorPosition(line, column || 1);
          editor.revealLine(line);
          return { actionId: action.id, success: true };
        }

        // === Search ===
        case 'searchInFiles': {
          const { query, isRegex, includePattern } = action.args;
          const files = await editor.listFiles(includePattern);
          const results: Array<{ file: string; line: number; text: string }> = [];
          
          for (const file of files.slice(0, 50)) { // Limit search scope
            const content = await editor.readFile(file);
            if (content) {
              const lines = content.split('\n');
              const pattern = isRegex ? new RegExp(query, 'gi') : null;
              
              lines.forEach((lineText, idx) => {
                const matches = pattern 
                  ? pattern.test(lineText)
                  : lineText.toLowerCase().includes(query.toLowerCase());
                if (matches) {
                  results.push({ file, line: idx + 1, text: lineText.trim() });
                }
              });
            }
          }
          
          return { actionId: action.id, success: true, result: { matches: results } };
        }

        case 'findAndReplace': {
          const { find, replace, isRegex, replaceAll } = action.args;
          const text = editor.getText();
          const pattern = isRegex ? new RegExp(find, replaceAll ? 'g' : '') : null;
          
          let newText: string;
          let count = 0;
          
          if (pattern) {
            newText = text.replace(pattern, () => { count++; return replace; });
          } else if (replaceAll) {
            newText = text.split(find).join(replace);
            count = text.split(find).length - 1;
          } else {
            const idx = text.indexOf(find);
            if (idx >= 0) {
              newText = text.slice(0, idx) + replace + text.slice(idx + find.length);
              count = 1;
            } else {
              newText = text;
            }
          }
          
          if (count > 0) {
            // Replace entire content (editor will handle this efficiently)
            const lineCount = editor.getLineCount();
            editor.executeEdits([{
              range: { startLine: 1, startColumn: 1, endLine: lineCount, endColumn: editor.getLine(lineCount).length + 1 },
              text: newText,
            }]);
          }
          
          return { actionId: action.id, success: true, result: { replacements: count } };
        }

        // === UI ===
        case 'showMessage': {
          const { message, type } = action.args;
          editor.showNotification(message, type || 'info');
          return { actionId: action.id, success: true };
        }

        case 'askConfirmation': {
          const { question, options } = action.args;
          const result = await editor.showConfirmDialog(question, options);
          return { actionId: action.id, success: true, result: { answer: result } };
        }

        default:
          return { actionId: action.id, success: false, error: `Unhandled action: ${action.action}` };
      }
    } catch (error: any) {
      return { actionId: action.id, success: false, error: error.message };
    }
  }

  // =========================================================================
  // Context Gathering
  // =========================================================================

  private gatherContext(): string {
    if (!this.editorCapabilities) return '';
    
    const editor = this.editorCapabilities;
    const parts: string[] = [];
    
    // Active file
    const filePath = editor.getActiveFilePath();
    if (filePath) {
      parts.push(`Active file: ${filePath}`);
    }
    
    // Selection
    const selection = editor.getSelection();
    if (selection && selection.text) {
      parts.push(`Selected text (lines ${selection.startLine}-${selection.endLine}):\n${selection.text}`);
    }
    
    // File content (limited)
    const content = editor.getText();
    if (content) {
      const lines = content.split('\n');
      const preview = lines.slice(0, 100).join('\n');
      parts.push(`File content (first 100 lines):\n${preview}`);
      if (lines.length > 100) {
        parts.push(`... (${lines.length - 100} more lines)`);
      }
    }
    
    return parts.join('\n\n');
  }

  // =========================================================================
  // Prompt Building
  // =========================================================================

  private buildPrompt(userRequest: string, editorContext: string, additionalContext?: string): string {
    // Build tool descriptions
    const toolDescriptions = AI_TOOLS.map(tool => {
      const params = tool.parameters.map(p => 
        `  - ${p.name} (${p.type}${p.required ? ', required' : ''}): ${p.description}`
      ).join('\n');
      return `${tool.name}: ${tool.description}\n${params || '  (no parameters)'}`;
    }).join('\n\n');

    return `You are an AI coding assistant with access to editor tools.
You can ONLY respond with action plans using the available tools.
You CANNOT directly edit files - you must use the tools provided.

## Available Tools

${toolDescriptions}

## Response Format

You MUST respond with a valid JSON action plan:
{
  "planId": "unique-id",
  "description": "What this plan does",
  "actions": [
    {
      "id": "action-1",
      "action": "toolName",
      "args": { "param1": "value1" },
      "reasoning": "Why this action"
    }
  ],
  "requiresConfirmation": false,
  "estimatedImpact": "low|medium|high"
}

## Current Editor Context

${editorContext}

${additionalContext ? `## Additional Context\n\n${additionalContext}` : ''}

## User Request

${userRequest}

## Your Response (JSON only)`;
  }

  // =========================================================================
  // Response Parsing
  // =========================================================================

  private parseAIResponse(content: string): AIActionPlan | null {
    try {
      // Extract JSON from response (might be wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[AI Extension] No JSON found in response');
        return null;
      }
      
      const plan = JSON.parse(jsonMatch[0]) as AIActionPlan;
      
      // Ensure plan has required fields
      if (!plan.planId) plan.planId = `plan-${Date.now()}`;
      if (!plan.description) plan.description = 'AI generated plan';
      if (!plan.actions) plan.actions = [];
      if (plan.requiresConfirmation === undefined) plan.requiresConfirmation = false;
      if (!plan.estimatedImpact) plan.estimatedImpact = 'low';
      
      // Ensure each action has an ID
      plan.actions.forEach((action, idx) => {
        if (!action.id) action.id = `action-${idx}`;
      });
      
      return plan;
    } catch (error) {
      console.error('[AI Extension] Failed to parse AI response:', error);
      return null;
    }
  }

  // =========================================================================
  // Validation
  // =========================================================================

  private validatePlan(plan: AIActionPlan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const action of plan.actions) {
      const tool = AI_TOOLS.find(t => t.name === action.action);
      
      if (!tool) {
        errors.push(`Unknown action: ${action.action}`);
        continue;
      }
      
      // Check required parameters
      for (const param of tool.parameters) {
        if (param.required && !(param.name in action.args)) {
          errors.push(`Missing required parameter '${param.name}' for action '${action.action}'`);
        }
      }
      
      // Check permission level
      if (tool.dangerous && this.permissionLevel === 'readonly') {
        errors.push(`Action '${action.action}' requires higher permission level`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  // =========================================================================
  // Approval
  // =========================================================================

  private async requestPlanApproval(plan: AIActionPlan): Promise<boolean> {
    if (!this.editorCapabilities) return false;
    
    const actionList = plan.actions.map(a => `• ${a.action}: ${a.reasoning || 'No reason provided'}`).join('\n');
    const message = `AI wants to execute the following plan:\n\n${plan.description}\n\nActions:\n${actionList}\n\nAllow?`;
    
    const result = await this.editorCapabilities.showConfirmDialog(message, ['Allow', 'Deny']);
    return result === 'Allow' || result === true;
  }

  // =========================================================================
  // Event Listeners
  // =========================================================================

  private setupEventListeners() {
    // Listen for AI-related events from other parts of the system
    extensionEvents.on('ai:processRequest', async (data: { request: string; context?: string }) => {
      const plan = await this.processRequest(data.request, data.context);
      if (plan) {
        extensionEvents.emit('ai:planReady', plan);
      }
    });
    
    extensionEvents.on('ai:executePlan', async (plan: AIActionPlan) => {
      const result = await this.executePlan(plan);
      extensionEvents.emit('ai:planExecuted', result);
    });
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  /**
   * Get available tools (for UI display)
   */
  getAvailableTools(): AITool[] {
    return AI_TOOLS.filter(tool => {
      if (this.permissionLevel === 'readonly') {
        return !tool.dangerous;
      }
      return true;
    });
  }

  /**
   * Get action history
   */
  getActionHistory(): AIAction[] {
    return [...this.actionHistory];
  }

  /**
   * Undo last plan
   */
  async undoLastPlan(): Promise<boolean> {
    if (!this.editorCapabilities || this.undoStack.length === 0) {
      return false;
    }
    
    this.editorCapabilities.undo();
    this.undoStack.pop();
    return true;
  }

  /**
   * Clear action history
   */
  clearHistory() {
    this.actionHistory = [];
    this.undoStack = [];
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const aiExtension = new AIExtensionController();

// =============================================================================
// Helper: Create Editor Capabilities from Monaco Editor
// =============================================================================

export function createEditorCapabilities(
  editor: any, 
  monaco: any,
  fileOperations: {
    openFile: (path: string) => Promise<boolean>;
    createFile: (path: string, content: string) => Promise<boolean>;
    deleteFile: (path: string) => Promise<boolean>;
    renameFile: (oldPath: string, newPath: string) => Promise<boolean>;
    readFile: (path: string) => Promise<string | null>;
    listFiles: (pattern?: string) => Promise<string[]>;
    getActiveFilePath: () => string | null;
  },
  terminal: {
    executeCommand: (command: string, cwd?: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  },
  ui: {
    showNotification: (message: string, type: 'info' | 'warning' | 'error') => void;
    showConfirmDialog: (message: string, options?: string[]) => Promise<string | boolean>;
  }
): EditorCapabilities {
  return {
    getText: () => editor.getValue() || '',
    getLine: (lineNumber: number) => {
      const model = editor.getModel();
      return model?.getLineContent(lineNumber) || '';
    },
    getLineCount: () => {
      const model = editor.getModel();
      return model?.getLineCount() || 0;
    },
    getSelection: () => {
      const selection = editor.getSelection();
      if (!selection || selection.isEmpty()) return null;
      const model = editor.getModel();
      if (!model) return null;
      return {
        text: model.getValueInRange(selection),
        startLine: selection.startLineNumber,
        endLine: selection.endLineNumber,
      };
    },
    executeEdits: (edits) => {
      const monacoEdits = edits.map(edit => ({
        range: new monaco.Range(
          edit.range.startLine,
          edit.range.startColumn,
          edit.range.endLine,
          edit.range.endColumn
        ),
        text: edit.text,
      }));
      return editor.executeEdits('ai-extension', monacoEdits);
    },
    getActiveFilePath: fileOperations.getActiveFilePath,
    openFile: fileOperations.openFile,
    createFile: fileOperations.createFile,
    deleteFile: fileOperations.deleteFile,
    renameFile: fileOperations.renameFile,
    readFile: fileOperations.readFile,
    listFiles: fileOperations.listFiles,
    setCursorPosition: (line: number, column: number) => {
      editor.setPosition({ lineNumber: line, column });
    },
    revealLine: (line: number) => {
      editor.revealLineInCenter(line);
    },
    executeCommand: terminal.executeCommand,
    showNotification: ui.showNotification,
    showConfirmDialog: ui.showConfirmDialog,
    pushUndoStop: () => editor.pushUndoStop(),
    undo: () => editor.trigger('ai-extension', 'undo', null),
    redo: () => editor.trigger('ai-extension', 'redo', null),
  };
}
