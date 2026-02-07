/**
 * GenCraft Types - Complete type definitions
 */

// Chat Messages
export interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  text: string;
  timestamp: number;
  hasAudio?: boolean;
}

// AI Providers
export type ModelProvider =
  | 'OpenAI'
  | 'Anthropic'
  | 'Groq'
  | 'Mistral'
  | 'Cohere'
  | 'xAI'
  | 'Gemini'
  | 'Cerebras';

export interface ModelOption {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  isThinking?: boolean;
  creditsPerUse?: number;
}

// View Modes
export enum ViewMode {
  PREVIEW = 'preview',
  CODE = 'code',
  SPLIT = 'split',
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  MOBILE = 'mobile',
}

// Generation State
export interface GenerationState {
  isGenerating: boolean;
  error: string | null;
  progressMessage: string;
  isThinking?: boolean;
}

// Generated App
export interface GeneratedApp {
  id: string;
  name: string;
  code: string;
  prompt: string;
  timestamp: number;
  history: ChatMessage[];
  language?: ProgrammingLanguage;
  provider?: string;
  modelId?: string;
  files?: ProjectFile[];
  thumbnail?: string;
  isFavorite?: boolean;
}

// Project Files
export interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

// ==================== EDITOR BRIDGE TYPES ====================

// File node for tree structure (re-exported from editorBridge for convenience)
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
  language?: string;
}

// Editor selection info
export interface EditorSelection {
  start: { line: number; column: number };
  end: { line: number; column: number };
  text: string;
}

// Editor cursor position
export interface EditorCursor {
  line: number;
  column: number;
}

// Agent command types for surgical edits
export type AgentCommand =
  | { type: 'insert'; path: string; position: { line: number; column: number }; text: string }
  | { type: 'replace'; path: string; start: { line: number; column: number }; end: { line: number; column: number }; text: string }
  | { type: 'replaceSelection'; text: string }
  | { type: 'createFile'; path: string; content: string }
  | { type: 'deleteFile'; path: string }
  | { type: 'renameFile'; oldPath: string; newPath: string }
  | { type: 'updateFile'; path: string; content: string }
  | { type: 'fullRegenerate'; code: string }
  // Multi-page commands
  | { type: 'createPage'; path: string; title: string; content: string }
  | { type: 'updateMultipleFiles'; files: { path: string; content: string }[] }
  // Deployment commands
  | { type: 'deploy'; platform: DeploymentPlatform; config?: Partial<DeploymentConfig> }
  | { type: 'fixBuildError'; error: string; file: string; suggestedFix: string };

// Agent response with possible commands
export interface AgentResponse {
  message: string;
  commands?: AgentCommand[];
  shouldBuild?: boolean;
  code?: string;
}

// ==================== DEPLOYMENT TYPES ====================

export type DeploymentPlatform = 'maula' | 'vercel' | 'railway' | 'netlify' | 'cloudflare';

export interface DeploymentCredentials {
  platform: DeploymentPlatform;
  token: string;
  teamId?: string;
  label?: string;
  addedAt: number;
}

export interface DeploymentConfig {
  platform: DeploymentPlatform;
  projectName: string;
  framework?: 'static' | 'react' | 'vue' | 'nextjs' | 'vite' | 'astro';
  buildCommand?: string;
  outputDir?: string;
  envVars?: Record<string, string>;
  rootDir?: string;
  nodeVersion?: string;
}

export interface DeploymentResult {
  success: boolean;
  platform: DeploymentPlatform;
  url?: string;
  deploymentId?: string;
  buildLogs?: string[];
  error?: string;
  errorType?: 'auth' | 'build' | 'config' | 'network' | 'quota';
  timestamp: number;
}

export interface DeploymentStatus {
  state: 'idle' | 'preparing' | 'uploading' | 'building' | 'deploying' | 'ready' | 'error';
  platform?: DeploymentPlatform;
  progress?: number;
  message: string;
  logs: string[];
  url?: string;
  error?: string;
}

// ==================== MULTI-PAGE PROJECT TYPES ====================

export interface ProjectPage {
  path: string;
  title: string;
  fileName: string;
  content: string;
}

export interface ProjectAsset {
  path: string;
  content: string;
  type: 'css' | 'js' | 'json' | 'image' | 'font' | 'other';
}

export interface MultiPageProject {
  name: string;
  framework: 'static' | 'react' | 'vue' | 'nextjs' | 'vite' | 'astro';
  pages: ProjectPage[];
  assets: ProjectAsset[];
  packageJson?: Record<string, unknown>;
  configFiles?: Record<string, string>;
  entryFile: string;
}

export interface ProjectBuildResult {
  success: boolean;
  files: Record<string, string>;
  errors?: BuildError[];
  warnings?: string[];
}

export interface BuildError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
  fixable: boolean;
  suggestedFix?: string;
}

