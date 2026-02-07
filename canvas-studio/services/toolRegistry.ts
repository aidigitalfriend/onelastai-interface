/**
 * CANVAS STUDIO - UNIFIED TOOL REGISTRY
 * Central registry for all agent tools with direct EditorBridge integration
 * 
 * Architecture:
 *   Agent → Tool Registry → EditorBridge
 * 
 * The agent NEVER touches files or editor state directly.
 * It can ONLY call the tools defined here.
 */

import { getEditorBridge, EditorBridge, CursorPosition, Selection, FileNode } from './editorBridge';

// ============================================================================
// TOOL RESULT TYPES
// ============================================================================

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  execute: (...args: any[]) => ToolResult;
}

// ============================================================================
// SECURITY: PATH VALIDATION
// ============================================================================

function validatePath(path: string): boolean {
  // Prevent directory traversal attacks
  if (path.includes('..')) return false;
  if (path.startsWith('/')) return false;
  if (path.includes('\\')) return false;
  // Prevent access to hidden files
  if (path.startsWith('.') && path !== '.env.example') return false;
  return true;
}

function sanitizePath(path: string): string {
  // Remove leading/trailing slashes and normalize
  return path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
}

// ============================================================================
// FILE SYSTEM TOOLS
// ============================================================================

const fileSystemTools: Record<string, ToolDefinition> = {
  // Read file contents
  getFile: {
    name: 'getFile',
    description: 'Read the contents of a file',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'File path relative to project root' }
    ],
    execute: (path: string): ToolResult => {
      const bridge = getEditorBridge();
      const cleanPath = sanitizePath(path);
      
      if (!validatePath(cleanPath)) {
        return { success: false, error: 'Invalid path: directory traversal not allowed' };
      }
      
      const content = bridge.getFile(cleanPath);
      if (content === null) {
        return { success: false, error: `File not found: ${cleanPath}` };
      }
      
      return { success: true, data: content, message: `Read ${cleanPath}` };
    }
  },

  // Write/update file contents
  writeFile: {
    name: 'writeFile',
    description: 'Write content to a file (creates if not exists, overwrites if exists)',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'File path relative to project root' },
      { name: 'content', type: 'string', required: true, description: 'File content to write' }
    ],
    execute: (path: string, content: string): ToolResult => {
      const bridge = getEditorBridge();
      const cleanPath = sanitizePath(path);
      
      if (!validatePath(cleanPath)) {
        return { success: false, error: 'Invalid path: directory traversal not allowed' };
      }
      
      bridge.writeFile(cleanPath, content);
      return { success: true, message: `Wrote ${content.length} bytes to ${cleanPath}` };
    }
  },

  // Update file with diff/patch
  updateFile: {
    name: 'updateFile',
    description: 'Apply a diff/patch to update a file',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'File path' },
      { name: 'diff', type: 'string', required: true, description: 'Unified diff to apply' }
    ],
    execute: (path: string, diff: string): ToolResult => {
      const bridge = getEditorBridge();
      const cleanPath = sanitizePath(path);
      
      if (!validatePath(cleanPath)) {
        return { success: false, error: 'Invalid path' };
      }
      
      const success = bridge.updateFile(cleanPath, diff);
      return success 
        ? { success: true, message: `Applied diff to ${cleanPath}` }
        : { success: false, error: `Failed to apply diff to ${cleanPath}` };
    }
  },

  // Create new file
  createFile: {
    name: 'createFile',
    description: 'Create a new file with optional content',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'File path' },
      { name: 'content', type: 'string', required: false, description: 'Initial content' },
      { name: 'language', type: 'string', required: false, description: 'Language hint' }
    ],
    execute: (path: string, content: string = '', language?: string): ToolResult => {
      const bridge = getEditorBridge();
      const cleanPath = sanitizePath(path);
      
      if (!validatePath(cleanPath)) {
        return { success: false, error: 'Invalid path' };
      }
      
      if (bridge.fileExists(cleanPath)) {
        return { success: false, error: `File already exists: ${cleanPath}` };
      }
      
      bridge.createFile(cleanPath, content, language);
      return { success: true, message: `Created ${cleanPath}` };
    }
  },

  // Delete file
  deleteFile: {
    name: 'deleteFile',
    description: 'Delete a file',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'File path to delete' }
    ],
    execute: (path: string): ToolResult => {
      const bridge = getEditorBridge();
      const cleanPath = sanitizePath(path);
      
      if (!validatePath(cleanPath)) {
        return { success: false, error: 'Invalid path' };
      }
      
      if (!bridge.fileExists(cleanPath)) {
        return { success: false, error: `File not found: ${cleanPath}` };
      }
      
      bridge.deleteFile(cleanPath);
      return { success: true, message: `Deleted ${cleanPath}` };
    }
  },

  // Rename/move file
  renameFile: {
    name: 'renameFile',
    description: 'Rename or move a file',
    parameters: [
      { name: 'oldPath', type: 'string', required: true, description: 'Current file path' },
      { name: 'newPath', type: 'string', required: true, description: 'New file path' }
    ],
    execute: (oldPath: string, newPath: string): ToolResult => {
      const bridge = getEditorBridge();
      const cleanOld = sanitizePath(oldPath);
      const cleanNew = sanitizePath(newPath);
      
      if (!validatePath(cleanOld) || !validatePath(cleanNew)) {
        return { success: false, error: 'Invalid path' };
      }
      
      if (!bridge.fileExists(cleanOld)) {
        return { success: false, error: `File not found: ${cleanOld}` };
      }
      
      bridge.renameFile(cleanOld, cleanNew);
      return { success: true, message: `Renamed ${cleanOld} to ${cleanNew}` };
    }
  },

  // List files in directory
  listFiles: {
    name: 'listFiles',
    description: 'List all files in a directory',
    parameters: [
      { name: 'directory', type: 'string', required: false, description: 'Directory path (default: root)' }
    ],
    execute: (directory: string = ''): ToolResult => {
      const bridge = getEditorBridge();
      const cleanDir = directory ? sanitizePath(directory) : '';
      
      if (cleanDir && !validatePath(cleanDir)) {
        return { success: false, error: 'Invalid path' };
      }
      
      const files = bridge.listFiles(cleanDir);
      return { success: true, data: files, message: `Found ${files.length} files` };
    }
  },

  // Get project tree structure
  getProjectTree: {
    name: 'getProjectTree',
    description: 'Get the full project file tree structure',
    parameters: [],
    execute: (): ToolResult => {
      const bridge = getEditorBridge();
      const tree = bridge.getProjectTree();
      return { success: true, data: tree };
    }
  },

  // Check if file exists
  fileExists: {
    name: 'fileExists',
    description: 'Check if a file exists',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'File path to check' }
    ],
    execute: (path: string): ToolResult => {
      const bridge = getEditorBridge();
      const cleanPath = sanitizePath(path);
      
      if (!validatePath(cleanPath)) {
        return { success: false, error: 'Invalid path' };
      }
      
      const exists = bridge.fileExists(cleanPath);
      return { success: true, data: exists };
    }
  },
};

