import React, { useState, useEffect, useCallback } from 'react';
import {
  GeneratedApp,
  ViewMode as LegacyViewMode,
  GenerationState,
  ChatMessage,
  ModelOption,
  ProgrammingLanguage,
  Template,
  FileNode,
} from './types';
import SandpackPreview from './components/SandpackPreview';
import CodeView from './components/CodeView';
import CodeEditor from './components/CodeEditor';
import FileTree from './components/FileTree';
import ChatBox from './components/ChatBox';
import TemplatesPanel, { LANGUAGES } from './components/TemplatesPanel';
import VoiceInput from './components/VoiceInput';
import ImageToCode from './components/ImageToCode';
import DeployPanel from './components/DeployPanel';
import PricingPaywall from './components/PricingPaywall';
import CreditStatusBar, { CreditInfo } from './components/PlanStatusBar';
import canvasAppsService from './services/canvasAppsService';
import { editorBridge, useEditorStore } from './services/editorBridge';
import { buildEditorContextForAgent, processAgentResponse, getSurgicalEditPrompt } from './services/agentProcessor';
import deploymentService from './services/deploymentService';
import { DeploymentPlatform } from './types';
import { Monitor, Tablet, Smartphone, Code, Columns, Mic, Image, Rocket, Edit, Eye, MessageSquare, FolderTree, Clock, LayoutTemplate, Settings, Sparkles, ChevronDown, Play, CheckCircle, GitBranch, Key, Package, Terminal, Wrench, RefreshCcw, BookOpen, TestTube2, BarChart3, Receipt, Globe, History, Activity } from 'lucide-react';

// New Phase 2-7 Components
import GitPanel from './components/sidebar/GitPanel';
import EnvironmentVars, { EnvVar } from './components/sidebar/EnvironmentVars';
import DependenciesPanel, { Dependency } from './components/sidebar/DependenciesPanel';
import HistoryPanel from './components/sidebar/HistoryPanel';
import type { HistoryEntry } from './components/sidebar/HistoryPanel';
import ConsolePanel, { ConsoleEntry } from './components/preview/ConsolePanel';
import NetworkPanel, { NetworkRequest } from './components/preview/NetworkPanel';
import PreviewToolbar from './components/preview/PreviewToolbar';
import DeployStatus from './components/deploy/DeployStatus';
import DomainManager from './components/deploy/DomainManager';
import HostingDashboard from './components/deploy/HostingDashboard';
import RollbackPanel from './components/deploy/RollbackPanel';
import AIAutofix from './components/ai/AIAutofix';
import AIRefactor from './components/ai/AIRefactor';
import AIExplain from './components/ai/AIExplain';
import AITestWriter from './components/ai/AITestWriter';
import UsageDashboard from './components/billing/UsageDashboard';
import InvoiceHistory from './components/billing/InvoiceHistory';
import ErrorBoundary from './components/shared/ErrorBoundary';

// Preview view mode type (separate from legacy ViewMode)
type PreviewViewMode = 'desktop' | 'tablet' | 'mobile' | 'code' | 'split';

// Left sidebar tab type
type SidebarTab = 'chat' | 'files' | 'templates' | 'history' | 'git' | 'env' | 'packages';

// Bottom panel tab type
type BottomPanelTab = 'console' | 'network' | 'problems' | 'terminal';

const MODELS: ModelOption[] = [
  // Best models for code generation
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Best for coding - highly recommended.',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Most capable OpenAI model.',
  },
  {
    id: 'grok-3',
    name: 'Grok 3',
    provider: 'xAI',
    description: 'Strong reasoning and coding.',
  },
  {
    id: 'codestral',
    name: 'Codestral',
    provider: 'Mistral',
    description: 'Specialized for code generation.',
  },
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B',
    provider: 'Groq',
    description: 'Ultra-fast inference.',
  },
];

const PRESET_TEMPLATES = [
  {
    name: 'SaaS Page',
    prompt:
      'Build a modern SaaS landing page for a CRM tool with features, pricing, and hero.',
  },
  {
    name: 'Analytics',
    prompt:
      'Create a dark-themed analytics dashboard with 3 chart placeholders and a sidebar.',
  },
  {
    name: 'Storefront',
    prompt:
      'Generate an elegant minimal furniture store with a grid of items and cart icon.',
  },
];

