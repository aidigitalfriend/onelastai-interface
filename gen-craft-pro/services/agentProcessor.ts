/**
 * Agent Processor Service for Standalone Canvas App
 * Parses and executes surgical edit commands from the AI agent
 * 
 * This is the STANDALONE version at /canvas-app/
 */

import { editorBridge } from './editorBridge';
import type { AgentCommand } from '../types';
import type { EditorSelection, EditorCursor } from './editorBridge';

// Result of command execution
export interface CommandResult {
  success: boolean;
  message: string;
  affectedFile?: string;
}

/**
 * Parse agent response for surgical edit commands
 * Commands are expected in ```command blocks
 */
export function parseAgentResponse(response: string): AgentCommand[] {
  const commands: AgentCommand[] = [];
  
  // Look for command blocks: ```command ... ```
  const commandBlockRegex = /```command\s*([\s\S]*?)```/gi;
  let match;
  
  while ((match = commandBlockRegex.exec(response)) !== null) {
    const commandText = match[1].trim();
    
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(commandText);
      
      if (Array.isArray(parsed)) {
        commands.push(...parsed);
      } else if (parsed.type) {
        commands.push(parsed);
      } else if (parsed.commands && Array.isArray(parsed.commands)) {
        commands.push(...parsed.commands);
      }
    } catch (e) {
      // Try to parse line by line as simple commands
      const lines = commandText.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const cmd = parseSimpleCommand(line);
        if (cmd) commands.push(cmd);
      }
    }
  }
  
  // Also check for inline JSON commands
  const inlineJsonRegex = /\{[\s\S]*?"type"\s*:\s*"(insert|replace|replaceSelection|createFile|deleteFile|renameFile|updateFile|fullRegenerate|createPage|updateMultipleFiles|deploy|fixBuildError)"[\s\S]*?\}/g;
  
  while ((match = inlineJsonRegex.exec(response)) !== null) {
    try {
      const cmd = JSON.parse(match[0]);
      if (cmd.type && !commands.some(c => JSON.stringify(c) === JSON.stringify(cmd))) {
        commands.push(cmd);
      }
    } catch (e) {
      // Ignore parse errors for inline JSON
    }
  }
  
  return commands;
}

/**
 * Parse simple command format (one command per line)
 * Format: COMMAND_TYPE arg1 arg2 ...
 */
function parseSimpleCommand(line: string): AgentCommand | null {
  const parts = line.trim().split(/\s+/);
  const type = parts[0]?.toUpperCase();
  
  switch (type) {
    case 'INSERT':
      // INSERT path line:col text
      if (parts.length >= 4) {
        const [, path, position, ...textParts] = parts;
        const [line, col] = position.split(':').map(Number);
        return {
          type: 'insert',
          path,
          position: { line, column: col || 1 },
          text: textParts.join(' '),
        };
      }
      break;
      
    case 'DELETE_FILE':
      // DELETE_FILE path
      if (parts.length >= 2) {
        return { type: 'deleteFile', path: parts[1] };
      }
      break;
      
    case 'CREATE_FILE':
      // CREATE_FILE path content
      if (parts.length >= 2) {
        const [, path, ...contentParts] = parts;
        return { type: 'createFile', path, content: contentParts.join(' ') || '' };
      }
      break;
      
    case 'RENAME_FILE':
      // RENAME_FILE oldPath newPath
      if (parts.length >= 3) {
        return { type: 'renameFile', oldPath: parts[1], newPath: parts[2] };
      }
      break;
  }
  
  return null;
}

/**
 * Execute a single agent command
 */