// ============================================================================
// CURSOR & SELECTION TOOLS
// ============================================================================

const cursorTools: Record<string, ToolDefinition> = {
  // Get current cursor position
  getCursorPosition: {
    name: 'getCursorPosition',
    description: 'Get the current cursor position in the active file',
    parameters: [],
    execute: (): ToolResult => {
      const bridge = getEditorBridge();
      const cursor = bridge.getCursor();
      return { success: true, data: cursor };
    }
  },

  // Set cursor position
  setCursorPosition: {
    name: 'setCursorPosition',
    description: 'Move the cursor to a specific position',
    parameters: [
      { name: 'line', type: 'number', required: true, description: 'Line number (1-based)' },
      { name: 'column', type: 'number', required: true, description: 'Column number (1-based)' }
    ],
    execute: (line: number, column: number): ToolResult => {
      const bridge = getEditorBridge();
      
      if (line < 1 || column < 1) {
        return { success: false, error: 'Line and column must be >= 1' };
      }
      
      bridge.setCursor({ line, column });
      return { success: true, message: `Cursor moved to line ${line}, column ${column}` };
    }
  },

  // Get current selection
  getSelection: {
    name: 'getSelection',
    description: 'Get the current text selection',
    parameters: [],
    execute: (): ToolResult => {
      const bridge = getEditorBridge();
      const selection = bridge.getSelection();
      
      if (!selection) {
        return { success: true, data: null, message: 'No selection' };
      }
      
      // Also get the selected text
      const selectedText = bridge.getSelectedText();
      return { 
        success: true, 
        data: { 
          ...selection, 
          text: selectedText 
        } 
      };
    }
  },

  // Set selection range
  setSelection: {
    name: 'setSelection',
    description: 'Select a range of text',
    parameters: [
      { name: 'startLine', type: 'number', required: true, description: 'Start line' },
      { name: 'startColumn', type: 'number', required: true, description: 'Start column' },
      { name: 'endLine', type: 'number', required: true, description: 'End line' },
      { name: 'endColumn', type: 'number', required: true, description: 'End column' }
    ],
    execute: (startLine: number, startColumn: number, endLine: number, endColumn: number): ToolResult => {
      const bridge = getEditorBridge();
      
      bridge.setSelection(
        { line: startLine, column: startColumn },
        { line: endLine, column: endColumn }
      );
      
      return { success: true, message: 'Selection set' };
    }
  },

  // Replace selected text
  replaceSelection: {
    name: 'replaceSelection',
    description: 'Replace the currently selected text with new text',
    parameters: [
      { name: 'text', type: 'string', required: true, description: 'Replacement text' }
    ],
    execute: (text: string): ToolResult => {
      const bridge = getEditorBridge();
      const selection = bridge.getSelection();
      
      if (!selection) {
        return { success: false, error: 'No text selected' };
      }
      
      bridge.replaceSelection(text);
      return { success: true, message: 'Selection replaced' };
    }
  },

  // Insert text at cursor
  insertAtCursor: {
    name: 'insertAtCursor',
    description: 'Insert text at the current cursor position',
    parameters: [
      { name: 'text', type: 'string', required: true, description: 'Text to insert' }
    ],
    execute: (text: string): ToolResult => {
      const bridge = getEditorBridge();
      bridge.insertAtCursor(text);
      return { success: true, message: `Inserted ${text.length} characters` };
    }
  },

  // Insert text at specific position
  insertAt: {
    name: 'insertAt',
    description: 'Insert text at a specific position',
    parameters: [
      { name: 'line', type: 'number', required: true, description: 'Line number' },
      { name: 'column', type: 'number', required: true, description: 'Column number' },
      { name: 'text', type: 'string', required: true, description: 'Text to insert' }
    ],
    execute: (line: number, column: number, text: string): ToolResult => {
      const bridge = getEditorBridge();
      bridge.insertAt({ line, column }, text);
      return { success: true, message: `Inserted at line ${line}` };
    }
  },

  // Replace range
  replaceRange: {
    name: 'replaceRange',
    description: 'Replace text in a specific range',
    parameters: [
      { name: 'startLine', type: 'number', required: true, description: 'Start line' },
      { name: 'startColumn', type: 'number', required: true, description: 'Start column' },
      { name: 'endLine', type: 'number', required: true, description: 'End line' },
      { name: 'endColumn', type: 'number', required: true, description: 'End column' },
      { name: 'text', type: 'string', required: true, description: 'Replacement text' }
    ],
    execute: (startLine: number, startColumn: number, endLine: number, endColumn: number, text: string): ToolResult => {
      const bridge = getEditorBridge();
      bridge.replaceRange(
        { line: startLine, column: startColumn },
        { line: endLine, column: endColumn },
        text
      );
      return { success: true, message: 'Range replaced' };
    }
  },

  // Delete line(s)
  deleteLine: {
    name: 'deleteLine',
    description: 'Delete a line or range of lines',
    parameters: [
      { name: 'startLine', type: 'number', required: true, description: 'Start line to delete' },
      { name: 'endLine', type: 'number', required: false, description: 'End line (for range delete)' }
    ],
    execute: (startLine: number, endLine?: number): ToolResult => {
      const bridge = getEditorBridge();
      
      if (endLine && endLine > startLine) {
        bridge.deleteLines(startLine, endLine);
        return { success: true, message: `Deleted lines ${startLine}-${endLine}` };
      } else {
        bridge.deleteLine(startLine);
        return { success: true, message: `Deleted line ${startLine}` };
      }
    }
  },
};

