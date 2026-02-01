import React, { useEffect, useState, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import { useStore } from './store/useStore';
import { FileExplorer } from './components/FileExplorer';
import { FileProjectManager } from './components/FileProjectManager';
import { CodeEditor } from './components/CodeEditor';
import { Terminal } from './components/Terminal';
import { RealTerminal } from './components/RealTerminal';
import { IntegratedTerminal, IntegratedTerminalAdvanced } from './components/IntegratedTerminal';
import { RealtimeTerminal } from './components/RealtimeTerminal';
import { SplitPane, Sash } from './components/SplitPane';
import { LazyLoadFallback, PanelLoadingFallback } from './components/LazyLoadFallback';
import { FileNode, OpenFile, ProjectTemplate } from './types';
import { voiceOutput, speechSupport } from './services/speech';
import { mediaService } from './services/media';
import { Diagnostic } from './services/codeIntelligence';

// ============================================
// Lazy-loaded components for code splitting
// These panels are loaded on-demand to reduce initial bundle size
// ============================================

// AI Panels (loaded when AI tab is selected)
const AIChat = lazy(() => import('./components/AIChat').then(m => ({ default: m.AIChat })));
const AgenticAIChat = lazy(() => import('./components/AgenticAIChat').then(m => ({ default: m.AgenticAIChat })));
const AIIntegrationPanel = lazy(() => import('./components/AIIntegrationPanel').then(m => ({ default: m.AIIntegrationPanel })));

// Template Galleries
const TemplateGallery = lazy(() => import('./components/TemplateGallery').then(m => ({ default: m.TemplateGallery })));
const PrebuiltTemplatesGallery = lazy(() => import('./components/PrebuiltTemplatesGallery'));

// Live Preview (heavy component with iframe)
const LivePreview = lazy(() => import('./components/LivePreview').then(m => ({ default: m.LivePreview })));

// DevOps Panels
const DeployPanel = lazy(() => import('./components/DeployPanel').then(m => ({ default: m.DeployPanel })));
const EnhancedDeployPanel = lazy(() => import('./components/EnhancedDeployPanel').then(m => ({ default: m.EnhancedDeployPanel })));
const PackagingPanel = lazy(() => import('./components/PackagingPanel').then(m => ({ default: m.PackagingPanel })));
const RemoteDevelopmentPanel = lazy(() => import('./components/RemoteDevelopmentPanel').then(m => ({ default: m.RemoteDevelopmentPanel })));

// Extensions & Marketplace
const ExtensionsPanel = lazy(() => import('./components/ExtensionsPanel').then(m => ({ default: m.ExtensionsPanel })));
const ExtensionMarketplacePanel = lazy(() => import('./components/ExtensionMarketplacePanel').then(m => ({ default: m.ExtensionMarketplacePanel })));

// Settings
const SettingsPanel = lazy(() => import('./components/SettingsPanel').then(m => ({ default: m.SettingsPanel })));

// Search
const SearchPanel = lazy(() => import('./components/SearchPanel').then(m => ({ default: m.SearchPanel })));
const SearchReplaceAdvanced = lazy(() => import('./components/SearchReplaceAdvanced').then(m => ({ default: m.SearchReplaceAdvanced })));

// Quick actions
const QuickOpen = lazy(() => import('./components/QuickOpen').then(m => ({ default: m.QuickOpen })));
const QuickOpenAdvanced = lazy(() => import('./components/QuickOpenAdvanced').then(m => ({ default: m.QuickOpenAdvanced })));
const WorkspaceManager = lazy(() => import('./components/WorkspaceManager').then(m => ({ default: m.WorkspaceManager })));

// Git & Version Control
const GitPanel = lazy(() => import('./components/GitPanel').then(m => ({ default: m.GitPanel })));
const GitIntegrationAdvanced = lazy(() => import('./components/GitIntegrationAdvanced').then(m => ({ default: m.GitIntegrationAdvanced })));
const VersionControlPanel = lazy(() => import('./components/VersionControlPanel').then(m => ({ default: m.VersionControlPanel })));

// Code Intelligence
const CodeIntelligencePanel = lazy(() => import('./components/CodeIntelligencePanel').then(m => ({ default: m.CodeIntelligencePanel })));

// Collaboration & Debug
const CollaborationPanel = lazy(() => import('./components/CollaborationPanel').then(m => ({ default: m.CollaborationPanel })));
const DebugPanel = lazy(() => import('./components/DebugPanel').then(m => ({ default: m.DebugPanel })));

// Task Runner & Analytics
const TaskRunnerPanel = lazy(() => import('./components/TaskRunnerPanel').then(m => ({ default: m.TaskRunnerPanel })));
const AnalyticsPanel = lazy(() => import('./components/AnalyticsPanel').then(m => ({ default: m.AnalyticsPanel })));
const TechStackPanel = lazy(() => import('./components/TechStackPanel').then(m => ({ default: m.TechStackPanel })));
const UsageDashboard = lazy(() => import('./components/UsageDashboard').then(m => ({ default: m.UsageDashboard })));

type LeftTab = 'files' | 'templates' | 'prebuilt' | 'extensions' | 'marketplace' | 'search' | 'history' | 'git';
type RightTab = 'ai' | 'ai-tools' | 'collab' | 'debug' | 'tasks' | 'package' | 'remote' | 'analytics' | 'usage' | 'techstack' | 'deploy' | 'settings' | 'copilot' | 'extensions';

// AI Provider Models Configuration
const AI_PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    icon: '✨',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
  },
  openai: {
    name: 'OpenAI',
    icon: '🤖',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini'],
  },
  anthropic: {
    name: 'Anthropic',
    icon: '🧠',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
  },
  mistral: {
    name: 'Mistral AI',
    icon: '🌀',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest', 'pixtral-12b-2409'],
  },
  groq: {
    name: 'Groq',
    icon: '⚡',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  },
  xai: {
    name: 'xAI',
    icon: '🅧',
    models: ['grok-2', 'grok-2-mini', 'grok-beta'],
  },
  cerebras: {
    name: 'Cerebras',
    icon: '🔮',
    models: ['llama-3.3-70b', 'llama-3.1-8b', 'llama-3.1-70b'],
  },
  huggingface: {
    name: 'Hugging Face',
    icon: '🤗',
    models: ['meta-llama/Llama-3.2-3B-Instruct', 'mistralai/Mistral-7B-Instruct-v0.3', 'Qwen/Qwen2.5-72B-Instruct'],
  },
  ollama: {
    name: 'Ollama (Local)',
    icon: '🦙',
    models: ['llama3.2', 'mistral', 'codellama', 'deepseek-coder', 'qwen2.5-coder'],
  },
};

type AIProviderKey = keyof typeof AI_PROVIDERS;

