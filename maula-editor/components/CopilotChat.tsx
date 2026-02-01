/**
 * CopilotChat - VS Code-like AI Assistant
 * Full file operations, code editing, command execution
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStore } from '../store/useStore';
import { 
  copilotService, 
  FileOperation, 
  TerminalCommand, 
  CopilotConfig 
} from '../services/copilot';
import { AIProvider } from '../types';

// Icons
const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const StopIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const TerminalIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ClearIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Message interface
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  fileOperations?: FileOperation[];
  commands?: TerminalCommand[];
}

// Provider options
const PROVIDERS: Array<{ id: AIProvider; name: string; icon: string }> = [
  { id: 'openai', name: 'OpenAI', icon: '🤖' },
  { id: 'anthropic', name: 'Claude', icon: '🧠' },
  { id: 'gemini', name: 'Gemini', icon: '✨' },
  { id: 'groq', name: 'Groq', icon: '⚡' },
  { id: 'xai', name: 'Grok', icon: '🚀' },
  { id: 'mistral', name: 'Mistral', icon: '🌬️' },
  { id: 'ollama', name: 'Ollama', icon: '🦙' },
];

const MODELS: Record<AIProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-preview', 'o1-mini'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  gemini: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
  xai: ['grok-2-latest', 'grok-2-vision-1212'],
  mistral: ['mistral-large-latest', 'mistral-medium-latest'],
  cerebras: ['llama-3.3-70b'],
  huggingface: ['meta-llama/Llama-3.2-3B-Instruct'],
  ollama: ['llama3.2', 'codellama', 'deepseek-coder', 'qwen2.5-coder'],
};

// Quick actions
const QUICK_ACTIONS = [
  { id: 'generate', label: 'Generate', icon: '✨', prompt: 'Create ' },
  { id: 'build', label: 'Build App', icon: '🏗️', prompt: 'Build a complete ' },
  { id: 'fix', label: 'Fix Error', icon: '🔧', prompt: 'Fix this error: ' },
  { id: 'explain', label: 'Explain', icon: '📖', prompt: 'Explain this code: ' },
  { id: 'refactor', label: 'Refactor', icon: '♻️', prompt: 'Refactor this code to ' },
  { id: 'test', label: 'Add Tests', icon: '🧪', prompt: 'Write tests for ' },
];

interface CopilotChatProps {
  onClose?: () => void;
}

export const CopilotChat: React.FC<CopilotChatProps> = ({ onClose }) => {
  const {
    theme,
    files,
    openFiles,
    activeFileId,
    createFile,
    createFolder,
    updateFileContent,
    deleteNode,
    renameNode,
    openFile,
    aiConfig,
  } = useStore();

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [model, setModel] = useState(MODELS.openai[0]);
  const [apiKey, setApiKey] = useState('');
  const [pendingOperations, setPendingOperations] = useState<FileOperation[]>([]);
  const [pendingCommands, setPendingCommands] = useState<TerminalCommand[]>([]);
  const [executedOps, setExecutedOps] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Theme - Updated for charcoal-aurora
  const isDark = theme !== 'light';
  const bgClass = isDark ? 'bg-vscode-sidebar' : 'bg-white';
  const borderClass = isDark ? 'border-[#1c1c1c]' : 'border-gray-200';
  const textClass = isDark ? 'text-[#a0a0a0]' : 'text-gray-800';
  const mutedClass = isDark ? 'text-[#606060]' : 'text-gray-500';
  const inputBg = isDark ? 'bg-vscode-bg' : 'bg-gray-100';

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Update copilot config when settings change
  useEffect(() => {
    copilotService.setConfig({
      provider,
      model,
      apiKey,
    });
  }, [provider, model, apiKey]);

  // Load saved API keys from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem(`copilot_apikey_${provider}`);
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, [provider]);

  // Handle file operations from AI
  const handleFileOperation = useCallback((operation: FileOperation) => {
    const opKey = `${operation.type}:${operation.path}:${operation.content?.slice(0, 50) || ''}`;
    if (executedOps.has(opKey)) return;
    
    console.log('[Copilot] File operation:', operation.type, operation.path);
    
    try {
      switch (operation.type) {
        case 'create':
        case 'edit': {
          const pathParts = operation.path.split('/').filter(Boolean);
          const fileName = pathParts.pop() || '';
          const parentPath = pathParts.join('/');
          
          // Create folders if needed
          if (parentPath) {
            let currentPath = '';
            for (const folder of pathParts) {
              createFolder(currentPath, folder);
              currentPath = currentPath ? `${currentPath}/${folder}` : folder;
            }
          }
          
          if (operation.type === 'create') {
            createFile(parentPath, fileName, operation.content || '');
          } else if (operation.content) {
            updateFileContent(operation.path, operation.content);
          } else if (operation.searchReplace) {
            // Handle search/replace
            const existingFile = files.find(f => f.path === operation.path);
            if (existingFile?.content) {
              const newContent = existingFile.content.replace(
                operation.searchReplace.search,
                operation.searchReplace.replace
              );
              updateFileContent(operation.path, newContent);
            }
          }
          
          // Open the file
          const ext = fileName.split('.').pop() || '';
          const langMap: Record<string, string> = {
            ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
            py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown',
          };
          openFile({
            id: crypto.randomUUID(),
            name: fileName,
            path: operation.path,
            content: operation.content || '',
            language: langMap[ext] || 'plaintext',
            isDirty: false,
          });
          break;
        }
        
        case 'delete':
          deleteNode(operation.path);
          break;
          
        case 'rename':
        case 'move':
          if (operation.newPath) {
            const file = files.find(f => f.path === operation.path);
            if (file?.content) {
              deleteNode(operation.path);
              const newPathParts = operation.newPath.split('/').filter(Boolean);
              const newFileName = newPathParts.pop() || '';
              const newParentPath = newPathParts.join('/');
              createFile(newParentPath, newFileName, file.content);
            }
          }
          break;
      }
      
      setExecutedOps(prev => new Set([...prev, opKey]));
      setPendingOperations(prev => [...prev, operation]);
    } catch (error) {
      console.error('[Copilot] Operation error:', error);
    }
  }, [files, createFile, createFolder, updateFileContent, deleteNode, openFile, executedOps]);

  // Handle terminal commands from AI
  const handleCommand = useCallback((command: TerminalCommand) => {
    console.log('[Copilot] Terminal command:', command.command);
    setPendingCommands(prev => [...prev, command]);
    
    // Execute in WebContainer or terminal (if available)
    // For now, we'll just log it
  }, []);

  // Send message
  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');
    setPendingOperations([]);
    setPendingCommands([]);
    setExecutedOps(new Set());
    
    // Get current file context
    const activeFile = openFiles.find(f => f.id === activeFileId);
    let context = '';
    if (activeFile) {
      context = `\n\nCurrent file: ${activeFile.path}\n\`\`\`${activeFile.language}\n${activeFile.content}\n\`\`\``;
    }
    
    const fullPrompt = input + context;
    
    try {
      await copilotService.chat(
        [
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content: fullPrompt },
        ],
        {
          onToken: (token) => {
            setStreamingContent(prev => prev + token);
          },
          onFileOperation: handleFileOperation,
          onCommand: handleCommand,
          onComplete: (response) => {
            const assistantMessage: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: response,
              timestamp: Date.now(),
              fileOperations: [...pendingOperations],
              commands: [...pendingCommands],
            };
            setMessages(prev => [...prev, assistantMessage]);
            setStreamingContent('');
            setIsStreaming(false);
          },
          onError: (error) => {
            console.error('[Copilot] Error:', error);
            setStreamingContent('');
            setIsStreaming(false);
            
            // Add error message
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `❌ Error: ${error.message}`,
              timestamp: Date.now(),
            }]);
          },
        }
      );
    } catch (error) {
      console.error('[Copilot] Chat error:', error);
      setIsStreaming(false);
    }
  };

  // Cancel streaming
  const handleCancel = () => {
    copilotService.cancel();
    setIsStreaming(false);
    setStreamingContent('');
  };

  // Quick action
  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    setInput(action.prompt);
    inputRef.current?.focus();
  };

  // Clear chat
  const handleClear = () => {
    setMessages([]);
    setPendingOperations([]);
    setPendingCommands([]);
  };

  // Copy code
  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Save API key
  const handleSaveApiKey = () => {
    localStorage.setItem(`copilot_apikey_${provider}`, apiKey);
    setShowSettings(false);
  };

  // Render message content with code highlighting
  const renderContent = (content: string, messageId: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeContent = String(children).replace(/\n$/, '');
            
            if (!inline && match) {
              return (
                <div className="relative group my-2">
                  <div className={`flex items-center justify-between px-3 py-1 text-xs ${isDark ? 'bg-[#2d2d2d]' : 'bg-gray-200'} rounded-t`}>
                    <span className={mutedClass}>{match[1]}</span>
                    <button
                      onClick={() => handleCopy(codeContent, `${messageId}-${match[1]}`)}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:${isDark ? 'bg-vscode-hover' : 'bg-gray-300'}`}
                    >
                      {copiedId === `${messageId}-${match[1]}` ? <CheckIcon /> : <CopyIcon />}
                    </button>
                  </div>
                  <pre className={`${isDark ? 'bg-vscode-bg' : 'bg-gray-100'} p-3 overflow-x-auto rounded-b text-sm`}>
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              );
            }
            
            return (
              <code className={`${isDark ? 'bg-vscode-hover' : 'bg-gray-200'} px-1 py-0.5 rounded text-sm`} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className={`flex flex-col h-full ${bgClass} ${textClass}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${borderClass}`}>
        <div className="flex items-center gap-2">
          <SparklesIcon />
          <span className="font-medium text-sm">AI COPILOT</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
            {PROVIDERS.find(p => p.id === provider)?.icon} {model}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            className={`p-1.5 rounded hover:${isDark ? 'bg-[#3c3c3c]' : 'bg-gray-200'} transition-colors`}
            title="Clear chat"
          >
            <ClearIcon />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded hover:${isDark ? 'bg-[#3c3c3c]' : 'bg-gray-200'} transition-colors ${showSettings ? (isDark ? 'bg-[#3c3c3c]' : 'bg-gray-200') : ''}`}
            title="Settings"
          >
            <SettingsIcon />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className={`p-1.5 rounded hover:${isDark ? 'bg-[#3c3c3c]' : 'bg-gray-200'} transition-colors`}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`border-b ${borderClass} overflow-hidden`}
          >
            <div className="p-3 space-y-3">
              {/* Provider */}
              <div>
                <label className={`block text-xs ${mutedClass} mb-1`}>Provider</label>
                <select
                  value={provider}
                  onChange={(e) => {
                    const p = e.target.value as AIProvider;
                    setProvider(p);
                    setModel(MODELS[p]?.[0] || '');
                  }}
                  className={`w-full px-2 py-1.5 rounded text-sm ${inputBg} border ${borderClass} focus:outline-none focus:border-blue-500`}
                >
                  {PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Model */}
              <div>
                <label className={`block text-xs ${mutedClass} mb-1`}>Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className={`w-full px-2 py-1.5 rounded text-sm ${inputBg} border ${borderClass} focus:outline-none focus:border-blue-500`}
                >
                  {(MODELS[provider] || []).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              
              {/* API Key */}
              <div>
                <label className={`block text-xs ${mutedClass} mb-1`}>API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter ${PROVIDERS.find(p => p.id === provider)?.name} API key`}
                  className={`w-full px-2 py-1.5 rounded text-sm ${inputBg} border ${borderClass} focus:outline-none focus:border-blue-500`}
                />
              </div>
              
              <button
                onClick={handleSaveApiKey}
                className="w-full px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className={`w-16 h-16 rounded-full ${isDark ? 'bg-[#2d2d2d]' : 'bg-gray-100'} flex items-center justify-center mb-4`}>
              <span className="text-3xl">⚡</span>
            </div>
            <h3 className="font-semibold text-lg mb-1">Ready to Build</h3>
            <p className={`${mutedClass} text-sm mb-4`}>
              I create apps, write code, and build projects
            </p>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_ACTIONS.slice(0, 4).map(action => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${isDark ? 'bg-[#2d2d2d] hover:bg-[#3c3c3c]' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message List */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              message.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : isDark ? 'bg-purple-900/50' : 'bg-purple-100'
            }`}>
              {message.role === 'user' ? '👤' : '✨'}
            </div>
            
            {/* Content */}
            <div className={`flex-1 max-w-[85%] ${message.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block text-left px-3 py-2 rounded-lg text-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'bg-[#2d2d2d]' : 'bg-gray-100'
              }`}>
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {renderContent(message.content, message.id)}
                  </div>
                )}
              </div>
              
              {/* File Operations Badge */}
              {message.fileOperations && message.fileOperations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {message.fileOperations.map((op, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                        op.type === 'create' ? 'bg-green-900/30 text-green-400' :
                        op.type === 'edit' ? 'bg-yellow-900/30 text-yellow-400' :
                        op.type === 'delete' ? 'bg-red-900/30 text-red-400' :
                        'bg-blue-900/30 text-blue-400'
                      }`}
                    >
                      <FileIcon />
                      {op.type}: {op.path.split('/').pop()}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Commands Badge */}
              {message.commands && message.commands.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {message.commands.map((cmd, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-900/30 text-purple-400"
                    >
                      <TerminalIcon />
                      {cmd.command.slice(0, 30)}{cmd.command.length > 30 ? '...' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming Message */}
        {isStreaming && streamingContent && (
          <div className="flex gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-purple-900/50' : 'bg-purple-100'}`}>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                ✨
              </motion.span>
            </div>
            <div className={`flex-1 max-w-[85%] px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-[#2d2d2d]' : 'bg-gray-100'}`}>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {renderContent(streamingContent, 'streaming')}
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isStreaming && !streamingContent && (
          <div className="flex gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-purple-900/50' : 'bg-purple-100'}`}>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                ✨
              </motion.span>
            </div>
            <div className={`px-3 py-2 rounded-lg ${isDark ? 'bg-[#2d2d2d]' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-2">
                <motion.div
                  className="flex gap-1"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                </motion.div>
                <span className={`text-sm ${mutedClass}`}>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`border-t ${borderClass} p-3`}>
        {/* Quick Actions Row */}
        <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              className={`flex-shrink-0 px-2 py-1 rounded text-xs ${isDark ? 'bg-[#2d2d2d] hover:bg-[#3c3c3c]' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
              title={action.prompt}
            >
              {action.icon}
            </button>
          ))}
        </div>
        
        {/* Input Box */}
        <div className={`flex items-end gap-2 ${inputBg} rounded-lg p-2`}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask me to build anything..."
            rows={1}
            className={`flex-1 bg-transparent resize-none outline-none text-sm max-h-32 ${textClass}`}
            style={{ minHeight: '24px' }}
            disabled={isStreaming}
          />
          
          {isStreaming ? (
            <button
              onClick={handleCancel}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              title="Stop"
            >
              <StopIcon />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={`p-2 rounded-lg transition-colors ${
                input.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : `${isDark ? 'bg-[#3c3c3c] text-[#808080]' : 'bg-gray-200 text-gray-400'} cursor-not-allowed`
              }`}
              title="Send (Enter)"
            >
              <SendIcon />
            </button>
          )}
        </div>
        
        {/* Provider indicator */}
        <div className={`flex items-center justify-between mt-2 text-xs ${mutedClass}`}>
          <span>
            {PROVIDERS.find(p => p.id === provider)?.icon} Using {model}
          </span>
          <span>Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
};

export default CopilotChat;
