import React, { useState, useEffect, useRef } from 'react';
import {
  GeneratedApp,
  ViewMode,
  GenerationState,
  ChatMessage,
  ModelOption,
} from './types';
import Preview from './components/Preview';
import CodeView from './components/CodeView';
import ChatBox from './components/ChatBox';
import CanvasNavDrawer from './components/CanvasNavDrawer';
import Dashboard from './components/Dashboard';
import { useEditorBridge } from './services/useEditorBridge';
import { ToolRegistry, runTool, getAvailableTools, ToolResult } from './services/toolRegistry';

// AI Models - 7 Providers, 14 Models with friendly names
const MODELS: ModelOption[] = [
  // Maula AI (Mistral backend)
  {
    id: 'mistral-large-2501',
    name: 'Nova',
    provider: 'Maula AI',
    backendProvider: 'mistral',
    description: 'Best for coding - highly recommended.',
    icon: '🌟',
  },
  {
    id: 'mistral-large-2501',
    name: 'Nova Pro',
    provider: 'Maula AI',
    backendProvider: 'mistral',
    description: 'Most powerful reasoning model.',
    isThinking: true,
    icon: '💫',
  },
  {
    id: 'codestral-latest',
    name: 'Maula Large',
    provider: 'Maula AI',
    backendProvider: 'mistral',
    description: 'Advanced multilingual model.',
    icon: '🔮',
  },
  {
    id: 'codestral-latest',
    name: 'Maula Code',
    provider: 'Maula AI',
    backendProvider: 'mistral',
    description: 'Specialized for code generation.',
    icon: '💻',
  },
  // Image Generator (OpenAI backend)
  {
    id: 'gpt-4o',
    name: 'Vision Pro',
    provider: 'Image Generator',
    backendProvider: 'openai',
    description: 'Best for visual tasks and images.',
    icon: '🎨',
  },
  {
    id: 'gpt-4o-mini',
    name: 'Vision Fast',
    provider: 'Image Generator',
    backendProvider: 'openai',
    description: 'Quick image understanding.',
    icon: '⚡',
  },
  // Designer (Gemini backend)
  {
    id: 'gemini-2.0-flash',
    name: 'Design Flash',
    provider: 'Designer',
    backendProvider: 'gemini',
    description: 'Fast multimodal design.',
    icon: '🎯',
  },
  {
    id: 'gemini-2.5-pro-preview',
    name: 'Design Pro',
    provider: 'Designer',
    backendProvider: 'gemini',
    description: 'Advanced design capabilities.',
    isThinking: true,
    icon: '🧠',
  },
  // Planner (Anthropic backend)
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Architect',
    provider: 'Planner',
    backendProvider: 'anthropic',
    description: 'Strategic planning and reasoning.',
    icon: '📐',
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Architect Fast',
    provider: 'Planner',
    backendProvider: 'anthropic',
    description: 'Quick planning assistance.',
    icon: '🚀',
  },
  // Code Builder (Groq backend)
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Turbo Code',
    provider: 'Code Builder',
    backendProvider: 'groq',
    description: 'Ultra-fast code generation.',
    icon: '⚡',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Turbo Instant',
    provider: 'Code Builder',
    backendProvider: 'groq',
    description: 'Lightning fast responses.',
    icon: '💨',
  },
  // Fast Coding (Cerebras backend)
  {
    id: 'llama-3.3-70b',
    name: 'Lightning',
    provider: 'Fast Coding',
    backendProvider: 'cerebras',
    description: 'Fastest inference speed.',
    icon: '⚡',
  },
  {
    id: 'llama3.1-8b',
    name: 'Lightning Lite',
    provider: 'Fast Coding',
    backendProvider: 'cerebras',
    description: 'Quick lightweight coding.',
    icon: '✨',
  },
];

// 8 Preset Templates
const PRESET_TEMPLATES = [
  { name: 'SaaS Landing Page', icon: '🚀', prompt: 'Build a modern SaaS landing page for a CRM tool with features, pricing, and hero.' },
  { name: 'Analytics Dashboard', icon: '📊', prompt: 'Create a dark-themed analytics dashboard with 3 chart placeholders and a sidebar.' },
  { name: 'E-commerce Store', icon: '🛒', prompt: 'Generate an elegant minimal furniture store with a grid of items and cart icon.' },
  { name: 'Portfolio Website', icon: '🎨', prompt: 'Create a minimal portfolio website for a designer with project gallery and contact form.' },
  { name: 'Blog Platform', icon: '📝', prompt: 'Build a clean blog platform with article cards, categories, and reading time.' },
  { name: 'Mobile App UI', icon: '📱', prompt: 'Design a mobile app UI for a fitness tracker with stats, progress, and workout plans.' },
  { name: 'Admin Panel', icon: '⚙️', prompt: 'Create an admin dashboard with user management, analytics, and settings panels.' },
  { name: 'Restaurant Menu', icon: '🍽️', prompt: 'Build a beautiful restaurant menu with categories, items, prices, and order button.' },
];

// 6 Quick Actions
const QUICK_ACTIONS = [
  { id: 'dark-mode', label: 'Dark Mode', icon: '🌙', description: 'Add dark mode toggle to the app' },
  { id: 'responsive', label: 'Responsive', icon: '📱', description: 'Make the layout responsive' },
  { id: 'animations', label: 'Animations', icon: '✨', description: 'Add smooth animations' },
  { id: 'accessibility', label: 'Accessibility', icon: '♿', description: 'Improve accessibility' },
  { id: 'loading', label: 'Loading', icon: '⏳', description: 'Add loading states' },
  { id: 'validation', label: 'Validation', icon: '✅', description: 'Add form validation' },
];

// Device preview sizes
const DEVICE_SIZES = {
  desktop: { width: '100%', height: '100%', label: 'Desktop' },
  tablet: { width: '768px', height: '1024px', label: 'Tablet' },
  mobile: { width: '375px', height: '812px', label: 'Mobile' },
};

type ActivePanel = 'workspace' | 'assistant' | 'dashboard' | 'files' | 'tools' | 'settings' | 'history' | null;
type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type ConversationPhase = 'initial' | 'gathering' | 'confirming' | 'building' | 'editing';

