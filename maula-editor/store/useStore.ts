import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  FileNode, 
  OpenFile, 
  Project, 
  ChatMessage, 
  AIConfig, 
  Extension,
  Theme,
  PanelLayout,
  EditorSettings,
  UILayout,
  ShellType,
  Workspace,
  RecentProject
} from '../types';
import { filesApiService } from '../services/filesApi';

interface StoreState {
  // Project
  currentProject: Project | null;
  projects: Project[];
  
  // Workspaces
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  recentProjects: RecentProject[];
  
  // Files
  files: FileNode[];
  openFiles: OpenFile[];
  activeFileId: string | null;
  
  // UI
  theme: Theme;
  layout: PanelLayout;
  uiLayout: UILayout;
  sidebarOpen: boolean;
  sidebarTab: 'files' | 'templates' | 'extensions';
  aiPanelOpen: boolean;
  terminalOpen: boolean;
  previewOpen: boolean;
  
  // Editor Settings
  editorSettings: EditorSettings;
  
  // AI
  aiConfig: AIConfig;
  chatHistory: ChatMessage[];
  chatSessions: Array<{ id: string; name: string; messages: ChatMessage[]; createdAt: number; updatedAt: number }>;
  activeChatSessionId: string | null;
  isAiLoading: boolean;
  
  // Extensions
  extensions: Extension[];
  
  // Actions - Project
  setCurrentProject: (project: Project | null) => void;
  createProject: (name: string, template: string, files: FileNode[]) => Promise<void>;
  deleteProject: (projectId: string) => void;
  renameProject: (projectId: string, newName: string) => void;
  
  // Actions - Workspace
  createWorkspace: (name: string, color?: string) => void;
  deleteWorkspace: (workspaceId: string) => void;
  renameWorkspace: (workspaceId: string, newName: string) => void;
  setActiveWorkspace: (workspaceId: string | null) => void;
  addProjectToWorkspace: (workspaceId: string, projectId: string) => void;
  removeProjectFromWorkspace: (workspaceId: string, projectId: string) => void;
  addRecentProject: (project: Project) => void;
  clearRecentProjects: () => void;
  
  // Actions - Files
  setFiles: (files: FileNode[]) => void;
  openFile: (file: OpenFile) => void;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string | null) => void;
  updateFileContent: (fileId: string, content: string) => void;
  createFile: (path: string, name: string, content?: string) => void;
  createFolder: (path: string, name: string) => void;
  deleteNode: (path: string) => void;
  renameNode: (path: string, newName: string) => void;
  moveNode: (sourcePath: string, targetPath: string) => void;
  copyNode: (sourcePath: string, targetPath: string) => void;
  
  // Actions - UI
  setTheme: (theme: Theme) => void;
  setLayout: (layout: PanelLayout) => void;
  setUILayout: (uiLayout: Partial<UILayout>) => void;
  toggleSidebar: () => void;
  setSidebarTab: (tab: 'files' | 'templates' | 'extensions') => void;
  toggleAiPanel: () => void;
  toggleTerminal: () => void;
  togglePreview: () => void;
  
  // Actions - Editor Settings
  setEditorSettings: (settings: Partial<EditorSettings>) => void;
  
  // Actions - AI
  setAiConfig: (config: Partial<AIConfig>) => void;
  addMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  setAiLoading: (loading: boolean) => void;
  createChatSession: (name?: string) => string;
  deleteChatSession: (sessionId: string) => void;
  switchChatSession: (sessionId: string) => void;
  renameChatSession: (sessionId: string, newName: string) => void;
  
  // Actions - Extensions
  toggleExtension: (extensionId: string) => void;
  addExtension: (extension: Extension) => void;
  removeExtension: (extensionId: string) => void;
  resetExtensions: () => void;
  syncExtensions: () => void;
}

const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  // Basic
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', 'Monaco', 'Consolas', monospace",
  fontLigatures: true,
  lineHeight: 1.6,
  letterSpacing: 0,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  lineNumbers: true,
  autoSave: true,
  
  // Professional Features
  theme: 'charcoal-aurora',
  iconTheme: 'material',
  cursorStyle: 'line',
  cursorBlinking: 'smooth',
  smoothScrolling: true,
  mouseWheelZoom: true,
  
  // Multi-cursor & Selection
  multiCursorModifier: 'alt',
  columnSelection: false,
  
  // Code Intelligence
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on',
  parameterHints: true,
  autoClosingBrackets: 'languageDefined',
  autoClosingQuotes: 'languageDefined',
  autoIndent: 'full',
  formatOnPaste: true,
  formatOnType: false,
  
  // Display
  renderWhitespace: 'selection',
  renderControlCharacters: false,
  renderLineHighlight: 'all',
  bracketPairColorization: true,
  guides: {
    indentation: true,
    bracketPairs: true,
    highlightActiveBracketPair: true,
  },
  
  // Performance (Large Files)
  largeFileOptimizations: true,
  maxTokenizationLineLength: 20000,
  
  // Diff Editor
  enableSplitViewResizing: true,
  renderSideBySide: true,
  
  // Terminal Settings
  terminal: {
    defaultShell: 'bash',
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    cursorStyle: 'bar',
    cursorBlink: true,
    scrollback: 10000,
    copyOnSelect: false,
    enableBell: false,
    lineHeight: 1.4,
  },
};

const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'gemini',
  model: 'gemini-2.0-flash',
  temperature: 0.7,
  maxTokens: 4096,
};