// ============================================================================
// EDITOR STATE TOOLS
// ============================================================================

const editorStateTools: Record<string, ToolDefinition> = {
  // Get active file
  getActiveFile: {
    name: 'getActiveFile',
    description: 'Get the currently active/open file path',
    parameters: [],
    execute: (): ToolResult => {
      const bridge = getEditorBridge();
      const activeFile = bridge.activeFile;
      return { success: true, data: activeFile };
    }
  },

  // Set active file
  setActiveFile: {
    name: 'setActiveFile',
    description: 'Open/activate a file in the editor',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'File path to open' }
    ],
    execute: (path: string): ToolResult => {
      const bridge = getEditorBridge();
      const cleanPath = sanitizePath(path);
      
      if (!validatePath(cleanPath)) {
        return { success: false, error: 'Invalid path' };
      }
      
      if (!bridge.fileExists(cleanPath)) {
        return { success: false, error: `File not found: ${cleanPath}` };
      }
      
      bridge.setActiveFile(cleanPath);
      return { success: true, message: `Opened ${cleanPath}` };
    }
  },

  // Undo last change
  undo: {
    name: 'undo',
    description: 'Undo the last edit operation',
    parameters: [],
    execute: (): ToolResult => {
      const bridge = getEditorBridge();
      bridge.undo();
      return { success: true, message: 'Undone' };
    }
  },

  // Redo last undone change
  redo: {
    name: 'redo',
    description: 'Redo the last undone operation',
    parameters: [],
    execute: (): ToolResult => {
      const bridge = getEditorBridge();
      bridge.redo();
      return { success: true, message: 'Redone' };
    }
  },

  // Get full editor context for agent
  getEditorContext: {
    name: 'getEditorContext',
    description: 'Get complete editor state for AI context',
    parameters: [],
    execute: (): ToolResult => {
      const bridge = getEditorBridge();
      const context = bridge.getAgentContext();
      return { success: true, data: context };
    }
  },

  // Search in files
  searchInFiles: {
    name: 'searchInFiles',
    description: 'Search for text across all files',
    parameters: [
      { name: 'query', type: 'string', required: true, description: 'Search query' },
      { name: 'isRegex', type: 'boolean', required: false, description: 'Treat as regex' }
    ],
    execute: (query: string, isRegex: boolean = false): ToolResult => {
      const bridge = getEditorBridge();
      const results = bridge.searchInFiles(query, isRegex);
      return { success: true, data: results, message: `Found ${results.length} matches` };
    }
  },

  // Get symbols (functions, classes, etc.)
  getSymbols: {
    name: 'getSymbols',
    description: 'Get code symbols (functions, classes, variables) from files',
    parameters: [
      { name: 'path', type: 'string', required: false, description: 'File path (default: active file)' }
    ],
    execute: (path?: string): ToolResult => {
      const bridge = getEditorBridge();
      const symbols = bridge.getSymbols(path);
      return { success: true, data: symbols };
    }
  },
};