export function executeCommand(command: AgentCommand): CommandResult {
  try {
    switch (command.type) {
      case 'insert':
        const insertSuccess = editorBridge.insertAt(command.path, command.position, command.text);
        return {
          success: insertSuccess,
          message: insertSuccess 
            ? `Inserted text at ${command.path}:${command.position.line}:${command.position.column}`
            : `Failed to insert at ${command.path}`,
          affectedFile: command.path,
        };
        
      case 'replace':
        const replaceSuccess = editorBridge.replaceRange(
          command.path,
          command.start,
          command.end,
          command.text
        );
        return {
          success: replaceSuccess,
          message: replaceSuccess
            ? `Replaced text in ${command.path} from ${command.start.line}:${command.start.column} to ${command.end.line}:${command.end.column}`
            : `Failed to replace in ${command.path}`,
          affectedFile: command.path,
        };
        
      case 'replaceSelection':
        const selReplaceSuccess = editorBridge.replaceSelection(command.text);
        return {
          success: selReplaceSuccess,
          message: selReplaceSuccess
            ? 'Replaced selection'
            : 'No selection to replace or replacement failed',
          affectedFile: editorBridge.getActiveFilePath(),
        };
        
      case 'createFile':
        const createSuccess = editorBridge.createFile(command.path, command.content);
        return {
          success: createSuccess,
          message: createSuccess
            ? `Created file: ${command.path}`
            : `Failed to create file ${command.path} (may already exist)`,
          affectedFile: command.path,
        };
        
      case 'deleteFile':
        const deleteSuccess = editorBridge.deleteFile(command.path);
        return {
          success: deleteSuccess,
          message: deleteSuccess
            ? `Deleted file: ${command.path}`
            : `Failed to delete file ${command.path}`,
          affectedFile: command.path,
        };
        
      case 'renameFile':
        const renameSuccess = editorBridge.renameFile(command.oldPath, command.newPath);
        return {
          success: renameSuccess,
          message: renameSuccess
            ? `Renamed ${command.oldPath} to ${command.newPath}`
            : `Failed to rename ${command.oldPath}`,
          affectedFile: command.newPath,
        };
        
      case 'updateFile':
        const updateSuccess = editorBridge.updateFile(command.path, command.content);
        return {
          success: updateSuccess,
          message: updateSuccess
            ? `Updated file: ${command.path}`
            : `Failed to update file ${command.path}`,
          affectedFile: command.path,
        };
        
      case 'fullRegenerate':
        // Full regeneration - replace everything
        editorBridge.loadFromCode(command.code, editorBridge.getLanguage());
        return {
          success: true,
          message: 'Full regeneration complete',
          affectedFile: editorBridge.getActiveFilePath(),
        };

      case 'createPage': {
        const pagePath = command.path.endsWith('.html') ? command.path : `${command.path}.html`;
        const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
        const pageCreated = editorBridge.createFile(normalizedPath, command.content);
        return {
          success: pageCreated,
          message: pageCreated ? `Created page: ${command.title} (${normalizedPath})` : `Failed to create page ${normalizedPath}`,
          affectedFile: normalizedPath,
        };
      }

      case 'updateMultipleFiles': {
        let allSuccess = true;
        const updated: string[] = [];
        for (const file of command.files) {
          const filePath = file.path.startsWith('/') ? file.path : `/${file.path}`;
          const exists = editorBridge.getFile(filePath) !== undefined;
          const ok = exists ? editorBridge.updateFile(filePath, file.content) : editorBridge.createFile(filePath, file.content);
          if (!ok) allSuccess = false;
          else updated.push(filePath);
        }
        return {
          success: allSuccess,
          message: `Updated ${updated.length}/${command.files.length} files`,
        };
      }

      case 'deploy':
        // Deploy commands are handled by App.tsx, not editorBridge
        console.log('[AgentProcessor] Deploy command received, delegating to App.tsx');
        return {
          success: true,
          message: `Deploy to ${command.platform} requested (handled by UI)`,
        };

      case 'fixBuildError': {
        const fixPath = command.file.startsWith('/') ? command.file : `/${command.file}`;
        const existsForFix = editorBridge.getFile(fixPath) !== undefined;
        const fixSuccess = existsForFix
          ? editorBridge.updateFile(fixPath, command.suggestedFix)
          : editorBridge.createFile(fixPath, command.suggestedFix);
        return {
          success: fixSuccess,
          message: fixSuccess ? `Fixed build error in ${fixPath}` : `Failed to fix ${fixPath}`,
          affectedFile: fixPath,
        };
      }
        
      default:
        return {
          success: false,
          message: `Unknown command type: ${(command as any).type}`,
        };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Error executing command: ${error.message}`,
    };
  }
}

/**
 * Execute multiple commands in sequence
 */
export function executeCommands(commands: AgentCommand[]): CommandResult[] {
  return commands.map(cmd => executeCommand(cmd));
}

/**
 * Process full agent response - parse and execute all commands
 */
export async function processAgentResponse(response: string): Promise<{
  commands: AgentCommand[];
  results: CommandResult[];
  hasErrors: boolean;
}> {
  const commands = parseAgentResponse(response);
  const results = executeCommands(commands);
  const hasErrors = results.some(r => !r.success);
  
  return { commands, results, hasErrors };
}

/**
 * Build context message to include in API request
 * Provides the agent with current editor state
 */
export function buildEditorContextForAgent(): string {
  return editorBridge.getAgentContext();
}

/**
 * Get the surgical edit system prompt
 * Instructions for the AI on how to use surgical edits
 */
export function getSurgicalEditPrompt(): string {
  return `
## Surgical Edit Commands

When making small changes to existing code, use surgical edit commands instead of regenerating the entire file. 
This is faster and preserves user edits.

Available commands (use JSON format in \`\`\`command blocks):

1. **Insert text at position:**
\`\`\`command
{"type": "insert", "path": "/index.html", "position": {"line": 10, "column": 1}, "text": "<div>New content</div>"}
\`\`\`

2. **Replace text in range:**
\`\`\`command
{"type": "replace", "path": "/index.html", "start": {"line": 5, "column": 1}, "end": {"line": 8, "column": 10}, "text": "replacement text"}
\`\`\`

3. **Replace current selection:**
\`\`\`command
{"type": "replaceSelection", "text": "new text for selection"}
\`\`\`

4. **Create new file:**
\`\`\`command
{"type": "createFile", "path": "/components/Button.jsx", "content": "export default function Button() { return <button>Click</button>; }"}
\`\`\`

5. **Delete file:**
\`\`\`command
{"type": "deleteFile", "path": "/old-file.js"}
\`\`\`

6. **Rename file:**
\`\`\`command
{"type": "renameFile", "oldPath": "/old.js", "newPath": "/new.js"}
\`\`\`

7. **Update entire file:**
\`\`\`command
{"type": "updateFile", "path": "/index.html", "content": "full file content here"}
\`\`\`

8. **Full regenerate (use sparingly):**
\`\`\`command
{"type": "fullRegenerate", "code": "complete new code"}
\`\`\`

9. **Create a new page (multi-page sites):**
\`\`\`command
{"type": "createPage", "path": "/about.html", "title": "About Us", "content": "<!DOCTYPE html>..."}
\`\`\`

10. **Update multiple files at once:**
\`\`\`command
{"type": "updateMultipleFiles", "files": [{"path": "/index.html", "content": "..."}, {"path": "/styles.css", "content": "..."}]}
\`\`\`

11. **Deploy the project:**
\`\`\`command
{"type": "deploy", "platform": "vercel"}
\`\`\`

12. **Fix a build error:**
\`\`\`command
{"type": "fixBuildError", "error": "...", "file": "/index.html", "suggestedFix": "fixed content..."}
\`\`\`

Guidelines:
- Use surgical edits for small changes (adding a button, changing text, fixing bugs)
- Use fullRegenerate only for major rewrites or new features
- Use createPage to add new pages to multi-page sites
- Use updateMultipleFiles for batch changes across files
- Use deploy when the user asks to deploy their project
- Line numbers are 1-indexed
- Multiple commands can be in one response
- Always explain what you're changing in plain text before the command
`;
}