const DEFAULT_EXTENSIONS: Extension[] = [
  // Language Support
  {
    id: 'javascript',
    name: 'JavaScript',
    description: 'JavaScript and TypeScript support with IntelliSense',
    icon: '🟨',
    version: '1.0.0',
    category: 'Language',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    description: 'TypeScript language support and type checking',
    icon: '🔷',
    version: '1.0.0',
    category: 'Language',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Python language support with Pylance',
    icon: '🐍',
    version: '1.0.0',
    category: 'Language',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'html',
    name: 'HTML',
    description: 'HTML language support and snippets',
    icon: '🌐',
    version: '1.0.0',
    category: 'Language',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'css',
    name: 'CSS',
    description: 'CSS, SCSS, and Less language support',
    icon: '🎨',
    version: '1.0.0',
    category: 'Language',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'json',
    name: 'JSON',
    description: 'JSON language support with schema validation',
    icon: '📋',
    version: '1.0.0',
    category: 'Language',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'markdown',
    name: 'Markdown',
    description: 'Markdown preview and editing support',
    icon: '📝',
    version: '1.0.0',
    category: 'Language',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'go',
    name: 'Go',
    description: 'Go language support',
    icon: '🐹',
    version: '1.0.0',
    category: 'Language',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'rust',
    name: 'Rust',
    description: 'Rust language support with rust-analyzer',
    icon: '🦀',
    version: '1.0.0',
    category: 'Language',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'java',
    name: 'Java',
    description: 'Java language support',
    icon: '☕',
    version: '1.0.0',
    category: 'Language',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'cpp',
    name: 'C/C++',
    description: 'C and C++ language support',
    icon: '⚙️',
    version: '1.0.0',
    category: 'Language',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'php',
    name: 'PHP',
    description: 'PHP language support',
    icon: '🐘',
    version: '1.0.0',
    category: 'Language',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'ruby',
    name: 'Ruby',
    description: 'Ruby language support',
    icon: '💎',
    version: '1.0.0',
    category: 'Language',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'swift',
    name: 'Swift',
    description: 'Swift language support',
    icon: '🐦',
    version: '1.0.0',
    category: 'Language',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'sql',
    name: 'SQL',
    description: 'SQL language support and formatting',
    icon: '🗄️',
    version: '1.0.0',
    category: 'Language',
    enabled: true,
    isBuiltIn: true,
  },
  // Frameworks
  {
    id: 'react',
    name: 'React',
    description: 'React development tools and snippets',
    icon: '⚛️',
    version: '1.0.0',
    category: 'Framework',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'vue',
    name: 'Vue.js',
    description: 'Vue 3 language support with Volar',
    icon: '💚',
    version: '1.0.0',
    category: 'Framework',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'angular',
    name: 'Angular',
    description: 'Angular language support and snippets',
    icon: '🅰️',
    version: '1.0.0',
    category: 'Framework',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'svelte',
    name: 'Svelte',
    description: 'Svelte language support',
    icon: '🔥',
    version: '1.0.0',
    category: 'Framework',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'Next.js snippets and support',
    icon: '▲',
    version: '1.0.0',
    category: 'Framework',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    description: 'Node.js debugging and tools',
    icon: '🟢',
    version: '1.0.0',
    category: 'Framework',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'express',
    name: 'Express',
    description: 'Express.js snippets and support',
    icon: '🚂',
    version: '1.0.0',
    category: 'Framework',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'django',
    name: 'Django',
    description: 'Django framework support',
    icon: '🎸',
    version: '1.0.0',
    category: 'Framework',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'flask',
    name: 'Flask',
    description: 'Flask framework support',
    icon: '🧪',
    version: '1.0.0',
    category: 'Framework',
    enabled: false,
    isBuiltIn: true,
  },
  // Formatters & Linters
  {
    id: 'tailwind',
    name: 'Tailwind CSS',
    description: 'Tailwind CSS IntelliSense and autocomplete',
    icon: '💨',
    version: '1.0.0',
    category: 'Formatters',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'prettier',
    name: 'Prettier',
    description: 'Code formatter for multiple languages',
    icon: '✨',
    version: '1.0.0',
    category: 'Formatters',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'eslint',
    name: 'ESLint',
    description: 'JavaScript and TypeScript linting',
    icon: '🔍',
    version: '1.0.0',
    category: 'Formatters',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'stylelint',
    name: 'Stylelint',
    description: 'CSS and SCSS linting',
    icon: '💅',
    version: '1.0.0',
    category: 'Formatters',
    enabled: false,
    isBuiltIn: true,
  },
  // AI Extensions
  {
    id: 'copilot',
    name: 'AI Copilot',
    description: 'AI-powered code completion and suggestions',
    icon: '🤖',
    version: '1.0.0',
    category: 'AI',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'codewhisperer',
    name: 'Code Whisperer',
    description: 'AI code generation assistant',
    icon: '🧠',
    version: '1.0.0',
    category: 'AI',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'tabnine',
    name: 'Tabnine',
    description: 'AI autocomplete for all languages',
    icon: '⚡',
    version: '1.0.0',
    category: 'AI',
    enabled: false,
    isBuiltIn: true,
  },
  // Themes
  {
    id: 'dracula',
    name: 'Dracula Theme',
    description: 'A dark theme for the editor',
    icon: '🧛',
    version: '1.0.0',
    category: 'Themes',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'onedark',
    name: 'One Dark Pro',
    description: 'Atom One Dark theme',
    icon: '🌙',
    version: '1.0.0',
    category: 'Themes',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'github-theme',
    name: 'GitHub Theme',
    description: 'GitHub\'s official VS Code theme',
    icon: '🐙',
    version: '1.0.0',
    category: 'Themes',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'material-theme',
    name: 'Material Theme',
    description: 'Material Design inspired theme',
    icon: '🎨',
    version: '1.0.0',
    category: 'Themes',
    enabled: false,
    isBuiltIn: true,
  },
  // Tools
  {
    id: 'git',
    name: 'Git',
    description: 'Git version control integration',
    icon: '📦',
    version: '1.0.0',
    category: 'Source Control',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'gitlens',
    name: 'GitLens',
    description: 'Supercharge Git capabilities',
    icon: '🔮',
    version: '1.0.0',
    category: 'Source Control',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'docker',
    name: 'Docker',
    description: 'Docker container management',
    icon: '🐳',
    version: '1.0.0',
    category: 'Tools',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'rest-client',
    name: 'REST Client',
    description: 'Send HTTP requests directly from the editor',
    icon: '📡',
    version: '1.0.0',
    category: 'Tools',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'live-server',
    name: 'Live Server',
    description: 'Launch a local dev server with live reload',
    icon: '🔄',
    version: '1.0.0',
    category: 'Tools',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'path-intellisense',
    name: 'Path Intellisense',
    description: 'Autocomplete file paths',
    icon: '📁',
    version: '1.0.0',
    category: 'Tools',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'auto-rename-tag',
    name: 'Auto Rename Tag',
    description: 'Auto rename paired HTML/XML tags',
    icon: '🏷️',
    version: '1.0.0',
    category: 'Tools',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'bracket-colorizer',
    name: 'Bracket Colorizer',
    description: 'Colorize matching brackets',
    icon: '🌈',
    version: '1.0.0',
    category: 'Tools',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'error-lens',
    name: 'Error Lens',
    description: 'Highlight errors and warnings inline',
    icon: '🔴',
    version: '1.0.0',
    category: 'Tools',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'todo-highlight',
    name: 'TODO Highlight',
    description: 'Highlight TODO, FIXME and other annotations',
    icon: '📌',
    version: '1.0.0',
    category: 'Tools',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'indent-rainbow',
    name: 'Indent Rainbow',
    description: 'Colorize indentation levels',
    icon: '🌈',
    version: '1.0.0',
    category: 'Tools',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'code-spell-checker',
    name: 'Code Spell Checker',
    description: 'Spell checker for source code',
    icon: '📖',
    version: '1.0.0',
    category: 'Tools',
    enabled: false,
    isBuiltIn: true,
  },
  // Snippets
  {
    id: 'es7-snippets',
    name: 'ES7+ Snippets',
    description: 'JavaScript/React/Redux/GraphQL snippets',
    icon: '📋',
    version: '1.0.0',
    category: 'Snippets',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'html-snippets',
    name: 'HTML Snippets',
    description: 'HTML5 snippets and boilerplate',
    icon: '📄',
    version: '1.0.0',
    category: 'Snippets',
    enabled: true,
    isBuiltIn: true,
  },
  // Testing
  {
    id: 'jest',
    name: 'Jest',
    description: 'Jest testing framework support',
    icon: '🃏',
    version: '1.0.0',
    category: 'Testing',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'vitest',
    name: 'Vitest',
    description: 'Vitest testing framework support',
    icon: '⚡',
    version: '1.0.0',
    category: 'Testing',
    enabled: false,
    isBuiltIn: true,
  },
  // Database
  {
    id: 'mongodb',
    name: 'MongoDB',
    description: 'MongoDB database tools',
    icon: '🍃',
    version: '1.0.0',
    category: 'Database',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'PostgreSQL database tools',
    icon: '🐘',
    version: '1.0.0',
    category: 'Database',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'prisma',
    name: 'Prisma',
    description: 'Prisma ORM support',
    icon: '🔺',
    version: '1.0.0',
    category: 'Database',
    enabled: false,
    isBuiltIn: true,
  },
  // Additional Development Tools
  {
    id: 'npm-intellisense',
    name: 'NPM Intellisense',
    description: 'Autocomplete npm modules in import statements',
    icon: '📦',
    version: '1.0.0',
    category: 'Tools',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'import-cost',
    name: 'Import Cost',
    description: 'Display package size inline when importing',
    icon: '📊',
    version: '1.0.0',
    category: 'Tools',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'debugger',
    name: 'Debugger',
    description: 'Built-in debugging support',
    icon: '🐛',
    version: '1.0.0',
    category: 'Tools',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'terminal',
    name: 'Integrated Terminal',
    description: 'Terminal integration for running commands',
    icon: '💻',
    version: '1.0.0',
    category: 'Tools',
    enabled: true,
    isBuiltIn: true,
  },
  // CI/CD & Deployment
  {
    id: 'github-actions',
    name: 'GitHub Actions',
    description: 'GitHub Actions workflow support',
    icon: '⚙️',
    version: '1.0.0',
    category: 'Tools',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deploy to Vercel directly',
    icon: '▲',
    version: '1.0.0',
    category: 'Tools',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'netlify',
    name: 'Netlify',
    description: 'Deploy to Netlify integration',
    icon: '🔷',
    version: '1.0.0',
    category: 'Tools',
    enabled: false,
    isBuiltIn: true,
  },
  // Code Quality
  {
    id: 'sonarqube',
    name: 'SonarQube',
    description: 'Code quality and security analysis',
    icon: '🔍',
    version: '1.0.0',
    category: 'Tools',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'codacy',
    name: 'Codacy',
    description: 'Automated code review',
    icon: '✅',
    version: '1.0.0',
    category: 'Tools',
    enabled: false,
    isBuiltIn: true,
  },
  // Documentation
  {
    id: 'jsdoc',
    name: 'JSDoc',
    description: 'JSDoc comment support and generation',
    icon: '📚',
    version: '1.0.0',
    category: 'Tools',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'better-comments',
    name: 'Better Comments',
    description: 'Colorful and categorized code comments',
    icon: '💬',
    version: '1.0.0',
    category: 'Tools',
    enabled: true,
    isBuiltIn: true,
  },
  // Additional Frameworks
  {
    id: 'remix',
    name: 'Remix',
    description: 'Remix framework support',
    icon: '💿',
    version: '1.0.0',
    category: 'Framework',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'astro',
    name: 'Astro',
    description: 'Astro static site builder support',
    icon: '🚀',
    version: '1.0.0',
    category: 'Framework',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'nuxt',
    name: 'Nuxt.js',
    description: 'Nuxt.js Vue framework support',
    icon: '💚',
    version: '1.0.0',
    category: 'Framework',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'solid',
    name: 'SolidJS',
    description: 'SolidJS reactive framework support',
    icon: '🟦',
    version: '1.0.0',
    category: 'Framework',
    enabled: false,
    isBuiltIn: true,
  },
  // Additional Testing
  {
    id: 'cypress',
    name: 'Cypress',
    description: 'End-to-end testing framework',
    icon: '🌲',
    version: '1.0.0',
    category: 'Testing',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'playwright',
    name: 'Playwright',
    description: 'Cross-browser end-to-end testing',
    icon: '🎭',
    version: '1.0.0',
    category: 'Testing',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'testing-library',
    name: 'Testing Library',
    description: 'Testing Library for component testing',
    icon: '🧪',
    version: '1.0.0',
    category: 'Testing',
    enabled: false,
    isBuiltIn: true,
  },
  // Additional Snippets
  {
    id: 'react-snippets',
    name: 'React Snippets',
    description: 'React and hooks code snippets',
    icon: '⚛️',
    version: '1.0.0',
    category: 'Snippets',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'vue-snippets',
    name: 'Vue Snippets',
    description: 'Vue 3 composition API snippets',
    icon: '💚',
    version: '1.0.0',
    category: 'Snippets',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'css-snippets',
    name: 'CSS Snippets',
    description: 'Common CSS patterns and layouts',
    icon: '🎨',
    version: '1.0.0',
    category: 'Snippets',
    enabled: true,
    isBuiltIn: true,
  },
  // More AI Tools
  {
    id: 'codeium',
    name: 'Codeium',
    description: 'Free AI code autocomplete',
    icon: '✨',
    version: '1.0.0',
    category: 'AI',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'cursor',
    name: 'Cursor AI',
    description: 'AI-first code editor features',
    icon: '🎯',
    version: '1.0.0',
    category: 'AI',
    enabled: false,
    isBuiltIn: true,
  },
  // Database Tools
  {
    id: 'redis',
    name: 'Redis',
    description: 'Redis database tools',
    icon: '🔴',
    version: '1.0.0',
    category: 'Database',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'mysql',
    name: 'MySQL',
    description: 'MySQL database tools',
    icon: '🐬',
    version: '1.0.0',
    category: 'Database',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Supabase backend integration',
    icon: '⚡',
    version: '1.0.0',
    category: 'Database',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'firebase',
    name: 'Firebase',
    description: 'Firebase backend integration',
    icon: '🔥',
    version: '1.0.0',
    category: 'Database',
    enabled: false,
    isBuiltIn: true,
  },
  // More Themes
  {
    id: 'nord-theme',
    name: 'Nord Theme',
    description: 'Arctic, north-bluish color palette',
    icon: '❄️',
    version: '1.0.0',
    category: 'Themes',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    description: 'Dark theme inspired by Tokyo night',
    icon: '🌃',
    version: '1.0.0',
    category: 'Themes',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'synthwave',
    name: 'Synthwave \'84',
    description: 'Retro 80s synthwave theme',
    icon: '🌅',
    version: '1.0.0',
    category: 'Themes',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'monokai-pro',
    name: 'Monokai Pro',
    description: 'Professional Monokai color scheme',
    icon: '🎨',
    version: '1.0.0',
    category: 'Themes',
    enabled: false,
    isBuiltIn: true,
  },
  // Additional Languages
  {
    id: 'yaml',
    name: 'YAML',
    description: 'YAML language support',
    icon: '📝',
    version: '1.0.0',
    category: 'Language',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'graphql',
    name: 'GraphQL',
    description: 'GraphQL language support and queries',
    icon: '◼️',
    version: '1.0.0',
    category: 'Language',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'kotlin',
    name: 'Kotlin',
    description: 'Kotlin language support',
    icon: '🟪',
    version: '1.0.0',
    category: 'Language',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'dart',
    name: 'Dart',
    description: 'Dart language support for Flutter',
    icon: '🎯',
    version: '1.0.0',
    category: 'Language',
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: 'solidity',
    name: 'Solidity',
    description: 'Solidity smart contract support',
    icon: '💎',
    version: '1.0.0',
    category: 'Language',
    enabled: false,
    isBuiltIn: true,
  },
  // AI Agent Extension
  {
    id: 'ai-agent',
    name: 'AI Coding Agent',
    description: 'Intelligent AI assistant for code generation, editing, and project scaffolding. Supports multiple AI providers.',
    icon: '🤖',
    version: '2.0.0',
    category: 'AI',
    enabled: true,
    isBuiltIn: true,
  },
];

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Initial State
      currentProject: null,
      projects: [],
      workspaces: [],
      activeWorkspaceId: null,
      recentProjects: [],
      files: [],
      openFiles: [],
      activeFileId: null,
      theme: 'steel',
      layout: 'default',
      uiLayout: {
        leftSidebarWidth: 260,
        rightSidebarWidth: 380,
        terminalHeight: 200,
        sidebarPosition: 'left',
        panelPosition: 'bottom',
        compactMode: false,
      },
      sidebarOpen: true,
      sidebarTab: 'files',
      aiPanelOpen: true,
      terminalOpen: true,
      previewOpen: true,
      editorSettings: DEFAULT_EDITOR_SETTINGS,
      aiConfig: DEFAULT_AI_CONFIG,
      chatHistory: [],
      chatSessions: [],
      activeChatSessionId: null,
      isAiLoading: false,
      extensions: DEFAULT_EXTENSIONS,

      // Project Actions
      setCurrentProject: (project) => {
        set({ currentProject: project });
        // Add to recent projects
        if (project) {
          get().addRecentProject(project);
        }
      },
      
      createProject: async (name, template, files) => {
        // First try to create on backend
        let backendProject: any = null;
        try {
          backendProject = await filesApiService.createProject({
            name,
            description: '',
            template,
          });
          console.log('[Store] Project created on backend:', backendProject.id);
          
          // Sync files to backend
          for (const file of files) {
            if (file.type === 'file') {
              try {
                await filesApiService.createFile({
                  projectId: backendProject.id,
                  path: file.path.startsWith('/') ? file.path : '/' + file.path,
                  name: file.name,
                  content: file.content || '',
                  type: 'FILE',
                });
              } catch (e) {
                console.warn('[Store] Failed to sync file:', file.path, e);
              }
            }
          }
        } catch (error) {
          console.warn('[Store] Backend sync failed, using local project:', error);
        }
        
        const project: Project = {
          id: backendProject?.id || crypto.randomUUID(),
          name,
          description: '',
          template,
          files,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          path: backendProject?.path, // Server-side path for terminal
        };
        set((state) => ({
          projects: [...state.projects, project],
          currentProject: project,
          files,
          openFiles: [],
          activeFileId: null,
        }));
        // Add to recent
        get().addRecentProject(project);
      },

      deleteProject: (projectId) => {
        set((state) => {
          const newProjects = state.projects.filter(p => p.id !== projectId);
          const isCurrentDeleted = state.currentProject?.id === projectId;
          // Also remove from all workspaces
          const updatedWorkspaces = state.workspaces.map(w => ({
            ...w,
            projectIds: w.projectIds.filter(id => id !== projectId)
          }));
          // Remove from recent projects
          const updatedRecent = state.recentProjects.filter(rp => rp.id !== projectId);
          return {
            projects: newProjects,
            workspaces: updatedWorkspaces,
            recentProjects: updatedRecent,
            currentProject: isCurrentDeleted ? null : state.currentProject,
            files: isCurrentDeleted ? [] : state.files,
            openFiles: isCurrentDeleted ? [] : state.openFiles,
            activeFileId: isCurrentDeleted ? null : state.activeFileId,
          };
        });
      },

      renameProject: (projectId, newName) => {
        set((state) => ({
          projects: state.projects.map(p => 
            p.id === projectId ? { ...p, name: newName, updatedAt: Date.now() } : p
          ),
          currentProject: state.currentProject?.id === projectId 
            ? { ...state.currentProject, name: newName, updatedAt: Date.now() }
            : state.currentProject,
          recentProjects: state.recentProjects.map(rp =>
            rp.id === projectId ? { ...rp, name: newName } : rp
          ),
        }));
      },

      // Workspace Actions
      createWorkspace: (name, color) => {
        const workspace: Workspace = {
          id: crypto.randomUUID(),
          name,
          projectIds: [],
          lastOpened: Date.now(),
          color: color || getRandomWorkspaceColor(),
        };
        set((state) => ({
          workspaces: [...state.workspaces, workspace],
        }));
      },

      deleteWorkspace: (workspaceId) => {
        set((state) => ({
          workspaces: state.workspaces.filter(w => w.id !== workspaceId),
          activeWorkspaceId: state.activeWorkspaceId === workspaceId ? null : state.activeWorkspaceId,
        }));
      },

      renameWorkspace: (workspaceId, newName) => {
        set((state) => ({
          workspaces: state.workspaces.map(w =>
            w.id === workspaceId ? { ...w, name: newName } : w
          ),
        }));
      },

      setActiveWorkspace: (workspaceId) => {
        set((state) => ({
          activeWorkspaceId: workspaceId,
          workspaces: state.workspaces.map(w =>
            w.id === workspaceId ? { ...w, lastOpened: Date.now() } : w
          ),
        }));
      },

      addProjectToWorkspace: (workspaceId, projectId) => {
        set((state) => ({
          workspaces: state.workspaces.map(w =>
            w.id === workspaceId && !w.projectIds.includes(projectId)
              ? { ...w, projectIds: [...w.projectIds, projectId] }
              : w
          ),
        }));
      },

      removeProjectFromWorkspace: (workspaceId, projectId) => {
        set((state) => ({
          workspaces: state.workspaces.map(w =>
            w.id === workspaceId
              ? { ...w, projectIds: w.projectIds.filter(id => id !== projectId) }
              : w
          ),
        }));
      },

      addRecentProject: (project) => {
        const recentEntry: RecentProject = {
          id: project.id,
          name: project.name,
          path: `/${project.name}`,
          lastOpened: Date.now(),
          template: project.template,
          fileCount: project.files.length,
        };
        set((state) => {
          // Remove existing entry if present
          const filtered = state.recentProjects.filter(rp => rp.id !== project.id);
          // Add to front and limit to 20 entries
          return {
            recentProjects: [recentEntry, ...filtered].slice(0, 20),
          };
        });
      },

      clearRecentProjects: () => set({ recentProjects: [] }),

      // File Actions
      setFiles: (files) => set({ files }),
      
      openFile: (file) => {
        const { openFiles } = get();
        const exists = openFiles.find((f) => f.id === file.id);
        if (!exists) {
          set({ openFiles: [...openFiles, file], activeFileId: file.id });
        } else {
          set({ activeFileId: file.id });
        }
      },
      
      closeFile: (fileId) => {
        const { openFiles, activeFileId } = get();
        const newOpenFiles = openFiles.filter((f) => f.id !== fileId);
        let newActiveId = activeFileId;
        if (activeFileId === fileId) {
          newActiveId = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1].id : null;
        }
        set({ openFiles: newOpenFiles, activeFileId: newActiveId });
      },
      
      setActiveFile: (fileId) => set({ activeFileId: fileId }),
      
      updateFileContent: (fileId, content) => {
        set((state) => ({
          openFiles: state.openFiles.map((f) =>
            f.id === fileId ? { ...f, content, isDirty: true } : f
          ),
        }));
      },

      createFile: (path, name, content = '') => {
        const id = crypto.randomUUID();
        const fullPath = path ? `${path}/${name}` : name;
        const language = getLanguageFromFilename(name);
        
        const newFile: FileNode = {
          id,
          name,
          type: 'file',
          path: fullPath,
          content,
          language,
        };
        
        set((state) => ({
          files: addNodeToTree(state.files, path, newFile),
        }));
      },

      createFolder: (path, name) => {
        const id = crypto.randomUUID();
        const fullPath = path ? `${path}/${name}` : name;
        
        const newFolder: FileNode = {
          id,
          name,
          type: 'folder',
          path: fullPath,
          children: [],
        };
        
        set((state) => ({
          files: addNodeToTree(state.files, path, newFolder),
        }));
      },

      deleteNode: (path) => {
        set((state) => ({
          files: removeNodeFromTree(state.files, path),
          openFiles: state.openFiles.filter((f) => !f.path.startsWith(path)),
        }));
      },

      renameNode: (path, newName) => {
        set((state) => ({
          files: renameNodeInTree(state.files, path, newName),
        }));
      },

      moveNode: (sourcePath, targetPath) => {
        set((state) => {
          // Find the source node
          const sourceNode = findNodeByPath(state.files, sourcePath);
          if (!sourceNode) return state;
          
          // Remove from source
          let newFiles = removeNodeFromTree(state.files, sourcePath);
          
          // Update path for the node and its children
          const newPath = targetPath ? `${targetPath}/${sourceNode.name}` : sourceNode.name;
          const updatedNode = updateNodePaths(sourceNode, newPath);
          
          // Add to target
          newFiles = addNodeToTree(newFiles, targetPath, updatedNode);
          
          return { files: newFiles };
        });
      },

      copyNode: (sourcePath, targetPath) => {
        set((state) => {
          // Find the source node
          const sourceNode = findNodeByPath(state.files, sourcePath);
          if (!sourceNode) return state;
          
          // Deep clone the node with new IDs
          const clonedNode = cloneNodeWithNewIds(sourceNode);
          
          // Update path for the cloned node
          const newPath = targetPath ? `${targetPath}/${clonedNode.name}` : clonedNode.name;
          const updatedNode = updateNodePaths(clonedNode, newPath);
          
          // Add to target
          const newFiles = addNodeToTree(state.files, targetPath, updatedNode);
          
          return { files: newFiles };
        });
      },

      // UI Actions
      setTheme: (theme) => {
        set({ theme });
        const root = document.documentElement;
        
        // Remove all theme classes first
        root.classList.remove('dark', 'high-contrast', 'theme-github-dark', 'theme-dracula', 'theme-nord', 'theme-monokai', 'theme-solarized-dark', 'theme-one-dark', 'theme-steel', 'theme-charcoal-aurora');
        
        // Helper function to set all CSS variables at once
        const setThemeVars = (vars: {
          bg: string;
          sidebar: string;
          panel: string;
          border: string;
          accent: string;
          accentHover: string;
          text: string;
          textMuted: string;
          selection: string;
          hover: string;
          active: string;
        }) => {
          root.style.setProperty('--vscode-bg', vars.bg);
          root.style.setProperty('--vscode-sidebar', vars.sidebar);
          root.style.setProperty('--vscode-panel', vars.panel);
          root.style.setProperty('--vscode-border', vars.border);
          root.style.setProperty('--vscode-accent', vars.accent);
          root.style.setProperty('--vscode-accent-hover', vars.accentHover);
          root.style.setProperty('--vscode-text', vars.text);
          root.style.setProperty('--vscode-text-muted', vars.textMuted);
          root.style.setProperty('--vscode-selection', vars.selection);
          root.style.setProperty('--vscode-hover', vars.hover);
          root.style.setProperty('--vscode-active', vars.active);
        };
        
        // Apply theme-specific classes and CSS variables
        switch (theme) {
          case 'dark':
            root.classList.add('dark');
            setThemeVars({
              bg: '#1e1e1e',
              sidebar: '#252526',
              panel: '#1e1e1e',
              border: '#3c3c3c',
              accent: '#0078d4',
              accentHover: '#1c8ae0',
              text: '#d4d4d4',
              textMuted: '#a0a0a0',
              selection: '#264f78',
              hover: '#2a2d2e',
              active: '#37373d',
            });
            break;
          case 'light':
            setThemeVars({
              bg: '#F8F8F8',
              sidebar: '#F3F3F3',
              panel: '#FFFFFF',
              border: '#E7E7E7',
              accent: '#007ACC',
              accentHover: '#0062A3',
              text: '#1F1F1F',
              textMuted: '#666666',
              selection: '#B5D5FF',
              hover: '#E8E8E8',
              active: '#DCDCDC',
            });
            break;
          case 'high-contrast':
            root.classList.add('dark', 'high-contrast');
            setThemeVars({
              bg: '#000000',
              sidebar: '#000000',
              panel: '#000000',
              border: '#ffffff',
              accent: '#f9825a',
              accentHover: '#f9825a',
              text: '#ffffff',
              textMuted: '#d1d5db',
              selection: '#528bff4d',
              hover: '#333333',
              active: '#444444',
            });
            break;
          case 'github-dark':
            root.classList.add('dark', 'theme-github-dark');
            setThemeVars({
              bg: '#0d1117',
              sidebar: '#161b22',
              panel: '#161b22',
              border: '#30363d',
              accent: '#58a6ff',
              accentHover: '#79c0ff',
              text: '#c9d1d9',
              textMuted: '#8b949e',
              selection: '#388bfd33',
              hover: '#21262d',
              active: '#30363d',
            });
            break;
          case 'dracula':
            root.classList.add('dark', 'theme-dracula');
            setThemeVars({
              bg: '#282a36',
              sidebar: '#21222c',
              panel: '#21222c',
              border: '#44475a',
              accent: '#bd93f9',
              accentHover: '#caa9fa',
              text: '#f8f8f2',
              textMuted: '#6272a4',
              selection: '#44475a',
              hover: '#343746',
              active: '#44475a',
            });
            break;
          case 'nord':
            root.classList.add('dark', 'theme-nord');
            setThemeVars({
              bg: '#2e3440',
              sidebar: '#3b4252',
              panel: '#3b4252',
              border: '#4c566a',
              accent: '#88c0d0',
              accentHover: '#8fbcbb',
              text: '#eceff4',
              textMuted: '#d8dee9',
              selection: '#434c5e',
              hover: '#434c5e',
              active: '#4c566a',
            });
            break;
          case 'monokai':
            root.classList.add('dark', 'theme-monokai');
            setThemeVars({
              bg: '#272822',
              sidebar: '#1e1f1c',
              panel: '#1e1f1c',
              border: '#49483e',
              accent: '#a6e22e',
              accentHover: '#b8f340',
              text: '#f8f8f2',
              textMuted: '#75715e',
              selection: '#49483e',
              hover: '#3e3d32',
              active: '#49483e',
            });
            break;
          case 'solarized-dark':
            root.classList.add('dark', 'theme-solarized-dark');
            setThemeVars({
              bg: '#002b36',
              sidebar: '#073642',
              panel: '#073642',
              border: '#094959',
              accent: '#268bd2',
              accentHover: '#2aa198',
              text: '#839496',
              textMuted: '#657b83',
              selection: '#073642',
              hover: '#073642',
              active: '#094959',
            });
            break;
          case 'one-dark':
            root.classList.add('dark', 'theme-one-dark');
            setThemeVars({
              bg: '#282c34',
              sidebar: '#21252b',
              panel: '#21252b',
              border: '#3e4451',
              accent: '#61afef',
              accentHover: '#528bff',
              text: '#abb2bf',
              textMuted: '#5c6370',
              selection: '#3e4451',
              hover: '#2c323c',
              active: '#3e4451',
            });
            break;
          case 'steel':
            root.classList.add('dark', 'theme-steel');
            setThemeVars({
              bg: '#16181d',
              sidebar: '#1c1f26',
              panel: '#1c1f26',
              border: '#3a3f4a',
              accent: '#7b8a9e',
              accentHover: '#95a5bb',
              text: '#d0d6de',
              textMuted: '#6d7585',
              selection: '#3a4555',
              hover: '#252932',
              active: '#323844',
            });
            break;
          case 'charcoal-aurora':
            root.classList.add('dark', 'theme-charcoal-aurora');
            setThemeVars({
              bg: '#0d0d0d',
              sidebar: '#0a0a0a',
              panel: '#0a0a0a',
              border: '#1c1c1c',
              accent: '#00c8e0',
              accentHover: '#00d4ff',
              text: '#a0a0a0',
              textMuted: '#505050',
              selection: '#1a3040',
              hover: '#161616',
              active: '#1c1c1c',
            });
            break;
          default:
            // Default to charcoal-aurora theme
            root.classList.add('dark', 'theme-charcoal-aurora');
            setThemeVars({
              bg: '#0d0d0d',
              sidebar: '#0a0a0a',
              panel: '#0a0a0a',
              border: '#1c1c1c',
              accent: '#00c8e0',
              accentHover: '#00d4ff',
              text: '#a0a0a0',
              textMuted: '#505050',
              selection: '#1a3040',
              hover: '#161616',
              active: '#1c1c1c',
            });
        }
      },
      
      setLayout: (layout) => set({ layout }),
      setUILayout: (uiLayout) => set((state) => ({ 
        uiLayout: { ...state.uiLayout, ...uiLayout } 
      })),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarTab: (tab) => set({ sidebarTab: tab }),
      toggleAiPanel: () => set((state) => ({ aiPanelOpen: !state.aiPanelOpen })),
      toggleTerminal: () => set((state) => ({ terminalOpen: !state.terminalOpen })),
      togglePreview: () => set((state) => ({ previewOpen: !state.previewOpen })),
      
      // Editor Settings Actions
      setEditorSettings: (settings) =>
        set((state) => ({ editorSettings: { ...state.editorSettings, ...settings } })),

      // AI Actions
      setAiConfig: (config) =>
        set((state) => ({ aiConfig: { ...state.aiConfig, ...config } })),
      
      addMessage: (message) =>
        set((state) => {
          const newHistory = [...state.chatHistory, message];
          // Also update the active chat session if exists
          if (state.activeChatSessionId) {
            const updatedSessions = state.chatSessions.map(session => 
              session.id === state.activeChatSessionId 
                ? { ...session, messages: newHistory, updatedAt: Date.now() }
                : session
            );
            return { chatHistory: newHistory, chatSessions: updatedSessions };
          }
          return { chatHistory: newHistory };
        }),
      
      clearChat: () => set({ chatHistory: [] }),
      
      setAiLoading: (loading) => set({ isAiLoading: loading }),

      createChatSession: (name) => {
        const sessionId = crypto.randomUUID();
        const sessionName = name || `Chat ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
        const newSession = {
          id: sessionId,
          name: sessionName,
          messages: [] as ChatMessage[],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          chatSessions: [newSession, ...state.chatSessions],
          activeChatSessionId: sessionId,
          chatHistory: [],
        }));
        return sessionId;
      },

      deleteChatSession: (sessionId) =>
        set((state) => {
          const filteredSessions = state.chatSessions.filter(s => s.id !== sessionId);
          const isActive = state.activeChatSessionId === sessionId;
          return {
            chatSessions: filteredSessions,
            activeChatSessionId: isActive ? (filteredSessions[0]?.id || null) : state.activeChatSessionId,
            chatHistory: isActive ? (filteredSessions[0]?.messages || []) : state.chatHistory,
          };
        }),

      switchChatSession: (sessionId) =>
        set((state) => {
          // Save current session first
          let updatedSessions = state.chatSessions;
          if (state.activeChatSessionId && state.chatHistory.length > 0) {
            updatedSessions = state.chatSessions.map(session =>
              session.id === state.activeChatSessionId
                ? { ...session, messages: state.chatHistory, updatedAt: Date.now() }
                : session
            );
          }
          // Load new session
          const targetSession = updatedSessions.find(s => s.id === sessionId);
          return {
            chatSessions: updatedSessions,
            activeChatSessionId: sessionId,
            chatHistory: targetSession?.messages || [],
          };
        }),

      renameChatSession: (sessionId, newName) =>
        set((state) => ({
          chatSessions: state.chatSessions.map(session =>
            session.id === sessionId ? { ...session, name: newName } : session
          ),
        })),

      // Extension Actions
      toggleExtension: (extensionId) =>
        set((state) => ({
          extensions: state.extensions.map((ext) =>
            ext.id === extensionId ? { ...ext, enabled: !ext.enabled } : ext
          ),
        })),
      
      addExtension: (extension) =>
        set((state) => {
          const exists = state.extensions.find((ext) => ext.id === extension.id);
          if (exists) return state;
          return { extensions: [...state.extensions, extension] };
        }),
      
      removeExtension: (extensionId) =>
        set((state) => ({
          extensions: state.extensions.filter((ext) => ext.id !== extensionId),
        })),

      resetExtensions: () =>
        set({ extensions: DEFAULT_EXTENSIONS }),

      syncExtensions: () =>
        set((state) => {
          // Merge new default extensions with existing state (preserving user's enabled/disabled choices)
          const existingIds = new Set(state.extensions.map(e => e.id));
          const newExtensions = DEFAULT_EXTENSIONS.filter(e => !existingIds.has(e.id));
          return { extensions: [...state.extensions, ...newExtensions] };
        }),
    }),
    {
      name: 'ai-friend-zone-storage',
      partialize: (state) => ({
        projects: state.projects,
        workspaces: state.workspaces,
        recentProjects: state.recentProjects,
        theme: state.theme,
        aiConfig: state.aiConfig,
        extensions: state.extensions,
        editorSettings: state.editorSettings,
      }),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<StoreState>;
        // If old version or extensions are too few, reset to defaults
        if (version < 2 || !state.extensions || state.extensions.length < 20) {
          return { ...state, extensions: DEFAULT_EXTENSIONS };
        }
        // Add workspace support for version < 3
        if (version < 3) {
          return { 
            ...state, 
            workspaces: [], 
            recentProjects: [],
            activeWorkspaceId: null 
          };
        }
        // Migrate to charcoal-aurora hardstyle theme for version < 6
        if (version < 6) {
          return {
            ...state,
            theme: 'charcoal-aurora' as Theme,
          };
        }
        return state;
      },
      version: 6, // Version 6: Dark Industrial Gaming Theme update
    }
  )
);

// Helper functions
function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin',
  };
  return langMap[ext || ''] || 'plaintext';
}

function addNodeToTree(nodes: FileNode[], parentPath: string, newNode: FileNode): FileNode[] {
  if (!parentPath) {
    return [...nodes, newNode];
  }
  
  return nodes.map((node) => {
    if (node.path === parentPath && node.type === 'folder') {
      return { ...node, children: [...(node.children || []), newNode] };
    }
    if (node.children) {
      return { ...node, children: addNodeToTree(node.children, parentPath, newNode) };
    }
    return node;
  });
}

function removeNodeFromTree(nodes: FileNode[], path: string): FileNode[] {
  return nodes
    .filter((node) => node.path !== path)
    .map((node) => {
      if (node.children) {
        return { ...node, children: removeNodeFromTree(node.children, path) };
      }
      return node;
    });
}

function renameNodeInTree(nodes: FileNode[], path: string, newName: string): FileNode[] {
  return nodes.map((node) => {
    if (node.path === path) {
      const pathParts = path.split('/');
      pathParts[pathParts.length - 1] = newName;
      return { ...node, name: newName, path: pathParts.join('/') };
    }
    if (node.children) {
      return { ...node, children: renameNodeInTree(node.children, path, newName) };
    }
    return node;
  });
}

function findNodeByPath(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

function updateNodePaths(node: FileNode, newBasePath: string): FileNode {
  const updatedNode = { ...node, path: newBasePath };
  if (node.children) {
    updatedNode.children = node.children.map(child => 
      updateNodePaths(child, `${newBasePath}/${child.name}`)
    );
  }
  return updatedNode;
}

function cloneNodeWithNewIds(node: FileNode): FileNode {
  const clonedNode: FileNode = {
    ...node,
    id: crypto.randomUUID(),
  };
  if (node.children) {
    clonedNode.children = node.children.map(child => cloneNodeWithNewIds(child));
  }
  return clonedNode;
}

function getRandomWorkspaceColor(): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', 
    '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', 
    '#a855f7', '#ec4899'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