// ============================================================================
// DEPLOY & EXPORT TOOLS (async — return __ASYNC_TOOL__ sentinel)
// ============================================================================

const deployTools: Record<string, ToolDefinition> = {
  // Check credential status for all providers
  getCredentialsStatus: {
    name: 'getCredentialsStatus',
    description: 'Check which deploy providers have valid tokens configured (Vercel, Netlify, Railway, Cloudflare, GitHub)',
    parameters: [],
    execute: (): ToolResult => {
      // Async tool — agent will process via fetch
      return { success: true, data: '__ASYNC_TOOL__:getCredentialsStatus:{}', message: 'Fetching credential status...' };
    }
  },

  // Deploy project to a cloud platform
  deployToplatform: {
    name: 'deployToplatform',
    description: 'Deploy the current project to a cloud provider (VERCEL, NETLIFY, RAILWAY, CLOUDFLARE). Requires token to be configured first via Credentials panel.',
    parameters: [
      { name: 'provider', type: 'string', required: true, description: 'Provider ID: VERCEL, NETLIFY, RAILWAY, or CLOUDFLARE' },
      { name: 'projectName', type: 'string', required: true, description: 'Project name (lowercase, hyphens only)' },
    ],
    execute: (provider: string, projectName: string): ToolResult => {
      if (!['VERCEL', 'NETLIFY', 'RAILWAY', 'CLOUDFLARE'].includes(provider)) {
        return { success: false, error: `Invalid provider: ${provider}. Use VERCEL, NETLIFY, RAILWAY, or CLOUDFLARE.` };
      }
      const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      return { success: true, data: `__ASYNC_TOOL__:deployToplatform:${JSON.stringify({ provider, projectName: safeName })}`, message: `Deploying to ${provider}...` };
    }
  },

  // Export project as ZIP
  exportAsZip: {
    name: 'exportAsZip',
    description: 'Export the current project files as a downloadable ZIP archive',
    parameters: [
      { name: 'filename', type: 'string', required: false, description: 'Optional ZIP filename (default: project-export.zip)' },
    ],
    execute: (filename?: string): ToolResult => {
      return { success: true, data: `__ASYNC_TOOL__:exportAsZip:${JSON.stringify({ filename: filename || 'project-export.zip' })}`, message: 'Preparing ZIP...' };
    }
  },

  // Push project to GitHub
  pushToGithub: {
    name: 'pushToGithub',
    description: 'Push the current project to a GitHub repository. Requires GitHub token configured via Credentials panel.',
    parameters: [
      { name: 'repoName', type: 'string', required: true, description: 'Repository name on GitHub' },
      { name: 'isPrivate', type: 'boolean', required: false, description: 'Whether the repo should be private (default: false)' },
    ],
    execute: (repoName: string, isPrivate: boolean = false): ToolResult => {
      return { success: true, data: `__ASYNC_TOOL__:pushToGithub:${JSON.stringify({ repoName, isPrivate })}`, message: `Pushing to GitHub: ${repoName}...` };
    }
  },

  // Generate video from prompt
  generateVideo: {
    name: 'generateVideo',
    description: 'Generate a video from a text prompt using AI video generation. Returns a video URL.',
    parameters: [
      { name: 'prompt', type: 'string', required: true, description: 'Description of the video to generate' },
      { name: 'duration', type: 'number', required: false, description: 'Video duration in seconds (default: 5)' },
      { name: 'aspectRatio', type: 'string', required: false, description: 'Aspect ratio: 16:9, 9:16, or 1:1 (default: 16:9)' },
    ],
    execute: (prompt: string, duration: number = 5, aspectRatio: string = '16:9'): ToolResult => {
      return { success: true, data: `__ASYNC_TOOL__:generateVideo:${JSON.stringify({ prompt, duration, aspectRatio })}`, message: 'Generating video...' };
    }
  },
};