interface ProjectFile {
  path: string;
  content: string;
  language?: string;
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODELS[0]);
  const [selectedProvider, setSelectedProvider] = useState('Anthropic');
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.PREVIEW);
  const [currentApp, setCurrentApp] = useState<GeneratedApp | null>(null);
  const [history, setHistory] = useState<GeneratedApp[]>([]);
  const [activePanel, setActivePanel] = useState<ActivePanel>('assistant');
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isStreaming, setIsStreaming] = useState(true);
  const [conversationPhase, setConversationPhase] = useState<ConversationPhase>('initial');
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [sidebarHighlight, setSidebarHighlight] = useState(false);
  const [showNavDrawer, setShowNavDrawer] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [genState, setGenState] = useState<GenerationState>({
    isGenerating: false,
    error: null,
    progressMessage: '',
  });

  // 🔗 EDITOR BRIDGE - Full editor integration
  const editorBridge = useEditorBridge({
    'main.html': currentApp?.code || ''
  });

  // Expose editorBridge globally for AI agents
  useEffect(() => {
    (window as any).editorBridge = editorBridge;
    console.log('[EditorBridge] Initialized and exposed globally');
    return () => {
      delete (window as any).editorBridge;
    };
  }, [editorBridge]);

  // Sync currentApp.code to editorBridge when it changes
  useEffect(() => {
    if (currentApp?.code) {
      editorBridge.setFile('main.html', currentApp.code);
      editorBridge.setActiveFile('main.html');
    }
  }, [currentApp?.code]);

  // 🔗 Sync editorBridge files to projectFiles state for Files panel
  useEffect(() => {
    const files = editorBridge.files;
    const fileList = editorBridge.fileList;
    
    if (fileList && fileList.length > 0) {
      const projectFilesList: ProjectFile[] = fileList.map((filePath: string) => ({
        path: filePath,
        content: files.get(filePath) || '',
        language: editorBridge.language || 'html'
      }));
      setProjectFiles(projectFilesList);
    }
  }, [editorBridge.fileList, editorBridge.files]);

  // Load dark mode preference
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('canvas_dark_mode');
    if (savedDarkMode) setIsDarkMode(JSON.parse(savedDarkMode));
  }, []);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('canvas_dark_mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Auto-scroll sidebar animation on page load to show users all options
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    // Check if user has seen the animation before
    const hasSeenAnimation = sessionStorage.getItem('sidebar_intro_seen');
    if (hasSeenAnimation) return;

    // Delay start for page to load
    const startDelay = setTimeout(() => {
      setSidebarHighlight(true);
      
      const scrollHeight = sidebar.scrollHeight;
      const clientHeight = sidebar.clientHeight;
      const maxScroll = scrollHeight - clientHeight;

      if (maxScroll > 0) {
        // Smooth scroll down
        let scrollPos = 0;
        const scrollDown = setInterval(() => {
          scrollPos += 3;
          sidebar.scrollTop = scrollPos;
          if (scrollPos >= maxScroll) {
            clearInterval(scrollDown);
            // Pause at bottom
            setTimeout(() => {
              // Smooth scroll back up
              const scrollUp = setInterval(() => {
                scrollPos -= 3;
                sidebar.scrollTop = scrollPos;
                if (scrollPos <= 0) {
                  clearInterval(scrollUp);
                  setSidebarHighlight(false);
                  sessionStorage.setItem('sidebar_intro_seen', 'true');
                }
              }, 15);
            }, 500);
          }
        }, 15);
      } else {
        setSidebarHighlight(false);
      }
    }, 1000);

    return () => clearTimeout(startDelay);
  }, []);

  // Filter models by selected provider
  const filteredModels = MODELS.filter(m => m.provider.toLowerCase() === selectedProvider.toLowerCase() || 
    (selectedProvider === 'Gemini' && m.provider === 'google') ||
    (selectedProvider === 'xAI' && m.provider === 'xai') ||
    (selectedProvider === 'Groq' && m.provider === 'groq'));

  useEffect(() => {
    const saved = localStorage.getItem('gencraft_v4_history');
    if (saved)
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed.slice(0, 20)); // Keep max 20 projects
      } catch (e) {}
  }, []);

  const saveHistory = (newHistory: GeneratedApp[]) => {
    const trimmed = newHistory.slice(0, 20); // Max 20 projects
    setHistory(trimmed);
    localStorage.setItem('gencraft_v4_history', JSON.stringify(trimmed));
  };

  const handleGenerate = async (
    instruction: string,
    isInitial: boolean = false
  ) => {
    if (!instruction.trim() || genState.isGenerating) return;

    setGenState({
      isGenerating: true,
      error: null,
      progressMessage: `Generating with ${selectedModel.name}...`,
      isThinking: selectedModel.isThinking,
    });

    try {
      // Call the backend API instead of direct SDK
      const response = await fetch('/api/canvas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: instruction,
          provider: selectedModel.backendProvider || 'mistral',
          modelId: selectedModel.id,
          isThinking: selectedModel.isThinking || false,
          currentCode: isInitial ? undefined : currentApp?.code,
          history: isInitial ? [] : currentApp?.history,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate application');
      }

      const userMsg: ChatMessage = {
        role: 'user',
        text: instruction,
        timestamp: Date.now(),
      };

      // Handle different action types (agent actions)
      const action = data.action || (isInitial ? 'build' : 'edit');

      switch (action) {
        case 'build_project': {
          // 🔗 Multi-file project creation using EditorBridge
          if (data.files && Array.isArray(data.files)) {
            console.log('[Canvas Agent] Creating multi-file project with', data.files.length, 'files');
            
            // Create all files using editorBridge
            data.files.forEach((file: { path: string; content: string; language?: string }) => {
              editorBridge.createFile(file.path, file.content, file.language);
            });
            
            // Set the main file as active
            const mainFile = data.mainFile || data.files[0]?.path;
            if (mainFile) {
              editorBridge.setActiveFile(mainFile);
              
              // Also update currentApp with main file content for preview
              const mainFileData = data.files.find((f: { path: string }) => f.path === mainFile);
              if (mainFileData) {
                const newApp: GeneratedApp = {
                  id: Date.now().toString(),
                  name: mainFile.split('/').pop() || 'Project',
                  code: mainFileData.content,
                  prompt: instruction,
                  timestamp: Date.now(),
                  history: [{ role: 'model', text: `✨ Created project with ${data.files.length} files!`, timestamp: Date.now() }],
                };
                setCurrentApp(newApp);
                saveHistory([newApp, ...history].slice(0, 10));
              }
            }
            
            setViewMode(ViewMode.CODE);
            setActivePanel('assistant');
          }
          break;
        }

        // 🔧 UNIFIED TOOL REGISTRY - Execute tools via central registry
        case 'tool_calls': {
          if (data.tool_calls && Array.isArray(data.tool_calls)) {
            console.log('[Canvas Agent] Executing tool calls:', data.tool_calls.length);
            
            const results: ToolResult[] = [];
            
            for (const toolCall of data.tool_calls) {
              const { tool, args } = toolCall;
              console.log(`[Tool Registry] Executing: ${tool}`, args);
              
              // Execute via unified Tool Registry
              const result = runTool(tool, args || []);
              results.push(result);
              
              // Log result
              if (result.success) {
                console.log(`[Tool Registry] ${tool} succeeded:`, result.message || result.data);
              } else {
                console.warn(`[Tool Registry] ${tool} failed:`, result.error);
              }
            }
            
            // Summarize results
            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;
            
            // Update conversation with result
            const resultMsg: ChatMessage = {
              role: 'model',
              text: failCount === 0 
                ? data.message || `✅ Executed ${successCount} tool${successCount > 1 ? 's' : ''} successfully`
                : data.message || `⚠️ ${successCount} succeeded, ${failCount} failed`,
              timestamp: Date.now(),
            };
            if (currentApp) {
              setCurrentApp({
                ...currentApp,
                history: [...currentApp.history, resultMsg],
              });
            }
            
            // If any file was created/modified, switch to code view
            const fileTools = ['writeFile', 'createFile', 'updateFile'];
            if (data.tool_calls.some((tc: any) => fileTools.includes(tc.tool))) {
              setViewMode(ViewMode.CODE);
            }
          }
          break;
        }

        // 🔧 SINGLE TOOL CALL - For simpler cases
        case 'run_tool': {
          if (data.tool) {
            console.log(`[Canvas Agent] Running single tool: ${data.tool}`);
            const result = runTool(data.tool, data.args || []);
            
            const resultMsg: ChatMessage = {
              role: 'model',
              text: result.success 
                ? (data.message || result.message || `✅ ${data.tool} completed`)
                : `⚠️ ${data.tool} failed: ${result.error}`,
              timestamp: Date.now(),
            };
            if (currentApp) {
              setCurrentApp({
                ...currentApp,
                history: [...currentApp.history, resultMsg],
              });
            }
          }
          break;
        }

        case 'build':
        default: {
          const code = data.code;
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
            };
            setCurrentApp(newApp);
            saveHistory([newApp, ...history].slice(0, 10));
          } else if (currentApp) {
            const updatedApp = {
              ...currentApp,
              code,
              history: [...currentApp.history, userMsg, modelMsg],
            };
            setCurrentApp(updatedApp);
            saveHistory(
              history.map((a) => (a.id === updatedApp.id ? updatedApp : a))
            );
          }
          setViewMode(ViewMode.PREVIEW);
          break;
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

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  // Camera functions - selfie style with front/back camera
  const startCamera = async (facing: 'user' | 'environment' = facingMode) => {
    try {
      // Stop any existing stream first
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facing },
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setShowCameraModal(true);
        setFacingMode(facing);
      }
    } catch (err) {
      console.error('Camera error:', err);
      alert('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setShowCameraModal(false);
    setCapturedImage(null);
  };

  const switchCamera = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    startCamera(newFacing);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirror the image for front camera (selfie mode)
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/png');
        setCapturedImage(imageData);
      }
    }
  };

  // Navigation drawer handler
  const handleNavigate = (action: string) => {
    setShowNavDrawer(false);
    
    switch(action) {
      case 'workspace':
        setActivePanel('workspace');
        break;
      case 'assistant':
        setActivePanel('assistant');
        break;
      case 'dashboard':
        setActivePanel('dashboard');
        break;
      case 'files':
        setActivePanel('files');
        break;
      case 'tools':
        setActivePanel('tools');
        break;
      case 'settings':
        setActivePanel('settings');
        break;
      case 'templates':
        setShowTemplatesModal(true);
        break;
      case 'main-app':
        window.location.href = '/';
        break;
      default:
        break;
    }
  };

  const savePhoto = () => {
    if (capturedImage) {
      const link = document.createElement('a');
      link.download = `photo_${Date.now()}.png`;
      link.href = capturedImage;
      link.click();
    }
  };

  // Screenshot - uses browser's screen capture API
  const captureScreenshot = async () => {
    try {
      // This opens the native browser dialog with Chrome Tab/Window/Entire Screen options
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor' // Suggests full screen but user can choose
        },
        audio: false
      });
      
      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      
      // Wait a moment for video to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture to canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/png');
        
        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
        
        // Download the screenshot
        const link = document.createElement('a');
        link.download = `screenshot_${Date.now()}.png`;
        link.href = imageData;
        link.click();
      }
    } catch (err) {
      console.error('Screenshot error:', err);
      // User cancelled or permission denied
    }
  };

  // Text-to-Speech using OpenAI TTS API
  const [ttsAudio, setTtsAudio] = useState<HTMLAudioElement | null>(null);
  
  const speakText = async (text: string) => {
    // Cancel any ongoing speech
    if (ttsAudio) {
      ttsAudio.pause();
      ttsAudio.currentTime = 0;
      setTtsAudio(null);
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://maula.onelastai.co';
      const response = await fetch(`${API_URL}/api/speech/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text, voice: 'nova', speed: 1.0 })
      });
      
      if (!response.ok) {
        // Fallback to browser TTS
        console.warn('[TTS] API failed, using browser fallback');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        return;
      }
      
      const data = await response.json();
      const audio = new Audio(data.audio);
      setTtsAudio(audio);
      
      audio.onended = () => {
        setIsSpeaking(false);
        setTtsAudio(null);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setTtsAudio(null);
      };
      
      audio.play();
    } catch (error) {
      console.error('[TTS] Error:', error);
      setIsSpeaking(false);
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const toggleSpeaker = () => {
    if (isSpeaking) {
      if (ttsAudio) {
        ttsAudio.pause();
        ttsAudio.currentTime = 0;
        setTtsAudio(null);
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      // Speak the last agent message
      const lastAgentMessage = currentApp?.history.filter(m => m.role === 'model').pop();
      if (lastAgentMessage) {
        speakText(lastAgentMessage.text);
      } else {
        speakText('No agent response to read yet.');
      }
    }
  };

  const openInNewTab = () => {
    if (currentApp?.code) {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(currentApp.code);
        newWindow.document.close();
      }
    }
  };

  const deleteProject = () => {
    if (currentApp && confirm('Delete this project?')) {
      setHistory(history.filter(h => h.id !== currentApp.id));
      setCurrentApp(null);
    }
  };

  const copyCode = () => {
    if (currentApp?.code) {
      navigator.clipboard.writeText(currentApp.code);
      alert('Code copied!');
    }
  };

  // 🚀 Deploy app to get shareable URL
  const deployApp = async () => {
    if (!currentApp?.code) {
      alert('No app to deploy. Generate something first!');
      return;
    }

    setIsDeploying(true);
    setShowDeployModal(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://maula.onelastai.co';
      
      const response = await fetch(`${API_URL}/api/hosting/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: currentApp.code,
          name: currentApp.name || 'Untitled App',
          description: currentApp.prompt,
          language: 'html',
          isPublic: true,
          originalPrompt: currentApp.prompt,
          aiModel: selectedModel.id,
          aiProvider: selectedProvider
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to deploy');
      }

      const data = await response.json();
      
      if (data.success && data.app?.url) {
        setDeployedUrl(data.app.url);
      } else {
        throw new Error(data.error || 'Deployment failed');
      }
    } catch (error) {
      console.error('Deploy error:', error);
      alert('Failed to deploy: ' + (error as Error).message);
      setShowDeployModal(false);
    } finally {
      setIsDeploying(false);
    }
  };

  // Copy deployed URL to clipboard
  const copyDeployedUrl = () => {
    if (deployedUrl) {
      navigator.clipboard.writeText(deployedUrl);
      alert('URL copied to clipboard!');
    }
  };

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-[#0a0a0a] text-gray-300 matrix-bg' : 'bg-gray-100 text-gray-800'}`}>
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* 1. Left Vertical Nav Bar - Neural Style */}
        <nav className={`w-16 ${isDarkMode ? 'bg-[#111]/95 border-gray-800/50' : 'bg-white border-gray-200'} backdrop-blur-md flex flex-col items-center shrink-0 z-[60] border-r relative`}>
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setShowNavDrawer(true)}
            className={`w-full py-2 flex justify-center items-center border-b ${isDarkMode ? 'border-gray-800/50 hover:bg-cyan-500/10' : 'border-gray-200 hover:bg-cyan-500/5'} transition-all duration-300 group`}
          >
            <div className="relative">
              <svg className={`w-5 h-5 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} group-hover:text-cyan-300 transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-cyan-400/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
          
          {/* Logo */}
          <div className={`py-3 border-b ${isDarkMode ? 'border-gray-800/50' : 'border-gray-200'} w-full flex justify-center`}>
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-900/30">
              <img 
                src="/logo.png" 
                alt="OneLast.AI" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Scrollable Icon Area */}
          <div 
            ref={sidebarRef}
            className={`flex-1 overflow-y-auto overflow-x-hidden py-2 w-full custom-scrollbar transition-all duration-500 ${sidebarHighlight ? 'bg-gradient-to-b from-cyan-500/10 via-transparent to-cyan-500/10 shadow-[inset_0_0_20px_rgba(34,211,238,0.15)]' : ''}`} 
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="flex flex-col items-center gap-1 px-2">
              {/* Home */}
              <button onClick={() => window.location.href = '/'} className={`p-2.5 rounded-lg ${isDarkMode ? 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10' : 'text-gray-400 hover:text-cyan-600 hover:bg-cyan-50'} transition-all w-full flex justify-center border border-transparent ${isDarkMode ? 'hover:border-cyan-500/20' : 'hover:border-cyan-200'}`} title="Home">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>

              {/* AI Assistant - Chat (moved up) */}
              <button onClick={() => togglePanel('assistant')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'assistant' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="AI Assistant">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>

              {/* Workspace */}
              <button onClick={() => togglePanel('workspace')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'workspace' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="Workspace">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>

              {/* Files */}
              <button onClick={() => togglePanel('files')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'files' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="Files">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>

              {/* Dashboard */}
              <button onClick={() => togglePanel('dashboard')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'dashboard' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="Dashboard">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>

              {/* History */}
              <button onClick={() => togglePanel('history')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'history' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="History">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Tools */}
              <button onClick={() => togglePanel('tools')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'tools' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="Tools">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              <div className="w-8 border-t border-gray-800/50 my-2"></div>

              {/* Preview Mode */}
              <button onClick={() => setViewMode(ViewMode.PREVIEW)} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${viewMode === ViewMode.PREVIEW ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(74,222,128,0.2)]' : 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'}`} title="Preview">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>

              {/* Code Mode */}
              <button onClick={() => setViewMode(ViewMode.CODE)} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${viewMode === ViewMode.CODE ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(74,222,128,0.2)]' : 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'}`} title="Code">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </button>

              {/* Split Mode */}
              <button onClick={() => setViewMode(ViewMode.SPLIT)} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${viewMode === ViewMode.SPLIT ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(74,222,128,0.2)]' : 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'}`} title="Split View">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </button>

              <div className="w-8 border-t border-gray-800/50 my-2"></div>

              {/* Desktop Preview */}
              <button onClick={() => setDeviceMode('desktop')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${deviceMode === 'desktop' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 border-transparent hover:border-purple-500/20'}`} title="Desktop Preview">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Tablet Preview */}
              <button onClick={() => setDeviceMode('tablet')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${deviceMode === 'tablet' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 border-transparent hover:border-purple-500/20'}`} title="Tablet Preview">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Mobile Preview */}
              <button onClick={() => setDeviceMode('mobile')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${deviceMode === 'mobile' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 border-transparent hover:border-purple-500/20'}`} title="Mobile Preview">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Camera */}
              <button onClick={() => isCameraActive ? stopCamera() : startCamera()} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${isCameraActive ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="Camera (Selfie)">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Speaker - Listen to Agent */}
              <button onClick={toggleSpeaker} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${isSpeaking ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse' : 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'}`} title="Listen to Agent">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>

              {/* Screenshot - Screen Capture */}
              <button onClick={captureScreenshot} className="p-2.5 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all w-full flex justify-center border border-transparent hover:border-cyan-500/20" title="Screenshot (Screen Capture)">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Share */}
              <button onClick={copyCode} className="p-2.5 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all w-full flex justify-center border border-transparent hover:border-cyan-500/20" title="Share">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>

            {/* 🚀 DEPLOY - One Click Deploy */}
            <button 
              onClick={deployApp} 
              disabled={!currentApp?.code || isDeploying}
              className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${
                isDeploying 
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 animate-pulse' 
                  : currentApp?.code 
                    ? 'text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 border-transparent hover:border-orange-500/30 hover:shadow-[0_0_10px_rgba(249,115,22,0.3)]' 
                    : 'text-gray-600 cursor-not-allowed border-transparent'
              }`} 
              title="Deploy & Get Shareable Link"
            >
              {isDeploying ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
            </button>

            {/* Open in New Tab */}
            <button onClick={openInNewTab} className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all w-full flex justify-center" title="Open in New Tab">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>

            {/* Delete */}
            <button onClick={deleteProject} className="p-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full flex justify-center" title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            {/* Templates */}
            <button onClick={() => setShowTemplatesModal(true)} className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all w-full flex justify-center" title="Templates">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </button>

            {/* Dark/Light Mode */}
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all w-full flex justify-center" title={isDarkMode ? 'Light Mode' : 'Dark Mode'}>
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Scroll indicator - shows during highlight animation */}
          {sidebarHighlight && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          )}
        </div>

        {/* Fixed Status at Bottom */}
        <div className={`py-3 border-t ${isDarkMode ? 'border-gray-800/50' : 'border-gray-200'} w-full flex justify-center`}>
          <div className={`w-2 h-2 rounded-full ${genState.isGenerating ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'} shadow-sm shadow-emerald-500/50`}></div>
        </div>
      </nav>

      {/* 2. Main Content Area - Neural Style */}
      <div className={`flex-1 flex flex-col relative overflow-hidden ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
        {/* Workspace Content (Preview/Code) - Full Height */}
        <main className="flex-1 relative flex">
          <div className={`flex-1 relative overflow-hidden ${isDarkMode ? 'bg-black/20 border-gray-800/50' : 'bg-gray-100 border-gray-200'} m-2 rounded-lg border shadow-[0_0_40px_rgba(0,0,0,0.3)]`}>
            {genState.isGenerating && (
              <div className={`absolute inset-0 z-40 ${isDarkMode ? 'bg-black/80' : 'bg-white/80'} backdrop-blur-md flex flex-col items-center justify-center animate-fade-in`}>
                <div className="w-16 h-16 border-4 border-cyan-900 border-t-cyan-400 rounded-full animate-spin mb-6 shadow-xl shadow-cyan-500/20"></div>
                <div className="text-center">
                  <p className="text-lg font-bold text-cyan-400 tracking-tight glow-cyan">
                    {genState.progressMessage}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mt-1 uppercase tracking-widest`}>
                    Synthesizing components...
                  </p>
                </div>
              </div>
            )}
            {/* Device Frame Preview */}
            <div className="h-full flex items-center justify-center p-4">
              <div 
                className={`${isDarkMode ? 'bg-[#0d0d0d] border-gray-800/50' : 'bg-white border-gray-200'} rounded-lg shadow-2xl overflow-hidden transition-all duration-300 border ${deviceMode === 'desktop' ? 'w-full h-full' : ''}`}
                style={deviceMode !== 'desktop' ? { width: DEVICE_SIZES[deviceMode].width, height: DEVICE_SIZES[deviceMode].height } : {}}
              >
                {viewMode === ViewMode.PREVIEW ? (
                  <Preview code={currentApp?.code || ''} />
                ) : viewMode === ViewMode.CODE ? (
                  <CodeView code={currentApp?.code || ''} />
                ) : (
                  <div className="flex h-full">
                    <div className={`w-1/2 border-r ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}><Preview code={currentApp?.code || ''} /></div>
                    <div className="w-1/2"><CodeView code={currentApp?.code || ''} /></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Right Toggleable Panels (Drawer-style) - Neural Style */}
          <div
            className={`h-full ${isDarkMode ? 'bg-[#111]/95 border-gray-800/50' : 'bg-white border-gray-200'} backdrop-blur-md border-l transition-all duration-300 ease-in-out flex shrink-0 shadow-2xl ${
              activePanel ? 'w-80' : 'w-0 border-l-0 opacity-0'
            }`}
          >
            <div className="w-80 h-full max-h-full flex flex-col overflow-hidden">
              {activePanel === 'workspace' && (
                <div className={`h-full flex flex-col ${isDarkMode ? 'bg-[#111]/95' : 'bg-white'}`}>
                  {/* Fixed Header */}
                  <div className={`px-6 py-4 flex items-center justify-between`}>
                    <h3 className={`text-xs font-bold ${isDarkMode ? 'text-cyan-500/80' : 'text-cyan-600'} uppercase tracking-widest`}>
                      Workspace
                    </h3>
                    <button
                      onClick={() => setActivePanel(null)}
                      className={`${isDarkMode ? 'text-gray-600 hover:text-cyan-400' : 'text-gray-400 hover:text-cyan-600'} transition-colors`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-scroll px-6 pb-6" style={{ maxHeight: 'calc(100vh - 60px)' }}>
                  <div className="mb-6">
                    <label className={`block text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase mb-2 tracking-widest`}>
                      New App Concept
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ex: Landing page for a SaaS..."
                      className={`w-full p-4 text-xs border ${isDarkMode ? 'border-gray-800 bg-black/50 text-gray-200 placeholder:text-gray-700' : 'border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-400'} rounded-lg focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none min-h-[120px] resize-none transition-all`}
                    />
                    <button
                      onClick={() => handleGenerate(prompt, true)}
                      disabled={genState.isGenerating || !prompt.trim()}
                      className="w-full mt-3 py-3 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white text-xs font-bold rounded-lg hover:from-cyan-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/30 uppercase tracking-widest"
                    >
                      {genState.isGenerating ? 'SYNTHESIZING...' : 'START BUILDING'}
                    </button>
                  </div>

                  {/* Quick Actions */}
                  <div className="mb-6">
                    <h3 className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-3`}>
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {QUICK_ACTIONS.slice(0, 6).map((action) => (
                        <button
                          key={action.id}
                          onClick={() => {
                            const actionPrompts: Record<string, string> = {
                              'dark-mode': 'Add a dark mode toggle to this app with smooth transitions',
                              'responsive': 'Make this layout fully responsive for mobile, tablet and desktop',
                              'animations': 'Add smooth CSS animations and transitions throughout the app',
                              'accessibility': 'Improve accessibility with ARIA labels, focus states, and keyboard navigation',
                              'loading': 'Add loading states and skeleton screens to improve UX',
                              'validation': 'Add form validation with error messages and success states'
                            };
                            if (currentApp) {
                              handleGenerate(actionPrompts[action.id] || action.description, false);
                            } else {
                              setPrompt(actionPrompts[action.id] || action.description);
                            }
                          }}
                          className={`flex flex-col items-center gap-1 p-3 ${isDarkMode ? 'bg-black/30 hover:bg-cyan-500/10 border-gray-800 hover:border-cyan-500/30' : 'bg-white hover:bg-cyan-50 border-gray-200 hover:border-cyan-300'} border rounded-lg transition-all`}
                          title={action.description}
                        >
                          <span className="text-lg">{action.icon}</span>
                          <span className={`text-[9px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{action.label.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Starter Templates */}
                  <div className="mb-6">
                    <h3 className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-3`}>
                      Starter Templates
                    </h3>
                    <div className="space-y-2">
                      {PRESET_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.name}
                          onClick={() => setPrompt(tpl.prompt)}
                          className={`w-full text-left px-4 py-3 text-xs ${isDarkMode ? 'text-gray-400 bg-black/30 border-gray-800 hover:bg-cyan-500/10 hover:border-cyan-500/30' : 'text-gray-600 bg-white border-gray-200 hover:bg-cyan-50 hover:border-cyan-300'} border rounded-lg transition-all flex items-center gap-3 group`}
                        >
                          <span className="text-xl">{tpl.icon}</span>
                          <span className={`${isDarkMode ? 'group-hover:text-cyan-400' : 'group-hover:text-cyan-600'} transition-colors`}>{tpl.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  </div>
                </div>
              )}

              {activePanel === 'assistant' && (
                <div className="h-full flex flex-col bg-[#111]/95">
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <ChatBox
                      messages={currentApp?.history || []}
                      onSendMessage={(text) => handleGenerate(text, false)}
                      isGenerating={genState.isGenerating}
                      onClose={() => setActivePanel(null)}
                      onNewChat={() => {
                        if (currentApp) {
                          setHistory(prev => prev.map(app => 
                            app.id === currentApp.id ? { ...app, history: [] } : app
                          ));
                        }
                      }}
                      models={MODELS}
                      selectedModel={selectedModel.id}
                      onModelChange={(modelId) => {
                        const model = MODELS.find(m => m.id === modelId);
                        if (model) setSelectedModel(model);
                      }}
                    />
                  </div>
                </div>
              )}

              {activePanel === 'dashboard' && (
                <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
                  <Dashboard 
                    isDarkMode={isDarkMode} 
                    onClose={() => setActivePanel(null)} 
                  />
                </div>
              )}

              {/* Files Panel */}
              {activePanel === 'files' && (
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#111]/95">
                  {/* Fixed Header */}
                  <div className="p-6 pb-4 border-b border-gray-800/50 flex items-center justify-between shrink-0">
                    <h3 className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest">
                      Files ({projectFiles.length})
                    </h3>
                    <button onClick={() => setActivePanel(null)} className="text-gray-600 hover:text-cyan-400 transition-colors" title="Close">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {/* Project Files */}
                    <div className="mb-4">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Project Files</h4>
                      <div className="space-y-1">
                        {projectFiles.length === 0 ? (
                          <div className="text-xs text-gray-600 italic py-2">No project files yet</div>
                        ) : (
                          projectFiles.map((file) => {
                            const ext = file.path.split('.').pop()?.toLowerCase() || '';
                            const iconColor = ext === 'html' ? 'text-orange-500' : 
                                              ext === 'js' || ext === 'jsx' ? 'text-yellow-500' : 
                                              ext === 'ts' || ext === 'tsx' ? 'text-blue-400' : 
                                              ext === 'css' ? 'text-pink-400' : 
                                              ext === 'json' ? 'text-green-400' : 'text-gray-400';
                            return (
                              <div 
                                key={file.path}
                                className="px-4 py-2 bg-black/30 border border-gray-800 hover:border-cyan-500/30 rounded-lg transition-all cursor-pointer group"
                                onClick={() => {
                                  editorBridge.setActiveFile(file.path);
                                  setViewMode(ViewMode.CODE);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-xs font-bold text-gray-400 group-hover:text-cyan-400 transition-colors truncate">{file.path}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Template Files */}
                    <div className="mb-4">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Templates</h4>
                      <div className="space-y-1">
                        {PRESET_TEMPLATES.slice(0, 4).map((tpl) => (
                          <div 
                            key={tpl.name}
                            className="px-4 py-2 bg-black/30 border border-gray-800 hover:border-cyan-500/30 rounded-lg transition-all cursor-pointer group"
                            onClick={() => {
                              setPrompt(tpl.prompt);
                              handleGenerate(tpl.prompt, true);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{tpl.icon}</span>
                              <span className="text-xs font-bold text-gray-400 group-hover:text-cyan-400 transition-colors">{tpl.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        const newPath = prompt('Enter new file name (e.g., component.tsx):');
                        if (newPath) {
                          editorBridge.createFile(newPath, '');
                          editorBridge.setActiveFile(newPath);
                          setViewMode(ViewMode.CODE);
                        }
                      }}
                      className="w-full py-2 text-xs font-bold bg-black/30 text-gray-500 hover:bg-cyan-500/10 hover:text-cyan-400 border border-gray-800 hover:border-cyan-500/30 rounded-lg transition-all uppercase tracking-widest"
                    >
                      + Add File
                    </button>
                  </div>
                </div>
              )}

              {/* Tools Panel */}
              {activePanel === 'tools' && (
                <div className="h-full flex flex-col bg-[#111]/95">
                  {/* Fixed Header */}
                  <div className="px-6 py-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-cyan-500/80 uppercase tracking-widest">
                      Tools & Actions
                    </h3>
                    <button onClick={() => setActivePanel(null)} className="text-gray-600 hover:text-cyan-400 transition-colors" title="Close">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-scroll px-6 pb-6 space-y-6" style={{ maxHeight: 'calc(100vh - 60px)' }}>
                    {/* Quick Enhancements */}
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                        Quick Enhancements
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {QUICK_ACTIONS.map((action) => (
                          <button 
                            key={action.id} 
                            onClick={() => {
                              const actionPrompts: Record<string, string> = {
                                'dark-mode': 'Add a dark mode toggle to this app with smooth transitions',
                                'responsive': 'Make this layout fully responsive for mobile, tablet and desktop',
                                'animations': 'Add smooth CSS animations and transitions throughout the app',
                                'accessibility': 'Improve accessibility with ARIA labels, focus states, and keyboard navigation',
                                'loading': 'Add loading states and skeleton screens to improve UX',
                                'validation': 'Add form validation with error messages and success states'
                              };
                              if (currentApp) {
                                handleGenerate(actionPrompts[action.id] || action.description, false);
                              } else {
                                setPrompt(actionPrompts[action.id] || action.description);
                                setActivePanel('workspace');
                              }
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-black/30 hover:bg-cyan-500/10 border border-gray-800 hover:border-cyan-500/30 rounded-lg transition-all text-left group"
                          >
                            <span className="text-sm">{action.icon}</span>
                            <span className="text-[10px] font-medium text-gray-500 group-hover:text-cyan-400 truncate transition-colors">{action.label}...</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Provider & Model */}
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                        Provider & Model
                      </h4>
                      
                      {/* Selected Model Card */}
                      <div className="p-4 rounded-lg mb-3 bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-yellow-400">⚡</span>
                          <span className="text-sm font-bold text-cyan-400">{selectedModel.name}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mb-2">{selectedModel.description}</p>
                        <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded bg-cyan-600 text-white uppercase tracking-widest">
                          {selectedProvider}
                        </span>
                      </div>

                      {/* Provider Tabs */}
                      <div className="flex gap-1 mb-3 flex-wrap">
                        {['Anthropic', 'OpenAI', 'Gemini', 'xAI', 'Groq'].map((provider) => (
                          <button
                            key={provider}
                            onClick={() => setSelectedProvider(provider)}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider ${
                              selectedProvider === provider
                                ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                                : 'bg-black/30 text-gray-500 hover:bg-cyan-500/10 hover:text-cyan-400 border border-gray-800 hover:border-cyan-500/30'
                            }`}
                          >
                            {provider}
                          </button>
                        ))}
                      </div>

                      {/* Models List */}
                      <div className="space-y-2">
                        {filteredModels.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setSelectedModel(m)}
                            className={`w-full text-left p-3 rounded-lg transition-all ${
                              selectedModel.id === m.id
                                ? 'bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]'
                                : 'bg-black/30 hover:bg-cyan-500/10 border border-gray-800 hover:border-cyan-500/30'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-yellow-400">⚡</span>
                              <div>
                                <p className="text-xs font-bold text-gray-300">
                                  {m.name}
                                  {m.isThinking && (
                                    <span className="ml-1 text-[9px] bg-cyan-500/20 text-cyan-400 px-1 rounded uppercase tracking-wider">THINKING</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-gray-500">{m.description}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Settings Section */}
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                        Settings
                      </h4>
                      
                      {/* Real-time Streaming */}
                      <div className="p-3 bg-black/30 border border-gray-800 rounded-lg">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-600'}`}></span>
                            <span className="text-xs font-medium text-gray-400">Real-time Streaming</span>
                          </div>
                          <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${isStreaming ? 'bg-cyan-600 text-white shadow-[0_0_8px_rgba(34,211,238,0.3)]' : 'bg-gray-700'}`} onClick={() => setIsStreaming(!isStreaming)}>
                            {isStreaming && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings Panel - Now just for additional settings */}
              {activePanel === 'settings' && (
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#111]/95">
                  {/* Fixed Header */}
                  <div className="p-6 border-b border-gray-800/50 flex items-center justify-between shrink-0">
                    <h3 className="text-sm font-bold text-cyan-500/80 uppercase tracking-widest">
                      Settings
                    </h3>
                    <button onClick={() => setActivePanel(null)} className="text-gray-600 hover:text-cyan-400 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                    {/* Neural Mode Toggle */}
                    <div className="p-4 bg-black/30 border border-gray-800 rounded-lg">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">Neural Mode</p>
                          <p className="text-[10px] text-gray-500">Cyberpunk interface active</p>
                        </div>
                        <div className="w-10 h-5 rounded-full transition-colors bg-cyan-600 shadow-[0_0_10px_rgba(34,211,238,0.3)]" onClick={() => setIsDarkMode(!isDarkMode)}>
                          <div className="w-4 h-4 rounded-full bg-white mt-0.5 transition-transform translate-x-5"></div>
                        </div>
                      </label>
                    </div>
                    {/* Auto-sync */}
                    <div className="p-4 bg-black/30 border border-gray-800 rounded-lg">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">Auto-sync</p>
                          <p className="text-[10px] text-gray-500">Automatically save changes</p>
                        </div>
                        <div className="w-10 h-5 rounded-full bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-colors">
                          <div className="w-4 h-4 rounded-full bg-white mt-0.5 translate-x-5"></div>
                        </div>
                      </label>
                    </div>
                    {/* Export Options */}
                    <div className="p-4 bg-black/30 border border-gray-800 rounded-lg">
                      <p className="text-xs font-bold text-gray-300 mb-3 uppercase tracking-wider">Export Options</p>
                      <div className="space-y-2">
                        <button className="w-full py-2 text-xs font-bold bg-black/40 hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400 border border-gray-800 hover:border-cyan-500/30 rounded-lg transition-all uppercase tracking-wider">
                          Download as ZIP
                        </button>
                        <button className="w-full py-2 text-xs font-bold bg-black/40 hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400 border border-gray-800 hover:border-cyan-500/30 rounded-lg transition-all uppercase tracking-wider">
                          Export to CodeSandbox
                        </button>
                        <button className="w-full py-2 text-xs font-bold bg-black/40 hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400 border border-gray-800 hover:border-cyan-500/30 rounded-lg transition-all uppercase tracking-wider">
                          Push to GitHub
                        </button>
                      </div>
                    </div>
                    {/* API Keys */}
                    <div className="p-4 bg-black/30 border border-gray-800 rounded-lg">
                      <p className="text-xs font-bold text-gray-300 mb-3 uppercase tracking-wider">API Configuration</p>
                      <button className="w-full py-2 text-xs font-bold bg-gradient-to-r from-cyan-600 to-emerald-600 text-white rounded-lg hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all uppercase tracking-wider">
                        Manage API Keys
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* History Panel */}
              {activePanel === 'history' && (
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#111]/95">
                  {/* Fixed Header */}
                  <div className="p-6 border-b border-gray-800/50 flex items-center justify-between shrink-0">
                    <h3 className="text-sm font-bold text-cyan-500/80 uppercase tracking-widest">
                      Project History
                    </h3>
                    <button onClick={() => setActivePanel(null)} className="text-gray-600 hover:text-cyan-400 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                    {history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center text-cyan-400 mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">No Projects Yet</p>
                        <p className="text-[10px] text-gray-600">Generate your first app to see it here</p>
                      </div>
                    ) : (
                      history.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => {
                            setCurrentApp(app);
                            setActivePanel('workspace');
                          }}
                          className={`w-full text-left p-4 rounded-lg transition-all border ${
                            currentApp?.id === app.id
                              ? 'bg-cyan-500/20 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
                              : 'bg-black/30 border-gray-800 hover:border-cyan-500/30 hover:bg-cyan-500/5'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${currentApp?.id === app.id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-500'}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${currentApp?.id === app.id ? 'text-cyan-400' : 'text-gray-300'}`}>
                                {app.name}
                              </p>
                              <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">
                                {app.prompt}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[9px] text-gray-600 flex items-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {new Date(app.timestamp).toLocaleDateString()}
                                </span>
                                <span className="text-[9px] text-gray-600 flex items-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  {app.history?.length || 0} edits
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                    
                    {history.length > 0 && (
                      <button 
                        onClick={() => {
                          if (confirm('Clear all project history?')) {
                            setHistory([]);
                            localStorage.removeItem('gencraft_v4_history');
                          }
                        }}
                        className="w-full mt-4 py-2 text-[10px] font-bold text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 rounded-lg transition-all uppercase tracking-widest"
                      >
                        Clear History
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>

      {genState.error && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm p-4 bg-[#111] border border-red-500/30 rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.2)] flex gap-4 items-start animate-slide-up">
          <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider">
              System Error
            </h4>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              {genState.error}
            </p>
            <div className="mt-3 flex gap-4">
              <button
                onClick={() => setGenState({ ...genState, error: null })}
                className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowTemplatesModal(false)}></div>
          <div className="relative w-full max-w-2xl max-h-[80vh] bg-[#111] border border-gray-800 rounded-lg shadow-[0_0_30px_rgba(34,211,238,0.1)] overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-cyan-400 uppercase tracking-widest">All Templates</h2>
              <button onClick={() => setShowTemplatesModal(false)} className="text-gray-500 hover:text-cyan-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                {PRESET_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.name}
                    onClick={() => {
                      setPrompt(tpl.prompt);
                      setShowTemplatesModal(false);
                    }}
                    className="text-left p-4 bg-black/40 hover:bg-cyan-500/10 border border-gray-800 hover:border-cyan-500/30 rounded-lg transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{tpl.icon}</span>
                      <span className="text-sm font-bold text-gray-300 group-hover:text-cyan-400 transition-colors">{tpl.name}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 line-clamp-2">{tpl.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal - Selfie Style */}
      {showCameraModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black">
          {/* Camera View */}
          <div className="relative w-full h-full flex flex-col">
            {/* Top Controls */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
              <button 
                onClick={stopCamera}
                className="p-3 bg-black/50 backdrop-blur-sm rounded-full text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 border border-gray-800 hover:border-cyan-500/30 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 text-xs font-bold bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full border border-cyan-500/30 uppercase tracking-wider">
                  {facingMode === 'user' ? 'Front Camera' : 'Back Camera'}
                </span>
              </div>
              <button 
                onClick={switchCamera}
                className="p-3 bg-black/50 backdrop-blur-sm rounded-full text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 border border-gray-800 hover:border-cyan-500/30 transition-all"
                title="Switch Camera"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Video Preview */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              {capturedImage ? (
                <img 
                  src={capturedImage} 
                  alt="Captured" 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`max-w-full max-h-full object-contain ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
              )}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6">
              {capturedImage ? (
                <>
                  {/* Retake Button */}
                  <button 
                    onClick={() => setCapturedImage(null)}
                    className="px-6 py-3 bg-black/50 backdrop-blur-sm rounded-full text-cyan-400 font-bold hover:bg-cyan-500/20 border border-gray-800 hover:border-cyan-500/30 transition-all uppercase tracking-wider"
                  >
                    Retake
                  </button>
                  {/* Save Button */}
                  <button 
                    onClick={savePhoto}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-emerald-600 rounded-full text-white font-bold hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all uppercase tracking-wider"
                  >
                    Save Photo
                  </button>
                </>
              ) : (
                /* Capture Button */
                <button 
                  onClick={takePhoto}
                  className="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_30px_rgba(34,211,238,0.4)]"
                >
                  <div className="w-16 h-16 bg-black rounded-full border-4 border-cyan-400"></div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 🚀 Deploy Success Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-cyan-500/10">
            {isDeploying ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Deploying Your App...</h3>
                <p className="text-gray-500 text-sm">Creating shareable URL</p>
              </div>
            ) : deployedUrl ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">🎉 Deployed Successfully!</h3>
                <p className="text-gray-500 text-sm mb-6">Your app is now live at:</p>
                
                {/* URL Display */}
                <div className="bg-black/50 border border-gray-700 rounded-lg p-3 mb-4">
                  <a 
                    href={deployedUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 text-sm break-all font-mono"
                  >
                    {deployedUrl}
                  </a>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button 
                    onClick={copyDeployedUrl}
                    className="flex-1 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy URL
                  </button>
                  <a 
                    href={deployedUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open
                  </a>
                </div>

                {/* Close Button */}
                <button 
                  onClick={() => { setShowDeployModal(false); setDeployedUrl(null); }}
                  className="w-full mt-4 py-2 text-gray-500 hover:text-gray-400 text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Navigation Drawer */}
      <CanvasNavDrawer 
        isOpen={showNavDrawer} 
        onClose={() => setShowNavDrawer(false)} 
        onNavigate={handleNavigate}
        isDarkMode={isDarkMode}
      />

      {/* Neural Link Footer */}
      <footer className={`fixed bottom-0 left-0 right-0 h-8 ${isDarkMode ? 'bg-[#0a0a0a]/95 border-gray-800/50' : 'bg-white/95 border-gray-200'} backdrop-blur-sm border-t flex items-center justify-between px-4 z-50`}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></div>
          <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase tracking-widest`}>Canvas_Protocol_v2.0</span>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-[10px] ${isDarkMode ? 'text-gray-700' : 'text-gray-400'} uppercase tracking-widest`}>Neural_Sync_Active</span>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse"></div>
            <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