// History Panel Component
const HistoryPanel: React.FC = () => {
  const { projects, currentProject, setCurrentProject, setFiles, deleteProject, renameProject, theme } = useStore();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renameMode, setRenameMode] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  // Check if theme is dark variant (all themes except 'light' are dark)
  const isDarkTheme = theme !== 'light';
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(null);
    if (menuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpen]);
  
  const bgCard = isDarkTheme ? 'bg-vscode-sidebar border border-vscode-border rounded-md' : 'bg-gray-100 border border-gray-300 rounded-md';
  const bgCardHover = isDarkTheme ? 'hover:bg-vscode-hover' : 'hover:bg-gray-200';
  const textPrimary = isDarkTheme ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkTheme ? 'text-vscode-text' : 'text-gray-700';
  const textMuted = isDarkTheme ? 'text-vscode-textMuted' : 'text-gray-600';
  const borderColor = isDarkTheme ? 'border-vscode-border' : 'border-gray-300';

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTemplateIcon = (template: string) => {
    const icons: Record<string, string> = {
      'react': '⚛️',
      'vue': '💚',
      'next': '▲',
      'node': '🟢',
      'python': '🐍',
      'html': '🌐',
      'typescript': '🔷',
    };
    return icons[template.toLowerCase()] || '📁';
  };

  const handleOpenProject = (project: typeof projects[0]) => {
    setCurrentProject(project);
    setFiles(project.files);
  };

  const handleRename = (projectId: string, currentName: string) => {
    setRenameMode(projectId);
    setRenameValue(currentName);
    setMenuOpen(null);
  };

  const handleRenameSubmit = (projectId: string) => {
    if (renameValue.trim()) {
      renameProject(projectId, renameValue.trim());
    }
    setRenameMode(null);
    setRenameValue('');
  };

  const handleDelete = (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteProject(projectId);
    }
    setMenuOpen(null);
  };

  const handleDownload = (project: typeof projects[0]) => {
    // Create a JSON file with project data
    const dataStr = JSON.stringify(project, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportName = `${project.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
    setMenuOpen(null);
  };

  const handleShare = (project: typeof projects[0]) => {
    // Copy project info to clipboard
    const shareText = `Check out my project: ${project.name} (${project.template}) - ${project.files.length} files`;
    navigator.clipboard.writeText(shareText);
    alert('Project info copied to clipboard!');
    setMenuOpen(null);
  };

  const menuBg = isDarkTheme ? 'bg-vscode-panel' : 'bg-white';
  const menuHover = isDarkTheme ? 'hover:bg-vscode-hover' : 'hover:bg-gray-200';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 border-b ${isDarkTheme ? 'border-vscode-border bg-vscode-sidebar' : 'border-gray-300 bg-gray-100'}`}>
        <h3 className={`text-xs font-semibold ${textPrimary} uppercase tracking-wide`}>Project History</h3>
        <p className={`text-xs ${textMuted} mt-1`}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-auto p-3">
        {projects.length === 0 ? (
          <div className={`text-center py-8 border border-dashed rounded-lg ${isDarkTheme ? 'border-vscode-border' : 'border-gray-400'}`}>
            <div className="text-4xl mb-3">📭</div>
            <p className={`text-sm ${textMuted}`}>No projects yet</p>
            <p className={`text-xs ${textMuted} mt-1`}>Create one from templates</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...projects].reverse().map((project) => (
              <div
                key={project.id}
                className={`relative w-full text-left p-3 transition-all duration-200 rounded-md ${bgCard} ${
                  currentProject?.id === project.id 
                    ? isDarkTheme ? 'border-vscode-accent bg-vscode-selection/30' : 'border-blue-500 bg-blue-50'
                    : ''
                }`}
              >
                <div 
                  className={`flex items-start gap-3 cursor-pointer rounded-md ${bgCardHover} -m-3 p-3`}
                  onClick={() => handleOpenProject(project)}
                >
                  <div className={`w-9 h-9 flex items-center justify-center text-base rounded-md ${
                    isDarkTheme ? 'bg-vscode-bg' : 'bg-gray-200'
                  }`}>
                    {getTemplateIcon(project.template)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {renameMode === project.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRenameSubmit(project.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(project.id);
                          if (e.key === 'Escape') { setRenameMode(null); setRenameValue(''); }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className={`w-full px-2 py-1 text-sm rounded ${isDarkTheme ? 'bg-vscode-bg border border-vscode-border text-white' : 'bg-white border border-blue-500 text-gray-900'} focus:outline-none`}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium truncate ${textPrimary}`}>{project.name}</h4>
                        {currentProject?.id === project.id && (
                          <span className="text-xs px-1.5 py-0.5 bg-vscode-accent text-white rounded">Active</span>
                        )}
                      </div>
                    )}
                    <p className={`text-xs ${textMuted} truncate`}>{project.template}</p>
                    <div className={`flex items-center gap-2 mt-1 text-xs ${textMuted}`}>
                      <span>{project.files.length} files</span>
                      <span>•</span>
                      <span>{formatDate(project.updatedAt)}</span>
                    </div>
                  </div>
                  
                  {/* Hamburger Menu Button */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === project.id ? null : project.id);
                      }}
                      className={`p-1.5 rounded ${isDarkTheme ? 'hover:bg-vscode-hover text-vscode-textMuted' : 'hover:bg-gray-300 text-gray-600'}`}
                      title="More options"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    
                    {/* Dropdown Menu */}
                    {menuOpen === project.id && (
                      <div className={`absolute right-0 top-8 w-36 ${menuBg} rounded-lg shadow-lg border ${borderColor} z-50 overflow-hidden`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenProject(project); setMenuOpen(null); }}
                          className={`w-full px-3 py-2 text-left text-sm ${textPrimary} ${menuHover} flex items-center gap-2`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Open
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRename(project.id, project.name); }}
                          className={`w-full px-3 py-2 text-left text-sm ${textPrimary} ${menuHover} flex items-center gap-2`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Rename
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownload(project); }}
                          className={`w-full px-3 py-2 text-left text-sm ${textPrimary} ${menuHover} flex items-center gap-2`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleShare(project); }}
                          className={`w-full px-3 py-2 text-left text-sm ${textPrimary} ${menuHover} flex items-center gap-2`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          Share
                        </button>
                        <div className={`border-t ${borderColor}`} />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                          className={`w-full px-3 py-2 text-left text-sm text-red-500 ${menuHover} flex items-center gap-2`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {projects.length > 0 && (
        <div className={`p-3 border-t ${borderColor}`}>
          <div className={`grid grid-cols-2 gap-2 text-center`}>
            <div className={`p-2 rounded-lg ${bgCard}`}>
              <div className={`text-lg font-bold ${textPrimary}`}>{projects.length}</div>
              <div className={`text-xs ${textMuted}`}>Projects</div>
            </div>
            <div className={`p-2 rounded-lg ${bgCard}`}>
              <div className={`text-lg font-bold ${textPrimary}`}>
                {projects.reduce((acc, p) => acc + p.files.length, 0)}
              </div>
              <div className={`text-xs ${textMuted}`}>Total Files</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const {
    files,
    openFile,
    openFiles,
    activeFileId,
    theme,
    setTheme,
    currentProject,
    addMessage,
  } = useStore();

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [leftTab, setLeftTab] = useState<LeftTab>('files');
  const [rightTab, setRightTab] = useState<RightTab>('ai');
  const [viewMode, setViewMode] = useState<'code' | 'split' | 'preview'>('code');
  
  // Panel widths for resizable sash dividers
  const [leftPanelWidth, setLeftPanelWidth] = useState(260);
  const [rightPanelWidth, setRightPanelWidth] = useState(380);
  const [splitRatio, setSplitRatio] = useState(50); // percentage for code/preview split
  
  // Terminal panel state - open by default
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [terminalMaximized, setTerminalMaximized] = useState(false);
  const [useRealTerminal, setUseRealTerminal] = useState(true); // Use real terminal by default
  const [terminalType, setTerminalType] = useState<'realtime' | 'advanced' | 'integrated'>('realtime'); // Use new realtime terminal by default
  
  // Code Intelligence panel state
  const [problemsPanelOpen, setProblemsPanelOpen] = useState(false);
  const [currentDiagnostics, setCurrentDiagnostics] = useState<Diagnostic[]>([]);
  const [bottomPanelTab, setBottomPanelTab] = useState<'terminal' | 'problems'>('terminal');
  
  // Split editor state
  const [splitEditorOpen, setSplitEditorOpen] = useState(false);
  
  // Command Palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const commandInputRef = useRef<HTMLInputElement>(null);
  
  // Quick Open (Ctrl+P) state
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
  
  // Workspace Manager state
  const [workspaceManagerOpen, setWorkspaceManagerOpen] = useState(false);
  
  // Voice, Screenshot, Camera state
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Voice toggle handler
  const handleVoiceToggle = useCallback(() => {
    if (voiceEnabled) {
      voiceOutput.stop();
      setVoiceEnabled(false);
    } else {
      setVoiceEnabled(true);
    }
  }, [voiceEnabled]);
  
  // Screenshot handler - uses browser's native screen capture API
  const handleScreenshot = useCallback(async () => {
    setIsCapturing(true);
    try {
      // Use the browser's native screen capture API
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'window',
        },
        audio: false,
      });
      
      // Get the video track
      const track = mediaStream.getVideoTracks()[0];
      
      // Create an ImageCapture object
      const imageCapture = new (window as any).ImageCapture(track);
      
      // Grab a frame
      const bitmap = await imageCapture.grabFrame();
      
      // Stop the stream immediately after capture
      track.stop();
      
      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        
        const filename = `screenshot-${currentProject?.name || 'project'}-${Date.now()}.png`;
        
        // Upload to S3
        const uploadResult = await mediaService.uploadFromCanvas(
          canvas, 
          filename, 
          'SCREENSHOT',
          currentProject?.id
        );
        
        if (uploadResult.success && uploadResult.media) {
          // Add to chat with S3 URL
          addMessage({
            id: crypto.randomUUID(),
            role: 'user',
            content: `📸 Screenshot captured and uploaded!\n\n![Screenshot](${uploadResult.media.url})`,
            timestamp: Date.now(),
          });
          
          // Also download locally
          mediaService.download(uploadResult.media.url, filename);
        } else {
          // Fallback: just download locally
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              addMessage({
                id: crypto.randomUUID(),
                role: 'user',
                content: '📸 Screenshot captured and saved locally!',
                timestamp: Date.now(),
              });
            }
          }, 'image/png');
        }
      }
    } catch (error: any) {
      console.error('Screenshot error:', error);
      if (error.name !== 'AbortError') {
        alert('Failed to capture screenshot. Please allow screen sharing when prompted.');
      }
    } finally {
      setIsCapturing(false);
    }
  }, [currentProject, addMessage]);
  
  // Camera handler
  const handleCameraToggle = useCallback(async () => {
    if (cameraActive && cameraStream) {
      // Stop camera
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setCameraActive(false);
    } else {
      // Start camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } 
        });
        setCameraStream(stream);
        setCameraActive(true);
        // Video will be connected in useEffect when modal opens
      } catch (error: any) {
        console.error('Camera error:', error);
        if (error.name === 'NotAllowedError') {
          alert('Camera access denied. Please allow camera permissions in your browser settings.');
        } else if (error.name === 'NotFoundError') {
          alert('No camera found on this device.');
        } else {
          alert('Failed to access camera. Please check permissions.');
        }
      }
    }
  }, [cameraActive, cameraStream]);
  
  // Capture photo from camera
  const capturePhoto = useCallback(async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        const filename = `camera-${Date.now()}.png`;
        
        // Upload to S3
        const uploadResult = await mediaService.uploadFromCanvas(
          canvas,
          filename,
          'CAMERA',
          currentProject?.id
        );
        
        if (uploadResult.success && uploadResult.media) {
          // Add to chat with S3 URL
          addMessage({
            id: crypto.randomUUID(),
            role: 'user',
            content: `📷 Photo captured!\n\n![Camera Photo](${uploadResult.media.url})`,
            timestamp: Date.now(),
          });
          
          // Also download locally
          mediaService.download(uploadResult.media.url, filename);
        } else {
          // Fallback: just download locally
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
              
              addMessage({
                id: crypto.randomUUID(),
                role: 'user',
                content: '📷 Photo captured and saved locally!',
                timestamp: Date.now(),
              });
            }
          }, 'image/png');
        }
      }
    }
  }, [addMessage, currentProject]);
  
  // Connect camera stream to video element when stream or cameraActive changes
  useEffect(() => {
    if (cameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(console.error);
    }
  }, [cameraActive, cameraStream]);
  
  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Command Palette commands
  const commands = useMemo(() => [
    { id: 'file.new', label: 'File: New File', shortcut: 'Ctrl+N', action: () => { /* TODO */ } },
    { id: 'file.save', label: 'File: Save', shortcut: 'Ctrl+S', action: () => { /* TODO */ } },
    { id: 'view.terminal', label: 'View: Toggle Terminal', shortcut: 'Ctrl+`', action: () => setTerminalOpen(!terminalOpen) },
    { id: 'view.sidebar.left', label: 'View: Toggle Left Sidebar', shortcut: 'Ctrl+B', action: () => setLeftSidebarOpen(!leftSidebarOpen) },
    { id: 'view.sidebar.right', label: 'View: Toggle Right Sidebar', shortcut: 'Ctrl+Shift+B', action: () => setRightSidebarOpen(!rightSidebarOpen) },
    { id: 'view.split', label: 'View: Toggle Split Editor', shortcut: 'Ctrl+\\', action: () => setSplitEditorOpen(!splitEditorOpen) },
    { id: 'view.code', label: 'View: Code Only', action: () => setViewMode('code') },
    { id: 'view.preview', label: 'View: Preview Only', action: () => setViewMode('preview') },
    { id: 'view.splitView', label: 'View: Split Code/Preview', action: () => setViewMode('split') },
    { id: 'explorer.focus', label: 'Explorer: Focus on Files', shortcut: 'Ctrl+Shift+E', action: () => { setLeftTab('files'); setLeftSidebarOpen(true); } },
    { id: 'search.focus', label: 'Search: Focus on Search', shortcut: 'Ctrl+Shift+F', action: () => { setLeftTab('search'); setLeftSidebarOpen(true); } },
    { id: 'ai.focus', label: 'AI: Focus on AI Chat', shortcut: 'Ctrl+Shift+A', action: () => { setRightTab('ai'); setRightSidebarOpen(true); } },
    { id: 'settings.open', label: 'Preferences: Open Settings', shortcut: 'Ctrl+,', action: () => { setRightTab('settings'); setRightSidebarOpen(true); } },
    { id: 'theme.toggle', label: 'Theme: Toggle Dark/Light', action: () => setTheme(isDark ? 'light' : 'dark') },
  ], [terminalOpen, leftSidebarOpen, rightSidebarOpen, splitEditorOpen, theme, setTheme]);

  const filteredCommands = useMemo(() => {
    if (!commandSearch) return commands;
    const search = commandSearch.toLowerCase();
    return commands.filter(cmd => cmd.label.toLowerCase().includes(search));
  }, [commands, commandSearch]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette: Ctrl+Shift+P or F1
      if ((e.ctrlKey && e.shiftKey && e.key === 'P') || e.key === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        setCommandPaletteOpen(true);
        setCommandSearch('');
      }
      // Quick Open (Ctrl+P)
      if (e.ctrlKey && !e.shiftKey && e.key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        setQuickOpenOpen(true);
      }
      // Terminal: Ctrl+` (keyCode 192 for backtick)
      if (e.ctrlKey && (e.key === '`' || e.keyCode === 192)) {
        e.preventDefault();
        e.stopPropagation();
        setTerminalOpen(!terminalOpen);
      }
      // Left Sidebar: Ctrl+B
      if (e.ctrlKey && !e.shiftKey && e.key === 'b') {
        e.preventDefault();
        e.stopPropagation();
        setLeftSidebarOpen(!leftSidebarOpen);
      }
      // Right Sidebar: Ctrl+Shift+B
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        e.stopPropagation();
        setRightSidebarOpen(!rightSidebarOpen);
      }
      // Split Editor: Ctrl+\
      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault();
        e.stopPropagation();
        setSplitEditorOpen(!splitEditorOpen);
      }
      // Explorer: Ctrl+Shift+E
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        setLeftTab('files');
        setLeftSidebarOpen(true);
      }
      // Search: Ctrl+Shift+F
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setLeftTab('search');
        setLeftSidebarOpen(true);
      }
      // Git: Ctrl+Shift+G
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        setLeftTab('git');
        setLeftSidebarOpen(true);
      }
      // Workspace Manager: Ctrl+Shift+O
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        setWorkspaceManagerOpen(true);
      }
      // AI Chat: Ctrl+Shift+A
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setRightTab('ai');
        setRightSidebarOpen(true);
      }
      // Settings: Ctrl+,
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        setRightTab('settings');
        setRightSidebarOpen(true);
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        if (commandPaletteOpen) setCommandPaletteOpen(false);
        if (quickOpenOpen) setQuickOpenOpen(false);
        if (workspaceManagerOpen) setWorkspaceManagerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [terminalOpen, leftSidebarOpen, rightSidebarOpen, splitEditorOpen, commandPaletteOpen, quickOpenOpen, workspaceManagerOpen]);

  // Focus command input when palette opens
  useEffect(() => {
    if (commandPaletteOpen && commandInputRef.current) {
      commandInputRef.current.focus();
    }
  }, [commandPaletteOpen]);

  // Sync theme on mount and when theme changes
  useEffect(() => {
    // Re-apply the theme when the component mounts or theme changes
    // This ensures CSS variables and classes are properly set
    setTheme(theme);
  }, [theme, setTheme]);

  const handleFileSelect = (node: FileNode) => {
    if (node.type === 'file') {
      const file: OpenFile = {
        id: node.id,
        name: node.name,
        path: node.path,
        content: node.content || '',
        language: node.language || 'plaintext',
        isDirty: false,
      };
      openFile(file);
    }
  };

  // Left sidebar items with SVG icons
  const leftSidebarItems = [
    { id: 'files' as LeftTab, label: 'Explorer', tooltip: 'File Explorer (Ctrl+Shift+E)' },
    { id: 'search' as LeftTab, label: 'Search', tooltip: 'Search (Ctrl+Shift+F)' },
    { id: 'git' as LeftTab, label: 'Source Control', tooltip: 'Source Control (Ctrl+Shift+G)' },
    { id: 'templates' as LeftTab, label: 'Templates', tooltip: 'Project Templates' },
    { id: 'prebuilt' as LeftTab, label: 'Prebuilt', tooltip: 'Prebuilt App Templates' },
    { id: 'extensions' as LeftTab, label: 'Extensions', tooltip: 'Installed Extensions (Ctrl+Shift+X)' },
    { id: 'marketplace' as LeftTab, label: 'Marketplace', tooltip: 'Extension Marketplace (Ctrl+Shift+M)' },
    { id: 'history' as LeftTab, label: 'History', tooltip: 'Project History (Ctrl+H)' },
  ];

  // Right sidebar items with SVG icons
  const rightSidebarItems = [
    { id: 'ai' as RightTab, label: 'AI Chat', tooltip: 'AI Assistant (Ctrl+Shift+A)' },
    { id: 'ai-tools' as RightTab, label: 'AI Tools', tooltip: 'AI Code Review, Docs, Security (Ctrl+Shift+I)' },
    { id: 'usage' as RightTab, label: 'Usage', tooltip: 'Usage & Credits Dashboard' },
    { id: 'collab' as RightTab, label: 'Collaborate', tooltip: 'Real-Time Collaboration (Ctrl+Shift+C)' },
    { id: 'debug' as RightTab, label: 'Debug', tooltip: 'Debugging (F5)' },
    { id: 'tasks' as RightTab, label: 'Tasks', tooltip: 'Task Runner & Tests' },
    { id: 'package' as RightTab, label: 'Package', tooltip: 'Packaging & Distribution' },
    { id: 'remote' as RightTab, label: 'Remote', tooltip: 'Remote Development (SSH, WSL, Docker)' },
    { id: 'analytics' as RightTab, label: 'Analytics', tooltip: 'Analytics & Telemetry' },
    { id: 'techstack' as RightTab, label: 'Tech Stack', tooltip: 'Electron, WASM, LSP, CLI Tools' },
    { id: 'deploy' as RightTab, label: 'Deploy', tooltip: 'Deploy to Cloud' },
    { id: 'settings' as RightTab, label: 'Settings', tooltip: 'Settings (Ctrl+,)' },
  ];

  // SVG icon renderer for left sidebar
  const renderLeftIcon = (id: LeftTab) => {
    const iconClass = "w-5 h-5";
    switch(id) {
      case 'files':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>;
      case 'search':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
      case 'git':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>;
      case 'templates':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
      case 'prebuilt':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>;
      case 'extensions':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58z" /></svg>;
      case 'marketplace':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>;
      case 'history':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      default:
        return null;
    }
  };

  // SVG icon renderer for right sidebar
  const renderRightIcon = (id: RightTab) => {
    const iconClass = "w-5 h-5";
    switch(id) {
      case 'ai':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>;
      case 'ai-tools':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>;
      case 'usage':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>;
      case 'collab':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>;
      case 'debug':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0112 12.75zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 01-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 002.248-2.354M12 12.75a2.25 2.25 0 01-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 00-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.734 3.734 0 01.4-2.253M12 8.25a2.25 2.25 0 00-2.248 2.146M12 8.25a2.25 2.25 0 012.248 2.146M8.683 5a6.032 6.032 0 01-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0112 3.75a3.75 3.75 0 013.317 1.998m-.03.002c.305.525.506 1.117.575 1.748A6.032 6.032 0 0114.718 5" /></svg>;
      case 'tasks':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>;
      case 'package':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>;
      case 'remote':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" /></svg>;
      case 'analytics':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
      case 'techstack':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" /></svg>;
      case 'deploy':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>;
      case 'settings':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
      case 'copilot':
        return <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>;
      case 'extensions':
        return <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
      default:
        return null;
    }
  };

  // VS Code Theme classes - use isDark for all dark theme variants
  const themeName = useStore((state) => state.theme);
  const isDark = !['light', 'high-contrast-light'].includes(themeName);

  // These are now fallbacks or for components not using CSS variables.
  // The primary theming is done by CSS variables set in useStore.
  const themeClasses = 'bg-vscode-bg text-vscode-text';
  
  const sidebarClasses = isDark
    ? 'bg-vscode-sidebar border-vscode-border'
    : 'bg-gray-100 border-gray-300 border-r';
  
  const panelClasses = isDark
    ? 'bg-vscode-sidebar border-vscode-border'
    : 'bg-gray-100 border-gray-300';
  
  const headerClasses = isDark
    ? 'bg-vscode-sidebar border-vscode-border border-b'
    : 'bg-gray-100 border-gray-300 border-b';
  
  const iconBarBtnActive = isDark
    ? 'text-vscode-accent border-l-2 border-l-vscode-accent'
    : 'text-blue-600 border-l-2 border-l-blue-600';
  
  const iconBarBtnInactive = isDark
    ? 'text-[#5a9a9a] hover:text-vscode-accent'
    : 'text-gray-500 hover:text-gray-900';
  
  const tooltipClasses = isDark
    ? 'bg-vscode-panel text-vscode-text border border-vscode-border shadow-vscode'
    : 'bg-white text-gray-900 border border-gray-300 shadow-lg';
  
  const dividerClasses = isDark ? 'bg-vscode-border' : 'bg-gray-300';
  const textMutedClass = isDark ? 'text-vscode-textMuted' : 'text-gray-500';
  const textHoverClass = isDark ? 'hover:text-white' : 'hover:text-gray-900';
  const bgHoverClass = isDark ? 'hover:bg-vscode-hover' : 'hover:bg-gray-200';
  const borderClass = isDark ? 'border-vscode-border' : 'border-gray-300';

  // Get theme class for the main container to enable CSS selectors
  const getThemeClass = () => {
    switch (themeName) {
      case 'github-dark': return 'theme-github-dark';
      case 'dracula': return 'theme-dracula';
      case 'nord': return 'theme-nord';
      case 'monokai': return 'theme-monokai';
      case 'solarized-dark': return 'theme-solarized-dark';
      case 'one-dark': return 'theme-one-dark';
      case 'steel': return 'theme-steel';
      case 'charcoal-aurora': return 'theme-charcoal-aurora';
      case 'high-contrast': return 'high-contrast';
      case 'light': return 'light';
      default: return isDark ? 'dark' : '';
    }
  };

  // State for hamburger menus
  const [leftMenuOpen, setLeftMenuOpen] = useState(false);
  const [rightMenuOpen, setRightMenuOpen] = useState(false);

  // Theme-aware menu styles for hamburger dropdowns
  const getMenuBgColor = () => {
    switch (themeName) {
      case 'github-dark': return '#161b22';
      case 'dracula': return '#282a36';
      case 'nord': return '#2e3440';
      case 'monokai': return '#272822';
      case 'solarized-dark': return '#002b36';
      case 'one-dark': return '#21252b';
      case 'steel': return '#1e2a38';
      case 'charcoal-aurora': return '#1a1a2e';
      case 'high-contrast': return '#000000';
      case 'light': return '#ffffff';
      default: return isDark ? '#252526' : '#ffffff';
    }
  };

  const getMenuBorderColor = () => {
    switch (themeName) {
      case 'github-dark': return '#30363d';
      case 'dracula': return '#44475a';
      case 'nord': return '#3b4252';
      case 'monokai': return '#3e3d32';
      case 'solarized-dark': return '#073642';
      case 'one-dark': return '#181a1f';
      case 'steel': return '#2d3e50';
      case 'charcoal-aurora': return '#16213e';
      case 'high-contrast': return '#ffffff';
      case 'light': return '#e0e0e0';
      default: return isDark ? '#3c3c3c' : '#e0e0e0';
    }
  };

  const getMenuHoverColor = () => {
    switch (themeName) {
      case 'github-dark': return '#30363d';
      case 'dracula': return '#44475a';
      case 'nord': return '#3b4252';
      case 'monokai': return '#3e3d32';
      case 'solarized-dark': return '#073642';
      case 'one-dark': return '#2c313a';
      case 'steel': return '#2d3e50';
      case 'charcoal-aurora': return '#16213e';
      case 'high-contrast': return '#1a1a1a';
      case 'light': return '#f0f0f0';
      default: return isDark ? '#2a2d2e' : '#f0f0f0';
    }
  };

  const getMenuTextColor = () => {
    switch (themeName) {
      case 'github-dark': return '#c9d1d9';
      case 'dracula': return '#f8f8f2';
      case 'nord': return '#eceff4';
      case 'monokai': return '#f8f8f2';
      case 'solarized-dark': return '#839496';
      case 'one-dark': return '#abb2bf';
      case 'steel': return '#e0e6ed';
      case 'charcoal-aurora': return '#e0e6ed';
      case 'high-contrast': return '#ffffff';
      case 'light': return '#333333';
      default: return isDark ? '#cccccc' : '#333333';
    }
  };

  const getMenuAccentColor = () => {
    switch (themeName) {
      case 'github-dark': return '#58a6ff';
      case 'dracula': return '#bd93f9';
      case 'nord': return '#88c0d0';
      case 'monokai': return '#a6e22e';
      case 'solarized-dark': return '#268bd2';
      case 'one-dark': return '#61afef';
      case 'steel': return '#5fa8d3';
      case 'charcoal-aurora': return '#00d9ff';
      case 'high-contrast': return '#00ff00';
      case 'light': return '#0066cc';
      default: return isDark ? '#0e639c' : '#0066cc';
    }
  };

  return (
    <div className={`flex flex-col h-screen w-full overflow-hidden bg-vscode-bg text-vscode-text ${getThemeClass()}`}>
      {/* Main Content Area - fills remaining height */}
      <div className="flex flex-1 overflow-hidden">
      {/* ===== LEFT SIDEBAR ===== */}
      <aside className="flex h-full">
        {/* Icon Bar - VS Code Style */}
        <div className={`w-12 border-r flex flex-col items-center py-2 gap-0.5 ${sidebarClasses}`}>
          {/* Logo */}
          <div className="w-10 h-10 flex items-center justify-center mb-2">
            <svg className="w-6 h-6 text-vscode-accent" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
          </div>
          
          <div className={`w-8 h-px ${dividerClasses} my-2`} />
          
          {/* Left Tab Icons */}
          {leftSidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (leftTab === item.id && leftSidebarOpen) {
                  setLeftSidebarOpen(false);
                } else {
                  setLeftTab(item.id);
                  setLeftSidebarOpen(true);
                }
              }}
              className={`w-10 h-10 flex items-center justify-center transition-all relative group
                ${leftTab === item.id && leftSidebarOpen
                  ? iconBarBtnActive 
                  : iconBarBtnInactive
                }`}
              title={item.tooltip}
            >
              {renderLeftIcon(item.id)}
              {/* Tooltip */}
              <div className={`absolute left-full ml-2 px-2 py-1 ${tooltipClasses} text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity`}>
                {item.tooltip}
              </div>
            </button>
          ))}
          
          <div className="flex-1" />
          
          {/* View Mode Icons */}
          <div className={`w-8 h-px ${isDark ? 'bg-vscode-border' : 'bg-gray-300'} my-2`} />
          
          <button
            onClick={() => setViewMode('code')}
            className={`w-10 h-10 flex items-center justify-center transition-all group relative
              ${viewMode === 'code' ? iconBarBtnActive : iconBarBtnInactive}`}
            title="Code Only"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <div className={`absolute left-full ml-2 px-2 py-1 ${tooltipClasses} text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50`}>
              Code View
            </div>
          </button>
          
          <button
            onClick={() => setViewMode('split')}
            className={`w-10 h-10 flex items-center justify-center transition-all group relative
              ${viewMode === 'split' ? iconBarBtnActive : iconBarBtnInactive}`}
            title="Split View (Code + Preview)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v18M3 3h18v18H3V3z" />
            </svg>
            <div className={`absolute left-full ml-2 px-2 py-1 ${tooltipClasses} text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50`}>
              Split View
            </div>
          </button>
          
          <button
            onClick={() => setViewMode('preview')}
            className={`w-10 h-10 flex items-center justify-center transition-all group relative
              ${viewMode === 'preview' ? iconBarBtnActive : iconBarBtnInactive}`}
            title="Preview Only"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z" />
            </svg>
            <div className={`absolute left-full ml-2 px-2 py-1 ${tooltipClasses} text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50`}>
              Preview
            </div>
          </button>
        </div>
        
        {/* Left Panel Content */}
        {leftSidebarOpen && (
          <div className={`relative flex flex-col border-r ${panelClasses}`} style={{ width: leftPanelWidth, minWidth: 180, maxWidth: 500 }}>
            {/* Panel Header */}
            <div className={`h-7 flex items-center justify-between px-3 border-b ${isDark ? 'border-vscode-border' : 'border-gray-200'}`}>
              <span className={`text-[10px] font-medium ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'} uppercase tracking-wide`}>
                {leftSidebarItems.find(i => i.id === leftTab)?.label}
              </span>
              <button
                onClick={() => setLeftSidebarOpen(false)}
                className={`p-0.5 ${isDark ? 'text-vscode-textMuted hover:text-white' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
                title="Close Panel"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Panel Content */}
            <div className="flex-1 overflow-hidden">
              {leftTab === 'files' && <FileProjectManager onFileSelect={handleFileSelect} />}
              {leftTab === 'templates' && (
                <Suspense fallback={<PanelLoadingFallback panelName="Templates" />}>
                  <TemplateGallery />
                </Suspense>
              )}
              {leftTab === 'prebuilt' && (
                <Suspense fallback={<PanelLoadingFallback panelName="Templates" />}>
                  <PrebuiltTemplatesGallery 
                    onSelectTemplate={async (template: ProjectTemplate, templateFiles: FileNode[]) => {
                      // Create project with template files
                      const { createProject, setSidebarTab, setFiles, openFile } = useStore.getState();
                      await createProject(template.name, template.id, templateFiles);
                      setSidebarTab('files');
                      setLeftTab('files');
                      
                      // Open the main file (index.html) in the editor
                      const mainFile = templateFiles.find(f => f.name === 'index.html' || f.name === 'App.tsx');
                      if (mainFile && mainFile.type === 'file') {
                        openFile({
                          id: mainFile.id || crypto.randomUUID(),
                          name: mainFile.name,
                          path: mainFile.path,
                          content: mainFile.content || '',
                          language: mainFile.language || 'html',
                          isDirty: false,
                        });
                      }
                      
                      // Switch to split view to show preview
                      setViewMode('split');
                    }}
                  />
                </Suspense>
              )}
              {leftTab === 'extensions' && (
                <Suspense fallback={<PanelLoadingFallback panelName="Extensions" />}>
                  <ExtensionsPanel />
                </Suspense>
              )}
              {leftTab === 'marketplace' && (
                <Suspense fallback={<PanelLoadingFallback panelName="Marketplace" />}>
                  <ExtensionMarketplacePanel />
                </Suspense>
              )}
              {leftTab === 'history' && <HistoryPanel />}
              {leftTab === 'search' && (
                <Suspense fallback={<PanelLoadingFallback panelName="Search" />}>
                  <SearchReplaceAdvanced onFileSelect={handleFileSelect} />
                </Suspense>
              )}
              {leftTab === 'git' && (
                <Suspense fallback={<PanelLoadingFallback panelName="Version Control" />}>
                  <VersionControlPanel onFileSelect={handleFileSelect} />
                </Suspense>
              )}
            </div>
            
            {/* Project Info */}
            {currentProject && (
              <div className={`p-3 border-t ${isDark ? 'border-vscode-border' : 'border-gray-200'}`}>
                <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-vscode-text' : 'text-gray-600'}`}>
                  <span className="text-vscode-accent">▶</span>
                  <span className="truncate">{currentProject.name}</span>
                </div>
              </div>
            )}
            
            {/* Resizable Sash */}
            <Sash
              direction="vertical"
              position="end"
              onResize={(delta) => setLeftPanelWidth(Math.max(180, Math.min(500, leftPanelWidth + delta)))}
              className="z-10"
            />
          </div>
        )}
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Editor + Preview */}
        <div className="flex-1 flex overflow-hidden">
          {viewMode === 'code' && (
            <div className="w-full h-full">
              <CodeEditor onDiagnosticsChange={setCurrentDiagnostics} />
            </div>
          )}
          
          {viewMode === 'preview' && (
            <div className="w-full h-full">
              <Suspense fallback={<LazyLoadFallback message="Loading Preview..." size="lg" />}>
                <LivePreview />
              </Suspense>
            </div>
          )}
          
          {viewMode === 'split' && (
            <SplitPane
              direction="horizontal"
              defaultSize={splitRatio}
              minSize={15}
              maxSize={85}
              onResize={setSplitRatio}
              className="w-full h-full"
            >
              {splitEditorOpen ? (
                <SplitPane direction="horizontal" defaultSize={50} minSize={20} maxSize={80}>
                  <CodeEditor onDiagnosticsChange={setCurrentDiagnostics} />
                  <CodeEditor />
                </SplitPane>
              ) : (
                <CodeEditor onDiagnosticsChange={setCurrentDiagnostics} />
              )}
              <Suspense fallback={<LazyLoadFallback message="Loading Preview..." size="lg" />}>
                <LivePreview />
              </Suspense>
            </SplitPane>
          )}
        </div>

        {/* Bottom Panel - Terminal & Problems */}
        {(terminalOpen || problemsPanelOpen) && (
          <div 
            className={`flex flex-col border-t ${isDark ? 'border-vscode-border bg-vscode-panel' : 'border-gray-200 bg-white'}`}
            style={{ height: terminalMaximized ? 'calc(100vh - 100px)' : terminalHeight }}
          >
            {/* Bottom Panel Tabs */}
            <div className={`flex items-center gap-0 border-b ${isDark ? 'border-vscode-border bg-vscode-sidebar' : 'border-gray-200 bg-gray-50'}`}>
              <button
                onClick={() => { setBottomPanelTab('problems'); setProblemsPanelOpen(true); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  bottomPanelTab === 'problems' && problemsPanelOpen
                    ? isDark ? 'text-white border-b-2 border-vscode-accent bg-vscode-panel' : 'text-blue-600 border-b-2 border-blue-500 bg-white'
                    : isDark ? 'text-vscode-textMuted hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Problems
                {currentDiagnostics.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    currentDiagnostics.some(d => d.severity === 'error')
                      ? 'bg-red-500 text-white'
                      : currentDiagnostics.some(d => d.severity === 'warning')
                        ? 'bg-yellow-500 text-black'
                        : isDark ? 'bg-vscode-hover text-vscode-text' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentDiagnostics.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setBottomPanelTab('terminal'); setTerminalOpen(true); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  bottomPanelTab === 'terminal' && terminalOpen
                    ? isDark ? 'text-white border-b-2 border-vscode-accent bg-vscode-panel' : 'text-blue-600 border-b-2 border-blue-500 bg-white'
                    : isDark ? 'text-vscode-textMuted hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Terminal
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setTerminalMaximized(!terminalMaximized)}
                className={`p-1.5 ${isDark ? 'hover:bg-vscode-hover text-vscode-textMuted hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`}
                title={terminalMaximized ? 'Restore Panel' : 'Maximize Panel'}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  {terminalMaximized ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  )}
                </svg>
              </button>
              <button
                onClick={() => { setTerminalOpen(false); setProblemsPanelOpen(false); }}
                className={`p-1.5 ${isDark ? 'hover:bg-vscode-hover text-vscode-textMuted hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`}
                title="Close Panel"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Panel Content */}
            <div className="flex-1 overflow-hidden">
              {bottomPanelTab === 'terminal' && terminalOpen && (
                terminalType === 'realtime' ? (
                  <RealtimeTerminal
                    defaultHeight={terminalHeight - 32}
                    onHeightChange={setTerminalHeight}
                    onMinimize={() => setTerminalOpen(false)}
                    onMaximize={() => setTerminalMaximized(!terminalMaximized)}
                    isMaximized={terminalMaximized}
                    projectId={currentProject?.id}
                  />
                ) : (
                  <IntegratedTerminalAdvanced
                    defaultHeight={terminalHeight - 32}
                    onHeightChange={setTerminalHeight}
                    onMinimize={() => setTerminalOpen(false)}
                    onMaximize={() => setTerminalMaximized(!terminalMaximized)}
                    isMaximized={terminalMaximized}
                    hideHeader={true}
                  />
                )
              )}
              {bottomPanelTab === 'problems' && problemsPanelOpen && (
                <Suspense fallback={<LazyLoadFallback message="Loading Problems..." size="sm" />}>
                  <CodeIntelligencePanel className="h-full" />
                </Suspense>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ===== RIGHT SIDEBAR ===== */}
      <aside className="flex h-full flex-row-reverse">
        {/* Icon Bar */}
        <div className={`w-12 border-l flex flex-col items-center py-2 gap-0.5 ${sidebarClasses}`}>
          {/* Right Tab Icons */}
          {rightSidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (rightTab === item.id && rightSidebarOpen) {
                  setRightSidebarOpen(false);
                } else {
                  setRightTab(item.id);
                  setRightSidebarOpen(true);
                }
              }}
              className={`w-10 h-10 flex items-center justify-center transition-all relative group
                ${rightTab === item.id && rightSidebarOpen
                  ? isDark ? 'text-white border-r-2 border-r-vscode-accent' : 'text-blue-600 border-r-2 border-r-blue-600'
                  : isDark ? 'text-vscode-textMuted hover:text-white' : 'text-gray-400 hover:text-gray-600'
                }`}
              title={item.tooltip}
            >
              {renderRightIcon(item.id)}
              {/* Tooltip */}
              <div className={`absolute right-full mr-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity ${tooltipClasses}`}>
                {item.tooltip}
              </div>
            </button>
          ))}
          
          <div className={`w-8 h-px ${isDark ? 'bg-vscode-border' : 'bg-gray-300'} my-2`} />
          
          {/* Media buttons - Camera, Screenshot, Voice */}
          <button
            onClick={handleCameraToggle}
            className={`w-10 h-10 flex items-center justify-center transition-all group relative ${
              cameraActive 
                ? 'text-red-400' 
                : isDark ? 'text-vscode-textMuted hover:text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
            title={cameraActive ? "Stop Camera" : "Start Camera"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>
            <div className={`absolute right-full mr-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 ${tooltipClasses}`}>
              {cameraActive ? 'Stop Camera' : 'Start Camera'}
            </div>
          </button>
          <button
            onClick={handleScreenshot}
            disabled={isCapturing}
            className={`w-10 h-10 flex items-center justify-center transition-all group relative ${
              isCapturing 
                ? 'text-blue-400 animate-pulse' 
                : isDark ? 'text-vscode-textMuted hover:text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Screenshot"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>
            <div className={`absolute right-full mr-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 ${tooltipClasses}`}>
              {isCapturing ? 'Capturing...' : 'Screenshot'}
            </div>
          </button>
          <button
            onClick={handleVoiceToggle}
            className={`w-10 h-10 flex items-center justify-center transition-all group relative ${
              voiceEnabled 
                ? 'text-green-400'
                : isDark ? 'text-vscode-textMuted hover:text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
            title={voiceEnabled ? "Voice On - Click to Turn Off" : "Voice Off - Click to Turn On"}
          >
            {voiceEnabled 
              ? <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
              : <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.395C2.806 8.757 3.63 8.25 4.51 8.25H6.75z" /></svg>
            }
            <div className={`absolute right-full mr-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 ${tooltipClasses}`}>
              {voiceEnabled ? 'Voice On' : 'Voice Off'}
            </div>
          </button>
          
          <div className="flex-1" />
        </div>
        
        {/* Right Panel Content */}
        {rightSidebarOpen && (
          <div className={`relative flex flex-col border-l ${panelClasses}`} style={{ width: rightPanelWidth, minWidth: 280, maxWidth: 600 }}>
            {/* Resizable Sash on left edge */}
            <Sash
              direction="vertical"
              position="start"
              onResize={(delta) => setRightPanelWidth(Math.max(280, Math.min(600, rightPanelWidth - delta)))}
              className="z-10"
            />
            
            {/* Panel Header */}
            <div className={`h-7 flex items-center justify-between px-3 border-b ${isDark ? 'border-vscode-border' : 'border-gray-200'}`}>
              <span className={`text-[10px] font-medium ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'} uppercase tracking-wide`}>
                {rightSidebarItems.find(i => i.id === rightTab)?.label}
              </span>
              <button
                onClick={() => setRightSidebarOpen(false)}
                className={`p-0.5 ${isDark ? 'text-vscode-textMuted hover:text-white' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
                title="Close Panel"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Panel Content */}
            <div className="flex-1 overflow-hidden">
              {rightTab === 'ai' && (
                <Suspense fallback={<PanelLoadingFallback panelName="AI Chat" />}>
                  <AgenticAIChat voiceEnabled={voiceEnabled} />
                </Suspense>
              )}
              {rightTab === 'ai-tools' && (
                <Suspense fallback={<PanelLoadingFallback panelName="AI Tools" />}>
                  <AIIntegrationPanel />
                </Suspense>
              )}
              {rightTab === 'collab' && (
                <Suspense fallback={<PanelLoadingFallback panelName="Collaboration" />}>
                  <CollaborationPanel />
                </Suspense>
              )}
              {rightTab === 'debug' && (
                <Suspense fallback={<PanelLoadingFallback panelName="Debug" />}>
                  <DebugPanel />
                </Suspense>
              )}
              {rightTab === 'tasks' && (
                <Suspense fallback={<PanelLoadingFallback panelName="Tasks" />}>
                  <TaskRunnerPanel />
                </Suspense>
              )}
              {rightTab === 'package' && (
                <Suspense fallback={<PanelLoadingFallback panelName="Packaging" />}>
                  <PackagingPanel />
                </Suspense>
              )}
              {rightTab === 'remote' && (
                <Suspense fallback={<PanelLoadingFallback panelName="Remote" />}>
                  <RemoteDevelopmentPanel />
                </Suspense>
              )}
              {rightTab === 'analytics' && (
                <Suspense fallback={<PanelLoadingFallback panelName="Analytics" />}>
                  <AnalyticsPanel />
                </Suspense>
              )}
              {rightTab === 'techstack' && (
                <Suspense fallback={<PanelLoadingFallback panelName="Tech Stack" />}>
                  <TechStackPanel />
                </Suspense>
              )}
              {rightTab === 'deploy' && (
                <Suspense fallback={<PanelLoadingFallback panelName="Deploy" />}>
                  <EnhancedDeployPanel />
                </Suspense>
              )}
              {rightTab === 'settings' && (
                <Suspense fallback={<PanelLoadingFallback panelName="Settings" />}>
                  <SettingsPanel theme={theme} setTheme={setTheme} />
                </Suspense>
              )}
              {rightTab === 'usage' && (
                <Suspense fallback={<PanelLoadingFallback panelName="Usage" />}>
                  <UsageDashboard />
                </Suspense>
              )}
            </div>
          </div>
        )}
      </aside>
      </div>
      {/* End of Main Content Area wrapper */}
      
      {/* Full-Width Status Bar - VS Code Style */}
      <footer className={`h-6 border-t flex items-center justify-between text-xs select-none shrink-0 ${isDark ? 'bg-vscode-accent text-white' : 'bg-blue-600 text-white'}`}>
        {/* Left Hamburger Menu */}
        <div className="relative">
          <button 
            onClick={() => { setLeftMenuOpen(!leftMenuOpen); setRightMenuOpen(false); }}
            className="flex items-center justify-center w-8 h-6 hover:bg-white/20 transition-colors"
            title="Main Menu"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Left Dropdown Menu */}
          {leftMenuOpen && (
            <div 
              className="absolute bottom-full left-0 mb-0 w-56 rounded-t-md shadow-2xl z-50 overflow-hidden"
              style={{ 
                backgroundColor: getMenuBgColor(), 
                borderWidth: '1px',
                borderColor: getMenuBorderColor(),
                boxShadow: `0 -4px 20px rgba(0,0,0,0.3), 0 0 1px ${getMenuBorderColor()}`
              }}
            >
              <div className="py-1">
                <button 
                  onClick={() => { setCommandPaletteOpen(true); setLeftMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all duration-150"
                  style={{ color: getMenuTextColor() }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = getMenuHoverColor(); e.currentTarget.style.paddingLeft = '14px'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.paddingLeft = '12px'; }}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: getMenuAccentColor() }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Command Palette...
                  </span>
                  <span className="text-[10px] opacity-50">Ctrl+Shift+P</span>
                </button>
                <button 
                  onClick={() => { setQuickOpenOpen(true); setLeftMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all duration-150"
                  style={{ color: getMenuTextColor() }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = getMenuHoverColor(); e.currentTarget.style.paddingLeft = '14px'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.paddingLeft = '12px'; }}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: getMenuAccentColor() }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    Quick Open...
                  </span>
                  <span className="text-[10px] opacity-50">Ctrl+P</span>
                </button>
                <div className="my-1 h-px mx-2" style={{ backgroundColor: getMenuBorderColor() }} />
                <button 
                  onClick={() => { setLeftTab('explorer'); setLeftSidebarOpen(true); setLeftMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all duration-150"
                  style={{ color: getMenuTextColor() }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = getMenuHoverColor(); e.currentTarget.style.paddingLeft = '14px'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.paddingLeft = '12px'; }}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: getMenuAccentColor() }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    Explorer
                  </span>
                  <span className="text-[10px] opacity-50">Ctrl+Shift+E</span>
                </button>
                <button 
                  onClick={() => { setLeftTab('search'); setLeftSidebarOpen(true); setLeftMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all duration-150"
                  style={{ color: getMenuTextColor() }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = getMenuHoverColor(); e.currentTarget.style.paddingLeft = '14px'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.paddingLeft = '12px'; }}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: getMenuAccentColor() }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    Search
                  </span>
                  <span className="text-[10px] opacity-50">Ctrl+Shift+F</span>
                </button>
                <button 
                  onClick={() => { setLeftTab('git'); setLeftSidebarOpen(true); setLeftMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all duration-150"
                  style={{ color: getMenuTextColor() }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = getMenuHoverColor(); e.currentTarget.style.paddingLeft = '14px'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.paddingLeft = '12px'; }}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: getMenuAccentColor() }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="19" r="2" />
                      <circle cx="19" cy="12" r="2" />
                      <path d="M12 7v10M14 12h3" />
                    </svg>
                    Source Control
                  </span>
                  <span className="text-[10px] opacity-50">Ctrl+Shift+G</span>
                </button>
                <div className="my-1 h-px mx-2" style={{ backgroundColor: getMenuBorderColor() }} />
                <button 
                  onClick={() => { setTerminalOpen(!terminalOpen); setLeftMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all duration-150"
                  style={{ color: getMenuTextColor() }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = getMenuHoverColor(); e.currentTarget.style.paddingLeft = '14px'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.paddingLeft = '12px'; }}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: getMenuAccentColor() }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Toggle Terminal
                  </span>
                  <span className="text-[10px] opacity-50">Ctrl+`</span>
                </button>
                <button 
                  onClick={() => { setLeftSidebarOpen(!leftSidebarOpen); setLeftMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all duration-150"
                  style={{ color: getMenuTextColor() }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = getMenuHoverColor(); e.currentTarget.style.paddingLeft = '14px'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.paddingLeft = '12px'; }}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: getMenuAccentColor() }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
                    </svg>
                    Toggle Sidebar
                  </span>
                  <span className="text-[10px] opacity-50">Ctrl+B</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Left Side Status Items */}
        <div className="flex items-center gap-0 flex-1">
          {/* Terminal Toggle - Always Visible */}
          <button 
            onClick={() => setTerminalOpen(!terminalOpen)}
            className={`flex items-center gap-1.5 hover:bg-white/20 px-2 py-0.5 transition-colors h-full ${terminalOpen ? 'bg-white/10' : ''}`}
            title={terminalOpen ? "Hide Terminal (Ctrl+`)" : "Show Terminal (Ctrl+`)"}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[11px]">Terminal</span>
          </button>

          <div className="w-px h-4 bg-white/20 mx-1" />

          {/* Git Branch */}
          <button 
            onClick={() => { setLeftTab('git'); setLeftSidebarOpen(true); }}
            className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 transition-colors h-full"
            title="Source Control"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="19" r="2" />
              <circle cx="19" cy="12" r="2" />
              <path d="M12 7v10M14 12h3" />
            </svg>
            <span>main</span>
            <svg className="w-2.5 h-2.5 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          {/* Sync Status */}
          <button 
            className="flex items-center gap-1 hover:bg-white/10 px-1.5 py-0.5 transition-colors h-full"
            title="Synchronize Changes"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Errors/Warnings */}
          <button 
            onClick={() => { setProblemsPanelOpen(!problemsPanelOpen); setBottomPanelTab('problems'); }}
            className="flex items-center gap-1.5 hover:bg-white/10 px-2 py-0.5 transition-colors h-full"
            title="No Problems"
          >
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
              <span>{currentDiagnostics.filter(d => d.severity === 'error').length}</span>
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{currentDiagnostics.filter(d => d.severity === 'warning').length}</span>
            </span>
          </button>
        </div>

        {/* Right Side Status Items */}
        <div className="flex items-center gap-0">
          {/* Line & Column */}
          <button 
            className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 transition-colors h-full"
            title="Go to Line/Column"
          >
            Ln 1, Col 1
          </button>

          {/* Spaces */}
          <button 
            className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 transition-colors h-full"
            title="Select Indentation"
          >
            Spaces: 2
          </button>

          {/* Encoding */}
          <button 
            className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 transition-colors h-full"
            title="Select Encoding"
          >
            UTF-8
          </button>

          {/* Line Ending */}
          <button 
            className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 transition-colors h-full"
            title="Select End of Line Sequence"
          >
            LF
          </button>

          {/* Language Mode */}
          <button 
            className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 transition-colors h-full"
            title="Select Language Mode"
          >
            {(() => {
              const activeFile = openFiles.find(f => f.id === activeFileId);
              if (!activeFile) return 'Plain Text';
              const ext = activeFile.name.split('.').pop()?.toLowerCase() || '';
              const langMap: Record<string, string> = {
                'ts': 'TypeScript', 'tsx': 'TypeScript React', 'js': 'JavaScript', 'jsx': 'JavaScript React',
                'py': 'Python', 'html': 'HTML', 'css': 'CSS', 'scss': 'SCSS', 'json': 'JSON',
                'md': 'Markdown', 'yaml': 'YAML', 'yml': 'YAML', 'xml': 'XML', 'sql': 'SQL',
                'sh': 'Shell Script', 'bash': 'Shell Script', 'go': 'Go', 'rs': 'Rust', 'java': 'Java',
                'c': 'C', 'cpp': 'C++', 'h': 'C', 'hpp': 'C++', 'cs': 'C#', 'php': 'PHP', 'rb': 'Ruby',
                'swift': 'Swift', 'kt': 'Kotlin', 'vue': 'Vue', 'svelte': 'Svelte'
              };
              return langMap[ext] || 'Plain Text';
            })()}
          </button>

          {/* Copilot Status */}
          <button 
            className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 transition-colors h-full"
            title="GitHub Copilot"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </button>

          {/* Prettier */}
          <button 
            className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 transition-colors h-full"
            title="Format Document"
          >
            <span className="text-[10px]">Prettier</span>
          </button>

          {/* Notifications */}
          <button 
            className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 transition-colors h-full"
            title="No Notifications"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        </div>

        {/* Right Hamburger Menu */}
        <div className="relative">
          <button 
            onClick={() => { setRightMenuOpen(!rightMenuOpen); setLeftMenuOpen(false); }}
            className="flex items-center justify-center w-8 h-6 hover:bg-white/20 transition-colors"
            title="More Options"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Right Dropdown Menu */}
          {rightMenuOpen && (
            <div 
              className="absolute bottom-full right-0 mb-0 w-56 rounded-t-md shadow-2xl z-50 overflow-hidden"
              style={{ 
                backgroundColor: getMenuBgColor(), 
                borderWidth: '1px',
                borderColor: getMenuBorderColor(),
                boxShadow: `0 -4px 20px rgba(0,0,0,0.3), 0 0 1px ${getMenuBorderColor()}`
              }}
            >
              <div className="py-1">
                <button 
                  onClick={() => { setRightTab('copilot'); setRightSidebarOpen(true); setRightMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all duration-150"
                  style={{ color: getMenuTextColor() }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = getMenuHoverColor(); e.currentTarget.style.paddingLeft = '14px'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.paddingLeft = '12px'; }}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: getMenuAccentColor() }} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    GitHub Copilot
                  </span>
                </button>
                <button 
                  onClick={() => { setRightTab('ai'); setRightSidebarOpen(true); setRightMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all duration-150"
                  style={{ color: getMenuTextColor() }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = getMenuHoverColor(); e.currentTarget.style.paddingLeft = '14px'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.paddingLeft = '12px'; }}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: getMenuAccentColor() }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    AI Chat
                  </span>
                </button>
                <div className="my-1 h-px mx-2" style={{ backgroundColor: getMenuBorderColor() }} />
                <button 
                  onClick={() => { setRightTab('extensions'); setRightSidebarOpen(true); setRightMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all duration-150"
                  style={{ color: getMenuTextColor() }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = getMenuHoverColor(); e.currentTarget.style.paddingLeft = '14px'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.paddingLeft = '12px'; }}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: getMenuAccentColor() }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Extensions
                  </span>
                  <span className="text-[10px] opacity-50">Ctrl+Shift+X</span>
                </button>
                <button 
                  onClick={() => { setRightTab('debug'); setRightSidebarOpen(true); setRightMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all duration-150"
                  style={{ color: getMenuTextColor() }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = getMenuHoverColor(); e.currentTarget.style.paddingLeft = '14px'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.paddingLeft = '12px'; }}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: getMenuAccentColor() }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Run and Debug
                  </span>
                  <span className="text-[10px] opacity-50">Ctrl+Shift+D</span>
                </button>
                <div className="my-1 h-px mx-2" style={{ backgroundColor: getMenuBorderColor() }} />
                <button 
                  onClick={() => { setRightTab('settings'); setRightSidebarOpen(true); setRightMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all duration-150"
                  style={{ color: getMenuTextColor() }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = getMenuHoverColor(); e.currentTarget.style.paddingLeft = '14px'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.paddingLeft = '12px'; }}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: getMenuAccentColor() }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </span>
                  <span className="text-[10px] opacity-50">Ctrl+,</span>
                </button>
                <button 
                  onClick={() => { setRightTab('techstack'); setRightSidebarOpen(true); setRightMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all duration-150"
                  style={{ color: getMenuTextColor() }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = getMenuHoverColor(); e.currentTarget.style.paddingLeft = '14px'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.paddingLeft = '12px'; }}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: getMenuAccentColor() }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    Tech Stack
                  </span>
                </button>
                <button 
                  onClick={() => { setRightTab('deploy'); setRightSidebarOpen(true); setRightMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all duration-150"
                  style={{ color: getMenuTextColor() }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = getMenuHoverColor(); e.currentTarget.style.paddingLeft = '14px'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.paddingLeft = '12px'; }}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: getMenuAccentColor() }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Deploy
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </footer>
      
      {/* Hidden elements for camera capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Camera Preview Modal */}
      {cameraActive && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className={`${isDark ? 'bg-vscode-sidebar border-vscode-border' : 'bg-white border-gray-200'} border rounded-lg p-4 max-w-2xl w-full mx-4 shadow-xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-medium ${isDark ? 'text-vscode-text' : 'text-gray-800'}`}>Camera Feed</h3>
              <button
                onClick={handleCameraToggle}
                className="p-2 text-gray-400 hover:text-white hover:bg-red-500/20 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className={`relative aspect-video ${isDark ? 'bg-black border-vscode-border' : 'bg-gray-900 border-gray-300'} border rounded overflow-hidden`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={capturePhoto}
                className={`px-4 py-2 ${isDark ? 'bg-vscode-accent text-white' : 'bg-blue-600 text-white'} rounded font-medium transition-all hover:opacity-90 flex items-center gap-2`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Capture
              </button>
              <button
                onClick={handleCameraToggle}
                className="px-4 py-2 bg-red-600 text-white rounded font-medium transition-all hover:bg-red-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette Modal */}
      {commandPaletteOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
          onClick={() => setCommandPaletteOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Palette */}
          <div 
            className={`relative w-full max-w-xl mx-4 ${isDark ? 'bg-vscode-sidebar border-vscode-border' : 'bg-white border-gray-200'} border rounded-lg shadow-2xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'border-vscode-border' : 'border-gray-200'}`}>
              <svg className={`w-4 h-4 ${isDark ? 'text-vscode-textMuted' : 'text-gray-400'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                ref={commandInputRef}
                type="text"
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Type a command or search..."
                className={`flex-1 bg-transparent border-none outline-none text-sm ${isDark ? 'text-white placeholder-vscode-textMuted' : 'text-gray-900 placeholder-gray-400'}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredCommands.length > 0) {
                    filteredCommands[0].action();
                    setCommandPaletteOpen(false);
                  }
                }}
              />
              <kbd className={`px-1.5 py-0.5 text-[10px] rounded ${isDark ? 'bg-vscode-bg text-vscode-textMuted' : 'bg-gray-100 text-gray-500'}`}>ESC</kbd>
            </div>
            
            {/* Command List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredCommands.length === 0 ? (
                <div className={`px-4 py-8 text-center ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
                  <p className="text-sm">No commands found</p>
                </div>
              ) : (
                filteredCommands.map((cmd, index) => (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      setCommandPaletteOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors
                      ${index === 0 
                        ? isDark ? 'bg-vscode-selection' : 'bg-blue-50' 
                        : isDark ? 'hover:bg-vscode-hover' : 'hover:bg-gray-50'
                      }`}
                  >
                    <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className={`px-1.5 py-0.5 text-[10px] rounded ${isDark ? 'bg-vscode-bg text-vscode-textMuted' : 'bg-gray-100 text-gray-500'}`}>
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                ))
              )}
            </div>
            
            {/* Footer hint */}
            <div className={`px-3 py-2 border-t text-[10px] ${isDark ? 'border-vscode-border text-vscode-textMuted bg-vscode-bg/50' : 'border-gray-200 text-gray-500 bg-gray-50'}`}>
              <span>↑↓ to navigate • Enter to select • Esc to close</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Quick Open Modal (Ctrl+P) */}
      <Suspense fallback={null}>
        <QuickOpenAdvanced 
          isOpen={quickOpenOpen}
          onClose={() => setQuickOpenOpen(false)}
          onFileSelect={handleFileSelect}
        />
      </Suspense>
      
      {/* Workspace Manager Modal */}
      <Suspense fallback={null}>
        <WorkspaceManager
          isOpen={workspaceManagerOpen}
          onClose={() => setWorkspaceManagerOpen(false)}
        />
      </Suspense>
    </div>
  );
};

export default App;
