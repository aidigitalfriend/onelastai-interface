
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { speak } from '../services/speechService';

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isGenerating: boolean;
  onNewChat?: () => void;
  onClose?: () => void;
  models?: ModelOption[];
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
  selectedLanguage?: string;
  onLanguageChange?: (language: string) => void;
}

const LANGUAGE_OPTIONS = [
  { id: 'auto', name: 'Auto-Detect', icon: '🔍' },
  { id: 'html', name: 'HTML', icon: '🌐' },
  { id: 'react', name: 'React/TSX', icon: '⚛️' },
  { id: 'typescript', name: 'TypeScript', icon: '🔷' },
  { id: 'javascript', name: 'JavaScript', icon: '📜' },
  { id: 'python', name: 'Python', icon: '🐍' },
];

const ChatBox: React.FC<ChatBoxProps> = ({ 
  messages, 
  onSendMessage, 
  isGenerating, 
  onNewChat,
  onClose,
  models = [],
  selectedModel = '',
  onModelChange,
  selectedLanguage = 'auto',
  onLanguageChange
}) => {
  const [input, setInput] = useState('');
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get unique providers
  const providers = Array.from(new Set(models.map(m => m.provider)));
  
  // Get models for selected provider
  const providerModels = selectedProvider 
    ? models.filter(m => m.provider === selectedProvider)
    : models;

  // Set initial provider based on selected model
  useEffect(() => {
    if (selectedModel && models.length > 0) {
      const model = models.find(m => m.id === selectedModel);
      if (model && model.provider !== selectedProvider) {
        setSelectedProvider(model.provider);
      }
    } else if (providers.length > 0 && !selectedProvider) {
      setSelectedProvider(providers[0]);
    }
  }, [selectedModel, models]);

  // Save current chat to history when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const existingSessionIndex = chatSessions.findIndex(s => 
        s.messages.length > 0 && s.messages[0].timestamp === messages[0]?.timestamp
      );
      
      if (existingSessionIndex === -1 && messages.length > 0) {
        // New session
        const newSession: ChatSession = {
          id: Date.now().toString(),
          title: messages[0]?.text.slice(0, 30) + '...' || 'New Chat',
          messages: [...messages],
          timestamp: Date.now()
        };
        setChatSessions(prev => [newSession, ...prev].slice(0, 10)); // Keep last 10
      }
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isGenerating) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleSpeak = async (text: string, idx: number) => {
    setSpeakingIdx(idx);
    await speak(text);
    setSpeakingIdx(null);
  };

  // Voice recording using Web Speech API
  const toggleVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition not supported in this browser');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + ' ' + transcript);
    };

    recognition.start();
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For now, just add the filename to input - in production, would upload and process
      setInput(prev => prev + ` [Attached: ${file.name}]`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] w-full relative">
      {/* Chat Header */}
      <div className="shrink-0 border-b border-gray-800/50">
        {/* Title Row */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">AI Assistant</h3>
              <p className="text-[9px] text-gray-600">Neural Interface v2.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowChatHistory(!showChatHistory)}
              className={`p-2 rounded-lg transition-all border ${showChatHistory ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' : 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`}
              title="Chat History"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button 
              onClick={() => {
                onNewChat?.();
                setShowChatHistory(false);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-cyan-400 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-all uppercase tracking-widest"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-all"
                title="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Model Selector Row */}
        {models.length > 0 && (
          <div className="px-4 py-3 bg-black/30">
            <div className="flex gap-2">
              {/* Provider Dropdown */}
              <div className="flex-1">
                <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Provider</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    setSelectedProvider(e.target.value);
                    // Auto-select first model of new provider
                    const firstModel = models.find(m => m.provider === e.target.value);
                    if (firstModel) onModelChange?.(firstModel.id);
                  }}
                  title="Select Provider"
                  className="w-full bg-black/60 border border-gray-700 hover:border-cyan-500/40 text-xs text-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 cursor-pointer transition-all"
                >
                  {providers.map(provider => (
                    <option key={provider} value={provider} className="bg-[#111] text-gray-300">
                      {provider}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Model Dropdown */}
              <div className="flex-1">
                <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => onModelChange?.(e.target.value)}
                  title="Select Model"
                  className="w-full bg-black/60 border border-gray-700 hover:border-emerald-500/40 text-xs text-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 cursor-pointer transition-all"
                >
                  {providerModels.map(model => (
                    <option key={model.id} value={model.id} className="bg-[#111] text-gray-300">
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language Dropdown */}
              <div className="flex-1">
                <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Language</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => onLanguageChange?.(e.target.value)}
                  title="Select Output Language"
                  className="w-full bg-black/60 border border-gray-700 hover:border-purple-500/40 text-xs text-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 cursor-pointer transition-all"
                >
                  {LANGUAGE_OPTIONS.map(lang => (
                    <option key={lang.id} value={lang.id} className="bg-[#111] text-gray-300">
                      {lang.icon} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Selected Model & Language Badge */}
            {selectedModel && (
              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] text-gray-500">
                    Model: <span className="text-emerald-400 font-medium">{models.find(m => m.id === selectedModel)?.name}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                  <span className="text-[10px] text-gray-500">
                    Output: <span className="text-purple-400 font-medium">{LANGUAGE_OPTIONS.find(l => l.id === selectedLanguage)?.name || 'Auto'}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat History Panel (slides in) */}
      {showChatHistory && (
        <div className="absolute inset-0 top-0 bg-[#0a0a0a] z-10 flex flex-col">
          <div className="p-4 border-b border-gray-800/50 flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Recent Conversations</h4>
            <button 
              onClick={() => setShowChatHistory(false)}
              className="p-1.5 text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
              title="Close History"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatSessions.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-8">No chat history yet</p>
            ) : (
              chatSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setShowChatHistory(false)}
                  className="w-full text-left p-3 bg-black/30 hover:bg-cyan-500/10 border border-gray-800 hover:border-cyan-500/30 rounded-lg transition-all group"
                >
                  <p className="text-xs font-medium text-gray-400 group-hover:text-cyan-400 truncate">{session.title}</p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {new Date(session.timestamp).toLocaleDateString()} • {session.messages.length} messages
                  </p>
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => setShowChatHistory(false)}
            className="m-4 py-2 text-xs font-bold text-gray-500 hover:text-cyan-400 bg-black/30 hover:bg-cyan-500/10 border border-gray-800 hover:border-cyan-500/30 rounded-lg transition-all uppercase tracking-widest"
          >
            Back to Chat
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <p className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest mb-2">Neural_Interface_Ready</p>
            <p className="text-xs text-gray-500 leading-relaxed">Request modifications, animations, or advanced functionality.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`group relative max-w-[90%] px-4 py-3 rounded-lg text-xs leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-white rounded-tr-none shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                : 'bg-black/40 text-gray-300 rounded-tl-none border border-gray-800'
            }`}>
              {msg.text}
              
              {msg.role === 'model' && (
                <button 
                  onClick={() => handleSpeak(msg.text, i)}
                  className={`absolute -right-8 top-1 p-1 text-gray-500 hover:text-cyan-400 transition-all ${speakingIdx === i ? 'opacity-100 text-cyan-400 animate-pulse' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
              )}
            </div>
            <span className="text-[10px] text-gray-600 mt-1 px-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
        {isGenerating && (
          <div className="flex items-center gap-2 text-cyan-400 text-[10px] px-2 font-bold uppercase tracking-widest italic animate-pulse">
            <span className="flex gap-1">
              <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
              <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"></span>
              <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce delay-150"></span>
            </span>
            Processing...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800 bg-[#0a0a0a] shrink-0">
        <div className="flex items-center gap-2">
          {/* Voice Recording Button */}
          <button 
            type="button"
            onClick={toggleVoiceRecording}
            className={`p-2.5 rounded-lg transition-all border ${isRecording ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-black/40 text-gray-500 border-gray-800 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30'}`}
            title="Voice Input"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          {/* File Upload Button */}
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 bg-black/40 text-gray-500 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 border border-gray-800 hover:border-cyan-500/30 transition-all"
            title="Upload File"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept="image/*,.pdf,.doc,.docx,.txt"
          />

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isGenerating}
              placeholder="Enter modification request..."
              className="w-full pl-4 pr-4 py-3 text-xs bg-black/40 border border-gray-800 rounded-lg focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all placeholder:text-gray-600 text-gray-300"
            />
          </div>

          {/* Send Button */}
          <button 
            type="submit" 
            disabled={!input.trim() || isGenerating} 
            className="p-2.5 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white rounded-lg disabled:bg-gray-800 disabled:from-gray-700 disabled:to-gray-700 transition-all shadow-[0_0_10px_rgba(34,211,238,0.2)] hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] active:scale-95"
            title="Send Message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;