// Programming Languages - Full Stack Support
export type ProgrammingLanguage = 
  // Frontend - Web
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'react'
  | 'nextjs'
  | 'vue'
  | 'svelte'
  | 'angular'
  | 'tailwind'
  | 'sass'
  // Backend - Server
  | 'nodejs'
  | 'express'
  | 'python'
  | 'fastapi'
  | 'django'
  | 'flask'
  | 'java'
  | 'spring'
  | 'go'
  | 'rust'
  | 'csharp'
  | 'dotnet'
  | 'php'
  | 'laravel'
  | 'ruby'
  | 'rails'
  // Database
  | 'sql'
  | 'postgresql'
  | 'mongodb'
  | 'prisma'
  | 'graphql'
  // Mobile
  | 'reactnative'
  | 'flutter'
  | 'swift'
  | 'kotlin'
  // DevOps & Tools
  | 'docker'
  | 'kubernetes'
  | 'terraform'
  | 'bash'
  | 'powershell'
  // Data & Config
  | 'json'
  | 'yaml'
  | 'markdown'
  | 'xml'
  // AI & Data Science
  | 'jupyter'
  | 'r';

export interface LanguageOption {
  id: ProgrammingLanguage;
  name: string;
  icon: string;
  color: string;
  fileExtension: string;
  description: string;
}

// Templates
export interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
  language: ProgrammingLanguage;
  category: TemplateCategory;
  icon?: string;
  tags?: string[];
  previewCode?: string;
}

export type TemplateCategory = 
  | 'landing'
  | 'dashboard'
  | 'ecommerce'
  | 'portfolio'
  | 'api'
  | 'database'
  | 'automation'
  | 'component'
  | 'fullstack'
  | 'mobile'
  | 'game';

// ==================== SANDBOX TYPES ====================

export interface SandboxConfig {
  id: string;
  projectId: string;
  template: 'node' | 'react' | 'vue' | 'nextjs' | 'python' | 'static';
  resources: { cpu: number; memory: number; disk: number };
  env: Record<string, string>;
  ports: number[];
  status: 'creating' | 'running' | 'paused' | 'stopped' | 'error';
}

export interface SandboxMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkIn: number;
  networkOut: number;
  uptime: number;
}

// ==================== BUILD PIPELINE TYPES ====================

export interface BuildConfig {
  id: string;
  projectId: string;
  command: string;
  outputDir: string;
  env: Record<string, string>;
  cache: boolean;
  parallel: boolean;
}

export interface BuildStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  duration?: number;
  logs: string[];
  error?: string;
}

export interface BuildResult {
  id: string;
  projectId: string;
  status: 'success' | 'failed' | 'cancelled';
  steps: BuildStep[];
  duration: number;
  artifacts: string[];
  size: number;
  timestamp: number;
}

// ==================== GIT SERVICE TYPES ====================

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
}

export interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  staged: boolean;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  files: string[];
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  lastCommit?: string;
}

// ==================== TERMINAL TYPES ====================

export interface TerminalSession {
  id: string;
  name: string;
  cwd: string;
  status: 'active' | 'idle' | 'closed';
  pid?: number;
}

export interface TerminalCommand {
  command: string;
  output: string;
  exitCode: number;
  timestamp: number;
  duration: number;
}

// ==================== ASSET PIPELINE TYPES ====================

export interface AssetFile {
  id: string;
  name: string;
  path: string;
  type: 'image' | 'font' | 'video' | 'audio' | 'document' | 'other';
  size: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  optimized?: boolean;
  dimensions?: { width: number; height: number };
  uploadedAt: number;
}

export interface AssetOptimization {
  originalSize: number;
  optimizedSize: number;
  format: string;
  quality: number;
  savings: number;
}

// ==================== DATABASE TYPES ====================

export interface DatabaseConfig {
  id: string;
  projectId: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite' | 'redis';
  name: string;
  host: string;
  port: number;
  status: 'provisioning' | 'active' | 'maintenance' | 'stopped' | 'error';
  size: number;
  connections: number;
  createdAt: number;
}

export interface DatabaseTable {
  name: string;
  columns: DatabaseColumn[];
  rowCount: number;
  size: number;
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue?: string;
}

// ==================== MONITORING TYPES ====================

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastChecked: number;
  message?: string;
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  source: string;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
}

export interface MonitoringMetrics {
  errorRate: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  requestsPerMin: number;
  activeUsers: number;
  period: '1h' | '6h' | '24h' | '7d';
}

// ==================== AI SERVICE TYPES ====================

export interface AIGenerationRequest {
  prompt: string;
  model: string;
  provider: ModelProvider;
  language: ProgrammingLanguage;
  context?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AIGenerationResponse {
  id: string;
  content: string;
  model: string;
  provider: ModelProvider;
  tokensUsed: number;
  finishReason: 'stop' | 'length' | 'error';
  latency: number;
}

// ==================== ENVIRONMENT TYPES ====================

export interface EnvironmentVariable {
  key: string;
  value: string;
  isSecret: boolean;
  scope: 'development' | 'preview' | 'production' | 'all';
}

// ==================== COLLABORATION TYPES ====================

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'online' | 'offline' | 'away';
  cursor?: EditorCursor;
  color: string;
}

export interface CollaborationSession {
  id: string;
  projectId: string;
  participants: Collaborator[];
  createdAt: number;
  isLive: boolean;
}

