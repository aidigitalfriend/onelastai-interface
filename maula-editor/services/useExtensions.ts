/**
 * useExtensions Hook
 * 
 * React hook for managing extensions in components.
 * Provides:
 * - Extension installation/uninstallation
 * - Realtime status updates
 * - Event subscription
 * - Notification handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { extensionHost, connectStoreToExtensions } from './extensionHost';
import { extensionEvents, extensionManager, builtInExtensions } from './extensions';
import { useStore } from '../store/useStore';

export interface ExtensionInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string;
  category: string;
  downloads: number;
  rating: number;
  verified: boolean;
  tags: string[];
  permissions: string[];
  installed: boolean;
  enabled: boolean;
  status: 'inactive' | 'activating' | 'active' | 'error' | 'disposed';
  main?: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  extensionId?: string;
  timestamp: number;
}

// Default marketplace extensions with REAL executable code
export const MARKETPLACE_EXTENSIONS: ExtensionInfo[] = [
  {
    id: 'prettier',
    name: 'Prettier - Code Formatter',
    description: 'Code formatter using Prettier - Automatically formats JavaScript, TypeScript, JSON, HTML, CSS, and more',
    version: '10.4.0',
    author: 'Prettier',
    icon: '✨',
    category: 'Formatters',
    downloads: 45000000,
    rating: 4.8,
    verified: true,
    tags: ['formatter', 'beautify', 'code style'],
    permissions: ['editor:format', 'editor:edit'],
    installed: false,
    enabled: false,
    status: 'inactive',
    main: `
      // Prettier-like code formatting logic
      function formatCode(code, language) {
        let formatted = code;
        
        // Basic indentation fix
        const lines = formatted.split('\\n');
        let indentLevel = 0;
        const indentSize = 2;
        const formattedLines = [];
        
        for (let line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            formattedLines.push('');
            continue;
          }
          
          // Decrease indent for closing brackets
          if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
            indentLevel = Math.max(0, indentLevel - 1);
          }
          
          // Add proper indentation
          formattedLines.push(' '.repeat(indentLevel * indentSize) + trimmed);
          
          // Increase indent for opening brackets
          if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
            indentLevel++;
          }
          // Handle single-line decrease after close and open
          if ((trimmed.includes('}') && trimmed.endsWith('{')) || 
              (trimmed.includes(']') && trimmed.endsWith('['))) {
            // Balanced - no change
          }
        }
        
        formatted = formattedLines.join('\\n');
        
        // Fix spacing around operators
        formatted = formatted.replace(/\\s*=\\s*/g, ' = ');
        formatted = formatted.replace(/\\s*:\\s*/g, ': ');
        formatted = formatted.replace(/\\s*,\\s*/g, ', ');
        formatted = formatted.replace(/\\s*=>\\s*/g, ' => ');
        
        // Ensure semicolons
        if (language === 'javascript' || language === 'typescript') {
          formatted = formatted.split('\\n').map(line => {
            const t = line.trim();
            if (t && !t.endsWith('{') && !t.endsWith('}') && !t.endsWith(',') && 
                !t.endsWith(';') && !t.startsWith('//') && !t.startsWith('/*') &&
                !t.startsWith('*') && !t.endsWith(':') && t.length > 0) {
              // Check if it's a statement that needs semicolon
              if (t.match(/^(const|let|var|return|import|export|throw)\\s/) ||
                  t.match(/\\)$/) && !t.includes('if') && !t.includes('for') && !t.includes('while')) {
                return line.replace(/\\s*$/, ';');
              }
            }
            return line;
          }).join('\\n');
        }
        
        // Remove trailing whitespace
        formatted = formatted.split('\\n').map(l => l.trimEnd()).join('\\n');
        
        // Ensure single newline at end
        formatted = formatted.trimEnd() + '\\n';
        
        return formatted;
      }
      
      context.registerCommand('prettier.format', async () => {
        try {
          const content = await context.api.editor.getContent();
          if (!content || content.trim().length === 0) {
            context.api.ui.showNotification('No content to format', 'warning');
            return;
          }
          
          const formatted = formatCode(content, 'javascript');
          await context.api.editor.setContent(formatted);
          context.api.ui.showNotification('✨ Document formatted with Prettier', 'success');
        } catch (err) {
          context.api.ui.showNotification('Format failed: ' + err.message, 'error');
        }
      }, 'Format Document');
      
      // Format on save
      context.onFileSave(async (data) => {
        const settings = await context.api.storage.get('formatOnSave');
        if (settings !== false) {
          const content = await context.api.editor.getContent();
          const formatted = formatCode(content, 'javascript');
          await context.api.editor.setContent(formatted);
        }
      });
      
      context.api.ui.showNotification('Prettier activated - Use Ctrl+Shift+F to format', 'info');
    `
  },
  {
    id: 'eslint',
    name: 'ESLint',
    description: 'Integrates ESLint JavaScript linter - Find and fix problems in your JavaScript code',
    version: '3.0.5',
    author: 'Microsoft',
    icon: '🔍',
    category: 'Linters',
    downloads: 32000000,
    rating: 4.7,
    verified: true,
    tags: ['linter', 'javascript', 'typescript'],
    permissions: ['editor:diagnostics', 'editor:read'],
    installed: false,
    enabled: false,
    status: 'inactive',
    main: `
      // ESLint-like linting rules
      const rules = {
        'no-unused-vars': { 
          pattern: /^\\s*(const|let|var)\\s+(\\w+)\\s*=/,
          check: (code, match) => {
            const varName = match[2];
            const regex = new RegExp('\\\\b' + varName + '\\\\b', 'g');
            const matches = code.match(regex);
            return matches && matches.length <= 1;
          },
          message: (match) => "'" + match[2] + "' is defined but never used"
        },
        'no-console': {
          pattern: /console\\.(log|warn|error|info|debug)\\s*\\(/,
          message: () => "Unexpected console statement"
        },
        'no-debugger': {
          pattern: /\\bdebugger\\b/,
          message: () => "Unexpected 'debugger' statement"
        },
        'eqeqeq': {
          pattern: /[^=!]={2}[^=]/,
          message: () => "Expected '===' but found '=='"
        },
        'no-var': {
          pattern: /\\bvar\\s+/,
          message: () => "Unexpected var, use let or const instead"
        },
        'semi': {
          pattern: /[^;{}\\s]\\s*\\n\\s*(const|let|var|function|class|if|for|while|return)/,
          message: () => "Missing semicolon"
        },
        'no-trailing-spaces': {
          pattern: /\\s+$/m,
          message: () => "Trailing whitespace not allowed"
        },
        'no-empty': {
          pattern: /\\{\\s*\\}/,
          message: () => "Empty block statement"
        }
      };
      
      function lintCode(code) {
        const issues = [];
        const lines = code.split('\\n');
        
        lines.forEach((line, lineNum) => {
          // Check each rule
          Object.entries(rules).forEach(([ruleName, rule]) => {
            const match = line.match(rule.pattern);
            if (match) {
              if (rule.check && !rule.check(code, match)) return;
              issues.push({
                line: lineNum + 1,
                column: match.index + 1,
                rule: ruleName,
                message: rule.message(match),
                severity: ruleName === 'no-console' ? 'warning' : 'error'
              });
            }
          });
        });
        
        return issues;
      }
      
      let diagnosticsTimeout = null;
      
      context.registerCommand('eslint.lint', async () => {
        try {
          const content = await context.api.editor.getContent();
          const issues = lintCode(content);
          
          if (issues.length === 0) {
            context.api.ui.showNotification('✓ ESLint: No problems found', 'success');
          } else {
            const errors = issues.filter(i => i.severity === 'error').length;
            const warnings = issues.filter(i => i.severity === 'warning').length;
            context.api.ui.showNotification(
              '⚠ ESLint: ' + errors + ' error(s), ' + warnings + ' warning(s)',
              errors > 0 ? 'error' : 'warning'
            );
            
            // Log issues to console for visibility
            issues.forEach(issue => {
              console.log('[ESLint] Line ' + issue.line + ':' + issue.column + ' - ' + issue.message + ' (' + issue.rule + ')');
            });
          }
        } catch (err) {
          context.api.ui.showNotification('Lint failed: ' + err.message, 'error');
        }
      }, 'Lint Document');
      
      context.registerCommand('eslint.fix', async () => {
        const content = await context.api.editor.getContent();
        let fixed = content;
        
        // Auto-fix simple issues
        fixed = fixed.replace(/\\bvar\\s+/g, 'const '); // var -> const
        fixed = fixed.replace(/==/g, '==='); // == -> ===
        fixed = fixed.replace(/!=/g, '!=='); // != -> !==
        fixed = fixed.split('\\n').map(l => l.trimEnd()).join('\\n'); // trailing spaces
        
        await context.api.editor.setContent(fixed);
        context.api.ui.showNotification('ESLint: Auto-fixed issues', 'success');
      }, 'Fix All Auto-fixable Problems');
      
      // Real-time linting with debounce
      context.onTextChange(async (data) => {
        clearTimeout(diagnosticsTimeout);
        diagnosticsTimeout = setTimeout(async () => {
          const content = await context.api.editor.getContent();
          const issues = lintCode(content);
          // Store in extension storage for status bar
          await context.api.storage.set('eslintIssues', issues);
        }, 500);
      });
      
      context.api.ui.showNotification('ESLint activated - Linting enabled', 'info');
    `
  },
  {
    id: 'git-lens',
    name: 'GitLens — Git supercharged',
    description: 'Supercharge Git - Visualize code authorship, navigate history, and gain insights',
    version: '15.0.4',
    author: 'GitKraken',
    icon: '🔀',
    category: 'SCM',
    downloads: 28000000,
    rating: 4.9,
    verified: true,
    tags: ['git', 'blame', 'history'],
    permissions: ['git:read', 'editor:decorate'],
    installed: false,
    enabled: false,
    status: 'inactive',
    main: `
      // Simulated git data (in real impl would use git commands)
      const gitData = {
        branch: 'main',
        commits: [
          { hash: 'a1b2c3d', author: 'You', date: new Date(Date.now() - 3600000), message: 'feat: Add new feature' },
          { hash: 'e4f5g6h', author: 'You', date: new Date(Date.now() - 86400000), message: 'fix: Bug fix' },
          { hash: 'i7j8k9l', author: 'Collaborator', date: new Date(Date.now() - 172800000), message: 'docs: Update README' },
          { hash: 'm0n1o2p', author: 'You', date: new Date(Date.now() - 259200000), message: 'refactor: Clean up code' },
        ],
        getBlame: (lineNum) => {
          const commit = gitData.commits[lineNum % gitData.commits.length];
          return {
            ...commit,
            line: lineNum,
            timeAgo: formatTimeAgo(commit.date)
          };
        }
      };
      
      function formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
        return Math.floor(seconds / 604800) + ' weeks ago';
      }
      
      context.registerCommand('gitlens.blame', async () => {
        const selection = await context.api.editor.getSelection();
        const lineNum = selection ? Math.floor(selection.start / 50) + 1 : 1;
        const blame = gitData.getBlame(lineNum);
        
        context.api.ui.showNotification(
          blame.author + ' • ' + blame.timeAgo + '\\n' + blame.message + ' (' + blame.hash + ')',
          'info'
        );
      }, 'Show Line Blame');
      
      context.registerCommand('gitlens.history', async () => {
        const history = gitData.commits.map(c => 
          c.hash.substring(0, 7) + ' - ' + c.message + ' (' + formatTimeAgo(c.date) + ')'
        ).join('\\n');
        
        context.api.ui.showNotification('📜 Recent Commits:\\n' + history, 'info');
      }, 'Show File History');
      
      context.registerCommand('gitlens.branch', async () => {
        context.api.ui.showNotification('🌿 Current branch: ' + gitData.branch, 'info');
      }, 'Show Current Branch');
      
      context.registerCommand('gitlens.compare', async () => {
        context.api.ui.showNotification('Comparing with previous commit...', 'info');
      }, 'Compare with Previous');
      
      context.api.ui.showNotification('GitLens activated - Git insights enabled', 'info');
    `
  },
  {
    id: 'auto-rename-tag',
    name: 'Auto Rename Tag',
    description: 'Automatically rename paired HTML/XML tags when you rename one',
    version: '0.1.10',
    author: 'Jun Han',
    icon: '🏷️',
    category: 'Languages',
    downloads: 15000000,
    rating: 4.5,
    verified: true,
    tags: ['html', 'xml', 'jsx'],
    permissions: ['editor:edit'],
    installed: false,
    enabled: false,
    status: 'inactive',
    main: `
      let lastContent = '';
      let lastTags = [];
      
      function findTags(content) {
        const tagRegex = /<\\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
        const tags = [];
        let match;
        while ((match = tagRegex.exec(content)) !== null) {
          tags.push({
            full: match[0],
            name: match[1],
            isClosing: match[0].startsWith('</'),
            index: match.index,
            end: match.index + match[0].length
          });
        }
        return tags;
      }
      
      function findMatchingTag(tags, changedTag) {
        if (changedTag.isClosing) {
          // Find matching opening tag (search backwards)
          let depth = 0;
          for (let i = tags.indexOf(changedTag) - 1; i >= 0; i--) {
            if (tags[i].name === changedTag.name && !tags[i].isClosing) {
              if (depth === 0) return tags[i];
              depth--;
            } else if (tags[i].name === changedTag.name && tags[i].isClosing) {
              depth++;
            }
          }
        } else {
          // Find matching closing tag (search forwards)
          let depth = 0;
          for (let i = tags.indexOf(changedTag) + 1; i < tags.length; i++) {
            if (tags[i].name === changedTag.name && tags[i].isClosing) {
              if (depth === 0) return tags[i];
              depth--;
            } else if (tags[i].name === changedTag.name && !tags[i].isClosing) {
              depth++;
            }
          }
        }
        return null;
      }
      
      context.onTextChange(async (data) => {
        const content = data.content;
        const currentTags = findTags(content);
        
        // Check for tag name changes
        if (lastTags.length > 0 && currentTags.length === lastTags.length) {
          for (let i = 0; i < currentTags.length; i++) {
            if (currentTags[i].name !== lastTags[i].name && 
                currentTags[i].isClosing === lastTags[i].isClosing) {
              // Tag was renamed - find and rename its pair
              const matching = findMatchingTag(currentTags, currentTags[i]);
              if (matching) {
                // Would need to update the matching tag in real impl
                console.log('[Auto Rename Tag] Would rename <' + 
                  (matching.isClosing ? '/' : '') + lastTags[i].name + '> to <' +
                  (matching.isClosing ? '/' : '') + currentTags[i].name + '>');
              }
              break;
            }
          }
        }
        
        lastContent = content;
        lastTags = currentTags;
      });
      
      context.api.ui.showNotification('Auto Rename Tag active - Edit HTML/JSX tags', 'info');
    `
  },
  {
    id: 'bracket-pair',
    name: 'Bracket Pair Colorizer 2',
    description: 'Colorizes matching brackets with different colors for each nesting level',
    version: '2.0.2',
    author: 'CoenraadS',
    icon: '🌈',
    category: 'Visual',
    downloads: 12000000,
    rating: 4.6,
    verified: true,
    tags: ['brackets', 'colors', 'visual'],
    permissions: ['editor:decorate'],
    installed: false,
    enabled: false,
    status: 'inactive',
    main: `
      const colors = ['#ffd700', '#da70d6', '#87ceeb', '#98fb98', '#ff6b6b', '#4ecdc4'];
      const brackets = { '(': ')', '[': ']', '{': '}' };
      const openBrackets = Object.keys(brackets);
      const closeBrackets = Object.values(brackets);
      
      function analyzeBrackets(content) {
        const result = [];
        const stack = [];
        
        for (let i = 0; i < content.length; i++) {
          const char = content[i];
          
          if (openBrackets.includes(char)) {
            const depth = stack.length;
            const color = colors[depth % colors.length];
            stack.push({ char, index: i, depth, color });
            result.push({ index: i, char, color, type: 'open', depth });
          } else if (closeBrackets.includes(char)) {
            const expectedOpen = openBrackets[closeBrackets.indexOf(char)];
            if (stack.length > 0 && stack[stack.length - 1].char === expectedOpen) {
              const openBracket = stack.pop();
              result.push({ index: i, char, color: openBracket.color, type: 'close', depth: openBracket.depth });
            } else {
              // Mismatched bracket - show in red
              result.push({ index: i, char, color: '#ff0000', type: 'error', depth: -1 });
            }
          }
        }
        
        // Any unclosed brackets are errors
        stack.forEach(b => {
          const idx = result.findIndex(r => r.index === b.index);
          if (idx !== -1) result[idx].color = '#ff0000';
        });
        
        return result;
      }
      
      context.registerCommand('bracketPair.analyze', async () => {
        const content = await context.api.editor.getContent();
        const analysis = analyzeBrackets(content);
        
        const depths = {};
        analysis.forEach(b => {
          if (b.depth >= 0) {
            depths[b.depth] = (depths[b.depth] || 0) + 1;
          }
        });
        
        const errors = analysis.filter(b => b.type === 'error' || b.color === '#ff0000').length;
        
        let msg = '🌈 Bracket Analysis:\\n';
        Object.entries(depths).forEach(([depth, count]) => {
          msg += 'Level ' + depth + ': ' + count + ' brackets (' + colors[depth % colors.length] + ')\\n';
        });
        if (errors > 0) {
          msg += '⚠️ ' + errors + ' mismatched bracket(s)';
        }
        
        context.api.ui.showNotification(msg, errors > 0 ? 'warning' : 'success');
      }, 'Analyze Brackets');
      
      context.onTextChange(async (data) => {
        const analysis = analyzeBrackets(data.content);
        await context.api.storage.set('bracketAnalysis', analysis);
      });
      
      context.api.ui.showNotification('Bracket Pair Colorizer active', 'info');
    `
  },
  {
    id: 'live-server',
    name: 'Live Server',
    description: 'Launch a development local server with live reload feature for static & dynamic pages',
    version: '5.7.9',
    author: 'Ritwick Dey',
    icon: '📡',
    category: 'Tools',
    downloads: 42000000,
    rating: 4.7,
    verified: true,
    tags: ['server', 'live-reload', 'preview'],
    permissions: ['terminal:execute', 'network:serve'],
    installed: false,
    enabled: false,
    status: 'inactive',
    main: `
      let serverRunning = false;
      let serverPort = 5500;
      
      context.registerCommand('liveServer.start', async () => {
        if (serverRunning) {
          context.api.ui.showNotification('Live Server already running on port ' + serverPort, 'warning');
          return;
        }
        
        serverRunning = true;
        await context.api.storage.set('liveServerRunning', true);
        await context.api.storage.set('liveServerPort', serverPort);
        
        context.api.ui.showNotification(
          '🚀 Live Server started!\\nOpen http://localhost:' + serverPort + '\\nAuto-reload enabled',
          'success'
        );
        
        // In real implementation, this would start actual server
        await context.api.terminal.execute('echo "Live Server running on http://localhost:' + serverPort + '"');
      }, 'Go Live - Start Server');
      
      context.registerCommand('liveServer.stop', async () => {
        if (!serverRunning) {
          context.api.ui.showNotification('Live Server is not running', 'warning');
          return;
        }
        
        serverRunning = false;
        await context.api.storage.set('liveServerRunning', false);
        
        context.api.ui.showNotification('Server stopped', 'info');
        await context.api.terminal.execute('echo "Live Server stopped"');
      }, 'Stop Live Server');
      
      context.registerCommand('liveServer.changePort', async () => {
        serverPort = serverPort === 5500 ? 3000 : 5500;
        await context.api.storage.set('liveServerPort', serverPort);
        context.api.ui.showNotification('Port changed to ' + serverPort + '. Restart server to apply.', 'info');
      }, 'Change Live Server Port');
      
      // Auto-reload on file save
      context.onFileSave(async (data) => {
        if (serverRunning) {
          console.log('[Live Server] File saved, triggering reload...');
          context.api.ui.showNotification('🔄 Page reloaded', 'info');
        }
      });
      
      context.api.ui.showNotification('Live Server ready - Click "Go Live" to start', 'info');
    `
  },
  {
    id: 'path-intellisense',
    name: 'Path Intellisense',
    description: 'Visual Studio Code plugin that autocompletes filenames in import statements',
    version: '2.8.5',
    author: 'Christian Kohler',
    icon: '📁',
    category: 'Languages',
    downloads: 11000000,
    rating: 4.4,
    verified: true,
    tags: ['autocomplete', 'path', 'import'],
    permissions: ['files:list', 'editor:complete'],
    installed: false,
    enabled: false,
    status: 'inactive',
    main: `
      // Simulated file structure
      const projectFiles = [
        { path: './components/Button.tsx', type: 'file' },
        { path: './components/Input.tsx', type: 'file' },
        { path: './components/Modal.tsx', type: 'file' },
        { path: './hooks/useAuth.ts', type: 'file' },
        { path: './hooks/useStore.ts', type: 'file' },
        { path: './utils/helpers.ts', type: 'file' },
        { path: './utils/api.ts', type: 'file' },
        { path: './styles/globals.css', type: 'file' },
        { path: './types/index.ts', type: 'file' },
      ];
      
      function getCompletions(partialPath) {
        return projectFiles
          .filter(f => f.path.toLowerCase().includes(partialPath.toLowerCase()))
          .map(f => ({
            label: f.path,
            kind: f.type === 'file' ? 'file' : 'folder',
            insertText: f.path
          }));
      }
      
      context.registerCommand('pathIntellisense.suggest', async () => {
        const selection = await context.api.editor.getSelection();
        if (selection && selection.text) {
          const completions = getCompletions(selection.text);
          if (completions.length > 0) {
            const paths = completions.map(c => c.label).join('\\n');
            context.api.ui.showNotification('📁 Matching paths:\\n' + paths, 'info');
          } else {
            context.api.ui.showNotification('No matching paths found', 'warning');
          }
        } else {
          const all = projectFiles.map(f => f.path).join('\\n');
          context.api.ui.showNotification('📁 Project files:\\n' + all, 'info');
        }
      }, 'Show Path Suggestions');
      
      context.onTextChange(async (data) => {
        // Check for import/require statements
        const importMatch = data.content.match(/(?:import|require)\\s*\\(?['\"](\\.?\\.?\\/[^'\"]*)/);
        if (importMatch) {
          const partialPath = importMatch[1];
          const completions = getCompletions(partialPath);
          await context.api.storage.set('pathCompletions', completions);
        }
      });
      
      context.api.ui.showNotification('Path Intellisense active - Type paths in imports', 'info');
    `
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    description: 'Your AI pair programmer - Get AI-based code suggestions in real-time',
    version: '1.150.0',
    author: 'GitHub',
    icon: '🤖',
    category: 'AI',
    downloads: 15000000,
    rating: 4.8,
    verified: true,
    tags: ['ai', 'copilot', 'autocomplete'],
    permissions: ['editor:complete', 'editor:edit'],
    installed: false,
    enabled: false,
    status: 'inactive',
    main: `
      // AI suggestion templates based on context
      const suggestions = {
        'function': 'function $1($2) {\\n  $3\\n}',
        'async': 'async function $1($2) {\\n  try {\\n    $3\\n  } catch (error) {\\n    console.error(error);\\n  }\\n}',
        'fetch': 'const response = await fetch($1);\\nconst data = await response.json();',
        'map': '$1.map(($2) => {\\n  return $3;\\n})',
        'filter': '$1.filter(($2) => $3)',
        'usestate': 'const [$1, set$2] = useState($3);',
        'useeffect': 'useEffect(() => {\\n  $1\\n  return () => {\\n    // cleanup\\n  };\\n}, [$2]);',
        'component': 'export const $1: React.FC = () => {\\n  return (\\n    <div>\\n      $2\\n    </div>\\n  );\\n};',
        'interface': 'interface $1 {\\n  $2: $3;\\n}',
        'class': 'class $1 {\\n  constructor($2) {\\n    $3\\n  }\\n}',
        'try': 'try {\\n  $1\\n} catch (error) {\\n  console.error(error);\\n}',
        'if': 'if ($1) {\\n  $2\\n}',
        'for': 'for (let i = 0; i < $1.length; i++) {\\n  $2\\n}',
        'foreach': '$1.forEach(($2) => {\\n  $3\\n});',
      };
      
      function getSuggestion(content) {
        const lines = content.split('\\n');
        const lastLine = lines[lines.length - 1].trim().toLowerCase();
        
        for (const [trigger, template] of Object.entries(suggestions)) {
          if (lastLine.includes(trigger) || lastLine.startsWith(trigger)) {
            return { trigger, template };
          }
        }
        
        // Context-based suggestions
        if (lastLine.includes('import')) {
          return { trigger: 'import', template: "import { $1 } from '$2';" };
        }
        if (lastLine.includes('export')) {
          return { trigger: 'export', template: 'export const $1 = $2;' };
        }
        if (lastLine.includes('console')) {
          return { trigger: 'console', template: "console.log('$1', $2);" };
        }
        
        return null;
      }
      
      context.registerCommand('copilot.suggest', async () => {
        const content = await context.api.editor.getContent();
        const suggestion = getSuggestion(content);
        
        if (suggestion) {
          context.api.ui.showNotification(
            '🤖 Copilot Suggestion (' + suggestion.trigger + '):\\n' + suggestion.template.replace(/\\$\\d/g, '...'),
            'info'
          );
        } else {
          context.api.ui.showNotification('🤖 Type to get AI suggestions', 'info');
        }
      }, 'Trigger Inline Suggestion');
      
      context.registerCommand('copilot.accept', async () => {
        const content = await context.api.editor.getContent();
        const suggestion = getSuggestion(content);
        
        if (suggestion) {
          const insertion = suggestion.template.replace(/\\$\\d/g, '');
          await context.api.editor.insertText(insertion);
          context.api.ui.showNotification('✓ Suggestion accepted', 'success');
        }
      }, 'Accept Suggestion');
      
      let suggestTimeout = null;
      context.onTextChange(async (data) => {
        clearTimeout(suggestTimeout);
        suggestTimeout = setTimeout(async () => {
          const suggestion = getSuggestion(data.content);
          if (suggestion) {
            await context.api.storage.set('copilotSuggestion', suggestion);
          }
        }, 300);
      });
      
      context.api.ui.showNotification('GitHub Copilot active - AI suggestions enabled', 'success');
    `
  },
  {
    id: 'docker',
    name: 'Docker',
    description: 'Makes it easy to build, manage, and deploy containerized applications',
    version: '1.28.0',
    author: 'Microsoft',
    icon: '🐳',
    category: 'Tools',
    downloads: 25000000,
    rating: 4.6,
    verified: true,
    tags: ['docker', 'containers', 'devops'],
    permissions: ['terminal:execute'],
    installed: false,
    enabled: false,
    status: 'inactive',
    main: `
      const dockerCommands = {
        build: 'docker build -t myapp:latest .',
        run: 'docker run -d -p 3000:3000 --name myapp-container myapp:latest',
        stop: 'docker stop myapp-container',
        remove: 'docker rm myapp-container',
        logs: 'docker logs -f myapp-container',
        ps: 'docker ps',
        images: 'docker images',
        compose: 'docker-compose up -d',
        composeDown: 'docker-compose down',
        prune: 'docker system prune -f'
      };
      
      context.registerCommand('docker.build', async () => {
        context.api.ui.showNotification('🐳 Building Docker image...', 'info');
        await context.api.terminal.execute(dockerCommands.build);
      }, 'Build Image');
      
      context.registerCommand('docker.run', async () => {
        context.api.ui.showNotification('🐳 Starting container...', 'info');
        await context.api.terminal.execute(dockerCommands.run);
      }, 'Run Container');
      
      context.registerCommand('docker.stop', async () => {
        context.api.ui.showNotification('🐳 Stopping container...', 'info');
        await context.api.terminal.execute(dockerCommands.stop);
      }, 'Stop Container');
      
      context.registerCommand('docker.logs', async () => {
        await context.api.terminal.execute(dockerCommands.logs);
      }, 'View Logs');
      
      context.registerCommand('docker.compose', async () => {
        context.api.ui.showNotification('🐳 Starting Docker Compose...', 'info');
        await context.api.terminal.execute(dockerCommands.compose);
      }, 'Compose Up');
      
      context.registerCommand('docker.ps', async () => {
        await context.api.terminal.execute(dockerCommands.ps);
      }, 'List Containers');
      
      context.registerCommand('docker.images', async () => {
        await context.api.terminal.execute(dockerCommands.images);
      }, 'List Images');
      
      context.api.ui.showNotification('Docker extension active - Container management ready', 'info');
    `
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Rich support for Python - IntelliSense, linting, debugging, formatting, and more',
    version: '2024.2.1',
    author: 'Microsoft',
    icon: '🐍',
    category: 'Languages',
    downloads: 95000000,
    rating: 4.7,
    verified: true,
    tags: ['python', 'intellisense', 'debug'],
    permissions: ['editor:complete', 'terminal:execute'],
    installed: false,
    enabled: false,
    status: 'inactive',
    main: `
      const pythonCommands = {
        run: 'python',
        install: 'pip install',
        venv: 'python -m venv venv',
        activate: 'source venv/bin/activate',
        requirements: 'pip freeze > requirements.txt',
        installReqs: 'pip install -r requirements.txt',
        lint: 'pylint',
        format: 'black',
        test: 'pytest'
      };
      
      context.registerCommand('python.runFile', async () => {
        context.api.ui.showNotification('🐍 Running Python file...', 'info');
        await context.api.terminal.execute(pythonCommands.run + ' main.py');
      }, 'Run Python File');
      
      context.registerCommand('python.runSelection', async () => {
        const selection = await context.api.editor.getSelection();
        if (selection && selection.text) {
          await context.api.terminal.execute('python -c "' + selection.text.replace(/"/g, '\\\\"') + '"');
        } else {
          context.api.ui.showNotification('Select code to run', 'warning');
        }
      }, 'Run Selection');
      
      context.registerCommand('python.createVenv', async () => {
        context.api.ui.showNotification('🐍 Creating virtual environment...', 'info');
        await context.api.terminal.execute(pythonCommands.venv);
        await context.api.terminal.execute(pythonCommands.activate);
      }, 'Create Virtual Environment');
      
      context.registerCommand('python.installPackage', async () => {
        context.api.ui.showNotification('Enter package name in terminal', 'info');
        await context.api.terminal.write(pythonCommands.install + ' ');
      }, 'Install Package');
      
      context.registerCommand('python.lint', async () => {
        context.api.ui.showNotification('🐍 Linting Python code...', 'info');
        await context.api.terminal.execute(pythonCommands.lint + ' *.py');
      }, 'Lint with Pylint');
      
      context.registerCommand('python.format', async () => {
        context.api.ui.showNotification('🐍 Formatting with Black...', 'info');
        await context.api.terminal.execute(pythonCommands.format + ' .');
      }, 'Format with Black');
      
      context.registerCommand('python.test', async () => {
        context.api.ui.showNotification('🐍 Running tests...', 'info');
        await context.api.terminal.execute(pythonCommands.test);
      }, 'Run Tests');
      
      context.api.ui.showNotification('Python extension active - Development tools ready', 'info');
    `
  },
  {
    id: 'tailwind',
    name: 'Tailwind CSS IntelliSense',
    description: 'Intelligent Tailwind CSS tooling - Autocomplete, syntax highlighting, and linting',
    version: '0.12.0',
    author: 'Tailwind Labs',
    icon: '💨',
    category: 'Languages',
    downloads: 9000000,
    rating: 4.8,
    verified: true,
    tags: ['tailwind', 'css', 'autocomplete'],
    permissions: ['editor:complete'],
    installed: false,
    enabled: false,
    status: 'inactive',
    main: `
      const tailwindClasses = {
        // Layout
        flex: ['flex', 'flex-row', 'flex-col', 'flex-wrap', 'flex-nowrap', 'flex-1', 'flex-auto', 'flex-none'],
        grid: ['grid', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-12', 'gap-1', 'gap-2', 'gap-4'],
        display: ['block', 'inline-block', 'inline', 'hidden', 'visible', 'invisible'],
        position: ['relative', 'absolute', 'fixed', 'sticky', 'static'],
        // Spacing
        padding: ['p-0', 'p-1', 'p-2', 'p-4', 'p-6', 'p-8', 'px-4', 'py-2', 'pt-4', 'pb-4', 'pl-4', 'pr-4'],
        margin: ['m-0', 'm-1', 'm-2', 'm-4', 'm-auto', 'mx-auto', 'my-4', 'mt-4', 'mb-4', 'ml-4', 'mr-4'],
        // Sizing
        width: ['w-full', 'w-1/2', 'w-1/3', 'w-1/4', 'w-screen', 'w-auto', 'w-64', 'w-96', 'max-w-md', 'max-w-lg'],
        height: ['h-full', 'h-screen', 'h-auto', 'h-64', 'h-96', 'min-h-screen'],
        // Typography
        text: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-center', 'text-left', 'text-right'],
        font: ['font-bold', 'font-semibold', 'font-medium', 'font-normal', 'font-light'],
        // Colors
        textColor: ['text-white', 'text-black', 'text-gray-500', 'text-red-500', 'text-blue-500', 'text-green-500'],
        bgColor: ['bg-white', 'bg-black', 'bg-gray-100', 'bg-gray-800', 'bg-blue-500', 'bg-red-500', 'bg-transparent'],
        // Borders
        border: ['border', 'border-2', 'border-0', 'border-t', 'border-b', 'rounded', 'rounded-lg', 'rounded-full', 'rounded-none'],
        // Effects
        shadow: ['shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-none'],
        opacity: ['opacity-0', 'opacity-50', 'opacity-100'],
        // Interactive
        hover: ['hover:bg-gray-100', 'hover:text-blue-500', 'hover:scale-105', 'hover:opacity-80'],
        transition: ['transition', 'transition-all', 'transition-colors', 'duration-150', 'duration-300', 'ease-in-out']
      };
      
      function getSuggestions(partial) {
        const results = [];
        Object.values(tailwindClasses).forEach(classes => {
          classes.forEach(cls => {
            if (cls.toLowerCase().includes(partial.toLowerCase())) {
              results.push(cls);
            }
          });
        });
        return results.slice(0, 10);
      }
      
      context.registerCommand('tailwind.suggest', async () => {
        const selection = await context.api.editor.getSelection();
        const partial = selection?.text || '';
        const suggestions = getSuggestions(partial);
        
        if (suggestions.length > 0) {
          context.api.ui.showNotification('💨 Tailwind Classes:\\n' + suggestions.join('\\n'), 'info');
        } else {
          const common = ['flex', 'grid', 'p-4', 'mx-auto', 'text-center', 'bg-white', 'rounded-lg', 'shadow'];
          context.api.ui.showNotification('💨 Common Classes:\\n' + common.join('\\n'), 'info');
        }
      }, 'Show Class Suggestions');
      
      context.registerCommand('tailwind.cheatsheet', async () => {
        let cheatsheet = '💨 Tailwind Cheatsheet:\\n\\n';
        cheatsheet += 'Layout: flex, grid, block, hidden\\n';
        cheatsheet += 'Spacing: p-4, m-4, px-2, my-auto\\n';
        cheatsheet += 'Size: w-full, h-screen, max-w-lg\\n';
        cheatsheet += 'Text: text-lg, font-bold, text-center\\n';
        cheatsheet += 'Color: text-gray-500, bg-blue-500\\n';
        cheatsheet += 'Border: rounded-lg, border, shadow-md\\n';
        context.api.ui.showNotification(cheatsheet, 'info');
      }, 'Show Cheatsheet');
      
      context.onTextChange(async (data) => {
        // Look for className=" patterns
        const classMatch = data.content.match(/className="([^"]*?)$/);
        if (classMatch) {
          const partial = classMatch[1].split(' ').pop() || '';
          if (partial.length > 1) {
            const suggestions = getSuggestions(partial);
            await context.api.storage.set('tailwindSuggestions', suggestions);
          }
        }
      });
      
      context.api.ui.showNotification('Tailwind CSS IntelliSense active', 'info');
    `
  },
  {
    id: 'import-cost',
    name: 'Import Cost',
    description: 'Display import/require package size in the editor - Know the cost of your dependencies',
    version: '3.3.0',
    author: 'Wix',
    icon: '📦',
    category: 'Tools',
    downloads: 4000000,
    rating: 4.3,
    verified: true,
    tags: ['import', 'bundle', 'size'],
    permissions: ['editor:decorate'],
    installed: false,
    enabled: false,
    status: 'inactive',
    main: `
      // Common package sizes (approximate, gzipped)
      const packageSizes = {
        'react': { size: 6.4, unit: 'kB' },
        'react-dom': { size: 130, unit: 'kB' },
        'lodash': { size: 71, unit: 'kB' },
        'moment': { size: 67, unit: 'kB' },
        'axios': { size: 13, unit: 'kB' },
        'date-fns': { size: 19, unit: 'kB' },
        'uuid': { size: 2.5, unit: 'kB' },
        'classnames': { size: 0.5, unit: 'kB' },
        'framer-motion': { size: 48, unit: 'kB' },
        'zustand': { size: 1.1, unit: 'kB' },
        '@tanstack/react-query': { size: 12, unit: 'kB' },
        'zod': { size: 12, unit: 'kB' },
        'tailwindcss': { size: 35, unit: 'kB' },
        'typescript': { size: 1500, unit: 'kB' },
        'next': { size: 90, unit: 'kB' },
        'express': { size: 57, unit: 'kB' },
        'socket.io': { size: 40, unit: 'kB' },
        'd3': { size: 74, unit: 'kB' },
        'chart.js': { size: 62, unit: 'kB' },
        'three': { size: 150, unit: 'kB' }
      };
      
      function analyzeImports(content) {
        const importRegex = /import\\s+(?:{[^}]*}|\\*\\s+as\\s+\\w+|\\w+)\\s+from\\s+['\"]([^'\"]+)['\"]|require\\(['\"]([^'\"]+)['\"]\\)/g;
        const imports = [];
        let match;
        
        while ((match = importRegex.exec(content)) !== null) {
          const pkg = match[1] || match[2];
          // Get base package name (without path)
          const basePkg = pkg.startsWith('.') ? null : pkg.split('/')[0].replace('@', '');
          
          if (basePkg && packageSizes[basePkg]) {
            imports.push({
              package: pkg,
              ...packageSizes[basePkg]
            });
          } else if (basePkg) {
            imports.push({
              package: pkg,
              size: '?',
              unit: 'kB'
            });
          }
        }
        
        return imports;
      }
      
      context.registerCommand('importCost.analyze', async () => {
        const content = await context.api.editor.getContent();
        const imports = analyzeImports(content);
        
        if (imports.length === 0) {
          context.api.ui.showNotification('No imports found', 'info');
          return;
        }
        
        let totalSize = 0;
        let report = '📦 Import Costs:\\n\\n';
        
        imports.forEach(imp => {
          const sizeStr = typeof imp.size === 'number' ? imp.size.toFixed(1) : imp.size;
          const color = imp.size > 50 ? '🔴' : imp.size > 20 ? '🟡' : '🟢';
          report += color + ' ' + imp.package + ': ' + sizeStr + ' ' + imp.unit + '\\n';
          if (typeof imp.size === 'number') totalSize += imp.size;
        });
        
        report += '\\n📊 Total: ~' + totalSize.toFixed(1) + ' kB (gzipped)';
        
        context.api.ui.showNotification(report, totalSize > 200 ? 'warning' : 'success');
      }, 'Calculate Import Costs');
      
      context.onTextChange(async (data) => {
        const imports = analyzeImports(data.content);
        await context.api.storage.set('importCosts', imports);
      });
      
      context.api.ui.showNotification('Import Cost active - Monitoring bundle size', 'info');
    `
  },
  {
    id: 'error-lens',
    name: 'Error Lens',
    description: 'Improve highlighting of errors, warnings and other diagnostics - See problems inline',
    version: '3.14.0',
    author: 'Alexander',
    icon: '🔴',
    category: 'Linters',
    downloads: 5000000,
    rating: 4.7,
    verified: true,
    tags: ['errors', 'diagnostics', 'inline'],
    permissions: ['editor:diagnostics', 'editor:decorate'],
    installed: false,
    enabled: false,
    status: 'inactive',
    main: `
      const errorPatterns = [
        { pattern: /\\bconsole\\.(log|warn|error)\\b/, severity: 'warning', message: 'Console statement' },
        { pattern: /\\bTODO\\b/i, severity: 'info', message: 'TODO comment' },
        { pattern: /\\bFIXME\\b/i, severity: 'warning', message: 'FIXME comment' },
        { pattern: /\\bHACK\\b/i, severity: 'warning', message: 'HACK comment' },
        { pattern: /\\bDEPRECATED\\b/i, severity: 'warning', message: 'Deprecated code' },
        { pattern: /any(?!thing|one|body|where)/, severity: 'warning', message: 'TypeScript any type' },
        { pattern: /\\/\\/\\s*@ts-ignore/, severity: 'warning', message: 'TypeScript ignore directive' },
        { pattern: /\\basync\\b(?!.*\\bawait\\b).*\\{[^}]*\\}/, severity: 'info', message: 'Async without await' },
      ];
      
      function findDiagnostics(content) {
        const diagnostics = [];
        const lines = content.split('\\n');
        
        lines.forEach((line, lineNum) => {
          errorPatterns.forEach(({ pattern, severity, message }) => {
            if (pattern.test(line)) {
              diagnostics.push({
                line: lineNum + 1,
                severity,
                message,
                source: 'Error Lens'
              });
            }
          });
        });
        
        return diagnostics;
      }
      
      context.registerCommand('errorLens.showAll', async () => {
        const content = await context.api.editor.getContent();
        const diagnostics = findDiagnostics(content);
        
        if (diagnostics.length === 0) {
          context.api.ui.showNotification('✓ No issues found', 'success');
          return;
        }
        
        let report = '🔍 Diagnostics Found:\\n\\n';
        const errors = diagnostics.filter(d => d.severity === 'error');
        const warnings = diagnostics.filter(d => d.severity === 'warning');
        const infos = diagnostics.filter(d => d.severity === 'info');
        
        if (errors.length) report += '🔴 Errors: ' + errors.length + '\\n';
        if (warnings.length) report += '🟡 Warnings: ' + warnings.length + '\\n';
        if (infos.length) report += '🔵 Info: ' + infos.length + '\\n';
        
        report += '\\nDetails:\\n';
        diagnostics.slice(0, 5).forEach(d => {
          const icon = d.severity === 'error' ? '🔴' : d.severity === 'warning' ? '🟡' : '🔵';
          report += icon + ' Line ' + d.line + ': ' + d.message + '\\n';
        });
        
        if (diagnostics.length > 5) {
          report += '... and ' + (diagnostics.length - 5) + ' more';
        }
        
        context.api.ui.showNotification(report, errors.length > 0 ? 'error' : 'warning');
      }, 'Show All Diagnostics');
      
      context.onTextChange(async (data) => {
        const diagnostics = findDiagnostics(data.content);
        await context.api.storage.set('errorLensDiagnostics', diagnostics);
      });
      
      context.api.ui.showNotification('Error Lens active - Inline diagnostics enabled', 'info');
    `
  },
  {
    id: 'todo-tree',
    name: 'Todo Tree',
    description: 'Show TODO, FIXME, etc. comment tags in a tree view - Never forget a TODO again',
    version: '0.0.226',
    author: 'Gruntfuggly',
    icon: '📋',
    category: 'Tools',
    downloads: 6000000,
    rating: 4.8,
    verified: true,
    tags: ['todo', 'comments', 'tasks'],
    permissions: ['editor:read'],
    installed: false,
    enabled: false,
    status: 'inactive',
    main: `
      const todoTags = ['TODO', 'FIXME', 'HACK', 'XXX', 'BUG', 'NOTE', 'OPTIMIZE', 'REVIEW'];
      
      function findTodos(content) {
        const todos = [];
        const lines = content.split('\\n');
        
        lines.forEach((line, lineNum) => {
          todoTags.forEach(tag => {
            const regex = new RegExp('\\\\/\\\\/\\\\s*' + tag + '[:：]?\\\\s*(.*)|\\\\/\\\\*\\\\s*' + tag + '[:：]?\\\\s*(.*?)\\\\*\\\\/', 'i');
            const match = line.match(regex);
            if (match) {
              todos.push({
                tag,
                text: (match[1] || match[2] || '').trim() || 'No description',
                line: lineNum + 1
              });
            }
          });
        });
        
        return todos;
      }
      
      context.registerCommand('todoTree.show', async () => {
        const content = await context.api.editor.getContent();
        const todos = findTodos(content);
        
        if (todos.length === 0) {
          context.api.ui.showNotification('✓ No TODOs found', 'success');
          return;
        }
        
        let report = '📋 Todo Tree:\\n\\n';
        
        // Group by tag
        const grouped = {};
        todos.forEach(todo => {
          if (!grouped[todo.tag]) grouped[todo.tag] = [];
          grouped[todo.tag].push(todo);
        });
        
        Object.entries(grouped).forEach(([tag, items]) => {
          const icon = tag === 'BUG' ? '🐛' : tag === 'FIXME' ? '🔧' : tag === 'HACK' ? '⚠️' : tag === 'NOTE' ? '📝' : '📌';
          report += icon + ' ' + tag + ' (' + items.length + '):\\n';
          items.forEach(item => {
            report += '   Line ' + item.line + ': ' + item.text.substring(0, 40) + '\\n';
          });
          report += '\\n';
        });
        
        context.api.ui.showNotification(report, 'info');
      }, 'Show Todo Tree');
      
      context.registerCommand('todoTree.summary', async () => {
        const content = await context.api.editor.getContent();
        const todos = findTodos(content);
        
        const summary = todoTags.map(tag => {
          const count = todos.filter(t => t.tag === tag).length;
          return count > 0 ? tag + ': ' + count : null;
        }).filter(Boolean).join(' | ');
        
        context.api.ui.showNotification('📋 ' + (summary || 'No TODOs found'), 'info');
      }, 'Quick Summary');
      
      context.onTextChange(async (data) => {
        const todos = findTodos(data.content);
        await context.api.storage.set('todoList', todos);
      });
      
      context.api.ui.showNotification('Todo Tree active - Tracking TODO comments', 'info');
    `
  },
  {
    id: 'bookmarks',
    name: 'Bookmarks',
    description: 'Mark lines and jump to them - Navigate your code with ease',
    version: '13.4.0',
    author: 'Alessandro Fragnani',
    icon: '🔖',
    category: 'Tools',
    downloads: 4500000,
    rating: 4.6,
    verified: true,
    tags: ['bookmarks', 'navigation'],
    permissions: ['editor:decorate', 'storage:write'],
    installed: false,
    enabled: false,
    status: 'inactive',
    main: `
      let bookmarks = [];
      
      // Load saved bookmarks
      (async () => {
        const saved = await context.api.storage.get('bookmarks');
        if (saved) bookmarks = saved;
      })();
      
      context.registerCommand('bookmarks.toggle', async () => {
        const selection = await context.api.editor.getSelection();
        const line = selection ? Math.floor(selection.start / 50) + 1 : 1;
        
        const existingIndex = bookmarks.findIndex(b => b.line === line);
        
        if (existingIndex >= 0) {
          bookmarks.splice(existingIndex, 1);
          context.api.ui.showNotification('🔖 Bookmark removed from line ' + line, 'info');
        } else {
          bookmarks.push({ line, label: 'Bookmark ' + (bookmarks.length + 1) });
          context.api.ui.showNotification('🔖 Bookmark added at line ' + line, 'success');
        }
        
        await context.api.storage.set('bookmarks', bookmarks);
      }, 'Toggle Bookmark');
      
      context.registerCommand('bookmarks.list', async () => {
        if (bookmarks.length === 0) {
          context.api.ui.showNotification('No bookmarks set', 'info');
          return;
        }
        
        let list = '🔖 Bookmarks:\\n\\n';
        bookmarks.forEach((b, i) => {
          list += (i + 1) + '. Line ' + b.line + ': ' + b.label + '\\n';
        });
        
        context.api.ui.showNotification(list, 'info');
      }, 'List All Bookmarks');
      
      context.registerCommand('bookmarks.clear', async () => {
        const count = bookmarks.length;
        bookmarks = [];
        await context.api.storage.set('bookmarks', bookmarks);
        context.api.ui.showNotification('Cleared ' + count + ' bookmark(s)', 'info');
      }, 'Clear All Bookmarks');
      
      context.registerCommand('bookmarks.next', async () => {
        if (bookmarks.length === 0) {
          context.api.ui.showNotification('No bookmarks set', 'warning');
          return;
        }
        // Would navigate to next bookmark in real implementation
        context.api.ui.showNotification('Jump to bookmark at line ' + bookmarks[0].line, 'info');
      }, 'Jump to Next Bookmark');
      
      context.api.ui.showNotification('Bookmarks active - Use Ctrl+Alt+K to toggle', 'info');
    `
  }
];

export function useExtensions() {
  const [extensions, setExtensions] = useState<ExtensionInfo[]>(MARKETPLACE_EXTENSIONS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const notificationIdRef = useRef(0);

  // Initialize extension system
  useEffect(() => {
    if (isInitialized) return;

    // Connect store to extension host
    connectStoreToExtensions(useStore);

    // Load installed extensions from storage
    const installed = localStorage.getItem('installedExtensions');
    if (installed) {
      const installedIds = JSON.parse(installed) as string[];
      setExtensions(prev => prev.map(ext => ({
        ...ext,
        installed: installedIds.includes(ext.id),
        enabled: installedIds.includes(ext.id)
      })));

      // Auto-activate installed extensions
      installedIds.forEach(id => {
        const ext = MARKETPLACE_EXTENSIONS.find(e => e.id === id);
        if (ext?.main) {
          extensionHost.activateExtension({
            id: ext.id,
            name: ext.name,
            version: ext.version,
            main: ext.main,
            permissions: ext.permissions
          });
        }
      });
    }

    // Listen for extension events
    extensionEvents.on('extension:activated', ({ extensionId }) => {
      setExtensions(prev => prev.map(ext => 
        ext.id === extensionId ? { ...ext, status: 'active' } : ext
      ));
    });

    extensionEvents.on('extension:deactivated', ({ extensionId }) => {
      setExtensions(prev => prev.map(ext => 
        ext.id === extensionId ? { ...ext, status: 'inactive' } : ext
      ));
    });

    extensionEvents.on('extension:error', ({ extensionId, error }) => {
      setExtensions(prev => prev.map(ext => 
        ext.id === extensionId ? { ...ext, status: 'error' } : ext
      ));
      addNotification(`Extension ${extensionId} error: ${error}`, 'error', extensionId);
    });

    // Listen for UI notifications from extensions
    extensionEvents.on('ui:notification', (message: string, type: string) => {
      addNotification(message, type as any);
    });

    setIsInitialized(true);

    return () => {
      extensionEvents.off('extension:activated', () => {});
      extensionEvents.off('extension:deactivated', () => {});
      extensionEvents.off('extension:error', () => {});
      extensionEvents.off('ui:notification', () => {});
    };
  }, [isInitialized]);

  // Add notification
  const addNotification = useCallback((message: string, type: Notification['type'] = 'info', extensionId?: string) => {
    const notification: Notification = {
      id: `notif-${++notificationIdRef.current}`,
      message,
      type,
      extensionId,
      timestamp: Date.now()
    };
    setNotifications(prev => [...prev, notification]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);

  // Install extension
  const installExtension = useCallback(async (extensionId: string) => {
    const ext = extensions.find(e => e.id === extensionId);
    if (!ext) return false;

    setExtensions(prev => prev.map(e => 
      e.id === extensionId ? { ...e, status: 'activating' } : e
    ));

    try {
      // Activate in extension host
      if (ext.main) {
        const success = await extensionHost.activateExtension({
          id: ext.id,
          name: ext.name,
          version: ext.version,
          main: ext.main,
          permissions: ext.permissions
        });

        if (!success) throw new Error('Activation failed');
      }

      // Update state
      setExtensions(prev => prev.map(e => 
        e.id === extensionId ? { ...e, installed: true, enabled: true, status: 'active' } : e
      ));

      // Save to storage
      const installed = extensions.filter(e => e.installed || e.id === extensionId).map(e => e.id);
      localStorage.setItem('installedExtensions', JSON.stringify(installed));

      addNotification(`${ext.name} installed successfully!`, 'success');
      return true;
    } catch (error: any) {
      setExtensions(prev => prev.map(e => 
        e.id === extensionId ? { ...e, status: 'error' } : e
      ));
      addNotification(`Failed to install ${ext.name}: ${error.message}`, 'error');
      return false;
    }
  }, [extensions, addNotification]);

  // Uninstall extension
  const uninstallExtension = useCallback(async (extensionId: string) => {
    const ext = extensions.find(e => e.id === extensionId);
    if (!ext) return false;

    try {
      // Deactivate in extension host
      await extensionHost.deactivateExtension(extensionId);

      // Update state
      setExtensions(prev => prev.map(e => 
        e.id === extensionId ? { ...e, installed: false, enabled: false, status: 'inactive' } : e
      ));

      // Save to storage
      const installed = extensions.filter(e => e.installed && e.id !== extensionId).map(e => e.id);
      localStorage.setItem('installedExtensions', JSON.stringify(installed));

      addNotification(`${ext.name} uninstalled`, 'info');
      return true;
    } catch (error: any) {
      addNotification(`Failed to uninstall ${ext.name}: ${error.message}`, 'error');
      return false;
    }
  }, [extensions, addNotification]);

  // Toggle extension enabled/disabled
  const toggleExtension = useCallback(async (extensionId: string) => {
    const ext = extensions.find(e => e.id === extensionId);
    if (!ext || !ext.installed) return;

    if (ext.enabled) {
      // Disable
      await extensionHost.deactivateExtension(extensionId);
      setExtensions(prev => prev.map(e => 
        e.id === extensionId ? { ...e, enabled: false, status: 'inactive' } : e
      ));
    } else {
      // Enable
      if (ext.main) {
        await extensionHost.activateExtension({
          id: ext.id,
          name: ext.name,
          version: ext.version,
          main: ext.main,
          permissions: ext.permissions
        });
      }
      setExtensions(prev => prev.map(e => 
        e.id === extensionId ? { ...e, enabled: true } : e
      ));
    }
  }, [extensions]);

  // Reload extension (hot reload)
  const reloadExtension = useCallback(async (extensionId: string) => {
    const ext = extensions.find(e => e.id === extensionId);
    if (!ext?.main) return;

    addNotification(`Reloading ${ext.name}...`, 'info');

    const success = await extensionHost.reloadExtension({
      id: ext.id,
      name: ext.name,
      version: ext.version,
      main: ext.main,
      permissions: ext.permissions
    });

    if (success) {
      addNotification(`${ext.name} reloaded!`, 'success');
    } else {
      addNotification(`Failed to reload ${ext.name}`, 'error');
    }
  }, [extensions, addNotification]);

  // Execute extension command
  const executeCommand = useCallback((extensionId: string, commandId: string, args?: any) => {
    extensionHost.executeCommand(extensionId, commandId, args);
  }, []);

  // Dismiss notification
  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Get installed extensions
  const installedExtensions = extensions.filter(e => e.installed);

  // Get active extensions
  const activeExtensions = extensions.filter(e => e.status === 'active');

  return {
    extensions,
    installedExtensions,
    activeExtensions,
    notifications,
    installExtension,
    uninstallExtension,
    toggleExtension,
    reloadExtension,
    executeCommand,
    addNotification,
    dismissNotification,
    clearNotifications
  };
}

export default useExtensions;