type ActivePanel = 'workspace' | 'assistant' | 'history' | 'voice' | 'image' | 'deploy' | 'files' | 'ai-tools' | 'billing' | null;
type EditorMode = 'view' | 'edit'; // Toggle between read-only and editable code
type AIToolTab = 'autofix' | 'refactor' | 'explain' | 'tests';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODELS[0]);
  const [viewMode, setViewMode] = useState<PreviewViewMode>('desktop');
  const [currentApp, setCurrentApp] = useState<GeneratedApp | null>(null);
  const [history, setHistory] = useState<GeneratedApp[]>([]);
  const [activePanel, setActivePanel] = useState<ActivePanel>('workspace');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('chat');
  const [genState, setGenState] = useState<GenerationState>({
    isGenerating: false,
    error: null,
    progressMessage: '',
  });
  
  // New state for templates and languages
  const [isTemplatesPanelOpen, setIsTemplatesPanelOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<ProgrammingLanguage | 'all'>('all');
  const [currentLanguage, setCurrentLanguage] = useState<ProgrammingLanguage>('html');
  
  // New feature modals
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [showImageToCode, setShowImageToCode] = useState(false);
  const [showDeployPanel, setShowDeployPanel] = useState(false);
  
  // Editor Bridge state
  const [editorMode, setEditorMode] = useState<EditorMode>('view');
  const [projectFiles, setProjectFiles] = useState<FileNode[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [useSurgicalEdits, setUseSurgicalEdits] = useState(true);
  
  // Sidebar discovery animation state
  const [sidebarHighlightIndex, setSidebarHighlightIndex] = useState<number | null>(null);
  const [hasSeenSidebarAnimation, setHasSeenSidebarAnimation] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // New Phase 2-7 state
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [bottomPanelTab, setBottomPanelTab] = useState<BottomPanelTab>('console');
  const [showAITools, setShowAITools] = useState(false);
  const [aiToolTab, setAIToolTab] = useState<AIToolTab>('autofix');
  const [showBilling, setShowBilling] = useState(false);
  const [showHosting, setShowHosting] = useState(false);
  const [projectHistory, setProjectHistory] = useState<HistoryEntry[]>([]);

  // Dev panel state
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([
    { id: '1', level: 'info', message: 'GenCraft Pro initialized', timestamp: new Date().toISOString(), source: 'system' },
  ]);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [envVars, setEnvVars] = useState<EnvVar[]>([
    { key: 'NODE_ENV', value: 'development', isSecret: false },
    { key: 'API_URL', value: '/api', isSecret: false },
  ]);
  const [projectDependencies, setProjectDependencies] = useState<Dependency[]>([
    { name: 'react', version: '19.0.0', latestVersion: '19.0.0', type: 'dependency' },
    { name: 'react-dom', version: '19.0.0', latestVersion: '19.0.0', type: 'dependency' },
    { name: 'tailwindcss', version: '3.4.16', latestVersion: '3.4.16', type: 'devDependency' },
  ]);

  // Auth & Credits state
  const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);
  const [activeCredits, setActiveCredits] = useState<CreditInfo | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [isCheckingPlan, setIsCheckingPlan] = useState(true);
  const [showThankYou, setShowThankYou] = useState(false);

  // Auth check + credit balance
  useEffect(() => {
    const checkAuthAndCredits = async () => {
      setIsCheckingPlan(true);
      try {
        // 1. Verify user session
        const authRes = await fetch('/api/auth/verify', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!authRes.ok) { setIsCheckingPlan(false); setShowPricing(true); return; }
        const authData = await authRes.json();
        if (!authData.valid || !authData.user) { setIsCheckingPlan(false); setShowPricing(true); return; }
        setAuthUser({ id: authData.user.id, email: authData.user.email });

        // 2. Check for post-checkout redirect
        const params = new URLSearchParams(window.location.search);
        if (params.get('purchase') === 'success' && params.get('session_id')) {
          try {
            const verifyRes = await fetch('/api/billing/verify', {
              method: 'POST', credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: params.get('session_id') }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) { setShowThankYou(true); setTimeout(() => setShowThankYou(false), 6000); }
          } catch (e) { console.error('Purchase verification error:', e); }
          window.history.replaceState({}, '', window.location.pathname);
        }

        // 3. Check credit balance
        const creditsRes = await fetch('/api/billing/credits?app=gen-craft-pro', { credentials: 'include' });
        const creditsData = await creditsRes.json();
        if (creditsData.success) {
          setActiveCredits({ balance: creditsData.balance || 0, lifetimeSpent: creditsData.lifetimeSpent || 0 });
          if ((creditsData.balance || 0) > 0) { setShowPricing(false); } else { setShowPricing(true); }
        } else {
          setShowPricing(true);
        }
      } catch (e) {
        console.error('Auth/credits check error:', e);
        setShowPricing(true);
      } finally {
        setIsCheckingPlan(false);
      }
    };
    checkAuthAndCredits();
  }, []);

  // Load apps from database (with localStorage fallback)
  useEffect(() => {
    const loadApps = async () => {
      setIsLoadingHistory(true);
      try {
        const apps = await canvasAppsService.getApps();
        setHistory(apps);
        
        // Try to migrate localStorage data to database if user is logged in
        const localApps = canvasAppsService.getLocalApps();
        if (localApps.length > 0 && apps.length === 0) {
          // User has local apps but no DB apps - try migration
          await canvasAppsService.migrateFromLocalStorage();
          const migratedApps = await canvasAppsService.getApps();
          setHistory(migratedApps.length > 0 ? migratedApps : localApps);
        }
      } catch (e) {
        console.error('[App] Failed to load apps:', e);
        // Fallback to localStorage
        setHistory(canvasAppsService.getLocalApps());
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadApps();
  }, []);

  // Sync editorBridge with currentApp code
  useEffect(() => {
    if (currentApp?.code) {
      editorBridge.loadFromCode(currentApp.code, currentLanguage);
      setProjectFiles(editorBridge.getProjectTree());
      // Set active file to first file if not set
      if (!activeFilePath) {
        const paths = editorBridge.getAllFilePaths();
        if (paths.length > 0) {
          setActiveFilePath(paths[0]);
        }
      }
    }
  }, [currentApp?.code, currentLanguage]);

  // Listen to editorBridge file changes
  useEffect(() => {
    const handleFileChange = (path: string, content: string) => {
      setProjectFiles(editorBridge.getProjectTree());
      // Sync back to currentApp if in edit mode
      if (editorMode === 'edit' && currentApp) {
        const newCode = editorBridge.toCode();
        setCurrentApp(prev => prev ? { ...prev, code: newCode } : null);
      }
    };
    editorBridge.onFileChange(handleFileChange);
  }, [editorMode, currentApp]);

  // Sidebar discovery animation - runs once on first load
  useEffect(() => {
    // Check if user has already seen the animation
    const hasSeen = localStorage.getItem('gencraft_sidebar_animated');
    if (hasSeen) {
      setHasSeenSidebarAnimation(true);
      return;
    }

    // Animation sequence: highlight each sidebar item with delay
    const sidebarItems = ['logo', 'workspace', 'assistant', 'history', 'settings'];
    let currentIndex = 0;
    
    const animateNext = () => {
      if (currentIndex < sidebarItems.length) {
        setSidebarHighlightIndex(currentIndex);
        currentIndex++;
        setTimeout(animateNext, 600);
      } else {
        // Animation complete
        setSidebarHighlightIndex(null);
        setHasSeenSidebarAnimation(true);
        localStorage.setItem('gencraft_sidebar_animated', 'true');
      }
    };

    // Start animation after a short delay
    const startTimer = setTimeout(() => {
      animateNext();
    }, 1000);

    return () => clearTimeout(startTimer);
  }, []);

  // Save app to database (with localStorage fallback)
  const saveApp = useCallback(async (app: GeneratedApp, isNew: boolean = false) => {
    try {
      if (isNew) {
        const savedApp = await canvasAppsService.saveApp(app);
        if (savedApp) {
          setHistory(prev => [savedApp, ...prev.filter(a => a.id !== savedApp.id)]);
        } else {
          // Fallback - just update state
          setHistory(prev => [app, ...prev.filter(a => a.id !== app.id)]);
        }
      } else {
        const updatedApp = await canvasAppsService.updateApp(app.id, app);
        if (updatedApp) {
          setHistory(prev => prev.map(a => a.id === updatedApp.id ? updatedApp : a));
        } else {
          // Fallback - just update state
          setHistory(prev => prev.map(a => a.id === app.id ? app : a));
        }
      }
    } catch (error) {
      console.error('[App] Save error:', error);
      // Fallback to just updating state
      if (isNew) {
        setHistory(prev => [app, ...prev.filter(a => a.id !== app.id)]);
      } else {
        setHistory(prev => prev.map(a => a.id === app.id ? app : a));
      }
    }
  }, []);

  // Legacy saveHistory for compatibility (no longer writes directly to localStorage)
  const saveHistory = useCallback((newHistory: GeneratedApp[]) => {
    setHistory(newHistory);
  }, []);

  // Helper to add console entries
  const addConsoleEntry = (level: ConsoleEntry['level'], message: string, source?: string) => {
    setConsoleEntries(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      level,
      message,
      timestamp: new Date().toISOString(),
      source,
    }]);
  };

  // Helper to track network requests
  const trackRequest = (method: NetworkRequest['method'], url: string, status: number, duration: number, size: number) => {
    setNetworkRequests(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      method,
      url,
      status,
      statusText: status < 400 ? 'OK' : 'Error',
      type: 'fetch',
      size,
      duration,
      startTime: new Date().toISOString(),
    }]);
  };

  const handleGenerate = async (
    instruction: string,
    isInitial: boolean = false
  ) => {
    if (!instruction.trim() || genState.isGenerating) return;

    // Auth gate — if not logged in, show sign-in screen
    if (!authUser) {
      setShowPricing(true);
      return;
    }

    // Credits gate — if no credits, show pricing
    if (!activeCredits || activeCredits.balance <= 0) {
      setShowPricing(true);
      return;
    }

    setGenState({
      isGenerating: true,
      error: null,
      progressMessage: `Generating ${LANGUAGES.find(l => l.id === currentLanguage)?.name || 'code'} with ${selectedModel.name}...`,
      isThinking: selectedModel.isThinking,
    });

    try {
      // Add language context to the prompt
      const languageContext = getLanguagePromptAddition(currentLanguage);
      const enhancedInstruction = languageContext 
        ? `[Language: ${currentLanguage.toUpperCase()}] ${languageContext}\n\nUser Request: ${instruction}`
        : instruction;

      // Call the backend API instead of direct SDK
      addConsoleEntry('info', `Generating with ${selectedModel.name}...`, 'gencraft');
      const startTime = Date.now();
      const response = await fetch('/api/canvas/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enhancedInstruction,
          provider: selectedModel.provider,
          modelId: selectedModel.id,
          isThinking: selectedModel.isThinking || false,
          currentCode: isInitial ? undefined : currentApp?.code,
          history: isInitial ? [] : currentApp?.history,
        }),
      });

      // Handle auth/plan errors with actionable prompts
      if (response.status === 401) {
        setGenState({ isGenerating: false, error: null, progressMessage: '' });
        setAuthUser(null);
        setShowPricing(true);
        return;
      }
      if (response.status === 403) {
        setGenState({ isGenerating: false, error: null, progressMessage: '' });
        setShowPricing(true);
        return;
      }

      const data = await response.json();
      const generateElapsed = Date.now() - startTime;
      trackRequest('POST', '/api/canvas/generate', response.status, generateElapsed, JSON.stringify(data).length);

      if (!response.ok || !data.success) {
        addConsoleEntry('error', data.error || 'Generation failed', 'gencraft');
        throw new Error(data.error || 'Failed to generate application');
      }

      const code = data.code;
      addConsoleEntry('log', `Generated ${code.length} chars in ${(generateElapsed / 1000).toFixed(1)}s`, 'gencraft');

      const userMsg: ChatMessage = {
        role: 'user',
        text: instruction,
        timestamp: Date.now(),
      };
      const modelMsg: ChatMessage = {
        role: 'model',
        text: isInitial ? 'Application built!' : 'Changes applied.',
        timestamp: Date.now(),
      };

      if (isInitial) {
        const newApp: GeneratedApp = {
          id: Date.now().toString(),
          name: instruction.substring(0, 30) + '...',
          code,
          prompt: instruction,
          timestamp: Date.now(),
          history: [modelMsg],
          language: currentLanguage,
          provider: selectedModel.provider,
          modelId: selectedModel.id,
        };
        setCurrentApp(newApp);
        // Save new app to database
        saveApp(newApp, true);
      } else if (currentApp) {
        const updatedApp = {
          ...currentApp,
          code,
          history: [...currentApp.history, userMsg, modelMsg],
        };
        setCurrentApp(updatedApp);
        // Update existing app in database
        saveApp(updatedApp, false);
      }

      setGenState({ isGenerating: false, error: null, progressMessage: '' });
      setViewMode('desktop');
    } catch (err: any) {
      setGenState({
        isGenerating: false,
        error: err.message,
        progressMessage: '',
      });
    }
  };

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  // Handle messages from AI Assistant chat - uses /api/canvas/chat endpoint
  // which supports multi-page builds, deployment commands, and build fix responses
  const handleChatMessage = async (text: string) => {
    if (!text.trim() || genState.isGenerating) return;

    // Auth gate — if not logged in, show sign-in screen
    if (!authUser) {
      setShowPricing(true);
      return;
    }

    // Credits gate — if no credits, show pricing
    if (!activeCredits || activeCredits.balance <= 0) {
      setShowPricing(true);
      return;
    }

    setGenState({
      isGenerating: true,
      error: null,
      progressMessage: 'Master Coder is thinking...',
    });

    try {
      const response = await fetch('/api/canvas/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          provider: selectedModel.provider,
          modelId: selectedModel.id,
          currentCode: currentApp?.code || '',
          conversationHistory: currentApp?.history?.slice(-10) || [],
        }),
      });

      // Handle auth/plan errors with actionable prompts
      if (response.status === 401) {
        setGenState({ isGenerating: false, error: null, progressMessage: '' });
        setAuthUser(null);
        setShowPricing(true);
        return;
      }
      if (response.status === 403) {
        setGenState({ isGenerating: false, error: null, progressMessage: '' });
        setShowPricing(true);
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process message');
      }

      const userMsg: ChatMessage = { role: 'user', text, timestamp: Date.now() };
      const modelMsg: ChatMessage = { role: 'model', text: data.message || 'Done!', timestamp: Date.now() };

      // Handle multi-page builds
      if (data.multiPage && data.pages && Array.isArray(data.pages)) {
        // Create all page files via editorBridge
        for (const page of data.pages) {
          const filePath = page.path.startsWith('/') ? page.path : `/${page.path}`;
          const exists = editorBridge.getFile(filePath) !== undefined;
          if (exists) {
            editorBridge.updateFile(filePath, page.content);
          } else {
            editorBridge.createFile(filePath, page.content);
          }
        }
        setProjectFiles(editorBridge.getProjectTree());

        // Use main code (index.html) for preview
        const mainCode = data.code || data.pages.find((p: any) => p.path.includes('index'))?.content || data.pages[0]?.content;
        if (mainCode) {
          if (currentApp) {
            const updatedApp = {
              ...currentApp,
              code: mainCode,
              history: [...currentApp.history, userMsg, modelMsg],
            };
            setCurrentApp(updatedApp);
            saveApp(updatedApp, false);
          } else {
            const newApp: GeneratedApp = {
              id: Date.now().toString(),
              name: text.substring(0, 30) + '...',
              code: mainCode,
              prompt: text,
              timestamp: Date.now(),
              history: [modelMsg],
              language: currentLanguage,
            };
            setCurrentApp(newApp);
            saveApp(newApp, true);
          }
        }
      }
      // Handle deploy commands
      else if (data.type === 'deploy' && data.deployPlatform) {
        // Add message to history
        if (currentApp) {
          const updatedApp = {
            ...currentApp,
            history: [...currentApp.history, userMsg, modelMsg],
          };
          setCurrentApp(updatedApp);
          saveApp(updatedApp, false);
        }

        // For Maula deploy, auto-deploy directly without opening panel
        if (data.deployPlatform === 'maula') {
          const files = useEditorStore.getState().files;
          if (Object.keys(files).length > 0) {
            setGenState({
              isGenerating: true,
              error: null,
              progressMessage: '🚀 Deploying to Maula.ai...',
            });
            try {
              const result = await deploymentService.deployToMaula(
                { platform: 'maula', projectName: currentApp?.name || 'canvas-project' },
                files,
              );
              if (result.success && result.url) {
                const deployMsg: ChatMessage = {
                  role: 'model',
                  text: `🎉 Your site is live!\n\n🔗 **${result.url}**\n\nShare this link with anyone — it's live on the internet with free SSL & CDN!\n\nManage your sites at maula.ai/dashboard/deployed-sites`,
                  timestamp: Date.now(),
                };
                if (currentApp) {
                  const app2 = { ...currentApp, history: [...currentApp.history, deployMsg] };
                  setCurrentApp(app2);
                  saveApp(app2, false);
                }
              } else {
                throw new Error(result.error || 'Deploy failed');
              }
              setGenState({ isGenerating: false, error: null, progressMessage: '' });
            } catch (deployErr: any) {
              setGenState({ isGenerating: false, error: deployErr.message, progressMessage: '' });
            }
          } else {
            setShowDeployPanel(true);
          }
        } else {
          // For other platforms, open deploy panel
          setShowDeployPanel(true);
        }
      }
      // Handle regular build responses
      else if (data.shouldBuild && data.code) {
        const code = data.code;
        if (currentApp) {
          const updatedApp = {
            ...currentApp,
            code,
            history: [...currentApp.history, userMsg, modelMsg],
          };
          setCurrentApp(updatedApp);
          saveApp(updatedApp, false);
        } else {
          const newApp: GeneratedApp = {
            id: Date.now().toString(),
            name: text.substring(0, 30) + '...',
            code,
            prompt: text,
            timestamp: Date.now(),
            history: [modelMsg],
            language: currentLanguage,
          };
          setCurrentApp(newApp);
          saveApp(newApp, true);
        }
      }
      // Chat-only response (no build)
      else {
        if (currentApp) {
          const updatedApp = {
            ...currentApp,
            history: [...currentApp.history, userMsg, modelMsg],
          };
          setCurrentApp(updatedApp);
          saveApp(updatedApp, false);
        }
      }

      setGenState({ isGenerating: false, error: null, progressMessage: '' });
    } catch (err: any) {
      setGenState({
        isGenerating: false,
        error: err.message,
        progressMessage: '',
      });
    }
  };

  // Handle deploy completion callback from DeployPanel
  const handleDeployComplete = (url: string, platform: DeploymentPlatform) => {
    if (currentApp) {
      const deployMsg: ChatMessage = {
        role: 'model',
        text: `🚀 Deployed successfully to ${platform}!\n${url}`,
        timestamp: Date.now(),
      };
      const updatedApp = {
        ...currentApp,
        history: [...currentApp.history, deployMsg],
      };
      setCurrentApp(updatedApp);
      saveApp(updatedApp, false);
    }
  };

  // Handle build error fix request from DeployPanel
  const handleFixBuildError = async (error: string, buildLogs: string[]) => {
    if (!currentApp) return;

    setGenState({
      isGenerating: true,
      error: null,
      progressMessage: 'AI is analyzing and fixing build errors...',
    });

    try {
      const files = useEditorStore.getState().files;
      const fix = await deploymentService.requestBuildFix(error, buildLogs, files);

      if (fix && fix.fixedFiles) {
        // Apply all fixes
        for (const [path, content] of Object.entries(fix.fixedFiles)) {
          const filePath = path.startsWith('/') ? path : `/${path}`;
          const exists = editorBridge.getFile(filePath) !== undefined;
          if (exists) {
            editorBridge.updateFile(filePath, content);
          } else {
            editorBridge.createFile(filePath, content);
          }
        }
        setProjectFiles(editorBridge.getProjectTree());

        const newCode = editorBridge.toCode();
        const fixMsg: ChatMessage = {
          role: 'model',
          text: `🔧 ${fix.explanation}`,
          timestamp: Date.now(),
        };
        const updatedApp = {
          ...currentApp,
          code: newCode,
          history: [...currentApp.history, fixMsg],
        };
        setCurrentApp(updatedApp);
        saveApp(updatedApp, false);
      } else {
        throw new Error('AI could not generate a fix. Try deploying again or modifying the code manually.');
      }

      setGenState({ isGenerating: false, error: null, progressMessage: '' });
    } catch (err: any) {
      setGenState({
        isGenerating: false,
        error: err.message,
        progressMessage: '',
      });
    }
  };

  // Handle template selection from templates panel
  const handleUseTemplate = (template: Template) => {
    setPrompt(template.prompt);
    setCurrentLanguage(template.language);
    setIsTemplatesPanelOpen(false);
    setActivePanel('workspace');
  };

  // Get language-specific system prompt addition
  const getLanguagePromptAddition = (lang: ProgrammingLanguage): string => {
    const languagePrompts: Partial<Record<ProgrammingLanguage, string>> = {
      html: 'Generate a complete, self-contained HTML file with embedded CSS and JavaScript. The output should start with <!DOCTYPE html>.',
      javascript: 'Generate clean, modern JavaScript code with ES6+ syntax. Include comments explaining key parts.',
      typescript: 'Generate TypeScript code with proper type annotations and interfaces. Include JSDoc comments.',
      python: 'Generate clean Python 3 code following PEP 8 style guidelines. Include docstrings and type hints.',
      react: 'Generate a React functional component with hooks. Use TypeScript and Tailwind CSS classes. Export the component.',
      nextjs: 'Generate Next.js 14 code using App Router with TypeScript. Use Server Components where appropriate.',
      vue: 'Generate a Vue 3 component using Composition API with TypeScript and <script setup> syntax.',
      svelte: 'Generate a Svelte component with TypeScript support.',
      css: 'Generate modern CSS with custom properties, flexbox/grid, and responsive design.',
      tailwind: 'Generate HTML with Tailwind CSS classes. Use utility-first approach with proper responsive classes.',
      nodejs: 'Generate Node.js code with ES modules (import/export). Include error handling and async/await.',
      express: 'Generate Express.js code with proper middleware, routing, and error handling.',
      sql: 'Generate SQL code compatible with PostgreSQL. Include proper constraints and indexes.',
      bash: 'Generate a Bash script with proper shebang, error handling, and comments.',
      json: 'Generate properly formatted JSON with appropriate structure.',
      markdown: 'Generate well-structured Markdown with proper headings, lists, and formatting.',
    };
    return languagePrompts[lang] || '';
  };

  // Helper function for sidebar animation classes
  const getSidebarItemClass = (index: number, baseClass: string, activeClass: string, inactiveClass: string, isActive: boolean) => {
    const isHighlighted = sidebarHighlightIndex === index && !hasSeenSidebarAnimation;
    const highlightClass = isHighlighted 
      ? 'animate-pulse ring-2 ring-indigo-400 ring-opacity-75 scale-110 bg-indigo-600/30 text-indigo-300' 
      : '';
    return `${baseClass} ${isActive ? activeClass : inactiveClass} ${highlightClass}`;
  };


  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-400 overflow-hidden">
      {/* Loading state */}
      {isCheckingPlan && (
        <div className="fixed inset-0 z-[100] bg-[#09090b] flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-violet-500/60 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 text-sm font-medium">Loading GenCraft Pro...</p>
          </div>
        </div>
      )}

      {/* Auth Gate — if not authenticated, show sign-in screen */}
      {!isCheckingPlan && !authUser && showPricing && (
        <div className="fixed inset-0 z-[100] bg-[#09090b] matrix-bg flex items-center justify-center">
          <div className="w-full max-w-md mx-auto px-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-blue-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-violet-500/20 ring-1 ring-white/10">
              <Sparkles className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight">GenCraft Pro</h1>
            <p className="text-zinc-500 text-sm font-medium">AI App Builder</p>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent mx-auto my-8" />
            <h2 className="text-xl font-semibold text-zinc-200 mb-2">Sign in to start building</h2>
            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">Create a free account to use GenCraft AI App Builder. Build full-stack apps with AI in seconds.</p>
            <div className="flex flex-col gap-3 mb-8">
              <a href="/auth/login?redirect=/gen-craft-pro/" className="w-full py-3 px-6 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-500/15 text-center ring-1 ring-white/10">Log In</a>
              <a href="/auth/signup?redirect=/gen-craft-pro/" className="w-full py-3 px-6 bg-zinc-800/50 border border-zinc-700/50 text-zinc-200 font-semibold rounded-xl hover:bg-zinc-700/50 hover:border-zinc-600/50 transition-all text-center">Create Free Account</a>
            </div>
            <div className="flex items-center justify-center gap-6 text-zinc-600">
              <div className="flex items-center gap-1.5 text-xs font-medium"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Free to sign up</div>
              <div className="flex items-center gap-1.5 text-xs font-medium"><div className="w-1.5 h-1.5 rounded-full bg-violet-500" />AI-powered</div>
              <div className="flex items-center gap-1.5 text-xs font-medium"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" />Secure</div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Paywall — user is authenticated but has no plan */}
      {!isCheckingPlan && authUser && showPricing && (
        <PricingPaywall userId={authUser?.id || null} userEmail={authUser?.email || null} isOverlay={true} />
      )}

      {/* Thank You Toast — shows after successful Stripe checkout */}
      {showThankYou && (
        <div className="fixed top-6 right-6 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-zinc-900/95 backdrop-blur-xl border border-emerald-500/25 rounded-2xl p-5 shadow-2xl shadow-black/50 max-w-sm">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/15 ring-1 ring-white/10">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-zinc-100 font-bold text-sm mb-1">🎉 Welcome to GenCraft Pro!</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">Your plan is now active. Start building amazing apps with AI — describe what you want below!</p>
              </div>
            </div>
            <div className="mt-3 w-full bg-zinc-800/50 rounded-full h-1 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-[shrink_6s_linear_forwards]" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* LEFT SIDEBAR — 340px, always visible */}
      {/* ============================================================ */}
      <aside className="w-[340px] shrink-0 flex flex-col bg-zinc-950/80 border-r border-zinc-800/50 z-50 backdrop-blur-sm">
        {/* Sidebar Header — Brand + New Project */}
        <div className="px-5 pt-5 pb-4 border-b border-zinc-800/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-600/20 ring-1 ring-white/10">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-zinc-100 leading-tight tracking-tight">GenCraft Pro</h1>
                <p className="text-[10px] text-zinc-500 font-medium">AI App Builder</p>
              </div>
            </div>
            <CreditStatusBar credits={activeCredits} onBuyCredits={() => setShowPricing(true)} />
          </div>
          {/* New App Prompt */}
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) { e.preventDefault(); handleGenerate(prompt, true); } }}
              placeholder="Describe what you want to build..."
              className="w-full p-3.5 pr-12 text-[13px] font-mono border border-zinc-800/60 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 outline-none bg-zinc-900/50 min-h-[72px] max-h-[120px] resize-none transition-all text-zinc-300 placeholder-zinc-600"
            />
            <button
              onClick={() => handleGenerate(prompt, true)}
              disabled={genState.isGenerating || !prompt.trim()}
              className="absolute bottom-3 right-3 w-8 h-8 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-lg flex items-center justify-center hover:from-violet-500 hover:to-blue-500 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-md shadow-violet-600/20 ring-1 ring-white/10 active:scale-95"
              title="Generate App"
            >
              <Play className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Sidebar Tabs */}
        <div className="flex border-b border-zinc-800/50 px-1.5 gap-0.5 overflow-x-auto custom-scrollbar">
          {([
            { id: 'chat' as SidebarTab, label: 'Chat', icon: MessageSquare },
            { id: 'files' as SidebarTab, label: 'Files', icon: FolderTree },
            { id: 'git' as SidebarTab, label: 'Git', icon: GitBranch },
            { id: 'packages' as SidebarTab, label: 'Deps', icon: Package },
            { id: 'env' as SidebarTab, label: 'Env', icon: Key },
            { id: 'templates' as SidebarTab, label: 'Templates', icon: LayoutTemplate },
            { id: 'history' as SidebarTab, label: 'History', icon: Clock },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setSidebarTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium border-b-2 transition-all ${
                sidebarTab === tab.id ? 'border-violet-500 text-violet-400' : 'border-transparent text-zinc-600 hover:text-zinc-400'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {sidebarTab === 'chat' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <ChatBox messages={currentApp?.history || []} onSendMessage={(text) => handleChatMessage(text)} isGenerating={genState.isGenerating} />
            </div>
          )}
          {sidebarTab === 'files' && (
            <div className="flex-1 overflow-hidden">
              <FileTree
                files={projectFiles}
                activeFile={activeFilePath}
                onFileSelect={(path) => { setActiveFilePath(path); setViewMode('code'); }}
                onFileCreate={(path) => { editorBridge.createFile(path, ''); setProjectFiles(editorBridge.getProjectTree()); setActiveFilePath(path); setViewMode('code'); }}
                onFileDelete={(path) => { editorBridge.deleteFile(path); setProjectFiles(editorBridge.getProjectTree()); if (activeFilePath === path) { const paths = editorBridge.getAllFilePaths(); setActiveFilePath(paths[0] || null); } }}
                onFileRename={(oldPath, newPath) => { editorBridge.renameFile(oldPath, newPath); setProjectFiles(editorBridge.getProjectTree()); if (activeFilePath === oldPath) { setActiveFilePath(newPath); } }}
                darkMode={true}
              />
            </div>
          )}
          {sidebarTab === 'templates' && (
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Quick Start</p>
              <div className="space-y-2 mb-6">
                {PRESET_TEMPLATES.map((tpl) => (
                  <button key={tpl.name} onClick={() => { setPrompt(tpl.prompt); setSidebarTab('chat'); }} className="w-full text-left px-4 py-3 text-xs text-zinc-400 bg-zinc-900/40 hover:bg-violet-500/10 hover:text-violet-300 rounded-xl border border-zinc-800/50 hover:border-violet-500/20 transition-all flex justify-between items-center group">
                    <span>{tpl.name}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))}
              </div>
              <button onClick={() => setIsTemplatesPanelOpen(true)} className="w-full py-2.5 text-xs text-violet-400 hover:text-violet-300 border border-violet-500/20 hover:border-violet-500/40 rounded-xl transition-all flex items-center justify-center gap-2">
                <LayoutTemplate className="w-3.5 h-3.5" />
                Browse All Templates
              </button>
            </div>
          )}
          {sidebarTab === 'history' && (
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((app) => (
                    <button key={app.id} onClick={() => setCurrentApp(app)} className={`w-full text-left px-4 py-3 text-xs rounded-xl transition-all border ${currentApp?.id === app.id ? 'bg-violet-500/12 border-violet-500/25 text-violet-300' : 'bg-zinc-900/30 text-zinc-400 border-zinc-800/50 hover:border-violet-500/20 hover:bg-violet-500/5'}`}>
                      <div className="font-semibold mb-1 truncate">{app.name}</div>
                      <div className="text-[10px] opacity-50">{new Date(app.timestamp).toLocaleString()}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>No project history yet.</p>
                  <p className="text-zinc-600 mt-1">Generated apps will appear here.</p>
                </div>
              )}
            </div>
          )}
          {sidebarTab === 'git' && (
            <div className="flex-1 overflow-hidden">
              <GitPanel projectId={currentApp?.id || 'default'} />
            </div>
          )}
          {sidebarTab === 'env' && (
            <div className="flex-1 overflow-hidden">
              <EnvironmentVars projectId={currentApp?.id || 'default'} vars={envVars} onChange={setEnvVars} />
            </div>
          )}
          {sidebarTab === 'packages' && (
            <div className="flex-1 overflow-hidden">
              <DependenciesPanel dependencies={projectDependencies} />
            </div>
          )}
        </div>

        {/* Sidebar Bottom Toolbar */}
        <div className="px-4 py-3 border-t border-zinc-800/50 flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <button onClick={() => setShowVoiceInput(true)} className="p-2 rounded-lg text-zinc-600 hover:text-violet-400 hover:bg-violet-500/8 transition-all" data-tooltip="Voice Input"><Mic className="w-4 h-4" /></button>
            <button onClick={() => setShowImageToCode(true)} className="p-2 rounded-lg text-zinc-600 hover:text-violet-400 hover:bg-violet-500/8 transition-all" data-tooltip="Image to Code"><Image className="w-4 h-4" /></button>
            <button onClick={() => setShowAITools(!showAITools)} className={`p-2 rounded-lg transition-all ${showAITools ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-600 hover:text-violet-400 hover:bg-violet-500/8'}`} data-tooltip="AI Tools"><Wrench className="w-4 h-4" /></button>
            <button onClick={() => setShowBilling(!showBilling)} className={`p-2 rounded-lg transition-all ${showBilling ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-600 hover:text-blue-400 hover:bg-blue-500/8'}`} data-tooltip="Usage & Billing"><BarChart3 className="w-4 h-4" /></button>
          </div>
          <div className="text-[9px] text-zinc-700 font-medium select-none">GenCraft Pro &middot; Maula AI</div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MAIN CONTENT — Header + Preview/Code Area */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/50 bg-zinc-950/60 backdrop-blur-sm shrink-0 z-40">
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/60 border border-zinc-800/60 rounded-lg text-xs font-medium hover:border-violet-500/30 hover:bg-zinc-800/40 transition-all">
                <span>{LANGUAGES.find(l => l.id === currentLanguage)?.icon}</span>
                <span className="text-zinc-300">{LANGUAGES.find(l => l.id === currentLanguage)?.name || 'HTML'}</span>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </button>
              <div className="absolute top-full left-0 mt-1 w-56 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/40 rounded-xl shadow-2xl shadow-black/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-1.5 max-h-80 overflow-y-auto">
                <p className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Language</p>
                {LANGUAGES.map((lang) => (
                  <button key={lang.id} onClick={() => setCurrentLanguage(lang.id)} className={`w-full text-left p-2 rounded-lg hover:bg-violet-500/10 transition-colors flex items-center gap-3 ${currentLanguage === lang.id ? 'bg-violet-500/12 ring-1 ring-violet-500/20' : ''}`}>
                    <span className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs shadow-sm" style={{ backgroundColor: lang.color }}>{lang.icon}</span>
                    <div>
                      <p className="text-xs font-medium text-zinc-200">{lang.name}</p>
                      <p className="text-[10px] text-zinc-500">{lang.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selector */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/60 border border-zinc-800/60 rounded-lg text-xs font-medium hover:border-violet-500/30 hover:bg-zinc-800/40 transition-all">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-zinc-300">{selectedModel.name}</span>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </button>
              <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/40 rounded-xl shadow-2xl shadow-black/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-1.5">
                <p className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">AI Model</p>
                {MODELS.map((model) => (
                  <button key={model.id} onClick={() => setSelectedModel(model)} className={`w-full text-left p-2.5 rounded-lg hover:bg-violet-500/10 transition-colors ${selectedModel.id === model.id ? 'bg-violet-500/12 ring-1 ring-violet-500/20' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <p className="text-xs font-medium text-zinc-200">{model.name}</p>
                      <span className="text-[10px] text-zinc-500 ml-auto">{model.provider}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5 ml-4">{model.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center — View Mode Tabs */}
          <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
            <button onClick={() => setViewMode('desktop')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'desktop' || viewMode === 'tablet' || viewMode === 'mobile' ? 'bg-violet-500/15 text-violet-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>PREVIEW</button>
            <button onClick={() => { setViewMode('code'); setEditorMode('edit'); }} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'code' ? 'bg-violet-500/15 text-violet-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>CODE</button>
            <button onClick={() => { setViewMode('split'); setEditorMode('edit'); }} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'split' ? 'bg-violet-500/15 text-violet-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>SPLIT</button>
          </div>

          {/* Right — Device frames + Deploy */}
          <div className="flex items-center gap-3">
            {(viewMode === 'desktop' || viewMode === 'tablet' || viewMode === 'mobile') && (
              <div className="flex items-center gap-0.5 bg-zinc-900/50 p-0.5 rounded-lg border border-zinc-800/50">
                <button onClick={() => setViewMode('desktop')} className={`p-1.5 rounded-md transition-all ${viewMode === 'desktop' ? 'bg-violet-500/15 text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`} data-tooltip="Desktop"><Monitor className="w-3.5 h-3.5" /></button>
                <button onClick={() => setViewMode('tablet')} className={`p-1.5 rounded-md transition-all ${viewMode === 'tablet' ? 'bg-violet-500/15 text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`} data-tooltip="Tablet"><Tablet className="w-3.5 h-3.5" /></button>
                <button onClick={() => setViewMode('mobile')} className={`p-1.5 rounded-md transition-all ${viewMode === 'mobile' ? 'bg-violet-500/15 text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`} data-tooltip="Mobile"><Smartphone className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <button onClick={() => setShowBottomPanel(!showBottomPanel)} className={`p-2 rounded-lg transition-all ${showBottomPanel ? 'bg-violet-500/15 text-violet-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'}`} data-tooltip="Console">
              <Terminal className="w-4 h-4" />
            </button>
            <button onClick={() => setShowHosting(!showHosting)} className={`p-2 rounded-lg transition-all ${showHosting ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'}`} data-tooltip="Hosting">
              <Activity className="w-4 h-4" />
            </button>
            <button onClick={() => setShowDeployPanel(true)} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white text-xs font-bold rounded-lg hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-600/15 ring-1 ring-white/10 active:scale-95 flex items-center gap-2">
              <Rocket className="w-3.5 h-3.5" />
              DEPLOY
            </button>
          </div>
        </header>

        {/* Preview / Code Area */}
        <main className="flex-1 relative overflow-hidden bg-[#09090b]">
          {genState.isGenerating && (
            <div className="absolute inset-0 z-40 bg-[#09090b]/80 backdrop-blur-md flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-2 border-zinc-800 border-t-violet-500 rounded-full animate-spin mb-6" />
              <p className="text-sm font-semibold text-zinc-200">{genState.progressMessage}</p>
              <p className="text-xs text-zinc-600 mt-1.5">Refining UI components and logic...</p>
            </div>
          )}
          <div className="h-full">
            <ErrorBoundary section="Editor">
              {editorMode === 'edit' && (viewMode === 'code' || viewMode === 'split') ? (
                <div className="h-full flex">
                  {viewMode === 'split' && (
                    <div className="w-1/2 border-r border-zinc-800/50">
                      <SandpackPreview code={currentApp?.code || ''} language={['react', 'nextjs'].includes(currentLanguage) ? 'react' : 'html'} viewMode="desktop" onViewModeChange={setViewMode} onCodeChange={(newCode) => { if (currentApp) { const updatedApp = { ...currentApp, code: newCode }; setCurrentApp(updatedApp); saveApp(updatedApp, false); } }} />
                    </div>
                  )}
                  <div className={viewMode === 'split' ? 'w-1/2' : 'w-full'}>
                    <CodeEditor filePath={activeFilePath || '/index.html'} darkMode={true} onSave={(content) => { if (activeFilePath) { editorBridge.updateFile(activeFilePath, content); const newCode = editorBridge.toCode(); if (currentApp) { const updatedApp = { ...currentApp, code: newCode }; setCurrentApp(updatedApp); saveApp(updatedApp, false); } } }} onChange={() => {}} />
                  </div>
                </div>
              ) : (
                <SandpackPreview code={currentApp?.code || ''} language={['react', 'nextjs'].includes(currentLanguage) ? 'react' : 'html'} viewMode={viewMode} onViewModeChange={setViewMode} onCodeChange={(newCode) => { if (currentApp) { const updatedApp = { ...currentApp, code: newCode }; setCurrentApp(updatedApp); saveApp(updatedApp, false); } }} />
              )}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* ============================================================ */}
      {/* BOTTOM PANEL — Console, Network, Problems */}
      {/* ============================================================ */}
      {showBottomPanel && (
        <div className="fixed bottom-0 left-[340px] right-0 h-[280px] z-50 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800/50 flex flex-col animate-fade-in-up">
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-zinc-800/40 shrink-0">
            {([
              { id: 'console' as BottomPanelTab, label: 'Console', icon: Terminal },
              { id: 'network' as BottomPanelTab, label: 'Network', icon: Globe },
              { id: 'problems' as BottomPanelTab, label: 'Problems', icon: Wrench },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setBottomPanelTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  bottomPanelTab === tab.id ? 'bg-violet-500/12 text-violet-400' : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                <tab.icon className="w-3 h-3" />
                {tab.label}
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={() => setShowBottomPanel(false)} className="p-1 text-zinc-700 hover:text-zinc-400 rounded transition-colors">
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {bottomPanelTab === 'console' && <ConsolePanel entries={consoleEntries} onClear={() => setConsoleEntries([])} />}
            {bottomPanelTab === 'network' && <NetworkPanel requests={networkRequests} onClear={() => setNetworkRequests([])} />}
            {bottomPanelTab === 'problems' && (
              <div className="p-4 text-xs text-zinc-500 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                No problems detected in workspace
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* AI TOOLS PANEL — Floating overlay */}
      {/* ============================================================ */}
      {showAITools && (
        <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" onClick={() => setShowAITools(false)}>
          <div
            className="absolute top-16 right-6 w-[520px] max-h-[80vh] bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-800/50 shrink-0">
              {([
                { id: 'autofix' as AIToolTab, label: 'Autofix', icon: Wrench },
                { id: 'refactor' as AIToolTab, label: 'Refactor', icon: RefreshCcw },
                { id: 'explain' as AIToolTab, label: 'Explain', icon: BookOpen },
                { id: 'tests' as AIToolTab, label: 'Tests', icon: TestTube2 },
              ]).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setAIToolTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    aiToolTab === tab.id ? 'bg-violet-500/12 text-violet-400' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <ErrorBoundary section="AI Tools" compact>
                {aiToolTab === 'autofix' && <AIAutofix errors={[]} />}
                {aiToolTab === 'refactor' && <AIRefactor code={currentApp?.code} fileName={activeFilePath || undefined} />}
                {aiToolTab === 'explain' && <AIExplain selectedCode={undefined} fileName={activeFilePath || undefined} />}
                {aiToolTab === 'tests' && <AITestWriter targetCode={currentApp?.code} fileName={activeFilePath || undefined} />}
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BILLING PANEL — Floating overlay */}
      {/* ============================================================ */}
      {showBilling && (
        <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" onClick={() => setShowBilling(false)}>
          <div
            className="absolute top-16 left-[360px] w-[420px] max-h-[80vh] bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/60 rounded-2xl shadow-2xl shadow-black/60 overflow-y-auto custom-scrollbar animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <UsageDashboard onUpgrade={() => { setShowBilling(false); setShowPricing(true); }} />
            <div className="border-t border-zinc-800/50">
              <InvoiceHistory />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* HOSTING DASHBOARD — Floating overlay */}
      {/* ============================================================ */}
      {showHosting && (
        <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" onClick={() => setShowHosting(false)}>
          <div
            className="absolute top-16 right-6 w-[480px] max-h-[80vh] bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/60 rounded-2xl shadow-2xl shadow-black/60 overflow-y-auto custom-scrollbar animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <ErrorBoundary section="Hosting" compact>
              <HostingDashboard projectId={currentApp?.id || 'default'} />
              <div className="border-t border-zinc-800/50">
                <DomainManager projectId={currentApp?.id || 'default'} />
              </div>
              <div className="border-t border-zinc-800/50">
                <RollbackPanel projectId={currentApp?.id || 'default'} />
              </div>
            </ErrorBoundary>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {genState.error && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm p-4 bg-zinc-900/95 backdrop-blur-xl border border-red-500/20 rounded-xl shadow-2xl shadow-black/50 flex gap-3 items-start animate-fade-in-up">
          <div className="p-2 bg-red-500/10 text-red-400 rounded-lg shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-zinc-200">Error</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{genState.error}</p>
            <button onClick={() => setGenState({ ...genState, error: null })} className="text-xs font-semibold text-red-400 hover:text-red-300 mt-2 transition-colors">Dismiss</button>
          </div>
        </div>
      )}

      {/* Templates Panel */}
      <TemplatesPanel isOpen={isTemplatesPanelOpen} onClose={() => setIsTemplatesPanelOpen(false)} onUseTemplate={handleUseTemplate} selectedLanguage={selectedLanguage} onLanguageChange={setSelectedLanguage} />

      {showVoiceInput && <VoiceInput onTranscript={(transcript) => { setPrompt(transcript); setShowVoiceInput(false); }} onClose={() => setShowVoiceInput(false)} />}

      {showImageToCode && (
        <ImageToCode
          onGenerate={async (code) => {
            const newApp: GeneratedApp = { id: Date.now().toString(), name: 'From Image', code, prompt: 'Generated from image upload', timestamp: Date.now(), history: [{ role: 'model', text: 'Generated from uploaded image', timestamp: Date.now() }], language: currentLanguage, provider: selectedModel.provider, modelId: selectedModel.id };
            setCurrentApp(newApp);
            saveApp(newApp, true);
            setShowImageToCode(false);
          }}
          onClose={() => setShowImageToCode(false)}
          outputType={['react', 'nextjs'].includes(currentLanguage) ? 'react' : 'html'}
        />
      )}

      {showDeployPanel && (
        <DeployPanel projectName={currentApp?.name || 'Untitled Project'} files={useEditorStore.getState().files} onClose={() => setShowDeployPanel(false)} onDeployComplete={handleDeployComplete} onFixBuildError={handleFixBuildError} />
      )}
    </div>
  );
};

export default App;