// ============================================================================
// UNIFIED TOOL REGISTRY
// ============================================================================

const allTools: Record<string, ToolDefinition> = {
  ...fileSystemTools,
  ...cursorTools,
  ...editorStateTools,
  ...deployTools,
};

// ============================================================================
// TOOL EXECUTOR
// ============================================================================

/**
 * Execute a tool by name with given arguments
 * This is the ONLY way the agent can interact with the editor
 */
export function runTool(toolName: string, args: any[] = []): ToolResult {
  const tool = allTools[toolName];
  
  if (!tool) {
    return { 
      success: false, 
      error: `Unknown tool: ${toolName}. Available tools: ${Object.keys(allTools).join(', ')}` 
    };
  }
  
  try {
    // Validate required parameters
    const requiredParams = tool.parameters.filter(p => p.required);
    for (let i = 0; i < requiredParams.length; i++) {
      if (args[i] === undefined || args[i] === null) {
        return { 
          success: false, 
          error: `Missing required parameter: ${requiredParams[i].name}` 
        };
      }
    }
    
    // Execute the tool
    const result = tool.execute(...args);
    
    console.log(`[ToolRegistry] ${toolName}(${JSON.stringify(args).slice(0, 100)}) => ${result.success ? 'OK' : 'FAIL'}`);
    
    return result;
  } catch (error: any) {
    console.error(`[ToolRegistry] ${toolName} error:`, error);
    return { 
      success: false, 
      error: error.message || 'Tool execution failed' 
    };
  }
}

/**
 * Execute multiple tools in sequence
 */
export function runTools(commands: { tool: string; args: any[] }[]): ToolResult[] {
  return commands.map(cmd => runTool(cmd.tool, cmd.args));
}

/**
 * Get list of available tools for agent context
 */
export function getAvailableTools(): { name: string; description: string; parameters: any[] }[] {
  return Object.values(allTools).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

/**
 * Get tool definition by name
 */
export function getTool(name: string): ToolDefinition | undefined {
  return allTools[name];
}

/**
 * Check if a tool exists
 */
export function hasTools(name: string): boolean {
  return name in allTools;
}

// ============================================================================
// EXPORT
// ============================================================================

export const ToolRegistry = {
  runTool,
  runTools,
  getAvailableTools,
  getTool,
  hasTools,
  
  // Tool categories
  fileSystemTools: Object.keys(fileSystemTools),
  cursorTools: Object.keys(cursorTools),
  editorStateTools: Object.keys(editorStateTools),
  deployTools: Object.keys(deployTools),
  
  // All tool names
  allToolNames: Object.keys(allTools),
};

export default ToolRegistry;
