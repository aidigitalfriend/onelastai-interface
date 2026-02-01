import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStore } from '../store/useStore';
import { ChatMessage } from '../types';
import { voiceInput, voiceOutput, speechSupport } from '../services/speech';
import { aiAgentExtension, FileOperation } from '../services/aiAgentExtension';
import { extensionEvents } from '../services/extensions';
import { filesApiService } from '../services/filesApi';
import { socketService } from '../services/socket';
import { StreamingParser, StreamingFileOperation, StreamingCommand } from '../services/streamingParser';
import { webContainerService } from '../services/webcontainer';
import AIAgentExtensionSettings from './AIAgentExtensionSettings';

// Icons
const HistoryIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Message action icons
const RefreshIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ThumbsUpIcon = ({ filled }: { filled?: boolean }) => (
  <svg className="w-3.5 h-3.5" fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
  </svg>
);

const ThumbsDownIcon = ({ filled }: { filled?: boolean }) => (
  <svg className="w-3.5 h-3.5" fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

interface AgenticAIChatProps {
  voiceEnabled?: boolean;
  onFileOperation?: (operation: FileOperation) => void;
  onTerminalCommand?: (command: string) => void;
}

export const AgenticAIChat: React.FC<AgenticAIChatProps> = ({ 
  voiceEnabled: externalVoiceEnabled = false,
  onFileOperation,
  onTerminalCommand,
}) => {
  const { 
    chatHistory, 
    addMessage, 
    clearChat, 
    isAiLoading,
    setAiLoading,
    openFiles,
    activeFileId,
    theme,
    createFile,
    createFolder,
    deleteNode,
    renameNode,
    files,
    openFile,
    updateFileContent,
    currentProject,
    createProject,
    setCurrentProject,
    // Chat sessions
    chatSessions,
    activeChatSessionId,
    createChatSession,
    deleteChatSession,
    switchChatSession,
    renameChatSession,
  } = useStore();
  
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [currentStreamingFile, setCurrentStreamingFile] = useState<StreamingFileOperation | null>(null);
  const [createdFilesCount, setCreatedFilesCount] = useState(0);
  const [createdFiles, setCreatedFiles] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{name: string, content: string, type: string, isImage?: boolean}>>([]);
  const [webContainerStatus, setWebContainerStatus] = useState<'idle' | 'booting' | 'installing' | 'running' | 'error'>('idle');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('orchestrator');
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [agentStatus, setAgentStatus] = useState<{status: string; agent: string; message?: string} | null>(null);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'up' | 'down' | null>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showExtensionSettings, setShowExtensionSettings] = useState(false);
  const [aiAgentStatus, setAiAgentStatus] = useState(aiAgentExtension.getStatus());
  const [extensionConfig, setExtensionConfig] = useState(aiAgentExtension.getConfig());
  
  // Handle file operation from AI
  const handleFileOperation = useCallback((operation: FileOperation) => {
    console.log('[AI] File operation:', operation);
    
    if (onFileOperation) {
      onFileOperation(operation);
    } else {
      // Default handler - create/edit files in store
      if (operation.type === 'create' || operation.type === 'edit') {
        const pathParts = operation.path.split('/');
        const fileName = pathParts.pop() || operation.path;
        const parentPath = pathParts.length > 0 ? pathParts.join('/') : '';
        
        // Create parent folders if they don't exist
        if (parentPath) {
          const folderParts = parentPath.split('/');
          let currentPath = '';
          for (const folder of folderParts) {
            const folderPath = currentPath ? `${currentPath}/${folder}` : folder;
            // Check if folder exists in files
            const folderExists = files.some(f => f.path === folderPath && f.type === 'folder');
            if (!folderExists) {
              createFolder(currentPath, folder);
            }
            currentPath = folderPath;
          }
        }
        
        // Determine language from extension
        const ext = fileName.split('.').pop() || '';
        const languageMap: Record<string, string> = {
          'ts': 'typescript',
          'tsx': 'typescript',
          'js': 'javascript',
          'jsx': 'javascript',
          'py': 'python',
          'html': 'html',
          'css': 'css',
          'json': 'json',
          'md': 'markdown',
          'yml': 'yaml',
          'yaml': 'yaml',
          'sh': 'bash',
          'env': 'plaintext',
        };
        const language = languageMap[ext] || 'plaintext';
        
        // Create the file
        createFile(parentPath, fileName, operation.content);
        
        // Auto-open the file in editor
        const fileId = crypto.randomUUID();
        openFile({
          id: fileId,
          name: fileName,
          path: operation.path,
          content: operation.content || '',
          language,
          isDirty: false,
        });
        
        console.log(`[AI] Created/Updated file: ${operation.path}`);
      } else if (operation.type === 'delete') {
        // Handle delete operation using store
        deleteNode(operation.path);
        console.log(`[AI] Deleted file/folder: ${operation.path}`);
      } else if (operation.type === 'rename') {
        // Handle rename operation using store
        if (operation.newName) {
          renameNode(operation.path, operation.newName);
          console.log(`[AI] Renamed ${operation.path} to ${operation.newName}`);
        } else {
          console.warn('[AI] Rename operation missing newName');
        }
      }
    }
  }, [onFileOperation, createFile, createFolder, deleteNode, renameNode, openFile, files]);

  // Listen for extension events
  useEffect(() => {
    const unsubscribeStatus = aiAgentExtension.onStatusChange(setAiAgentStatus);
    const unsubscribeConfig = aiAgentExtension.onConfigChange(setExtensionConfig);
    
    // Listen for open settings command from extension
    const handleOpenSettings = () => setShowExtensionSettings(true);
    extensionEvents.on('aiAgent:openSettings', handleOpenSettings);
    
    return () => {
      unsubscribeStatus();
      unsubscribeConfig();
      extensionEvents.off('aiAgent:openSettings', handleOpenSettings);
    };
  }, []);
  
  // Available agents
  const AGENTS = [
    { id: 'orchestrator', name: 'Orchestrator', icon: '🎯', description: 'Auto-delegates to best agent' },
    { id: 'code-generation', name: 'Code Gen', icon: '💻', description: 'Creates new code' },
    { id: 'refactor', name: 'Refactor', icon: '🔧', description: 'Improves code' },
    { id: 'debug', name: 'Debug', icon: '🐛', description: 'Finds bugs' },
    { id: 'test', name: 'Test', icon: '🧪', description: 'Writes tests' },
    { id: 'build', name: 'Build', icon: '📦', description: 'Build config' },
    { id: 'deploy', name: 'Deploy', icon: '🚀', description: 'Deployment' },
    { id: 'filesystem', name: 'Files', icon: '📁', description: 'File ops' },
    { id: 'ui', name: 'UI', icon: '🎨', description: 'UI components' },
    { id: 'documentation', name: 'Docs', icon: '📝', description: 'Documentation' },
  ];
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const parserRef = useRef<StreamingParser | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFile = openFiles.find(f => f.id === activeFileId);
  
  // Theme classes - VS Code style
  // Check if it's a dark theme (dark, charcoal-aurora, or any theme that starts with theme- which are all dark)
  const isDark = theme === 'dark' || theme === 'charcoal-aurora' || theme.startsWith('theme-') || ['dracula', 'nord', 'monokai', 'one-dark', 'github-dark', 'solarized-dark', 'steel'].includes(theme);
  const bgClass = isDark ? 'bg-vscode-sidebar' : 'bg-white';
  const borderClass = isDark ? 'border-vscode-border' : 'border-gray-200';
  const textClass = isDark ? 'text-vscode-text' : 'text-gray-800';
  const mutedTextClass = isDark ? 'text-vscode-textMuted' : 'text-gray-500';
  const inputBgClass = isDark ? 'bg-vscode-input border-vscode-border' : 'bg-white border-gray-300';

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, streamingContent]);

  // Connect to socket on mount
  useEffect(() => {
    const connect = async () => {
      setConnectionStatus('connecting');
      try {
        await socketService.connect();
        setConnectionStatus('connected');
      } catch (err) {
        console.error('Socket connection failed:', err);
        setConnectionStatus('disconnected');
      }
    };
    
    connect();
  }, []);

  // Helper to get language from file extension
  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      'ts': 'typescript', 'tsx': 'typescript', 'js': 'javascript', 'jsx': 'javascript',
      'py': 'python', 'html': 'html', 'css': 'css', 'json': 'json', 'md': 'markdown',
    };
    return map[ext] || 'plaintext';
  };

  // Track created file paths to avoid duplicates
  const createdFilePaths = useRef<Set<string>>(new Set());
  const MAX_FILES_PER_SESSION = 25; // Limit files to prevent runaway creation

  // Create file immediately when streaming starts
  const handleFileStart = useCallback((file: StreamingFileOperation) => {
    // Check if we've hit the file limit
    if (createdFilePaths.current.size >= MAX_FILES_PER_SESSION) {
      console.warn('[AI] ⚠️ File limit reached, skipping:', file.path);
      return;
    }
    
    // Check if file was already created in this session
    if (createdFilePaths.current.has(file.path)) {
      console.log('[AI] ⏭️ File already created, skipping:', file.path);
      return;
    }
    
    console.log('[AI] 📄 File started:', file.path);
    createdFilePaths.current.add(file.path);
    setCurrentStreamingFile(file);
    
    // Create folders if needed
    const pathParts = file.path.split('/');
    const fileName = pathParts.pop() || file.path;
    const parentPath = pathParts.join('/');
    
    if (parentPath) {
      let currentPath = '';
      for (const folder of pathParts) {
        const folderPath = currentPath ? `${currentPath}/${folder}` : folder;
        createFolder(currentPath, folder);
        currentPath = folderPath;
      }
    }
    
    // Create the file immediately with empty/partial content
    createFile(parentPath, fileName, file.content || '// Loading...');
    
    // Open the file in editor
    const fileId = crypto.randomUUID();
    openFile({
      id: fileId,
      name: fileName,
      path: file.path,
      content: file.content || '// Loading...',
      language: getLanguage(file.path),
      isDirty: true,
    });
  }, [createFile, createFolder, openFile]);

  // Update file content as it streams
  const handleFileProgress = useCallback((file: StreamingFileOperation) => {
    // Skip if file wasn't started (limit reached)
    if (!createdFilePaths.current.has(file.path)) return;
    
    // Update the file content in real-time
    if (file.content) {
      updateFileContent(file.path, file.content);
    }
  }, [updateFileContent]);

  // Finalize file when complete
  const handleFileComplete = useCallback(async (file: StreamingFileOperation) => {
    // Skip if file wasn't started (limit reached)
    if (!createdFilePaths.current.has(file.path)) {
      console.log('[AI] ⏭️ Skipping completion for non-started file:', file.path);
      return;
    }
    
    console.log('[AI] ✅ File completed:', file.path);
    setCurrentStreamingFile(null);
    setCreatedFilesCount(prev => prev + 1);
    
    // Final update with complete content
    if (file.content) {
      updateFileContent(file.path, file.content);
    }

    // Sync file to backend server if we have a project
    if (currentProject?.id) {
      try {
        const pathParts = file.path.split('/').filter(p => p);
        const fileName = pathParts.pop() || file.path;
        
        await filesApiService.createFile({
          projectId: currentProject.id,
          path: file.path.startsWith('/') ? file.path : '/' + file.path,
          name: fileName,
          content: file.content || '',
          type: 'FILE',
        });
        console.log('[AI] 📁 File synced to backend:', file.path);
      } catch (error) {
        console.error('[AI] Failed to sync file to backend:', error);
        // Don't throw - local file is still created
      }
    }
    
    // Also call the external handler if provided
    if (onFileOperation) {
      onFileOperation({
        type: file.type as 'create' | 'edit' | 'delete',
        path: file.path,
        content: file.content,
      });
    }
  }, [updateFileContent, onFileOperation, currentProject]);

  // Handle terminal command from AI
  const handleTerminalCommand = useCallback((command: string) => {
    console.log('[AI] Terminal command:', command);
    if (onTerminalCommand) {
      onTerminalCommand(command);
    }
  }, [onTerminalCommand]);

  // Handle WebContainer commands from AI
  const handleCommand = useCallback(async (command: StreamingCommand) => {
    console.log('[AI] 🔧 Command:', command);
    
    try {
      switch (command.type) {
        case 'install':
          setWebContainerStatus('installing');
          // First mount all files to WebContainer
          if (files.length > 0) {
            await webContainerService.writeFiles(files);
          }
          // Then run npm install
          const installResult = await webContainerService.runCommand('npm', ['install']);
          if (installResult.exitCode === 0) {
            console.log('[AI] ✅ Dependencies installed');
          }
          break;
          
        case 'start':
          setWebContainerStatus('running');
          // Mount files first
          if (files.length > 0) {
            await webContainerService.writeFiles(files);
          }
          // Start dev server
          const serverResult = await webContainerService.startDevServer('npm', ['start']);
          if (serverResult.url) {
            setServerUrl(serverResult.url);
            console.log('[AI] 🚀 Server started at:', serverResult.url);
          }
          break;
          
        case 'rebuild':
          setWebContainerStatus('installing');
          await webContainerService.writeFiles(files);
          await webContainerService.runCommand('npm', ['run', 'build']);
          break;
          
        case 'terminal':
          if (command.command) {
            const parts = command.command.split(' ');
            await webContainerService.runCommand(parts[0], parts.slice(1));
          }
          break;
      }
    } catch (error) {
      console.error('[AI] Command error:', error);
      setWebContainerStatus('error');
    }
  }, [files]);

  // Voice input handler
  const handleVoiceInput = async () => {
    if (!speechSupport.recognition) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      voiceInput.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    voiceInput.start({
      onResult: (result) => {
        setInput(prev => result.isFinal ? result.transcript : prev);
      },
      onError: (error) => {
        console.error('Voice input error:', error);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      },
    }, { continuous: true, interimResults: true });
  };

  // File upload handler
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newUploadedFiles: Array<{name: string, content: string, type: string, isImage?: boolean}> = [];

    for (const file of Array.from(files)) {
      try {
        const isImage = file.type.startsWith('image/');
        if (isImage) {
          // Read images as base64 data URL
          const content = await readFileAsBase64(file);
          newUploadedFiles.push({
            name: file.name,
            content,
            type: file.type,
            isImage: true,
          });
        } else {
          // Read text files as text
          const content = await readFileAsText(file);
          newUploadedFiles.push({
            name: file.name,
            content,
            type: file.type || 'text/plain',
            isImage: false,
          });
        }
      } catch (error) {
        console.error(`Failed to read file ${file.name}:`, error);
      }
    }

    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
    
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Speak response
  const handleSpeak = (text: string) => {
    if (!externalVoiceEnabled || !speechSupport.synthesis) return;
    
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`[^`]+`/g, '')
      .slice(0, 500);
    
    voiceOutput.speak(cleanText, {
      rate: 1,
      pitch: 1,
      onEnd: () => {},
      onError: () => {},
    });
  };

  // Send message with REAL-TIME streaming
  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || isAiLoading || isStreaming) return;

    // Reset file tracking for new message
    createdFilePaths.current.clear();

    // Separate images from text files
    const imageFiles = uploadedFiles.filter(f => f.isImage);
    const textFiles = uploadedFiles.filter(f => !f.isImage);

    // Build display message for chat history
    let displayMessage = input;
    if (textFiles.length > 0) {
      const fileContents = textFiles.map(file => 
        `\n\n📎 **Attached file: ${file.name}**\n\`\`\`\n${file.content}\n\`\`\``
      ).join('');
      displayMessage = (input || 'Here are some files:') + fileContents;
    }
    if (imageFiles.length > 0) {
      displayMessage = (displayMessage || 'Analyze this image:') + `\n\n🖼️ **${imageFiles.length} image(s) attached**`;
    }
    
    // Add agent tag if not orchestrator
    const agentLabel = selectedAgent !== 'orchestrator' 
      ? `\n\n🤖 *Using: ${AGENTS.find(a => a.id === selectedAgent)?.name || selectedAgent} agent*`
      : '';

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: displayMessage + agentLabel,
      timestamp: Date.now(),
      attachments: imageFiles.map(f => ({
        type: 'image' as const,
        name: f.name,
        content: f.content,
        mimeType: f.type,
      })),
    };

    addMessage(userMessage);
    setInput('');
    const currentUploadedFiles = [...uploadedFiles]; // Save before clearing
    setUploadedFiles([]); // Clear uploaded files after sending
    setAiLoading(true);
    setIsStreaming(true);
    setStreamingContent('');
    setCreatedFilesCount(0);
    setAgentStatus(selectedAgent !== 'orchestrator' ? { status: 'working', agent: selectedAgent } : null);

    // Initialize streaming parser with real-time callbacks
    parserRef.current = new StreamingParser({
      onFileStart: handleFileStart,
      onFileProgress: handleFileProgress,
      onFileComplete: handleFileComplete,
      onCommand: handleCommand,
    });

    try {
      // Prepare text content
      let textContent = input;
      
      // Add text file contents
      if (textFiles.length > 0) {
        const fileContents = textFiles.map(file => 
          `\n\n📎 **Attached file: ${file.name}**\n\`\`\`\n${file.content}\n\`\`\``
        ).join('');
        textContent = (input || 'Here are some files:') + fileContents;
      }

      // Add current file context
      if (activeFile) {
        textContent += `\n\n[Current file: ${activeFile.name}]\n\`\`\`${activeFile.language}\n${activeFile.content}\n\`\`\``;
      }
      
      // Add context about existing files
      if (files.length > 0) {
        const projectContext = files.map(f => {
          if (f.type === 'file' && f.content) {
            const truncatedContent = f.content.length > 1500 
              ? f.content.substring(0, 1500) + '\n... (truncated)'
              : f.content;
            return `[File: ${f.path}]\n\`\`\`\n${truncatedContent}\n\`\`\``;
          }
          return f.type === 'folder' ? `[Folder: ${f.path}]` : `[File: ${f.path}]`;
        }).join('\n\n');
        textContent += `\n\n--- PROJECT FILES ---\n${projectContext}\n--- END ---`;
      }

      // Build messages for AI - with image support
      const messagesForAI = chatHistory.map(m => {
        // Check if message has image attachments
        if (m.attachments?.some(a => a.type === 'image')) {
          return {
            role: m.role as 'user' | 'assistant',
            content: m.content,
            images: m.attachments.filter(a => a.type === 'image').map(a => a.content),
          };
        }
        return {
          role: m.role as 'user' | 'assistant',
          content: m.content,
        };
      });

      // Add current message with images
      if (imageFiles.length > 0) {
        messagesForAI.push({
          role: 'user' as const,
          content: textContent || 'Analyze this image and help me build what you see:',
          images: imageFiles.map(f => f.content),
        });
      } else {
        messagesForAI.push({
          role: 'user' as const,
          content: textContent,
        });
      }

      // Check if AI Agent extension is configured
      if (!aiAgentExtension.isConfigured()) {
        setIsStreaming(false);
        setAiLoading(false);
        setShowExtensionSettings(true);
        return;
      }

      // Try WebSocket streaming first with timeout, then fallback to REST API
      let useRestFallback = false;
      
      if (socketService.isConnected()) {
        try {
          await Promise.race([
            new Promise<void>((resolve, reject) => {
              let hasResponse = false;
              
              aiAgentExtension.streamChat(
                messagesForAI,
                {
                  onToken: (token) => {
                    hasResponse = true;
                    // Process token through streaming parser
                    const displayContent = parserRef.current?.processToken(token) || '';
                    setStreamingContent(displayContent);
                  },
                  onComplete: (response) => {
                    setStreamingContent('');
                    setIsStreaming(false);
                    setAgentStatus(null);
                    
                    const assistantMessage: ChatMessage = {
                      id: crypto.randomUUID(),
                      role: 'assistant',
                      content: response,
                      timestamp: Date.now(),
                    };
                    addMessage(assistantMessage);
                    
                    // Reset parser
                    parserRef.current?.reset();
                    
                    if (externalVoiceEnabled && speechSupport.synthesis) {
                      handleSpeak(response);
                    }
                    
                    resolve();
                  },
                  onError: (error) => {
                    reject(error);
                  },
                  onFileOperation: (op) => {
                    // Backup handler for any missed operations
                    console.log('[AI] Backup file operation:', op);
                  },
                  onTerminalCommand: handleTerminalCommand,
                },
              );
            }),
            new Promise<void>((_, reject) => 
              setTimeout(() => reject(new Error('WebSocket timeout')), 10000)
            ),
          ]);
        } catch (wsError) {
          console.log('[AI] WebSocket failed, falling back to REST:', wsError);
          useRestFallback = true;
        }
      } else {
        useRestFallback = true;
      }
      
      if (useRestFallback) {
        // Fallback to REST API via extension
        await new Promise<void>((resolve, reject) => {
          aiAgentExtension.streamChat(
            messagesForAI,
            {
              onToken: (token) => {
                const displayContent = parserRef.current?.processToken(token) || '';
                setStreamingContent(displayContent);
              },
              onComplete: (response) => {
                setStreamingContent('');
                setIsStreaming(false);
                setAgentStatus(null);
                
                // Process operations from parsed response
                const operations = aiAgentExtension.parseOperations(response);
                operations.forEach(op => {
                  handleFileStart({ type: op.type as any, path: op.path, content: op.content, isComplete: true });
                  handleFileComplete({ type: op.type as any, path: op.path, content: op.content, isComplete: true });
                });
                
                const commands = aiAgentExtension.parseTerminalCommands(response);
                commands.forEach(handleTerminalCommand);
                
                const assistantMessage: ChatMessage = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: response,
                  timestamp: Date.now(),
                };
                addMessage(assistantMessage);
                
                parserRef.current?.reset();
                resolve();
              },
              onError: (error) => {
                reject(error);
              },
              onFileOperation: (op) => {
                handleFileStart({ type: op.type as any, path: op.path, content: op.content, isComplete: true });
                handleFileComplete({ type: op.type as any, path: op.path, content: op.content, isComplete: true });
              },
              onTerminalCommand: handleTerminalCommand,
            }
          );
        });
      }
      
    } catch (error) {
      console.error('AI error:', error);
      setStreamingContent('');
      
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: Date.now(),
      };
      addMessage(errorMessage);
    } finally {
      setAiLoading(false);
      setIsStreaming(false);
      setCurrentStreamingFile(null);
      setAgentStatus(null);
      parserRef.current?.reset();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: '✨ Generate', prompt: 'Generate code for: ' },
    { label: '🏗️ Build App', prompt: 'Build a complete app: ' },
    { label: '🔧 Fix Error', prompt: 'Fix this error: ' },
    { label: '📝 Explain', prompt: 'Explain this code: ' },
  ];

  // Render markdown content
  const renderContent = (content: string) => {
    // Clean file operation tags for display
    const cleanContent = content
      .replace(/<dyad-write[^>]*>[\s\S]*?<\/dyad-write>/gi, '\n✅ FILE_CREATED\n')
      .replace(/<file_create[^>]*>[\s\S]*?<\/file_create>/gi, '\n✅ FILE_CREATED\n')
      .replace(/<dyad-search-replace[^>]*>[\s\S]*?<\/dyad-search-replace>/gi, '\n✅ FILE_UPDATED\n')
      .replace(/<file_edit[^>]*>[\s\S]*?<\/file_edit>/gi, '\n✅ FILE_UPDATED\n')
      .replace(/<dyad-delete[^>]*>[\s\S]*?<\/dyad-delete>/gi, '\n🗑️ FILE_DELETED\n')
      .replace(/<file_delete[^>]*\/?>/gi, '\n🗑️ FILE_DELETED\n');
    
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            
            if (isInline) {
              return (
                <code className={`${isDark ? 'bg-vscode-input text-vscode-accent' : 'bg-gray-100 text-gray-800'} px-1.5 py-0.5 text-sm font-mono rounded`}>
                  {children}
                </code>
              );
            }
            
            return (
              <div className={`relative mt-2 overflow-hidden rounded border ${isDark ? 'bg-vscode-bg border-vscode-border' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`flex items-center justify-between px-3 py-1.5 ${isDark ? 'bg-vscode-sidebar text-vscode-textMuted' : 'bg-gray-100 text-gray-600'} text-xs font-medium`}>
                  <span>{match[1]}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(String(children))}
                    className={`hover:text-vscode-accent transition-colors`}
                  >
                    Copy
                  </button>
                </div>
                <pre className="p-3 overflow-x-auto text-sm">
                  <code className={`${className} ${isDark ? 'text-vscode-text' : 'text-gray-800'}`}>{children}</code>
                </pre>
              </div>
            );
          },
          p({ children }) {
            return <p className="mb-2 leading-relaxed">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-none mb-2 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-none mb-2 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="before:content-['▸'] before:mr-2 before:text-vscode-accent">{children}</li>;
          },
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    );
  };

  return (
    <div className={`flex flex-col h-full ${bgClass} font-mono`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'border-vscode-border bg-vscode-sidebar' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center gap-2">
          <span className="text-vscode-accent">⚡</span>
          <span className={`font-semibold text-sm ${textClass}`}>AI CHAT</span>
          {/* Provider Badge */}
          <span 
            className={`text-xs px-1.5 py-0.5 rounded ${
              aiAgentExtension.isConfigured()
                ? 'bg-green-500/20 text-green-400'
                : 'bg-yellow-500/20 text-yellow-400 cursor-pointer'
            }`}
            onClick={() => !aiAgentExtension.isConfigured() && setShowExtensionSettings(true)}
            title={aiAgentExtension.isConfigured() 
              ? `${extensionConfig.provider} - ${extensionConfig.model}` 
              : 'Click to configure AI provider'
            }
          >
            {aiAgentExtension.isConfigured() 
              ? extensionConfig.provider 
              : '⚠️ Not Configured'
            }
          </span>
          {activeChatSessionId && chatSessions.find(s => s.id === activeChatSessionId) && (
            <span className={`text-xs ${mutedTextClass} max-w-32 truncate`}>
              - {chatSessions.find(s => s.id === activeChatSessionId)?.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Chat History Button */}
          <button
            onClick={() => setShowChatHistory(!showChatHistory)}
            className={`p-1.5 rounded transition-colors ${
              showChatHistory 
                ? 'bg-vscode-accent text-white' 
                : isDark ? 'text-vscode-textMuted hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            }`}
            title="Chat History"
          >
            <HistoryIcon />
          </button>
          
          {/* New Chat Button */}
          <button
            onClick={() => {
              createChatSession();
            }}
            className={`p-1.5 rounded transition-colors ${
              isDark ? 'text-vscode-textMuted hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            }`}
            title="New Chat"
          >
            <PlusIcon />
          </button>
          
          {/* Delete Current Chat Button */}
          {activeChatSessionId && (
            <button
              onClick={() => {
                if (activeChatSessionId && confirm('Delete this chat?')) {
                  deleteChatSession(activeChatSessionId);
                }
              }}
              className={`p-1.5 rounded transition-colors ${
                isDark ? 'text-vscode-textMuted hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
              }`}
              title="Delete Chat"
            >
              <TrashIcon />
            </button>
          )}
          
          {/* Clear Chat Button (when no session) */}
          {!activeChatSessionId && chatHistory.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear this chat?')) {
                  clearChat();
                }
              }}
              className={`p-1.5 rounded transition-colors ${
                isDark ? 'text-vscode-textMuted hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
              }`}
              title="Clear Chat"
            >
              <TrashIcon />
            </button>
          )}
          
          {/* AI Extension Settings Button */}
          <button
            onClick={() => setShowExtensionSettings(true)}
            className={`p-1.5 rounded transition-colors ${
              isDark ? 'text-vscode-textMuted hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            }`}
            title={`AI Settings (${extensionConfig.provider} - ${extensionConfig.model})`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat History Sidebar */}
      {showChatHistory && (
        <div className={`border-b ${isDark ? 'border-vscode-border bg-vscode-bg' : 'border-gray-200 bg-white'} max-h-64 overflow-y-auto`}>
          <div className={`px-3 py-2 text-xs font-semibold ${mutedTextClass} sticky top-0 ${isDark ? 'bg-vscode-bg' : 'bg-white'} border-b ${isDark ? 'border-vscode-border' : 'border-gray-100'}`}>
            CHAT HISTORY ({chatSessions.length})
          </div>
          
          {chatSessions.length === 0 ? (
            <div className={`px-3 py-4 text-center text-sm ${mutedTextClass}`}>
              No chat history yet
            </div>
          ) : (
            <div className="py-1">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                    session.id === activeChatSessionId
                      ? isDark ? 'bg-vscode-accent/20 border-l-2 border-vscode-accent' : 'bg-blue-50 border-l-2 border-blue-500'
                      : isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (editingSessionId !== session.id) {
                      switchChatSession(session.id);
                      setShowChatHistory(false);
                    }
                  }}
                >
                  <ChatIcon />
                  <div className="flex-1 min-w-0">
                    {editingSessionId === session.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => {
                          if (editingName.trim()) {
                            renameChatSession(session.id, editingName.trim());
                          }
                          setEditingSessionId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (editingName.trim()) {
                              renameChatSession(session.id, editingName.trim());
                            }
                            setEditingSessionId(null);
                          } else if (e.key === 'Escape') {
                            setEditingSessionId(null);
                          }
                        }}
                        className={`w-full px-1 py-0.5 text-sm rounded ${isDark ? 'bg-vscode-input border-vscode-border text-white' : 'bg-white border-gray-300'} border outline-none focus:border-vscode-accent`}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <div className={`text-sm truncate ${textClass}`}>{session.name}</div>
                        <div className={`text-xs ${mutedTextClass}`}>
                          {session.messages.length} messages • {new Date(session.updatedAt).toLocaleDateString()}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSessionId(session.id);
                        setEditingName(session.name);
                      }}
                      className={`p-1 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}
                      title="Rename"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this chat?')) {
                          deleteChatSession(session.id);
                        }
                      }}
                      className={`p-1 rounded ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* New Chat at Bottom */}
          <div className={`px-3 py-2 border-t ${isDark ? 'border-vscode-border' : 'border-gray-100'}`}>
            <button
              onClick={() => {
                createChatSession();
                setShowChatHistory(false);
              }}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                isDark 
                  ? 'bg-vscode-accent/20 text-vscode-accent hover:bg-vscode-accent/30' 
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              <PlusIcon />
              New Chat
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 && !isStreaming && (
          <div className="text-center py-12 border border-dashed border-vscode-border rounded-lg">
            <div className="text-5xl mb-4 text-vscode-accent">⚡</div>
            <h3 className={`text-xl font-semibold ${textClass} mb-2`}>Ready to Build</h3>
            <p className={`${mutedTextClass} text-sm`}>I create apps, write code, and build projects</p>
            
            <div className="flex flex-wrap justify-center gap-1.5 mt-4">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => setInput(action.prompt)}
                  className={`px-2.5 py-1 text-xs font-medium transition-all rounded ${
                    isDark 
                      ? 'text-vscode-textMuted hover:text-white hover:bg-white/5' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {chatHistory.map((msg, msgIndex) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-vscode-accent text-white shadow-lg px-4 py-3 rounded-lg'
                : ''
            }`}>
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
              ) : (
                <div className={`px-4 py-3 rounded-lg ${isDark ? 'bg-vscode-sidebar border border-vscode-border text-vscode-text' : 'bg-white border border-gray-200 text-gray-800 shadow-sm'}`}>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {renderContent(msg.content)}
                  </div>
                  
                  {/* Message Action Icons */}
                  <div className={`flex items-center gap-1 mt-3 pt-2 border-t ${isDark ? 'border-vscode-border' : 'border-gray-100'}`}>
                    {/* Regenerate */}
                    <button
                      onClick={() => {
                        // Find the user message before this one and regenerate
                        const userMsgIndex = chatHistory.slice(0, msgIndex).reverse().findIndex(m => m.role === 'user');
                        if (userMsgIndex !== -1) {
                          const actualIndex = msgIndex - 1 - userMsgIndex;
                          const userMsg = chatHistory[actualIndex];
                          if (userMsg) {
                            setInput(userMsg.content);
                          }
                        }
                      }}
                      className={`p-1.5 rounded transition-colors ${isDark ? 'text-vscode-textMuted hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                      title="Regenerate response"
                    >
                      <RefreshIcon />
                    </button>
                    
                    {/* Copy */}
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(msg.content);
                          setCopiedMessageId(msg.id);
                          setTimeout(() => setCopiedMessageId(null), 2000);
                        } catch (err) {
                          console.error('Failed to copy:', err);
                        }
                      }}
                      className={`p-1.5 rounded transition-colors ${copiedMessageId === msg.id ? 'text-green-500' : isDark ? 'text-vscode-textMuted hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                      title={copiedMessageId === msg.id ? 'Copied!' : 'Copy response'}
                    >
                      {copiedMessageId === msg.id ? <CheckIcon /> : <CopyIcon />}
                    </button>
                    
                    {/* Thumbs Up */}
                    <button
                      onClick={() => {
                        setMessageFeedback(prev => ({
                          ...prev,
                          [msg.id]: prev[msg.id] === 'up' ? null : 'up'
                        }));
                      }}
                      className={`p-1.5 rounded transition-colors ${messageFeedback[msg.id] === 'up' ? 'text-green-500' : isDark ? 'text-vscode-textMuted hover:text-green-400 hover:bg-white/10' : 'text-gray-400 hover:text-green-500 hover:bg-gray-100'}`}
                      title="Good response"
                    >
                      <ThumbsUpIcon filled={messageFeedback[msg.id] === 'up'} />
                    </button>
                    
                    {/* Thumbs Down */}
                    <button
                      onClick={() => {
                        setMessageFeedback(prev => ({
                          ...prev,
                          [msg.id]: prev[msg.id] === 'down' ? null : 'down'
                        }));
                      }}
                      className={`p-1.5 rounded transition-colors ${messageFeedback[msg.id] === 'down' ? 'text-red-500' : isDark ? 'text-vscode-textMuted hover:text-red-400 hover:bg-white/10' : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'}`}
                      title="Bad response"
                    >
                      <ThumbsDownIcon filled={messageFeedback[msg.id] === 'down'} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Streaming content */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className={`max-w-[85%] px-4 py-3 rounded-lg border ${
              isDark ? 'bg-vscode-sidebar border-vscode-accent text-vscode-text' : 'bg-white border-blue-300 text-gray-800'
            }`}>
              {/* Active agent indicator */}
              {agentStatus && (
                <div className={`flex items-center gap-2 mb-3 p-2 rounded border ${
                  isDark ? 'bg-vscode-bg border-green-500/50' : 'bg-green-50 border-green-300'
                }`}>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium">
                    {AGENTS.find(a => a.id === agentStatus.agent)?.icon || '◉'} 
                    <span className="ml-1">{AGENTS.find(a => a.id === agentStatus.agent)?.name || 'Agent'}</span>
                    <span className="ml-2 opacity-70">{agentStatus.message || 'Working...'}</span>
                  </span>
                </div>
              )}
              
              {/* Currently streaming file indicator */}
              {currentStreamingFile && (
                <div className={`flex items-center gap-2 mb-3 p-2 rounded border ${
                  isDark ? 'bg-vscode-bg border-blue-500/50' : 'bg-blue-50 border-blue-300'
                }`}>
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-sm font-medium">
                    {currentStreamingFile.type === 'create' ? '▶ Creating' : '▶ Editing'}: 
                    <code className={`ml-1 font-mono ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{currentStreamingFile.path}</code>
                  </span>
                </div>
              )}
              
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {renderContent(streamingContent || '█')}
              </div>
              
              {/* Files created counter */}
              {createdFilesCount > 0 && (
                <div className={`mt-2 text-xs ${mutedTextClass} font-medium border-t border-vscode-border pt-2`}>
                  ✅ {createdFilesCount} file{createdFilesCount > 1 ? 's' : ''} created
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className={`p-4 border-t ${isDark ? 'border-vscode-border' : 'border-gray-200'}`}>
        {/* Uploaded files preview */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded border ${
                  isDark ? 'bg-vscode-sidebar border-vscode-border text-vscode-text' : 'bg-gray-50 border-gray-300 text-gray-700'
                }`}
              >
                {file.isImage ? (
                  <img 
                    src={file.content} 
                    alt={file.name} 
                    className="w-8 h-8 object-cover rounded border border-vscode-border"
                  />
                ) : (
                  <span className="text-vscode-accent">◉</span>
                )}
                <span className="max-w-32 truncate font-mono text-xs">{file.name}</span>
                <button
                  onClick={() => removeUploadedFile(index)}
                  className={`ml-1 hover:text-red-500 transition-colors`}
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className={`flex items-end gap-1.5 p-2 ${inputBgClass} min-w-0`}>
          {/* Hidden file input - accepts both text and image files */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelected}
            className="hidden"
            accept=".txt,.js,.ts,.tsx,.jsx,.py,.json,.html,.css,.md,.yaml,.yml,.xml,.csv,.sql,.sh,.bash,.env,.gitignore,.dockerfile,Dockerfile,.toml,.ini,.cfg,image/*,.png,.jpg,.jpeg,.gif,.webp,.svg"
          />
          
          {/* Agent selector button */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowAgentSelector(!showAgentSelector)}
              className={`p-1 transition-colors flex items-center gap-0.5 text-xs rounded ${
                isDark ? 'text-vscode-textMuted hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              } ${selectedAgent !== 'orchestrator' ? 'text-green-400' : ''}`}
              title={`Current: ${AGENTS.find(a => a.id === selectedAgent)?.name || 'Orchestrator'}`}
            >
              <span>{AGENTS.find(a => a.id === selectedAgent)?.icon || '◉'}</span>
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Agent dropdown */}
            {showAgentSelector && (
              <div className={`absolute bottom-full left-0 mb-2 w-56 shadow-2xl rounded-lg border ${
                isDark ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-gray-200'
              } max-h-80 overflow-y-auto z-50`}>
                <div className={`px-3 py-2 text-xs font-semibold ${isDark ? 'text-[#808080] bg-[#1e1e1e]' : 'text-gray-500 bg-gray-50'} border-b ${isDark ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
                  Select Agent
                </div>
                {AGENTS.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => {
                      setSelectedAgent(agent.id);
                      setShowAgentSelector(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors border-b ${isDark ? 'border-[#3c3c3c]/50' : 'border-gray-100'} ${
                      selectedAgent === agent.id
                        ? 'bg-blue-600 text-white'
                        : isDark ? 'bg-[#252526] hover:bg-[#37373d] text-[#cccccc]' : 'bg-white hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className="text-lg">{agent.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{agent.name}</div>
                      <div className={`text-xs truncate ${
                        selectedAgent === agent.id ? 'text-white/70' : mutedTextClass
                      }`}>{agent.description}</div>
                    </div>
                    {selectedAgent === agent.id && (
                      <span className="font-medium">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* File upload button */}
          <button
            onClick={handleFileUpload}
            className={`p-1 transition-colors flex-shrink-0 rounded ${
              isDark ? 'text-vscode-textMuted hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            title="Upload files or images"
            disabled={isAiLoading || isStreaming}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              uploadedFiles.length > 0 
                ? "Describe these files..." 
                : selectedAgent === 'orchestrator'
                  ? "Ask me to build something..."
                  : `Ask ${AGENTS.find(a => a.id === selectedAgent)?.name || 'Agent'}...`
            }
            className={`flex-1 min-w-0 resize-none bg-transparent outline-none text-sm ${textClass} placeholder:${mutedTextClass} font-mono`}
            rows={1}
            style={{ minHeight: '24px', maxHeight: '200px' }}
            disabled={isAiLoading || isStreaming}
          />
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {speechSupport.recognition && (
              <button
                onClick={handleVoiceInput}
                className={`p-1 transition-colors text-xs rounded ${
                  isListening 
                    ? 'bg-red-500/20 text-red-400' 
                    : isDark ? 'text-vscode-textMuted hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                ◉
              </button>
            )}
            
            <button
              onClick={handleSend}
              disabled={(!input.trim() && uploadedFiles.length === 0) || isAiLoading || isStreaming}
              className={`p-1 transition-all rounded ${
                (input.trim() || uploadedFiles.length > 0) && !isAiLoading && !isStreaming
                  ? 'text-vscode-accent hover:bg-vscode-accent/10'
                  : isDark ? 'text-vscode-textMuted/50' : 'text-gray-300'
              }`}
            >
              {isAiLoading || isStreaming ? (
                <div className="w-3.5 h-3.5 border border-vscode-accent/30 border-t-vscode-accent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* AI Agent Extension Settings Modal */}
      <AIAgentExtensionSettings
        isOpen={showExtensionSettings}
        onClose={() => setShowExtensionSettings(false)}
      />
    </div>
  );
};

export default AgenticAIChat;
