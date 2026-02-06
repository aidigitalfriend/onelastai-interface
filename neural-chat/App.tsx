
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SettingsPanel from './components/SettingsPanel';
import ChatBox from './components/ChatBox';
import NavigationDrawer from './components/NavigationDrawer';
import CanvasAppDrawer from './components/CanvasAppDrawer';
import Overlay from './components/Overlay';
import Footer from './components/Footer';
// Fix: Import WorkspaceMode which was missing and causing a reference error on line 312
import { ChatSession, Message, SettingsState, NavItem, CanvasState, WorkspaceMode, FileAttachment } from './types';
import { DEFAULT_SETTINGS, NEURAL_PRESETS } from './constants';
import { callBackendAPI, streamChat, extractFileText } from './services/apiService';
import { useFileBridge } from './services/useFileBridge';
import { startSTS, stopSTS, getIsSTSActive, speak, stopSpeaking } from './services/speechService';
import { connectRealtime, disconnectRealtime, startRecording, stopRecording, isConnected as isRealtimeConnected, sendTextMessage } from './services/openaiRealtimeService';

// Voice options for the call modal - matches OpenAI Realtime voices
const VOICE_OPTIONS: Array<'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'> = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

interface VoiceMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

const App: React.FC = () => {
  // UI State
  const [isOverlayActive, setIsOverlayActive] = useState(true);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isCanvasDrawerOpen, setIsCanvasDrawerOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isRecordingSTT, setIsRecordingSTT] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [sttTranscript, setSttTranscript] = useState('');

  // Voice Call Modal State
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceCallStatus, setVoiceCallStatus] = useState<'idle' | 'connecting' | 'active'>('idle');
  const [selectedVoice, setSelectedVoice] = useState<'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'>('alloy');
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([]);
  const [voiceStatusText, setVoiceStatusText] = useState('Ready to call');
  const voiceScrollRef = useRef<HTMLDivElement>(null);
  
  // Streaming state
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Image attachment state
  const [pendingImage, setPendingImage] = useState<{ data: string; name: string; mimeType: string } | null>(null);
  
  // File attachment state
  const [pendingFiles, setPendingFiles] = useState<FileAttachment[]>([]);

  // File Bridge for comprehensive file operations
  const fileBridge = useFileBridge({
    onMessage: (message) => {
      console.log('[FileBridge]', message);
    },
    onProgress: (percent, message) => {
      console.log('[FileBridge Progress]', percent, message);
    },
    onApprovalRequest: async (request) => {
      const confirmed = window.confirm(
        `Allow ${request.action} on ${request.path}?\n${request.details || ''}`
      );
      return confirmed;
    },
    onQuestion: async (question) => {
      return window.prompt(question);
    }
  });

  // Expose fileBridge globally for AI agents
  useEffect(() => {
    (window as any).fileBridge = fileBridge;
    console.log('[FileBridge] Initialized and exposed globally');
    return () => {
      delete (window as any).fileBridge;
    };
  }, [fileBridge]);

  // Gemini Live & STT Refs
  const recognitionRef = useRef<any>(null);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  // App Data State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('neural_sessions');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: '1',
        name: "Welcome Chat",
        active: true,
        messages: [
          { 
            id: 'init-1', 
            sender: 'AGENT', 
            text: 'Hi there! 👋 Welcome to One LastAI Chat. I\'m your AI assistant and I\'m here to help you with anything you need. Feel free to ask questions, upload images, or just chat!', 
            timestamp: new Date().toLocaleTimeString() 
          }
        ],
        settings: { ...DEFAULT_SETTINGS }
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('neural_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const activeSession = sessions.find(s => s.active) || sessions[0];

  // Stop generation handler
  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsThinking(false);
    setStreamingMessageId(null);
  }, []);

  const handleSend = async (text: string) => {
    if (isThinking) return;

    const timestamp = new Date().toLocaleTimeString();
    const hasImage = !!pendingImage;
    const hasFiles = pendingFiles.length > 0;
    
    const userMsg: Message = { 
      id: Date.now().toString(), 
      sender: 'YOU', 
      text, 
      timestamp,
      isImage: hasImage,
      imageData: pendingImage?.data,
      files: hasFiles ? [...pendingFiles] : undefined
    };

    setSessions(prev => prev.map(s => 
      s.active ? { ...s, messages: [...s.messages, userMsg] } : s
    ));

    // Switch to CHAT view when sending a message (especially with image)
    if (activeSession.settings.workspaceMode !== 'CHAT') {
      updateActiveSettings({ ...activeSession.settings, workspaceMode: 'CHAT' });
    }

    setIsThinking(true);
    
    // Include image in API call if present
    // Also include file content for code/text files
    const fileContext = pendingFiles
      .filter(f => f.content)
      .map(f => `File: ${f.name}\n\`\`\`\n${f.content}\n\`\`\``)
      .join('\n\n');
    
    const fullPrompt = fileContext ? `${text}\n\n${fileContext}` : text;
    
    // Clear pending image and files after sending
    setPendingImage(null);
    setPendingFiles([]);

    // Create placeholder message for streaming
    const agentMsgId = (Date.now() + 1).toString();
    const agentMsg: Message = { 
      id: agentMsgId, 
      sender: 'AGENT', 
      text: '', 
      timestamp: new Date().toLocaleTimeString(),
    };

    setSessions(prev => prev.map(s => 
      s.active ? { ...s, messages: [...s.messages, agentMsg] } : s
    ));

    setStreamingMessageId(agentMsgId);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Use streaming API
    await streamChat(
      fullPrompt,
      activeSession.settings,
      {
        onText: (content) => {
          // Append streamed text to the agent message
          setSessions(prev => prev.map(s => {
            if (!s.active) return s;
            return {
              ...s,
              messages: s.messages.map(m => 
                m.id === agentMsgId 
                  ? { ...m, text: m.text + content }
                  : m
              )
            };
          }));
        },
        onDone: (data) => {
          setIsThinking(false);
          setStreamingMessageId(null);
          abortControllerRef.current = null;
          
          // Check for canvas updates in the final message
          setSessions(prev => {
            const session = prev.find(s => s.active);
            if (!session) return prev;
            
            const finalMessage = session.messages.find(m => m.id === agentMsgId);
            if (finalMessage && !hasImage) {
              // Check for code blocks to update canvas
              const codeBlockMatch = finalMessage.text.match(/```(\w+)?\n([\s\S]*?)```/);
              if (codeBlockMatch) {
                const language = codeBlockMatch[1] || 'text';
                const code = codeBlockMatch[2];
                
                if (['javascript', 'typescript', 'python', 'html', 'css', 'java', 'cpp', 'rust', 'go'].includes(language)) {
                  const settingsUpdate: Partial<SettingsState> = {
                    canvas: {
                      ...session.settings.canvas,
                      content: code,
                      type: 'code',
                      language: language,
                      title: `CODE_${language.toUpperCase()}`
                    },
                    workspaceMode: 'CANVAS'
                  };
                  updateActiveSettings({ ...session.settings, ...settingsUpdate } as SettingsState);
                }
              }
            }
            
            return prev;
          });
        },
        onError: (error) => {
          setIsThinking(false);
          setStreamingMessageId(null);
          abortControllerRef.current = null;
          
          // Update the message with error
          let errorText = '⚠️ An error occurred. Please try again.';
          if (error === 'auth') {
            errorText = '⚠️ Please sign in to continue.\n\n• Click the ↗ button in the header to go to the home page and sign in or create an account. Once logged in, return here to chat!';
          } else if (error === 'credits') {
            errorText = '⚠️ Insufficient credits.\n\n• Please go to your dashboard to purchase more credits. Click the ↗ button in the header to access billing.';
          }
          
          setSessions(prev => prev.map(s => {
            if (!s.active) return s;
            return {
              ...s,
              messages: s.messages.map(m => 
                m.id === agentMsgId 
                  ? { ...m, text: errorText }
                  : m
              )
            };
          }));
        }
      },
      pendingImage || undefined,
      abortControllerRef.current.signal
    );
  };

  const handleFileUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isTextFile = file.type.startsWith('text/') || 
      /\.(txt|md|json|xml|csv|log|ini|yaml|yml|toml)$/i.test(file.name);
    const isCodeFile = /\.(js|jsx|ts|tsx|py|html|css|scss|java|cpp|c|h|hpp|rs|go|rb|php|swift|kt|scala|sql|sh|bash|zsh|ps1)$/i.test(file.name);
    const isDocument = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(file.name);
    
    // Create file attachment object
    const fileAttachment: FileAttachment = {
      id: Date.now().toString(),
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
    };
    
    // For images, read as data URL and set as pending attachment
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPendingImage({
          data: dataUrl,
          name: file.name,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
      return;
    }
    
    // For videos, read as data URL
    if (isVideo) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        fileAttachment.dataUrl = dataUrl;
        setPendingFiles(prev => [...prev, fileAttachment]);
        
        // Also update canvas for preview
        updateActiveSettings({
          ...activeSession.settings,
          workspaceMode: 'CANVAS',
          canvas: {
            ...activeSession.settings.canvas,
            content: dataUrl,
            type: 'video',
            title: `VIDEO_${file.name.toUpperCase()}`
          }
        });
      };
      reader.readAsDataURL(file);
      return;
    }
    
    // For text and code files, read as text
    if (isTextFile || isCodeFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        fileAttachment.content = content;
        setPendingFiles(prev => [...prev, fileAttachment]);
        
        // Determine canvas type
        const canvasType = isCodeFile ? 'code' : 'text';
        const language = isCodeFile ? file.name.split('.').pop() || 'text' : undefined;
        
        // Update canvas to show the file content
        updateActiveSettings({
          ...activeSession.settings,
          workspaceMode: 'CANVAS',
          canvas: {
            content: content,
            type: canvasType,
            language: language,
            title: `FILE_${file.name.toUpperCase()}`
          }
        });
      };
      reader.readAsText(file);
      return;
    }
    
    // For PDF and DOCX files, extract text via backend
    const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
    const isDocx = /\.docx$/i.test(file.name) || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isCsv = /\.csv$/i.test(file.name) || file.type === 'text/csv';
    
    if (isPdf || isDocx || isCsv) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        
        // Show loading state
        const loadingAttachment = { ...fileAttachment, content: '⏳ Extracting text...' };
        setPendingFiles(prev => [...prev, loadingAttachment]);
        
        // Extract text from the file via backend
        const result = await extractFileText(dataUrl, file.name, file.type);
        
        if (result.success && result.text) {
          // Update the file attachment with extracted content
          setPendingFiles(prev => prev.map(f => 
            f.id === fileAttachment.id 
              ? { ...f, content: result.text }
              : f
          ));
          
          // Update canvas to show the extracted text
          const canvasTitle = isPdf 
            ? `PDF_${file.name.toUpperCase()}${result.metadata?.pages ? ` (${result.metadata.pages} pages)` : ''}`
            : isDocx 
              ? `DOCX_${file.name.toUpperCase()}`
              : `CSV_${file.name.toUpperCase()}`;
          
          updateActiveSettings({
            ...activeSession.settings,
            workspaceMode: 'CANVAS',
            canvas: {
              content: result.text,
              type: 'text',
              title: canvasTitle
            }
          });
        } else {
          // Update with error message
          setPendingFiles(prev => prev.map(f => 
            f.id === fileAttachment.id 
              ? { ...f, content: `❌ ${result.error || 'Failed to extract text'}` }
              : f
          ));
        }
      };
      reader.readAsDataURL(file);
      return;
    }
    
    // For other documents (.doc, etc.) and binary files, just store metadata
    // Don't try to read content (would show garbled text)
    fileAttachment.dataUrl = undefined;
    fileAttachment.content = undefined;
    setPendingFiles(prev => [...prev, fileAttachment]);
    
    // Show a message about the file
    const sizeStr = file.size < 1024 ? `${file.size} bytes` : 
                    file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` :
                    `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    
    // Auto-send a message about the file attachment
    handleSend(`I've attached a file: **${file.name}** (${sizeStr}, ${file.type || 'unknown type'}). Please help me with this file.`);
  };
  
  // Clear pending files
  const clearPendingFiles = () => {
    setPendingFiles([]);
  };

  const toggleSTT = () => {
    if (isRecordingSTT) {
      recognitionRef.current?.stop();
      setIsRecordingSTT(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech Recognition not supported in this browser environment.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Get single result, not continuous
      recognition.interimResults = false; // Only final results to avoid duplicates
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        // Get only the final result from the last result
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript;
          setSttTranscript(prev => prev ? prev + ' ' + transcript : transcript);
        }
      };

      recognition.onend = () => setIsRecordingSTT(false);
      recognition.start();
      setIsRecordingSTT(true);
      recognitionRef.current = recognition;
    }
  };

  // Debounce guard for live toggle
  const [isTogglingLive, setIsTogglingLive] = useState(false);
  
  // Open Voice Call Modal
  const toggleLive = async () => {
    // Prevent rapid toggling
    if (isTogglingLive) return;
    setIsTogglingLive(true);
    setTimeout(() => setIsTogglingLive(false), 500);
    
    // Open the voice call modal instead of inline voice
    setShowVoiceModal(true);
    setVoiceCallStatus('idle');
    setVoiceStatusText('Ready to call');
  };

  // Close Voice Call Modal
  const closeVoiceModal = () => {
    if (voiceCallStatus === 'active') {
      endVoiceCall();
    }
    setShowVoiceModal(false);
    setVoiceMessages([]);
  };

  // Accumulator for streaming AI response text
  const aiResponseAccumulator = useRef<string>('');
  const lastAiMessageId = useRef<string | null>(null);

  // Start Voice Call using OpenAI Realtime API
  const startVoiceCall = async () => {
    setVoiceCallStatus('connecting');
    setVoiceStatusText('Connecting to OpenAI Realtime...');

    try {
      // Connect to OpenAI Realtime API (token is fetched from backend)
      const connected = await connectRealtime({
        voice: selectedVoice,
        instructions: activeSession.settings.customPrompt || 'You are a helpful AI assistant. Be conversational, friendly, and concise in your responses.',
        temperature: activeSession.settings.temperature || 0.8,
        onConnected: () => {
          console.log('[Voice Call] Connected to OpenAI Realtime');
        },
        onDisconnected: () => {
          console.log('[Voice Call] Disconnected');
          setVoiceCallStatus('idle');
          setVoiceStatusText('Disconnected');
          setIsLiveActive(false);
        },
        onTranscript: (text, isUser) => {
          if (isUser) {
            // User's transcribed speech
            const userMsg: VoiceMessage = {
              id: Date.now().toString(),
              text: text,
              isUser: true,
              timestamp: Date.now()
            };
            setVoiceMessages(prev => [...prev, userMsg]);
            // Reset AI accumulator for new response
            aiResponseAccumulator.current = '';
            lastAiMessageId.current = null;
          } else {
            // AI response streaming - accumulate text
            aiResponseAccumulator.current += text;
            
            if (!lastAiMessageId.current) {
              // Create new AI message
              lastAiMessageId.current = Date.now().toString();
              const aiMsg: VoiceMessage = {
                id: lastAiMessageId.current,
                text: aiResponseAccumulator.current,
                isUser: false,
                timestamp: Date.now()
              };
              setVoiceMessages(prev => [...prev, aiMsg]);
            } else {
              // Update existing AI message
              setVoiceMessages(prev => prev.map(msg => 
                msg.id === lastAiMessageId.current 
                  ? { ...msg, text: aiResponseAccumulator.current }
                  : msg
              ));
            }
          }
        },
        onStatusChange: (status) => {
          setVoiceStatusText(status);
          if (status === 'Listening...') {
            setIsRecordingSTT(true);
          } else if (status === 'Processing...' || status === 'Speaking...') {
            setIsRecordingSTT(false);
          }
        },
        onError: (error) => {
          console.error('[Voice Call] Error:', error);
          setVoiceStatusText(`Error: ${error}`);
        }
      });

      if (connected) {
        // Start recording after connection
        const recordingStarted = await startRecording();
        if (recordingStarted) {
          setVoiceCallStatus('active');
          setVoiceStatusText('Listening...');
          setIsLiveActive(true);
        } else {
          setVoiceStatusText('Failed to start microphone');
          disconnectRealtime();
          setVoiceCallStatus('idle');
        }
      } else {
        setVoiceStatusText('Failed to connect');
        setVoiceCallStatus('idle');
      }
    } catch (error) {
      console.error('[Voice Call] Start error:', error);
      setVoiceStatusText(`Error: ${error}`);
      setVoiceCallStatus('idle');
    }
  };

  // End Voice Call
  const endVoiceCall = () => {
    stopRecording();
    disconnectRealtime();
    setIsLiveActive(false);
    setVoiceCallStatus('idle');
    setVoiceStatusText('Call ended');
    setIsRecordingSTT(false);
    aiResponseAccumulator.current = '';
    lastAiMessageId.current = null;
  };

  // Scroll voice messages to bottom
  useEffect(() => {
    if (voiceScrollRef.current) {
      voiceScrollRef.current.scrollTop = voiceScrollRef.current.scrollHeight;
    }
  }, [voiceMessages]);

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) return [
        { id: Date.now().toString(), name: "New Chat", active: true, messages: [], settings: { ...DEFAULT_SETTINGS } }
      ];
      if (prev.find(s => s.id === id)?.active) filtered[0].active = true;
      return filtered;
    });
  };

  const handleApplyPreset = (type: string) => {
    const preset = NEURAL_PRESETS[type];
    if (!preset) return;
    updateActiveSettings({ ...activeSession.settings, customPrompt: preset.prompt, temperature: preset.temp });
  };

  const createNewSession = () => {
    const id = Date.now().toString();
    const newSession: ChatSession = {
      id, name: `Chat ${id.slice(-4)}`, active: true, 
      messages: [{ id: `init-${id}`, sender: 'AGENT', text: 'Hi! How can I help you today?', timestamp: new Date().toLocaleTimeString() }],
      settings: { ...DEFAULT_SETTINGS }
    };
    setSessions(prev => prev.map(s => ({ ...s, active: false })).concat(newSession));
  };

  const selectSession = (id: string) => {
    setSessions(prev => prev.map(s => ({ ...s, active: s.id === id })));
  };

  const updateActiveSettings = (settings: SettingsState) => {
    setSessions(prev => prev.map(s => s.active ? { ...s, settings } : s));
  };

  return (
    <div className="matrix-bg text-gray-300 h-screen flex flex-col overflow-hidden relative selection:bg-green-500/30 selection:text-white font-mono">
      <Overlay active={isOverlayActive} onActivate={() => setIsOverlayActive(false)} />
      <div className={`flex flex-col h-full transition-opacity duration-300 ${(isNavDrawerOpen || isCanvasDrawerOpen) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Header 
          onToggleLeft={() => setIsLeftPanelOpen(!isLeftPanelOpen)} 
          onToggleRight={() => setIsRightPanelOpen(!isRightPanelOpen)}
          onToggleNav={() => setIsNavDrawerOpen(!isNavDrawerOpen)}
          onToggleCanvas={() => setIsCanvasDrawerOpen(true)}
          onClear={() => setSessions(prev => prev.map(s => s.active ? { ...s, messages: [] } : s))}
          onLock={() => setIsOverlayActive(true)}
          leftOpen={isLeftPanelOpen} rightOpen={isRightPanelOpen}
        />
        <div className="flex-grow flex relative overflow-hidden z-10">
          {(isLeftPanelOpen || isRightPanelOpen) && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-[50] transition-opacity animate-in fade-in duration-300" onClick={() => { setIsLeftPanelOpen(false); setIsRightPanelOpen(false); }}></div>
          )}
          <Sidebar sessions={sessions} onSelect={selectSession} onCreate={createNewSession} onDelete={deleteSession} isOpen={isLeftPanelOpen} />
          <ChatBox 
            messages={activeSession.messages} isThinking={isThinking}
            isRecordingSTT={isRecordingSTT} isLiveActive={isLiveActive}
            onSend={handleSend} onFileUpload={handleFileUpload}
            onToggleSTT={toggleSTT} onToggleLive={toggleLive}
            onStopGeneration={handleStopGeneration}
            agentSettings={activeSession.settings} onUpdateSettings={updateActiveSettings}
            pendingImage={pendingImage} onClearPendingImage={() => setPendingImage(null)}
            pendingFiles={pendingFiles} onClearPendingFiles={() => setPendingFiles([])}
            sttTranscript={sttTranscript} onClearSttTranscript={() => setSttTranscript('')}
          />
          <SettingsPanel settings={activeSession.settings} onChange={updateActiveSettings} onApplyPreset={handleApplyPreset} onReset={() => updateActiveSettings({ ...activeSession.settings, ...DEFAULT_SETTINGS })} isOpen={isRightPanelOpen} />
        </div>
        <Footer />
      </div>
      <NavigationDrawer 
        isOpen={isNavDrawerOpen} 
        onClose={() => setIsNavDrawerOpen(false)} 
        currentSettings={activeSession.settings}
        onSettingsChange={updateActiveSettings}
        onModuleSelect={(item: NavItem) => {
          // Handle Canvas App - open the canvas drawer
          if (item.tool === 'canvas_app') {
            setIsNavDrawerOpen(false);
            setTimeout(() => setIsCanvasDrawerOpen(true), 300);
            return;
          }
          
          let mode: WorkspaceMode = 'CHAT';
          if (item.tool === 'browser') mode = 'PORTAL';
          else if (item.tool === 'canvas') mode = 'CANVAS';
          updateActiveSettings({ ...activeSession.settings, activeTool: item.tool, workspaceMode: mode });
          setIsNavDrawerOpen(false);
      }} />
      <CanvasAppDrawer isOpen={isCanvasDrawerOpen} onClose={() => setIsCanvasDrawerOpen(false)} />

      {/* Voice Call Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4 bg-[#1a1a2e] rounded-2xl border border-purple-500/20 shadow-2xl overflow-hidden">
            {/* Close Button */}
            <button
              onClick={closeVoiceModal}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Content */}
            <div className="p-6 pt-8 flex flex-col items-center">
              {/* AI Avatar */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500/30 to-cyan-500/30 flex items-center justify-center mb-4 border-2 border-teal-500/40">
                <span className="text-5xl">🤖</span>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-white mb-1">AI Studio Assistant</h2>
              
              {/* Status */}
              <p className={`text-sm mb-4 ${
                voiceCallStatus === 'active' ? 'text-emerald-400' : 
                voiceCallStatus === 'connecting' ? 'text-yellow-400' : 
                voiceStatusText.includes('Error') || voiceStatusText.includes('failed') ? 'text-red-400' :
                'text-gray-400'
              }`}>
                {voiceStatusText}
              </p>

              {/* Voice Selector */}
              <div className="flex items-center gap-2 mb-6">
                <span className="text-gray-400 text-sm">Voice:</span>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  disabled={voiceCallStatus === 'active'}
                  className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 text-sm focus:outline-none focus:border-purple-500/50 disabled:opacity-50 capitalize"
                >
                  {VOICE_OPTIONS.map(voice => (
                    <option key={voice} value={voice} className="bg-[#1a1a2e] capitalize">{voice}</option>
                  ))}
                </select>
              </div>

              {/* Voice Messages Area - Only show when there are messages */}
              {voiceMessages.length > 0 && (
                <div 
                  ref={voiceScrollRef}
                  className="w-full max-h-48 overflow-y-auto mb-6 bg-[#0d0d1a] rounded-xl p-4 border border-gray-800/50"
                >
                  {voiceMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'} mb-2`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                        msg.isUser 
                          ? 'bg-purple-500/30 text-purple-100 rounded-br-none' 
                          : 'bg-gray-700/50 text-gray-200 rounded-bl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Call Button */}
              <button
                onClick={voiceCallStatus === 'active' ? endVoiceCall : startVoiceCall}
                disabled={voiceCallStatus === 'connecting'}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 ${
                  voiceCallStatus === 'active' 
                    ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.5)]' 
                    : voiceCallStatus === 'connecting'
                    ? 'bg-yellow-500/50 cursor-wait'
                    : 'bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 shadow-[0_0_20px_rgba(0,0,0,0.5)]'
                }`}
              >
                {voiceCallStatus === 'active' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                  </svg>
                ) : voiceCallStatus === 'connecting' ? (
                  <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                )}
              </button>

              {/* Hint Text */}
              <p className="text-gray-500 text-xs mt-4 text-center">
                {voiceCallStatus === 'active' 
                  ? 'Tap the button to end the call' 
                  : 'Tap the button to start a voice call'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
